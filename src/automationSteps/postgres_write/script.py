import json
import psycopg
from psycopg.rows import dict_row

def connect_to_postgres():
    secret_connection = next(iter(key for key in secrets if key.endswith("postgres_connection")), None)
    if not secret_connection:
        raise ValueError("No postgres_connection secret found")
    POSTGRES_CONNECTION_RAW = secrets[secret_connection]

    # Replace curly quotes with straight quotes
    SMART_QUOTE_MAP = str.maketrans({
        '\u201c': '"',  # “
        '\u201d': '"',  # ”
        '\u2018': "'",  # ‘
        '\u2019': "'",  # ’
        '\u201b': "'",  # ‛ single high-reversed-9
        '\u201e': '"',  # „ double low-9
        '\u201f': '"',  # ‟ double high-reversed-9
    })
    cleaned_json = POSTGRES_CONNECTION_RAW.translate(SMART_QUOTE_MAP)
    POSTGRES_CONNECTION = json.loads(cleaned_json)

    # Now actually use it - pick which env you want
    conn_data = {}
    if getattr(inputs, "connection_secret_tag", None):
      if inputs.connection_secret_tag not in POSTGRES_CONNECTION:
          raise ValueError(f"Connection secret tag {inputs.connection_secret_tag} not found in POSTGRES_CONNECTION")
      conn_data = POSTGRES_CONNECTION[inputs.connection_secret_tag]
    else:
      # If no connection secret tag is provided, POSTGRES_CONNECTION isn't nested
      conn_data = POSTGRES_CONNECTION
    
    REQUIRED_KEYS = ('host', 'port', 'user_name', 'password')
    missing_keys = [key for key in REQUIRED_KEYS if key not in conn_data]
    if missing_keys:
        raise ValueError(f"PostgreSQL connection secret is missing required key(s): {', '.join(missing_keys)}")

    POSTGRES_HOST = conn_data['host']
    POSTGRES_PORT = conn_data['port']
    POSTGRES_PASSWORD = conn_data['password']
    POSTGRES_USER = conn_data['user_name']

    INPUT_DATABASE = inputs.database
    INPUT_QUERY = inputs.query

    outputs.log(f"Using host: {POSTGRES_HOST} and port: {POSTGRES_PORT}")

    try:
        with psycopg.connect(
            host=POSTGRES_HOST,
            dbname=INPUT_DATABASE,
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            port=POSTGRES_PORT,
            row_factory=dict_row,
            connect_timeout=10
        ) as connection:
            with connection.cursor() as cursor:
                cursor.execute(INPUT_QUERY)

                if cursor.description is None: # True for INSERT/UPDATE/DELETE
                    connection.commit()
                    outputs.log(f"Rows affected: {cursor.rowcount}")
                    outputs.log(f"cursor.statusmessage: {cursor.statusmessage}")
                    outputs.result = str(cursor.rowcount)
                    outputs.result_status = cursor.statusmessage
                else: # SELECT query
                    rows = cursor.fetchall()

                    if not rows:
                        outputs.log("Query returned no rows")
                        outputs.result = ""
                        outputs.result_status = "No rows returned"
                    elif inputs.return_single_value:
                        if len(rows) == 1 and len(rows[0]) == 1:
                            single_value = next(iter(rows[0].values()))
                            outputs.log(f"Single value result: {single_value}")
                            outputs.result = str(single_value)
                            outputs.result_status = "Single value returned"
                        else:
                            raise ValueError("Expected a single value result, but the query returned multiple rows or columns.")
                    else:
                        outputs.log(f"Multiple values/rows returned: {len(rows)} rows")
                        outputs.result = str(rows)
                        outputs.result_status = "Multiple values returned"

    except psycopg.Error as e:
        raise ValueError(f"Error while using PostgreSQL connection: {e}")

connect_to_postgres()
