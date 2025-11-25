import { getFertilizerRecommendations } from "@/services/cropDataService";

// Test the enhanced fertilizer recommendations
const testFertilizerRecommendations = async () => {
  try {
    console.log("Testing enhanced fertilizer recommendations...");
    
    // Test with a known crop
    const recommendations = await getFertilizerRecommendations("Rice", "Clay");
    
    console.log("Fertilizer Recommendations:", recommendations);
    
    // Check if detailed recommendations are present
    if (recommendations.detailedRecommendations) {
      console.log("✓ Detailed recommendations are available");
      console.log("Nitrogen Level:", recommendations.detailedRecommendations.nitrogen.level);
      console.log("Phosphorus Level:", recommendations.detailedRecommendations.phosphorus.level);
      console.log("Potassium Level:", recommendations.detailedRecommendations.potassium.level);
      
      // Check if detailed info is available
      if (recommendations.detailedRecommendations.nitrogen.detailedInfo) {
        console.log("✓ Nitrogen detailed info is available");
      }
      if (recommendations.detailedRecommendations.phosphorus.detailedInfo) {
        console.log("✓ Phosphorus detailed info is available");
      }
      if (recommendations.detailedRecommendations.potassium.detailedInfo) {
        console.log("✓ Potassium detailed info is available");
      }
    } else {
      console.log("✗ Detailed recommendations are missing");
    }
    
    console.log("Test completed successfully!");
  } catch (error) {
    console.error("Test failed:", error);
  }
};

// Run the test
testFertilizerRecommendations();