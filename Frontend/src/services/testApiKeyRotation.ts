/**
 * Test file to verify API key rotation is working properly
 */

import { getNextApiKey, getApiKeyCount, getAllApiKeys, resetApiKeyRotation } from "./apiKeyRotationService";

// Test the API key rotation
console.log("Testing API Key Rotation Service");

// Get the total number of API keys
const keyCount = getApiKeyCount();
console.log(`Total API keys configured: ${keyCount}`);

// Get all API keys (for debugging)
const allKeys = getAllApiKeys();
console.log("All API keys:", allKeys);

// Test rotation by getting keys multiple times
console.log("\nTesting rotation:");
resetApiKeyRotation(); // Reset to start from the beginning

for (let i = 0; i < keyCount * 2; i++) {
  const key = getNextApiKey();
  console.log(`Request ${i + 1}: ${key}`);
}

console.log("\nRotation test completed!");