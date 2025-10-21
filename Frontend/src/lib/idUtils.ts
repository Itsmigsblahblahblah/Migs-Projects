/**
 * Utility functions for generating readable document IDs
 */

/**
 * Generates a URL-safe slug from a string
 * @param text The text to convert to a slug
 * @returns A URL-safe slug
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Generates a timestamp string in YYYYMMDD format
 * @returns Timestamp string
 */
export function generateTimestamp(): string {
  const now = new Date();
  return `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
}

/**
 * Generates a readable document ID for farmer crops
 * Format: {username}_{cropName}_{timestamp}
 * @param username The farmer's username
 * @param cropName The name of the crop
 * @returns A readable document ID
 */
export function generateFarmerCropId(username: string, cropName: string): string {
  const slug = generateSlug(cropName);
  const timestamp = generateTimestamp();
  const userSlug = generateSlug(username);
  return `${userSlug}_${slug}_${timestamp}`;
}

/**
 * Generates a readable document ID for deletion requests
 * Format: {username}_deletion_request_{timestamp}
 * @param username The farmer's username
 * @returns A readable document ID
 */
export function generateDeletionRequestId(username: string): string {
  const timestamp = generateTimestamp();
  const userSlug = generateSlug(username);
  return `${userSlug}_deletion_request_${timestamp}`;
}