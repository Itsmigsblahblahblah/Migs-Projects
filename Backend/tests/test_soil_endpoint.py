import requests
import json

# Test the soil data endpoint
def test_soil_data_endpoint():
    # Test with a known barangay
    response = requests.get("http://localhost:8000/soil-data/San Roque")
    print("Response for San Roque:")
    print(json.dumps(response.json(), indent=2))
    
    # Test with a barangay that doesn't exist
    response = requests.get("http://localhost:8000/soil-data/NonExistentBarangay")
    print("\nResponse for NonExistentBarangay:")
    print(json.dumps(response.json(), indent=2))

if __name__ == "__main__":
    test_soil_data_endpoint()