import json
import psycopg
from psycopg.rows import tuple_row, dict_row

def connect_to_postgres():
    connection = None

    outputs.log(f'result_format: {inputs.return_single_value}')

    try:
        secret_connection = next(iter(key for key in secrets if key.endswith("postgres_connection")), None)
        POSTGRES_CONNECTION_RAW = secrets[secret_connection]
        outputs.log(f"POSTGRES_CONNECTION raw: {POSTGRES_CONNECTION_RAW}")

        # Replace curly quotes with straight quotes
        cleaned_json = POSTGRES_CONNECTION_RAW.replace('“', '"').replace('”', '"')
        POSTGRES_CONNECTION = json.loads(cleaned_json)

        # Pick which env you want
        env = inputs.connection_secret_tag if inputs.connection_secret_tag in POSTGRES_CONNECTION else 'production_db'
        conn_data = POSTGRES_CONNECTION[env]

        POSTGRES_HOST = conn_data['host']
        POSTGRES_PORT = conn_data['port']
        POSTGRES_PASSWORD = conn_data['password']
        POSTGRES_USER = conn_data['user_name']

    except json.JSONDecodeError as e:
        outputs.log(f"Error decoding JSON from connection_secret_tag: {e}")
        return None
    except KeyError as e:
        outputs.log(f"Missing key in connection JSON: {e}")
        return None

    try:
        outputs.log(f'Secrets: {secrets}')

        INPUT_DATABASE = inputs.database
        outputs.log(f"Input database: {INPUT_DATABASE}")

        INPUT_QUERY = inputs.query
        outputs.log(f"Input query: {INPUT_QUERY}")

        connection = psycopg.connect(
            host=POSTGRES_HOST,
            dbname=INPUT_DATABASE,
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            port=POSTGRES_PORT,
            row_factory=dict_row
        )

        with connection.cursor() as cursor:
            outputs.log("Successfully connected to the database!")
            cursor.execute(INPUT_QUERY)

            # Fetch all rows
            all_rows = cursor.fetchall()

            if not all_rows:
                outputs.log("Query returned no results")
                outputs.result = ""
                return

            # Check if it's exactly 1 row with 1 column
            if inputs.return_single_value:
                if len(all_rows) == 1 and len(all_rows[0]) == 1:
                    single_value = all_rows[0][0]
                    outputs.log(f"Single value result: {single_value}")
                    outputs.result = str(single_value)
                else:
                    raise ValueError("Expected a single value result, but the query returned multiple rows or columns.")
            else:
                # Multiple values - return entire dataset as string
                outputs.log(f"Multiple values/rows returned: {len(all_rows)} rows")
                outputs.result = str(all_rows)

    except Exception as error:
        outputs.log(f"Error while connecting to PostgreSQL: {error}")
        raise ValueError(f"Error while using PostgreSQL Plugin: {error}")

    finally:
        if connection is not None:
            connection.close()
            outputs.log("PostgreSQL connection is closed.")

connect_to_postgres()
