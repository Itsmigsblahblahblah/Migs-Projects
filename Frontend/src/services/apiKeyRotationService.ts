/**
 * Service for managing Gemini API keys with round-robin rotation
 */

// Array of API keys from environment variables
const API_KEYS = [
  import.meta.env.VITE_GEMINI_API_KEY_1,
  import.meta.env.VITE_GEMINI_API_KEY_2,
  import.meta.env.VITE_GEMINI_API_KEY_3,
  import.meta.env.VITE_GEMINI_API_KEY_4,
  import.meta.env.VITE_GEMINI_API_KEY_5,
  import.meta.env.VITE_GEMINI_API_KEY_6
].filter(key => key !== undefined && key !== "");

// Validate that we have at least one API key
if (API_KEYS.length === 0) {
  console.warn("No Gemini API keys found in environment variables. Please check your .env file.");
}

// Current index for round-robin selection
let currentIndex = 0;

/**
 * Get the next API key in round-robin fashion
 * @returns The next API key to use, or undefined if no keys are available
 */
export const getNextApiKey = (): string | undefined => {
  if (API_KEYS.length === 0) {
    return undefined;
  }

  const apiKey = API_KEYS[currentIndex];
  // Move to the next key, wrapping around if necessary
  currentIndex = (currentIndex + 1) % API_KEYS.length;
  return apiKey;
};

/**
 * Reset the API key rotation index
 * This can be useful for testing or when you want to start from the beginning
 */
export const resetApiKeyRotation = (): void => {
  currentIndex = 0;
};

/**
 * Get the total number of available API keys
 * @returns Number of configured API keys
 */
export const getApiKeyCount = (): number => {
  return API_KEYS.length;
};

/**
 * Get all configured API keys (for debugging purposes)
 * @returns Array of all configured API keys
 */
export const getAllApiKeys = (): string[] => {
  return [...API_KEYS]; // Return a copy to prevent external modification
};