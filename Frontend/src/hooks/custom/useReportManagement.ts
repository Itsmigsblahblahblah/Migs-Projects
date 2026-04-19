import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/firebaseConfig";

// Backend URL from environment variable or default to localhost
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// Gemini API integration via backend proxy
const getGeminiRecommendation = async (reportText: string) => {
  // Detect language (simple approach)
  const isTagalog = /[áàâéèêíìîóòôúùûñÁÀÂÉÈÊÍÌÎÓÒÔÚÙÛÑ]/.test(reportText) || 
                    reportText.toLowerCase().includes('ng ') || 
                    reportText.toLowerCase().includes('ang ') ||
                    reportText.toLowerCase().includes('sa ') ||
                    reportText.toLowerCase().includes('na ');
  
  const language = isTagalog ? 'Tagalog' : 'English';
  
  const prompt = `
    You are an expert agricultural advisor helping farmers in the Philippines, specifically in Majayjay.
    
    Analyze the following farming problem report and provide crop recommendations and solutions:
    
    Report: "${reportText}"
    
    The report is in ${language}. Please respond in the same language.
    
    IMPORTANT INSTRUCTIONS:
    1. If the report is vague, unclear, or just a few words like "try nga", provide EMPTY arrays for "recommend" and "avoid"
    2. Only provide specific crop recommendations when the farmer describes a clear problem or situation
    3. If the report doesn't contain enough information to make meaningful recommendations, keep "recommend" and "avoid" as empty arrays
    4. Focus your advice on the specific issue mentioned in the report
    5. FOR THE "problem" FIELD, YOU MUST USE ONLY ONE OF THESE FIVE CATEGORIES: "general", "flood", "pest", "disease", or "drought"
    6. DO NOT CREATE NEW PROBLEM CATEGORIES LIKE "Seedling failure" or "Unclear report"
    7. If the problem doesn't fit exactly into one of these categories, use "general"
    
    Please respond in the following JSON format:
    {
      "problem": "identified problem category (MUST BE ONE OF: flood, pest, drought, disease, or general)",
      "crop": "affected crop if mentioned (or 'unknown' if not specified)",
      "recommend": ["recommended crops or solutions as an array of strings - KEEP EMPTY if report is too vague"],
      "avoid": ["crops to avoid as an array of strings - KEEP EMPTY if report is too vague"],
      "advice": "detailed expert advice as a single string"
    }
    
    Ensure your response is valid JSON and nothing else. Keep your response focused on practical farming advice.
    If the report is too vague or generic, provide general farming advice but keep the recommendation arrays EMPTY.
    STRICTLY FOLLOW THE PROBLEM CATEGORIZATION RULES ABOVE.
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
      return JSON.parse(jsonString);
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
        return JSON.parse(cleanedJsonString);
      } catch (secondParseError) {
        console.error("Second JSON parsing attempt failed:", secondParseError);
        throw new Error("Failed to parse Gemini API response as valid JSON");
      }
    }
  } catch (error) {
    console.error("Error with Gemini API via backend proxy:", error);
    // Fallback to default response if API fails
    return {
      problem: "general",
      crop: "unknown",
      recommend: [], // Empty array instead of generic recommendation
      avoid: [], // Empty array
      advice: "Please provide more specific details about your farming situation or problem. For example, mention specific crops, issues you're facing, or conditions in your farm."
    };
  }
};

export const useReportManagement = (userId: string, username: string, setMonthlyReports: (count: number) => void, monthlyReports: number) => {
    const [reportText, setReportText] = useState("");
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [recommendation, setRecommendation] = useState<any>(null);
    const { toast } = useToast();

    const handleSubmitReport = async () => {
        if (!reportText.trim()) {
            toast({
                title: "Walang input",
                description: "Pakitype ang inyong problema sa sakahan.",
                variant: "destructive",
            });
            return;
        }

        setIsProcessing(true);

        try {
            // Get recommendation from Gemini API
            const result = await getGeminiRecommendation(reportText);
            setRecommendation(result);

            // Save to Firestore
            const reportData = {
                userId: userId,
                username: username,
                reportText: reportText,
                problem: result.problem,
                affectedCrop: result.crop,
                recommendedCrops: result.recommend,
                cropsToAvoid: result.avoid,
                advice: result.advice,
                hasImage: selectedImage !== null,
                imageName: selectedImage?.name || null,
                createdAt: Timestamp.now(),
                status: 'processed'
            };

            // Add to Firestore with auto-generated ID
            const reportsRef = collection(db, "farmReports");
            const docRef = await addDoc(reportsRef, reportData);

            toast({
                title: "Recommendation Ready",
                description: "Nakuha na namin ang inyong crop recommendation at nai-save na sa database!",
            });

            // Update monthly count
            setMonthlyReports(monthlyReports + 1);

            // Clear form
            setReportText("");
            setSelectedImage(null);

        } catch (error: any) {
            console.error("Error getting recommendation:", error);
            
            // Check if it's a JSON parsing error
            if (error.message && error.message.includes("JSON")) {
                toast({
                    title: "Format Error",
                    description: "The AI response had formatting issues. We've provided a default recommendation instead.",
                    variant: "destructive",
                });
                
                // Provide a fallback recommendation
                const fallbackRecommendation = {
                    problem: "general",
                    crop: "unknown",
                    recommend: [], // Empty array instead of generic recommendation
                    avoid: [], // Empty array
                    advice: "Please provide more specific details about your farming situation or problem. For example, mention specific crops, issues you're facing, or conditions in your farm."
                };
                
                setRecommendation(fallbackRecommendation);
                
                // Still save to Firestore with fallback data
                const reportData = {
                    userId: userId,
                    username: username,
                    reportText: reportText,
                    problem: fallbackRecommendation.problem,
                    affectedCrop: fallbackRecommendation.crop,
                    recommendedCrops: fallbackRecommendation.recommend,
                    cropsToAvoid: fallbackRecommendation.avoid,
                    advice: fallbackRecommendation.advice,
                    hasImage: selectedImage !== null,
                    imageName: selectedImage?.name || null,
                    createdAt: Timestamp.now(),
                    status: 'processed'
                };

                const reportsRef = collection(db, "farmReports");
                await addDoc(reportsRef, reportData);

                toast({
                    title: "Fallback Recommendation Saved",
                    description: "We saved a default recommendation while we work on fixing the AI service.",
                });

                // Update monthly count
                setMonthlyReports(monthlyReports + 1);

                // Clear form
                setReportText("");
                setSelectedImage(null);
            } else {
                toast({
                    title: "Error",
                    description: "May problema sa pagkuha ng recommendation. Subukan ulit.",
                    variant: "destructive",
                });
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            toast({
                title: "Image uploaded",
                description: "Larawan ay nai-upload na para sa analysis.",
            });
        }
    };

    return {
        reportText,
        selectedImage,
        isProcessing,
        recommendation,
        setReportText,
        setSelectedImage,
        setIsProcessing,
        setRecommendation,
        handleSubmitReport,
        handleImageUpload
    };
};