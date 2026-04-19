/**
 * Service for managing Gemini API keys with round-robin rotation
 * Now fetches API keys from backend proxy to prevent client-side exposure
 */

// Backend URL from environment variable or default to localhost
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// Cache for API keys (fetched from backend)
let apiKeyCache: string[] = [];
let cacheInitialized = false;
let currentCacheIndex = 0;

/**
 * Fetch API keys from backend proxy
 * This is called once to initialize the rotation cache
 */
const fetchApiKeysFromBackend = async (): Promise<void> => {
  if (cacheInitialized) return;

  try {
    const response = await fetch(`${BACKEND_URL}/gemini/status`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch API key status: ${response.statusText}`);
    }

    const status = await response.json();
    
    if (!status.keys_configured) {
      console.warn("No Gemini API keys configured on backend!");
      return;
    }

    // We don't actually fetch the keys themselves, just confirm they exist on backend
    // The actual key rotation happens on the backend
    cacheInitialized = true;
  } catch (error) {
    console.error("Failed to initialize API key cache from backend:", error);
    throw error;
  }
};

/**
 * Get the next API key in round-robin fashion
 * NOTE: For backward compatibility, this now returns undefined
 * The actual API calls should go through the backend proxy
 * @deprecated Use the backend proxy endpoint directly instead
 * @returns The next API key to use, or undefined if no keys are available
 */
export const getNextApiKey = (): string | undefined => {
  // API keys are now managed on the backend
  // This function returns undefined to indicate that
  // the backend proxy should be used instead
  return undefined;
};

/**
 * Reset the API key rotation index
 * Now delegates to backend rotation
 */
export const resetApiKeyRotation = (): void => {
  // Rotation is now handled on the backend
  // No client-side action needed
  currentCacheIndex = 0;
};

/**
 * Get the total number of available API keys
 * @returns Number of configured API keys
 */
export const getApiKeyCount = (): number => {
  // Return 0 as keys are now on backend
  // This is for backward compatibility
  return 0;
};

/**
 * Get all configured API keys (for debugging purposes)
 * NOTE: This no longer returns actual keys for security
 * @returns Empty array (keys are managed on backend)
 */
export const getAllApiKeys = (): string[] => {
  // Security: Never expose API keys to client
  return [];
};

/**
 * Initialize the API key rotation service
 * Now just verifies backend connectivity
 */
export const initializeApiKeyRotation = async (): Promise<void> => {
  try {
    await fetchApiKeysFromBackend();
  } catch (error) {
    console.warn("API key rotation initialization failed, will use backend proxy directly");
  }
};

// Auto-initialize on module load
initializeApiKeyRotation().catch(() => {
  console.warn("Failed to auto-initialize API key rotation");
});