# Postgres Query Runner

## Files

### 1. `postgres_get`
**Purpose**: Read-only queries against Snowflake. Returns query results as strings.

**Key Features**
- **Read-only guardrail**: Regex check blocks `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `CREATE`, `GRANT`, `REVOKE`, `COPY`, `CALL`, `DO`. Only `SELECT` queries should pass.
- **Smart quote normalization**: Converts curly quotes `“”‘’` to straight quotes before `json.loads()` to handle copy-paste from docs.
- **Multi-env support**: Reads `MYSQL_CONNECTION` secret. If `inputs.connection_secret_tag` is set, uses that nested key. Otherwise treats the secret as flat.
- **Single value mode**: Set `inputs.return_single_value = True` to extract one cell. Throws if query returns >1 row or >1 column.

### 2. `postgres_send`  
**Purpose**: Write operations against Snowflake. Returns stats + results.

**Key Features**
- **No SQL guardrail**: Intentionally allows `INSERT`, `UPDATE`, `DELETE`, etc. Use with caution..
- **Same secret/env handling** as `postgres_get`
- **Single value mode** also supported for write queries that return a value, e.g. `INSERT ... RETURNING id`

## Dependencies

- Packages: psycopg v3, json (stdlib)

## Inputs

The script expects these runtime objects to be defined:

| Input                        | Type   | Description                                                                                                                                             |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| secrets                      | dict   | Contains a key ending in `postgres_connection` with JSON credentials                                                                                    |
| inputs.connection_secret_tag | str    | Optional. Selects which env to use from the JSON. If empty, assumes connection info at root level. Raises `ValueError` if tag is provided but not found |
| inputs.database              | str    | Target database name to connect to                                                                                                                      |
| inputs.query                 | str    | SQL query string to execute                                                                                                                             |
| inputs.return_single_value   | bool   | If `True`, expects exactly 1 row + 1 column and returns that value. If `False`, returns full result set. Raises `ValueError` if expectation not met     |
| outputs                      | object | Has `.log()` method and `.result` attribute for output                                                                                                  |

### Secrets JSON Format

The `postgres_connection` secret must be valid JSON. Curly quotes are auto-converted to straight quotes. Supports both nested (with environment keys) and flat formats:

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

or, without optional `connection_secret_tag` input field:

```json
{
  "host": "db.example.com",
  "port": 5432,
  "user_name": "app_user",
  "password": "super_secret"
}
```

## Core Function: connect_to_postgres()

What it does:

1. **Load credentials**: Finds the `postgres_connection` secret, replaces curly quotes `“”` with straight quotes, and parses JSON.
2. **Select environment**: Uses `inputs.connection_secret_tag` if provided. Raises `ValueError` if tag not found. If empty, uses connection JSON as-is.
3. **Connect**: Opens a psycopg connection using `dict_row` factory.
4. **Execute**: Runs `inputs.query` with a cursor.
5. **Format result**:
   - If `inputs.return_single_value = True`: Expects exactly 1 row with 1 column. Sets `outputs.result` to that value as a string. Raises `ValueError` if query returns 0 rows or multiple rows/columns.
   - If `inputs.return_single_value = False`: Sets `outputs.result` to `str(all_rows)` - a stringified list of dicts from `dict_row`.
   - If no rows and `return_single_value = False`, `outputs.result` is `""`.
6. **Cleanup**: Connection closed automatically via context manager.

Error handling:

- `ValueError`: Raised if no `postgres_connection` secret found.
- `ValueError`: Raised if `inputs.connection_secret_tag` not found in connection JSON.
- `psycopg.Error`: Caught and re-raised as `ValueError(f"Error while using PostgreSQL connection: {e}")`.
- `ValueError`: Raised when `return_single_value = True` but query doesn't return exactly 1 row + 1 column.

## Outputs

All activity is sent to `outputs.log()`. Final data is written to `outputs.result` as a string.

| Scenario              | `return_single_value` | `outputs.result` value                                     |
| --------------------- | --------------------- | ---------------------------------------------------------- |
| 1 row, 1 column       | `True`                | `"42"`                                                     |
| 1 row, 1 column       | `False`               | `"[{'count': 42}]"`                                        |
| Multiple rows/columns | `False`               | `"[{'id': 1, 'name': 'Alice'}, {'id': 2, 'name': 'Bob'}]"` |
| Multiple rows/columns | `True`                | Raises `ValueError`                                        |
| Zero rows             | `False`               | `""`                                                       |
| Zero rows             | `True`                | Raises `ValueError`                                        |
| Error before query    | N/A                   | Not set                                                    |

## Notes & Gotchas

- **SQL injection risk**: `inputs.query` is executed directly. Never pass user input without sanitizing.
- **No params**: The current code doesn't support parameterized queries. Add `cursor.execute(query, params)` if needed.
- **Row factory**: Uses `dict_row`, so multi-row results are lists of dicts. Single value is accessed via `next(iter(rows[0].values()))`.
- **Strict single-value mode**: `return_single_value = True` will now raise `ValueError` instead of silently returning `str(all_rows)`. Handle this in calling code.
- **Connection pooling**: This opens and closes a connection per call. For high volume, use a pool.
- **Curly quotes**: Only curly double quotes are replaced. Other unicode quotes will still break `json.loads()`.
