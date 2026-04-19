"""
Test Firebase Connection
Run this to verify Firebase is configured correctly
"""

from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

print("=" * 60)
print("FIREBASE CONFIGURATION TEST")
print("=" * 60)

# Check if Firebase variables are set
firebase_vars = {
    'FIREBASE_API_KEY': os.environ.get('FIREBASE_API_KEY', 'NOT SET'),
    'FIREBASE_AUTH_DOMAIN': os.environ.get('FIREBASE_AUTH_DOMAIN', 'NOT SET'),
    'FIREBASE_PROJECT_ID': os.environ.get('FIREBASE_PROJECT_ID', 'NOT SET'),
    'FIREBASE_STORAGE_BUCKET': os.environ.get('FIREBASE_STORAGE_BUCKET', 'NOT SET'),
    'FIREBASE_MESSAGING_SENDER_ID': os.environ.get('FIREBASE_MESSAGING_SENDER_ID', 'NOT SET'),
    'FIREBASE_APP_ID': os.environ.get('FIREBASE_APP_ID', 'NOT SET'),
}

print("\nFirebase Environment Variables:")
print("-" * 60)
all_set = True
for key, value in firebase_vars.items():
    is_set = value != 'NOT SET'
    status = "✅" if is_set else "❌"
    print(f"{status} {key}: {value[:20] if is_set else value}...")
    if not is_set:
        all_set = False

print("\n" + "=" * 60)
if all_set:
    print("✅ ALL FIREBASE VARIABLES CONFIGURED CORRECTLY")
    print("\nYou can now access the backend at: http://localhost:8000")
    print("Firebase config endpoint: http://localhost:8000/config/firebase")
else:
    print("❌ SOME FIREBASE VARIABLES ARE MISSING!")
    print("\nPlease check your .env file in the Backend directory")

print("=" * 60)

# Test the config endpoint
print("\nTesting /config/firebase endpoint...")
try:
    import requests
    response = requests.get('http://localhost:8000/config/firebase')
    if response.status_code == 200:
        data = response.json()
        if data.get('success'):
            print("✅ Backend config endpoint is working!")
            print(f"   Project ID: {data['config'].get('projectId')}")
        else:
            print("❌ Backend returned invalid response")
    else:
        print(f"❌ Backend returned status: {response.status_code}")
except Exception as e:
    print(f"❌ Could not connect to backend: {e}")
    print("   Make sure the backend server is running: python main.py")
