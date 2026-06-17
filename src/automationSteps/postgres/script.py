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

        # 2. Use context manager for cursor - auto-closes on exit
        with connection.cursor() as cursor:
            # 3. Execute a sample test query
            outputs.log("Successfully connected to the database!")
            cursor.execute(INPUT_QUERY)

            # 4. Fetch and display the results
            query_result = cursor.fetchone()
            outputs.log(f"PostgreSQL query result: {query_result[0]}")
            outputs.result = str(query_result[0])  # Store result as string for output

        # psycopg v3 autocommits DDL but not DML. For SELECT it's fine.
        # If you did INSERT/UPDATE: connection.commit()

    except Exception as error:
        outputs.log(f"Error while connecting to PostgreSQL: {error}")

    finally:
        # 5. Ensure the database connection always closes
        if connection is not None:
            connection.close()
            outputs.log("PostgreSQL connection is closed.")

connect_to_postgres()
