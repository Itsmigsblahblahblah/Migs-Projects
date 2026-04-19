/**
 * Service for interacting with Gemini API for crop management insights
 * Now uses backend proxy to prevent API key exposure
 */

import { getNextApiKey } from "./apiKeyRotationService";

// Backend URL from environment variable or default to localhost
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

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
      "growthStage": "Current growth stage (Preparation/Planting/Maintenance/Harvesting/Post-Harvest)",
      "daysInCurrentStage": number,
      "careTips": ["Array of 3-5 specific care tips for current growth stage"],
      "potentialIssues": ["Array of 2-3 potential issues to watch for"],
      "weatherConsiderations": "Any weather-related considerations for this crop at this time"
    }
    
    Ensure your response is valid JSON and nothing else. Be specific and practical for Filipino farmers.
  `;

  try {
    // Build request payload
    const requestPayload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    };

    // Call backend proxy endpoint instead of Gemini API directly
    const response = await fetch(`${BACKEND_URL}/gemini/generate-content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      throw new Error(`Backend Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract JSON from the response
    const textResponse = data.candidates[0].content.parts[0].text;
    // Clean up the response to extract valid JSON
    const jsonStart = textResponse.indexOf('{');
    const jsonEnd = textResponse.lastIndexOf('}') + 1;
    let jsonString = textResponse.substring(jsonStart, jsonEnd);
    
    // Sanitize JSON string to remove bad control characters
    // Remove any control characters except for \n, \r, \t
    jsonString = jsonString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Handle escaped quotes that might break parsing
    jsonString = jsonString.replace(/\\"/g, '"');
    
    // Try to parse the sanitized JSON
    try {
      const result = JSON.parse(jsonString);
      return result;
    } catch (parseError) {
      console.error("JSON parsing failed after sanitization:", parseError);
      console.error("Raw response:", textResponse);
      console.error("Sanitized JSON string:", jsonString);
      
      // Try to extract JSON with more robust cleaning
      const cleanedJsonString = jsonString
        .replace(/\\n/g, '')  // Remove newlines
        .replace(/\\r/g, '')  // Remove carriage returns
        .replace(/\\t/g, '')  // Remove tabs
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();
        
      try {
        const result = JSON.parse(cleanedJsonString);
        return result;
      } catch (secondParseError) {
        console.error("Second JSON parsing attempt failed:", secondParseError);
        throw new Error("Failed to parse Gemini API response as valid JSON");
      }
    }
  } catch (error) {
    console.error("Error with Gemini API via backend proxy:", error);
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
  };
};

/**
 * Get real-time price estimation for a specific crop using Gemini AI
 * @param cropName Name of the crop
 * @param currentPrice Current market price of the crop
 * @param location Farm location (optional)
 * @returns Estimated price trend and insights
 */
export const getCropPriceEstimate = async (
  cropName: string,
  currentPrice: number,
  location?: string
) => {
  const prompt = `
    You are an expert agricultural market analyst specializing in Philippine vegetable markets, particularly in Majayjay, Laguna.
    
    Based on the crop name and current market price provided, estimate the price trend for the next month and provide market insights:
    
    Crop: ${cropName}
    Current Price: ₱${currentPrice.toFixed(2)} per kg
    Location: ${location || 'Majayjay, Laguna'}
    Current Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
    
    Consider these factors in your analysis:
    - Seasonal demand patterns in the Philippines
    - Supply and demand dynamics
    - Weather conditions affecting crop production
    - Local market trends in Majayjay and nearby areas
    - Historical price patterns for this crop
    - Upcoming holidays or events that might affect demand
    
    Please respond in the following JSON format:
    {
      "estimatedPriceNextMonth": number,
      "priceChangePercentage": number,
      "trend": "Increasing/Decreasing/Stable",
      "confidenceLevel": "High/Medium/Low",
      "factors": ["Array of 3-5 key factors affecting the price"],
      "recommendations": ["Array of 2-3 recommendations for farmers"],
      "marketOutlook": "Brief market outlook for the next month"
    }
    
    Ensure your response is valid JSON and nothing else. Be specific and practical for Filipino farmers.
  `;

  try {
    // Build request payload
    const requestPayload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    };

    // Call backend proxy endpoint instead of Gemini API directly
    const response = await fetch(`${BACKEND_URL}/gemini/generate-content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      throw new Error(`Backend Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract JSON from the response
    const textResponse = data.candidates[0].content.parts[0].text;
    // Clean up the response to extract valid JSON
    const jsonStart = textResponse.indexOf('{');
    const jsonEnd = textResponse.lastIndexOf('}') + 1;
    const jsonString = textResponse.substring(jsonStart, jsonEnd);
    
    const result = JSON.parse(jsonString);
    
    return result;
  } catch (error) {
    console.error("Error with Gemini API via backend proxy for price estimation:", error);
    // Fallback to default response if API fails
    const priceChangePercentage = (Math.random() * 10) - 5; // Random change between -5% and +5%
    const estimatedPriceNextMonth = currentPrice * (1 + priceChangePercentage / 100);
    
    return {
      estimatedPriceNextMonth: parseFloat(estimatedPriceNextMonth.toFixed(2)),
      priceChangePercentage: parseFloat(priceChangePercentage.toFixed(2)),
      trend: priceChangePercentage > 0 ? "Increasing" : priceChangePercentage < 0 ? "Decreasing" : "Stable",
      confidenceLevel: "Low",
      factors: [
        "Market fluctuations",
        "Seasonal demand",
        "Supply variations"
      ],
      recommendations: [
        "Monitor market prices regularly",
        "Consider storage options if prices are favorable"
      ],
      marketOutlook: "Market prices may fluctuate based on supply and demand. Monitor local market trends for better selling opportunities."
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

/**
 * Get step-by-step instructions for a specific farming task using Gemini AI
 * @param taskTitle Title of the task
 * @returns Array of step-by-step instructions
 */
export const getStepByStepInstructions = async (
  taskTitle: string
): Promise<string[]> => {
  const prompt = `
    You are an expert agricultural advisor specializing in Philippine farming conditions, particularly in Majayjay, Laguna.
    
    Provide simple, easy-to-understand step-by-step instructions for the following farming task:
    
    Task: ${taskTitle}
    
    Consider these factors in your instructions:
    - Typical conditions and practices in the Philippines
    - Simple language that regular farmers can understand
    - Practical steps that can be implemented easily
    - Local agricultural practices in Majayjay
    - Respond in Tagalog language for better understanding of Filipino farmers
    
    Please respond in the following JSON format:
    {
      "steps": ["Step 1 description", "Step 2 description", "Step 3 description", ...]
    }
    
    Provide 5-7 clear steps. Ensure your response is valid JSON and nothing else. Make the instructions practical and easy to follow for Filipino farmers.
  `;

  try {
    // Build request payload
    const requestPayload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    };

    // Call backend proxy endpoint instead of Gemini API directly
    const response = await fetch(`${BACKEND_URL}/gemini/generate-content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      throw new Error(`Backend Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract JSON from the response
    const textResponse = data.candidates[0].content.parts[0].text;
    // Clean up the response to extract valid JSON
    const jsonStart = textResponse.indexOf('{');
    const jsonEnd = textResponse.lastIndexOf('}') + 1;
    let jsonString = textResponse.substring(jsonStart, jsonEnd);
    
    // Sanitize JSON string to remove bad control characters
    // Remove any control characters except for \n, \r, \t
    jsonString = jsonString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Handle escaped quotes that might break parsing
    jsonString = jsonString.replace(/\\"/g, '"');
    
    // Try to parse the sanitized JSON
    try {
      const result = JSON.parse(jsonString);
      return result.steps || [];
    } catch (parseError) {
      console.error("JSON parsing failed after sanitization:", parseError);
      console.error("Raw response:", textResponse);
      console.error("Sanitized JSON string:", jsonString);
      
      // Try to extract JSON with more robust cleaning
      const cleanedJsonString = jsonString
        .replace(/\\n/g, '')  // Remove newlines
        .replace(/\\r/g, '')  // Remove carriage returns
        .replace(/\\t/g, '')  // Remove tabs
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();
        
      try {
        const result = JSON.parse(cleanedJsonString);
        return result.steps || [];
      } catch (secondParseError) {
        console.error("Second JSON parsing attempt failed:", secondParseError);
        throw new Error("Failed to parse Gemini API response as valid JSON");
      }
    }
  } catch (error) {
    console.error("Error with Gemini API via backend proxy for step-by-step instructions:", error);
    // Fallback to default steps if API fails
    return [
      "Maghanda ng mga kailangang gamit at materyales para sa gawaing ito",
      "Sundin ang mga lokal na pamamaraan sa pagpapatupad ng gawaing ito",
      "Regular na bantayan ang progreso at gumawa ng mga pag-aayos kung kinakailangan",
      "Tapusin ang gawain ayon sa mga karaniwang pamamaraan sa pagsasaka",
      "I-record ang mga detalye ng pagkumpleto para sa hinaharap na sanggunian"
    ];
  }
};
