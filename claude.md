# Postgres Query Runner

This module connects to a Postgres database using psycopg and executes a user-provided SQL query. It pulls connection credentials from a secrets store and handles single-value vs multi-row results.

## Dependencies
- Python: 3.7+
- Packages: psycopg v3, json (stdlib)

Install with: `pip install psycopg`

## Inputs
The script expects these runtime objects to be defined:

| Input | Type | Description |
| --- | --- | --- |
| secrets | dict | Contains a key ending in `postgres_connection` with JSON credentials |
| inputs.connection_secret_tag | str | Optional. Selects which env to use from the JSON. Defaults to `production_db` |
| inputs.database | str | Target database name to connect to |
| inputs.query | str | SQL query string to execute |
| inputs.return_single_value | bool | If `True`, expects exactly 1 row + 1 column and returns that value. If `False`, returns full result set. Raises `ValueError` if expectation not met |
| outputs | object | Has `.log()` method and `.result` attribute for output |

### Secrets JSON Format
The `postgres_connection` secret must be JSON with environment keys. Curly quotes are auto-converted to straight quotes. Always include `production_db` as it's the default fallback.

```json
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
```

## Core Function: connect_to_postgres()

What it does:
1. **Load credentials**: Finds the `postgres_connection` secret, replaces curly quotes `“”` with straight quotes, and parses JSON.
2. **Select environment**: Uses `inputs.connection_secret_tag` if it exists in the JSON. Falls back to `production_db`.
3. **Connect**: Opens a psycopg connection using `dict_row` factory.
4. **Execute**: Runs `inputs.query` with a cursor.
5. **Format result**:
   - If `inputs.return_single_value = True`: Expects exactly 1 row with 1 column. Sets `outputs.result` to that value as a string. Raises `ValueError` if query returns 0 rows or multiple rows/columns.
   - If `inputs.return_single_value = False`: Sets `outputs.result` to `str(all_rows)` - a stringified list of dicts from `dict_row`.
   - If no rows and `return_single_value = False`, `outputs.result` is `""`.
6. **Cleanup**: Always closes the connection in `finally`.

Error handling:
- `json.JSONDecodeError`: Logs error and returns `None` if secrets JSON is malformed.
- `KeyError`: Logs error and returns `None` if `host`, `port`, `user_name`, or `password` missing.
- `ValueError`: Raised when `return_single_value = True` but query doesn't return exactly 1 row + 1 column.
- Generic `Exception`: Logs any connection or query errors and re-raises as `ValueError`. Connection still closes.

## Outputs
All activity is sent to `outputs.log()`. Final data is written to `outputs.result` as a string.

| Scenario | `return_single_value` | `outputs.result` value |
| --- | --- | --- |
| 1 row, 1 column | `True` | `"42"` |
| 1 row, 1 column | `False` | `"[{'count': 42}]"` |
| Multiple rows/columns | `False` | `"[{'id': 1, 'name': 'Alice'}, {'id': 2, 'name': 'Bob'}]"` |
| Multiple rows/columns | `True` | Raises `ValueError` |
| Zero rows | `False` | `""` |
| Zero rows | `True` | Raises `ValueError` |
| Error before query | N/A | Not set |

## Usage Example
Set up the required globals, then call the function:

```python
secrets = {
  "myapp_postgres_connection": '{"production_db": {"host": "localhost", "port": 5432, "user_name": "dev", "password": "dev"}}'
}

class Inputs:
    connection_secret_tag = "production_db"
    database = "analytics"
    query = "SELECT COUNT(*) FROM users"
    return_single_value = True

class Outputs:
    def log(self, msg): print(msg)
    result = None

inputs = Inputs()
outputs = Outputs()

connect_to_postgres()
print(outputs.result) # "1573"
```

## Updated Script

```python
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
```

## Notes & Gotchas
- **SQL injection risk**: `inputs.query` is executed directly. Never pass user input without sanitizing.
- **No params**: The current code doesn't support parameterized queries. Add `cursor.execute(query, params)` if needed.
- **Row factory change**: Now uses `dict_row` instead of `tuple_row`, so multi-row results are lists of dicts. If `return_single_value = True`, you must access the single value via `all_rows[0][0]` which works because dict values are ordered, but `list(all_rows[0].values())[0]` is safer if you want to be explicit.
- **Strict single-value mode**: `return_single_value = True` will now raise `ValueError` instead of silently returning `str(all_rows)`. Handle this in calling code.
- **Connection pooling**: This opens and closes a connection per call. For high volume, use a pool.
- **Curly quotes**: Only curly double quotes are replaced. Other unicode quotes will still break `json.loads()`.
