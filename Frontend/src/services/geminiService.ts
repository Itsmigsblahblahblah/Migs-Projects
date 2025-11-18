/**
 * Service for interacting with Gemini API for crop management insights
 */

// Use the existing API key from the project
const GEMINI_API_KEY = "AIzaSyBH392sx2Gy-D8DBz3MrDZ_Ou88h4IDtog";

/**
 * Get estimated harvest date for a specific crop using Gemini AI
 * @param cropName Name of the crop
 * @param plantedDate Date when the crop was planted
 * @param location Farm location (optional)
 * @returns Estimated harvest date and additional growing insights
 */
export const getHarvestEstimate = async (
  cropName: string,
  plantedDate: Date,
  location?: string
) => {
  const prompt = `
    You are an expert agricultural advisor specializing in Philippine farming conditions, particularly in Majayjay, Laguna.
    
    Based on the crop name and planting date provided, estimate the optimal harvest date and provide growing insights:
    
    Crop: ${cropName}
    Planting Date: ${plantedDate.toISOString().split('T')[0]}
    Location: ${location || 'Majayjay, Laguna'}
    
    Consider these factors in your analysis:
    - Typical growing conditions in the Philippines
    - Seasonal variations and weather patterns
    - Average days to maturity for this crop variety
    - Local agricultural practices in Majayjay
    
    Please respond in the following JSON format:
    {
      "estimatedHarvestDate": "YYYY-MM-DD",
      "daysToHarvest": number,
      "growthStage": "Current growth stage (Germination/Vegetative/Flowering/Fruiting/Maturing)",
      "daysInCurrentStage": number,
      "careTips": ["Array of 3-5 specific care tips for current growth stage"],
      "potentialIssues": ["Array of 2-3 potential issues to watch for"],
      "weatherConsiderations": "Any weather-related considerations for this crop at this time"
    }
    
    Ensure your response is valid JSON and nothing else. Be specific and practical for Filipino farmers.
  `;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract JSON from the response
    const textResponse = data.candidates[0].content.parts[0].text;
    // Clean up the response to extract valid JSON
    const jsonStart = textResponse.indexOf('{');
    const jsonEnd = textResponse.lastIndexOf('}') + 1;
    const jsonString = textResponse.substring(jsonStart, jsonEnd);
    
    const result = JSON.parse(jsonString);
    
    // Convert estimatedHarvestDate to a proper Date object for display
    if (result.estimatedHarvestDate) {
      result.formattedHarvestDate = new Date(result.estimatedHarvestDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    
    return result;
  } catch (error) {
    console.error("Error with Gemini API:", error);
    // Fallback to default response if API fails
    const defaultDaysToHarvest = getDefaultDaysToHarvest(cropName);
    const estimatedDate = new Date(plantedDate);
    estimatedDate.setDate(estimatedDate.getDate() + defaultDaysToHarvest);
    
    return {
      estimatedHarvestDate: estimatedDate.toISOString().split('T')[0],
      formattedHarvestDate: estimatedDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      daysToHarvest: defaultDaysToHarvest,
      growthStage: "Growing",
      daysInCurrentStage: 0,
      careTips: [
        "Ensure regular watering",
        "Monitor for pests and diseases",
        "Apply appropriate fertilizers"
      ],
      potentialIssues: [
        "Weather fluctuations",
        "Pest infestations"
      ],
      weatherConsiderations: "Continue monitoring weather conditions for optimal growth"
    };
  }
};

/**
 * Get default days to harvest based on crop type
 * @param cropName Name of the crop
 * @returns Estimated days to harvest
 */
const getDefaultDaysToHarvest = (cropName: string): number => {
  const crop = cropName.toLowerCase();
  
  if (crop.includes("rice")) return 120;
  if (crop.includes("corn")) return 100;
  if (crop.includes("tomato")) return 70;
  if (crop.includes("eggplant")) return 75;
  if (crop.includes("pechay")) return 45;
  if (crop.includes("mustard")) return 40;
  if (crop.includes("kangkong")) return 30;
  if (crop.includes("squash")) return 60;
  if (crop.includes("melon")) return 80;
  if (crop.includes("watermelon")) return 90;
  if (crop.includes("cucumber")) return 60;
  if (crop.includes("okra")) return 60;
  if (crop.includes("sitaw")) return 60;
  if (crop.includes("patani")) return 60;
  if (crop.includes("ampalaya")) return 70;
  if (crop.includes("labanos")) return 30;
  if (crop.includes("talong")) return 70;
  if (crop.includes("sili")) return 65;
  
  // Default fallback
  return 90;
};