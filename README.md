# Postgres Connection

A Kizen plugin that connects to an external Postgres database so Agentic Workflows can look up and write real-time data.

The plugin adds two automation steps: **Read Data** and **Write Data**. Both connect using a stored `postgres_connection` secret, run the SQL you give them, and return the result as a string.

## Steps

### Read Data

Runs a `SELECT` against your database. A regex guardrail blocks anything that writes or changes schema (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `CREATE`, `GRANT`, `REVOKE`, `COPY`, `CALL`, `DO`), so this step is read-only.

### Write Data

Runs write queries (`INSERT`, `UPDATE`, `DELETE`, and the rest). There is no guardrail here, so use it carefully. It also returns a `result_status` output alongside the result.

## Inputs

Both steps take the same inputs:

| Input | Required | Description |
| --- | --- | --- |
| Database | Yes | Name of the database to connect to. |
| Query | Yes | The SQL to run. |
| Return Single Value | Yes | `YES` expects exactly one row and one column and returns that cell. `NO` returns the full result set as a stringified list of dicts. Defaults to `YES`. |
| Connection Secret Tag | No | Picks one environment out of a multi-env connection secret. Leave empty when the secret holds a single connection at the root. |

## Outputs

| Output | Step | Description |
| --- | --- | --- |
| Result | Both | Query result as a string. Empty string when a `NO`-single-value query returns no rows. |
| Result Status | Write only | The Postgres command tag for writes without `RETURNING` (e.g. `INSERT 0 1`), or one of `No rows returned`, `Single value returned`, `Multiple values returned` for queries with a result set. |

Turning on **Return Single Value** raises an error if the query returns zero rows or more than one cell, so only use it when you expect exactly one value.

## Connection secret

Store credentials in a secret named `postgres_connection` as JSON. Use a flat object for a single connection:

```json
{
  "host": "db.example.com",
  "port": 5432,
  "user_name": "app_user",
  "password": "super_secret"
}
```

Or nest connections under environment keys and select one with the Connection Secret Tag input:

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

Curly quotes in the JSON are converted to straight quotes before parsing, so pasting from docs won't break the connection.

## Notes

- The query runs directly against the database with no parameter binding. Never pass unsanitized user input into the Query field.
- Each step opens and closes its own connection per run.
