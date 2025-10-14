import { createContext, useContext, useState, ReactNode } from "react";
import { Timestamp } from "firebase/firestore";

interface Crop {
    id: string;
    name: string;
    landArea: string;
    quantity: number;
    soilType: string;
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    puhunan: number;
    plantedDate: any;
    createdAt: any;
}

interface CropContextType {
    crops: Crop[];
    addCrop: (crop: Omit<Crop, 'id' | 'plantedDate' | 'createdAt'>) => void;
    getCropById: (id: string) => Crop | undefined;
}

const CropContext = createContext<CropContextType | undefined>(undefined);

export const CropProvider = ({ children }: { children: ReactNode }) => {
    const [crops, setCrops] = useState<Crop[]>([
        // Test crop data for demonstration
        {
            id: "test-crop-1",
            name: "Rice",
            landArea: "2 hectares",
            quantity: 1500,
            soilType: "Clay Loam",
            nitrogen: 45,
            phosphorus: 30,
            potassium: 25,
            puhunan: 8000,
            plantedDate: { toDate: () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            createdAt: { toDate: () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
    ]);

    const addCrop = (cropData: Omit<Crop, 'id' | 'plantedDate' | 'createdAt'>) => {
        const newCrop: Crop = {
            id: Math.random().toString(36).substr(2, 9), // Generate a random ID
            ...cropData,
            plantedDate: Timestamp.now(),
            createdAt: Timestamp.now()
        };

        setCrops(prev => [...prev, newCrop]);
    };

    const getCropById = (id: string) => {
        return crops.find(crop => crop.id === id);
    };

    return (
        <CropContext.Provider value={{ crops, addCrop, getCropById }}>
            {children}
        </CropContext.Provider>
    );
};

export const useCrops = () => {
    const context = useContext(CropContext);
    if (context === undefined) {
        throw new Error("useCrops must be used within a CropProvider");
    }
    return context;
};