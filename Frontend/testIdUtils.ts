import { generateFarmerCropId, generateDeletionRequestId, generateSlug, generateTimestamp } from "./src/lib/idUtils";

console.log("Testing Updated ID Generation Functions:");
console.log("=====================================");

// Test slug generation
console.log("Slug for 'Rice':", generateSlug("Rice"));
console.log("Slug for 'Corn & Beans':", generateSlug("Corn & Beans"));
console.log("Slug for 'Tomato-Plant':", generateSlug("Tomato-Plant"));
console.log("Slug for 'Juan Dela Cruz':", generateSlug("Juan Dela Cruz"));

// Test timestamp generation
console.log("Current timestamp:", generateTimestamp());

// Test farmer crop ID generation with username
console.log("Farmer Crop ID (juan_dela_cruz, Rice):", generateFarmerCropId("juan_dela_cruz", "Rice"));
console.log("Farmer Crop ID (maria_santos, Corn & Beans):", generateFarmerCropId("maria_santos", "Corn & Beans"));

// Test deletion request ID generation with username
console.log("Deletion Request ID (juan_dela_cruz):", generateDeletionRequestId("juan_dela_cruz"));
console.log("Deletion Request ID (maria_santos):", generateDeletionRequestId("maria_santos"));