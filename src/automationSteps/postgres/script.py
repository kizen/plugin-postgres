import psycopg2

def connect_to_postgres():
    connection = None
    try:
        # 1. Connect to the PostgreSQL database
        # Replace placeholders with your actual database credentials
        connection = psycopg2.connect(
            host="localhost",
            database="your_database_name",
            user="your_username",
            password="your_password",
            port="5432",  # Default PostgreSQL port
        )

        # 2. Create a cursor object to execute SQL commands
        cursor = connection.cursor()

        # 3. Execute a sample test query
        outputs.log("Successfully connected to the database!")
        cursor.execute("SELECT version();")

        # 4. Fetch and display the results
        db_version = cursor.fetchone()
        outputs.log(f"PostgreSQL database version: {db_version[0]}")

        # Clean up the cursor
        cursor.close()

    except Exception as error:
        outputs.log(f"Error while connecting to PostgreSQL: {error}")
    
    finally:
        # 5. Ensure the database connection always closes
        if connection is not None:
            connection.close()
            outputs.log("PostgreSQL connection is closed.")
    
if __name__ == "__main__":
    connect_to_postgres()
