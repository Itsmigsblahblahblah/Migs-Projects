import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/firebaseConfig";

// Gemini API integration
const getGeminiRecommendation = async (reportText: string) => {
  // Use the API key from environment variables
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  
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
    
    Please respond in the following JSON format:
    {
      "problem": "identified problem category (flood, pest, drought, disease, or general)",
      "crop": "affected crop if mentioned (or 'unknown' if not specified)",
      "recommend": ["recommended crops or solutions as an array of strings"],
      "avoid": ["crops to avoid as an array of strings"],
      "advice": "detailed expert advice as a single string"
    }
    
    Ensure your response is valid JSON and nothing else. Keep your response focused on practical farming advice.
  `;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": API_KEY,
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
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error with Gemini API:", error);
    // Fallback to default response if API fails
    return {
      problem: "general",
      crop: "unknown",
      recommend: ["Consult with local agricultural officer for specific recommendations"],
      avoid: [],
      advice: "We're experiencing technical difficulties. Please try again later or consult with a local agricultural expert."
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

        } catch (error) {
            console.error("Error getting recommendation:", error);
            toast({
                title: "Error",
                description: "May problema sa pagkuha ng recommendation. Subukan ulit.",
                variant: "destructive",
            });
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