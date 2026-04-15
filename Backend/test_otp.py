"""
Quick test script to verify OTP endpoint is working
"""
import requests
import json

# Test the OTP endpoint
url = "http://localhost:8000/auth/send-otp"
data = {"phone_number": "9764148017"}

print(f"Testing OTP endpoint: {url}")
print(f"Request: {data}\n")

try:
    response = requests.post(url, json=data, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
except requests.exceptions.ConnectionError:
    print("ERROR: Cannot connect to backend!")
    print("Make sure backend is running: uvicorn main:app --reload")
except requests.exceptions.Timeout:
    print("ERROR: Request timed out")
    print("Backend might be hanging on Semaphore API call")
except Exception as e:
    print(f"ERROR: {str(e)}")
