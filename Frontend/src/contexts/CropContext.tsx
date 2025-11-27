import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { collection, addDoc, updateDoc, doc, query, where, getDocs, Timestamp, orderBy, setDoc, deleteDoc } from "firebase/firestore"; // Added deleteDoc import
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/firebaseConfig";
import { generateFarmerCropId } from "@/lib/idUtils";

interface ChecklistItem {
    id: string;
    title: string;
    completed: boolean;
    category: string;
    completedAt?: string; // Add timestamp for completion
    detailedInstructions?: string[]; // Add detailed instructions property
}

interface Crop {
    id: string;
    userId: string;
    name: string;
    landArea: number;
    soilType: string;
    plantedDate: any;
    puhunan: number;
    createdAt: any;
    checklist?: ChecklistItem[]; // Add checklist field
    harvestData?: any; // Add harvest data field
    marketData?: any; // Add market data field
}

interface CropContextType {
    crops: Crop[];
    addCrop: (crop: Omit<Crop, 'id' | 'plantedDate' | 'createdAt' | 'userId'> & { checklist?: ChecklistItem[] }) => Promise<string>;
    updateCrop: (id: string, cropData: Partial<Omit<Crop, 'id' | 'plantedDate' | 'createdAt' | 'userId'>>) => Promise<void>;
    deleteCrop: (id: string) => Promise<void>; // Add delete function
    getCropById: (id: string) => Crop | undefined;
    loadCrops: () => Promise<void>;
}

const CropContext = createContext<CropContextType | undefined>(undefined);

export const CropProvider = ({ children }: { children: ReactNode }) => {
    const [crops, setCrops] = useState<Crop[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                const userId = user.uid;
                setCurrentUserId(userId);
                // Load crops when user changes
                loadCrops(userId);
            } else {
                setCurrentUserId(null);
                setCrops([]);
            }
        });

        return () => unsubscribe();
    }, []);

    // Load crops when currentUserId changes
    useEffect(() => {
        if (currentUserId) {
            loadCrops(currentUserId);
        } else {
            setCrops([]);
        }
    }, [currentUserId]);

    const loadCrops = async (userId?: string) => {
        try {
            const effectiveUserId = userId || currentUserId || localStorage.getItem('userId') || 'default-user';

            if (!effectiveUserId) {
                console.warn("No userId found");
                setCrops([]);
                return;
            }

            console.log("Loading crops for userId:", effectiveUserId);

            const cropsRef = collection(db, "farmerCrops");
            // Query without orderBy to get ALL data including old records without createdAt
            const q = query(
                cropsRef,
                where("userId", "==", effectiveUserId)
            );

            const querySnapshot = await getDocs(q);
            const loadedCrops: Crop[] = [];

            console.log("Found crops:", querySnapshot.size);

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                console.log("Crop data:", doc.id, data);
                loadedCrops.push({
                    id: doc.id,
                    userId: data.userId,
                    name: data.name,
                    landArea: data.landArea,
                    soilType: data.soilType,
                    plantedDate: data.plantedDate,
                    puhunan: data.puhunan,
                    createdAt: data.createdAt,
                    checklist: data.checklist || [], // Load checklist data
                    harvestData: data.harvestData || null, // Load harvest data
                    marketData: data.marketData || null,  // Load market data

                });
            });

            // Sort in memory by createdAt (newest first), put items without createdAt at the end
            loadedCrops.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || new Date(0);
                const dateB = b.createdAt?.toDate?.() || new Date(0);
                return dateB.getTime() - dateA.getTime();
            });

            console.log("Loaded crops:", loadedCrops.length);
            setCrops(loadedCrops);
        } catch (error) {
            console.error("Error loading crops from Firestore:", error);
            setCrops([]);
        }
    };

    const addCrop = async (cropData: Omit<Crop, 'id' | 'createdAt' | 'userId'> & { checklist?: ChecklistItem[] }) => {
        try {
            const userId = currentUserId || localStorage.getItem('userId') || 'default-user';
            if (!userId) {
                throw new Error("No userId found. Please log in again.");
            }

            // Get username from localStorage
            const username = localStorage.getItem('username') || userId;

            const newCropData = {
                ...cropData,
                userId: userId,
                plantedDate: cropData.plantedDate, // Use the provided plantedDate instead of Timestamp.now()
                createdAt: Timestamp.now()
            };

            // Remove undefined properties to prevent Firebase errors
            const cleanCropData: any = Object.fromEntries(
                Object.entries(newCropData).filter(([_, value]) => value !== undefined)
            );

            // Add to Firestore with auto-generated ID
            const cropsRef = collection(db, "farmerCrops");
            const docRef = await addDoc(cropsRef, cleanCropData);

            // Add to local state with the auto-generated ID
            const newCrop: Crop = {
                id: docRef.id, // Use the auto-generated ID
                ...cleanCropData
            };

            setCrops(prev => [newCrop, ...prev]);

            // Return the ID of the newly added crop
            return docRef.id;
        } catch (error) {
            console.error("Error adding crop to Firestore:", error);
            throw error;
        }
    };

    const updateCrop = async (id: string, cropData: Partial<Omit<Crop, 'id' | 'plantedDate' | 'createdAt' | 'userId'>>) => {
        try {
            // Remove undefined properties to prevent Firebase errors
            const cleanCropData = Object.fromEntries(
                Object.entries(cropData).filter(([_, value]) => value !== undefined)
            );

            // Update in Firestore
            const cropRef = doc(db, "farmerCrops", id);
            await updateDoc(cropRef, cleanCropData);

            // Update in local state
            setCrops(prev =>
                prev.map(crop =>
                    crop.id === id
                        ? { ...crop, ...cleanCropData }
                        : crop
                )
            );
        } catch (error) {
            console.error("Error updating crop in Firestore:", error);
            throw error;
        }
    };

    const deleteCrop = async (id: string) => {
        try {
            // Delete from Firestore
            const cropRef = doc(db, "farmerCrops", id);
            await deleteDoc(cropRef);

            // Update local state
            setCrops(prev => prev.filter(crop => crop.id !== id));
        } catch (error) {
            console.error("Error deleting crop from Firestore:", error);
            throw error;
        }
    };

    const getCropById = (id: string) => {
        return crops.find(crop => crop.id === id);
    };

    return (
        <CropContext.Provider value={{ crops, addCrop, updateCrop, deleteCrop, getCropById, loadCrops }}>
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