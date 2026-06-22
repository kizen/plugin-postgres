import psycopg
from psycopg.rows import tuple_row

def connect_to_postgres():
    connection = None
    try:
        outputs.log(f'Secrets: {secrets}')

        secret_password = next(iter(key for key in secrets if key.endswith("postgres_password")), None)
        POSTGRES_PASSWORD = secrets[secret_password]

        secret_port = next(iter(key for key in secrets if key.endswith("postgres_port")), None)
        POSTGRES_PORT = secrets[secret_port]

        secret_host = next(iter(key for key in secrets if key.endswith("postgres_host")), None)
        POSTGRES_HOST = secrets[secret_host]

        INPUT_USER = inputs.user
        outputs.log(f"Input user: {INPUT_USER}")

        INPUT_DATABASE = inputs.database
        outputs.log(f"Input database: {INPUT_DATABASE}")

        INPUT_QUERY = inputs.query
        outputs.log(f"Input query: {INPUT_QUERY}")

        connection = psycopg.connect(
            host=POSTGRES_HOST,
            dbname=INPUT_DATABASE,
            user=INPUT_USER,
            password=POSTGRES_PASSWORD,
            port=POSTGRES_PORT,
            row_factory=tuple_row # Matches psycopg2 behavior: returns tuples
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
            if len(all_rows) == 1 and len(all_rows[0]) == 1:
                single_value = all_rows[0][0]
                outputs.log(f"Single value result: {single_value}")
                outputs.result = str(single_value)
            else:
                # Multiple values - return entire dataset as string
                outputs.log(f"Multiple values/rows returned: {len(all_rows)} rows")
                outputs.result = str(all_rows)

    except Exception as error:
        outputs.log(f"Error while connecting to PostgreSQL: {error}")

    finally:
        if connection is not None:
            connection.close()
            outputs.log("PostgreSQL connection is closed.")

connect_to_postgres()
