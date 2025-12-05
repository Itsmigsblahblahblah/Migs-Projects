import requests
import json

# Test what the frontend might be sending
url = "http://localhost:8000/enhanced-soil/enhanced-recommend"

# Simulate a request that might cause issues
data = {
    "soil_data": {
        "pH": 6.5,
        "Nitrogen": "M",
        "Phosphorus": "L",
        "Potassium": "H"
    }
}

headers = {
    "Content-Type": "application/json"
}

try:
    response = requests.post(url, data=json.dumps(data), headers=headers)
    print(f"Status code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")