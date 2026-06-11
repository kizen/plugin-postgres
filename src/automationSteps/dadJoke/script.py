import requests

# Fetch a random dad joke as plain text.
url = "https://icanhazdadjoke.com/"
headers = {"Accept": "text/plain"}

response = requests.get(url, headers=headers)

if response.status_code == 200:
    joke = response.text
    # Write the joke to the mapped output field and log it.
    outputs.target = joke
    outputs.log(f"Received joke: {joke}")
else:
    outputs.log(f"Error: {response.status_code} - {response.text}")
