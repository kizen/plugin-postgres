import psycopg
from psycopg.rows import tuple_row

def connect_to_postgres():
    connection = None
    try:
        # 1. Connect to the PostgreSQL database using psycopg v3
        # Best practice: use a connection string or conninfo
        connection = psycopg.connect(
            host="localhost",
            dbname="your_database_name", # Note: 'dbname' instead of 'database'
            user="your_username",
            password="your_password",
            port="5432",
            row_factory=tuple_row # Matches psycopg2 behavior: returns tuples
        )

        # 2. Use context manager for cursor - auto-closes on exit
        with connection.cursor() as cursor:
            # 3. Execute a sample test query
            print("Successfully connected to the database!")
            cursor.execute("SELECT version();")

            # 4. Fetch and display the results
            db_version = cursor.fetchone()
            print(f"PostgreSQL database version: {db_version[0]}")

        # psycopg v3 autocommits DDL but not DML. For SELECT it's fine.
        # If you did INSERT/UPDATE: connection.commit()

    except Exception as error:
        print(f"Error while connecting to PostgreSQL: {error}")

    finally:
        # 5. Ensure the database connection always closes
        if connection is not None:
            connection.close()
            print("PostgreSQL connection is closed.")

if __name__ == "__main__":
    connect_to_postgres()
