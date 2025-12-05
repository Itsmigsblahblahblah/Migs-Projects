import requests
import json

# Test what the frontend might be sending that causes the time error
url = "http://localhost:8000/enhanced-soil/enhanced-recommend"

# Simulate a request with incomplete data that might trigger the error
test_cases = [
    # Case 1: Missing soil_data
    {},
    
    # Case 2: Empty soil_data
    {"soil_data": {}},
    
    # Case 3: Missing required fields
    {"soil_data": {"pH": 6.5}},
    
    # Case 4: Invalid values
    {"soil_data": {"pH": 6.5, "Nitrogen": "X", "Phosphorus": "L", "Potassium": "H"}},
    
    # Case 5: Valid data
    {"soil_data": {"pH": 6.5, "Nitrogen": "M", "Phosphorus": "L", "Potassium": "H"}}
]

headers = {
    "Content-Type": "application/json"
}

for i, data in enumerate(test_cases):
    print(f"\nTest case {i+1}: {data}")
    try:
        response = requests.post(url, data=json.dumps(data), headers=headers)
        print(f"Status code: {response.status_code}")
        if response.status_code == 200:
            print("Success")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Exception: {e}")