import requests

# SECRETS:
#   webhook_url  – the destination webhook URL (configured in the platform, never
#                  committed).
#
# INPUTS:
#   message  string  – the text to send (e.g. the joke from the Dad Joke step).

# At runtime, secret keys are namespaced by the plugin's api_name.
webhook_url = secrets["scott_f_dev__webhook_url"]
message = inputs.message

# POST the message as the request body.
response = requests.post(webhook_url, json={"message": message}, timeout=30)

if 200 <= response.status_code < 300:
    outputs.log(f"Posted message to webhook: {message}")
else:
    outputs.log(f"Error posting to webhook: {response.status_code} - {response.text}")
