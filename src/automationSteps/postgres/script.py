import secrets

import psycopg
from psycopg.rows import tuple_row

def connect_to_postgres():
    connection = None
    try:
        outputs.log(f'Secrets: {secrets}')
        
        connection = psycopg.connect(
            host="localhost",
            dbname="TEST_DB", # Note: 'dbname' instead of 'database'
            user="scott_readonly",
            password="test12345",
            port="5432",
            row_factory=tuple_row # Matches psycopg2 behavior: returns tuples
        )

        # 2. Use context manager for cursor - auto-closes on exit
        with connection.cursor() as cursor:
            # 3. Execute a sample test query
            outputs.log("Successfully connected to the database!")
            cursor.execute("""SELECT t."Age" FROM public.test_table t;""")

            # 4. Fetch and display the results
            db_version = cursor.fetchone()
            outputs.log(f"PostgreSQL database version: {db_version[0]}")

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
