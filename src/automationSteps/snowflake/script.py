import http.client
import json

BASE_URL = "/external-integrations/proxy/scott_f_dev/snowflake_staging_api"

payload = {
    "statement": "SELECT * FROM TEST_DB.PUBLIC.TEST_CUSTOMERS",
    "timeout": 1000,
    "database": "TEST_DB",
    "schema": "PUBLIC",
    "warehouse": "COMPUTE_WH",
    "bindings": {},
    "parameters": {},
    "role": "SYSADMIN",
}

outputs.log(f"{BASE_URL}/api/v2/statements?async=false")

res = kizen.api.post(f"{BASE_URL}/api/v2/statements?async=false", json=payload)

outputs.log(res.json())
