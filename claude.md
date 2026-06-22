# plugin-postgres - Developer Notes

## 1. Purpose
This plugin enables Agentic Workflows to execute read-only `SELECT` queries against external PostgreSQL databases. v1 is Expand-only: no Hydrate, no scheduled syncs, no writes.

**Ticket:** KZN-17384  
**Status:** Launch Standard | **Pillar:** Expand

## 2. Runtime & Dependencies
- **Python:** 3.9+
- **Driver:** `psycopg[binary] >= 3.1` 
- **Container:** Built into `agentic-workflow` image via KZN-17367
- **No internet egress** from plugin runtime except to the target Postgres host

## 3. Entry Point
`main.py::connect_to_postgres()`

This is invoked by the workflow engine when a user runs the "Run Query" action step.

## 4. Connection Handling

### 4.1 Secret Resolution
Secrets are injected at runtime and resolved by suffix match:
```python
postgres_host      # from secrets key ending in "postgres_host"
postgres_port      # from secrets key ending in "postgres_port" 
postgres_password  # from secrets key ending in "postgres_password"

Username and database are passed as plugin inputs: inputs.user, inputs.database.

4.2 Connection String

psycopg.connect(
    host=POSTGRES_HOST,
    dbname=INPUT_DATABASE,
    user=INPUT_USER,
    password=POSTGRES_PASSWORD,
    port=POSTGRES_PORT,
    row_factory=tuple_row  # Returns tuples, matches psycopg2 behavior
)

4.3 SSL Mode
v1 Limitation: sslmode is not passed in code yet. Connection will use libpq default.
Future: Add sslmode parameter to connect call. Supported values: disable, allow, prefer, require, verify-ca, verify-full. Recommend require for prod.

4.4 Timeouts
Relies on Postgres statement_timeout and TCP timeouts. Plugin sets no explicit connect_timeout, but container enforces 10s hard timeout for the step. Long queries should fail fast.

5. Query Execution & Result Handling
5.1 Allowed SQL
Only SELECT statements. No enforcement in plugin yet - relies on DB role permissions.
Best practice: Create read-only role with GRANT SELECT only. Do not use superuser.

5.2 Result Serialization Logic
Located in connect_to_postgres() lines 40-56 equivalent:

Query Result

outputs.result

Notes

0 rows

""

String literal, not "" or None

1 row, 1 column

str(value)

e.g. SELECT 1 → "1"

N rows or M columns

str(all_rows)

Stringified tuple list: [(1, 'Alice'), (2, 'Bob')]

Important: row_factory=tuple_row means multi-column rows come back as tuples. We cast the whole list to string for the workflow variable. Downstream steps must parse if they need structured data.

5.3 Empty Result Discrepancy
Code says: outputs.result = "No results"
Doc currently says: Returns "" in section 9 and 10.
Action: Update doc to match code. v1 returns "No results".

6. Error Handling
All exceptions caught at top level:

except Exception as error:
    outputs.log(f"Error while connecting to PostgreSQL: {error}")

User sees: Clean message with Postgres error text.
Logs: Full stack trace + connection params (password redacted) logged internally.
No retries: Avoid duplicate reads. Fail fast.
Common errors to map:

psycopg.OperationalError: connection refused → Check host/port/firewall
psycopg.OperationalError: password authentication failed → Bad creds
psycopg.errors.SyntaxError → Bad SQL surfaced to user
psycopg.errors.UndefinedTable → Missing table/permission
7. Security Notes
7.1 SQL Injection
Plugin does not do parameterization. INPUT_QUERY is executed as-is.
Mitigation:

Only SELECT allowed via DB role permissions
Users should use workflow inputs for values, not string concat in queries
Future: Add query templating with $1 style params
7.2 Credential Storage
All secrets encrypted at rest via Kizen Secrets Manager. Never log POSTGRES_PASSWORD.

7.3 Network
Requires customer to allowlist Kizen egress IPs. No SSH tunnel or VPC peering in v1. Default port 5432.

8. Local Development & Testing
8.1 Test DB Setup

docker run -d --name pg-test -e POSTGRES_PASSWORD=test -p 5432:5432 postgres:15
psql -h localhost -U postgres -c "CREATE DATABASE kizen_test;"
psql -h localhost -U postgres -d kizen_test -c "CREATE TABLE users(id int, name text); INSERT INTO users VALUES (1,'Alice'),(2,'Bob');"

8.2 Test Matrix
Test Case

Query

Expected outputs.result

Auth success

SELECT 1

"1"

Auth fail

bad password

Logs error, no result set

Single value

SELECT count(*) FROM users

"2"

Multi-row

SELECT * FROM users

"[(1, 'Alice'), (2, 'Bob')]"

Empty

SELECT * FROM users WHERE 1=0

"No results"

SQL error

SELEC 1

Logs error, surfaced to user

8.3 Manual QA Checklist
Create connection with valid creds → Test Connection succeeds
Create connection with bad host → Clean error: connection refused
Run SELECT 1 → Returns "1"
Run SELECT id, name FROM users LIMIT 2 → Returns "[(1, 'Alice'), (2, 'Bob')]"
Run query with no results → Returns "No results"
Run bad SQL → Surfaces Postgres syntax error
Test with RDS + sslmode=require → Validate after sslmode is wired up

9. Known v1 Limitations
No sslmode passed: Connections use libpq default. Wire this up for verify-ca support.
Result format: Stringified tuples. Not JSON. Downstream parsing required for structured use.
No query params: Risk of SQL injection if users concat inputs. Add templating in v2.
No schema introspection: Can’t list tables/columns in builder yet.
Size limits: Results >5MB may truncate. User must LIMIT.
No pagination: User writes LIMIT/OFFSET manually.

10. Observability
Logs: outputs.log() used for connection success, row count, errors, close. Visible in workflow run logs.
Notify Plugin Developer: Toggle in step config routes errors to plugin owner Slack.
Metrics to add: query_duration_ms, row_count, error_type

11. Future Work
Pass sslmode and sslrootcert from connection config
Add parameterized query support: inputs.params → $1, $2 binding
Return JSON instead of stringified tuples when multi-row
Add Test Query button in connection setup
Support SSH tunnel / Cloud SQL Auth Proxy
Hydrate: scheduled SELECT * sync to Kizen tables

12. Related Links
Internal Doc: KZN-17384
Lucidchart: [Postgres Plugin Sequence Diagram]
Driver Docs: https://www.psycopg.org/psycopg3/docs/
Container Ticket: KZN-17367
MySQL Plugin: KZN-17385 for behavior parity reference