# Postgres Query Runner

This module connects to a Postgres database using psycopg and executes a user-provided SQL query. It pulls connection credentials from a secrets store and handles single-value vs multi-row results.

## Dependencies
- Python: 3.7+
- Packages: psycopg v3, json (stdlib)

Install with: pip install psycopg

## Inputs
The script expects these runtime objects to be defined:

Input | Type | Description
--- | --- | ---
secrets | dict | Contains a key ending in postgres_connection with JSON credentials
inputs.connection_secret_tag | str | Optional. Selects which env to use from the JSON. Defaults to production_db
inputs.database | str | Target database name to connect to
inputs.query | str | SQL query string to execute
outputs | object | Has .log() method and .result attribute for output

### Secrets JSON Format
The postgres_connection secret must be JSON with environment keys. Curly quotes are auto-converted to straight quotes. Always include production_db as it's the default fallback.

{
  "production_db": {
    "host": "db.example.com",
    "port": 5432,
    "user_name": "app_user",
    "password": "super_secret"
  },
  "staging_db": {
    "host": "staging.db.example.com", 
    "port": 5432,
    "user_name": "app_user",
    "password": "staging_secret"
  }
}

## Core Function: connect_to_postgres()

What it does:
1. Load credentials: Finds the postgres_connection secret, replaces curly quotes with straight quotes, and parses JSON.
2. Select environment: Uses inputs.connection_secret_tag if it exists in the JSON. Falls back to production_db.
3. Connect: Opens a psycopg connection using tuple_row factory.
4. Execute: Runs inputs.query with a cursor.
5. Format result: 
   - If query returns exactly 1 row with 1 column, outputs.result is that value as a string.
   - If multiple rows/columns, outputs.result is str(all_rows) - a stringified list of tuples.
   - If no rows, outputs.result is "".
6. Cleanup: Always closes the connection in finally.

Error handling:
- json.JSONDecodeError: Logs error and returns None if secrets JSON is malformed.
- KeyError: Logs error and returns None if host, port, user_name, or password missing.
- Generic Exception: Logs any connection or query errors. Connection still closes.

## Outputs
All activity is sent to outputs.log(). Final data is written to outputs.result as a string.

Scenario | outputs.result value
--- | ---
1 row, 1 column | "42"
Multiple rows/columns | "[(1, 'Alice'), (2, 'Bob')]"
Zero rows | ""
Error before query | Not set

## Usage Example
Set up the required globals, then call the function:

secrets = {
  "myapp_postgres_connection": '{"production_db": {"host": "localhost", "port": 5432, "user_name": "dev", "password": "dev"}}'
}

class Inputs:
    connection_secret_tag = "production_db"
    database = "analytics"
    query = "SELECT COUNT(*) FROM users"

class Outputs:
    def log(self, msg): print(msg)
    result = None

inputs = Inputs()
outputs = Outputs()

connect_to_postgres()
print(outputs.result)  # "1573"

## Notes & Gotchas
- SQL injection risk: inputs.query is executed directly. Never pass user input without sanitizing.
- No params: The current code doesn't support parameterized queries. Add cursor.execute(query, params) if needed.
- Result formatting: Multi-row results use str(all_rows). For JSON APIs, consider json.dumps(all_rows) instead.
- Connection pooling: This opens and closes a connection per call. For high volume, use a pool.
- Curly quotes: Only curly double quotes are replaced. Other unicode quotes will still break json.loads().