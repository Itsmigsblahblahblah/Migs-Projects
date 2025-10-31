import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { collection, addDoc, Timestamp, doc, setDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { generateFarmerReportId } from "@/lib/idUtils";

// Mock NLP and DSS System
const processReport = (text: string) => {
    const problems = {
        flood: ['baha', 'flood', 'tubig', 'ulan', 'nalubog'],
        pest: ['insekto', 'pest', 'uod', 'peste', 'damage'],
        drought: ['tuyo', 'dry', 'walang tubig', 'drought', 'init'],
        disease: ['sakit', 'disease', 'bulok', 'rot', 'fungus']
    };

    const crops = {
        corn: ['mais', 'corn'],
        rice: ['bigas', 'rice', 'palay'],
        tomato: ['kamatis', 'tomato'],
        cabbage: ['repolyo', 'cabbage'],
        eggplant: ['talong', 'eggplant']
    };

    let detectedProblem = 'general';
    let affectedCrop = 'unknown';

    // Simple NLP simulation
    const lowerText = text.toLowerCase();

    for (const [problem, keywords] of Object.entries(problems)) {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
            detectedProblem = problem;
            break;
        }
    }

    for (const [crop, keywords] of Object.entries(crops)) {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
            affectedCrop = crop;
            break;
        }
    }

    // DSS Logic
    const recommendations = {
        flood: {
            avoid: ['Corn', 'Tomato', 'Eggplant'],
            recommend: ['Kangkong', 'Gabi', 'Rice (flood-tolerant variety)'],
            advice: 'Consider raised bed planting and improved drainage systems. Plant flood-tolerant crops during rainy season.'
        },
        pest: {
            avoid: ['Cabbage', 'Tomato'],
            recommend: ['Corn', 'Root vegetables', 'Herbs'],
            advice: 'Implement integrated pest management. Use organic pesticides and companion planting techniques.'
        },
        drought: {
            avoid: ['Rice', 'Leafy vegetables'],
            recommend: ['Cassava', 'Sweet potato', 'Drought-resistant corn varieties'],
            advice: 'Install drip irrigation systems. Mulch around plants to retain moisture.'
        },
        disease: {
            avoid: ['Tomato', 'Eggplant'],
            recommend: ['Root crops', 'Legumes'],
            advice: 'Ensure proper crop rotation and soil sterilization. Remove infected plants immediately.'
        },
        general: {
            avoid: [],
            recommend: ['Seasonal vegetables', 'Local varieties'],
            advice: 'Consult with local agricultural officer for specific recommendations.'
        }
    };

    return {
        problem: detectedProblem,
        crop: affectedCrop,
        ...recommendations[detectedProblem as keyof typeof recommendations]
    };
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
            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 2000));

            const result = processReport(reportText);
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
            console.error("Error saving report:", error);
            toast({
                title: "Error",
                description: "May problema sa pag-save ng report sa database. Subukan ulit.",
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