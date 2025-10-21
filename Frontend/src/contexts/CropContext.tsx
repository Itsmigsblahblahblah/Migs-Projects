import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { collection, addDoc, updateDoc, doc, query, where, getDocs, Timestamp, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/firebaseConfig";

interface ChecklistItem {
    id: string;
    title: string;
    completed: boolean;
    category: string;
}

interface Crop {
    id: string;
    userId: string;
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
    checklist?: ChecklistItem[]; // Add checklist field
}

interface CropContextType {
    crops: Crop[];
    addCrop: (crop: Omit<Crop, 'id' | 'plantedDate' | 'createdAt' | 'userId'>) => Promise<void>;
    updateCrop: (id: string, cropData: Partial<Omit<Crop, 'id' | 'plantedDate' | 'createdAt' | 'userId'>>) => Promise<void>;
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
            const effectiveUserId = userId || currentUserId || localStorage.getItem('userId') || localStorage.getItem('username');

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
                    quantity: data.quantity,
                    soilType: data.soilType,
                    nitrogen: data.nitrogen || 0,
                    phosphorus: data.phosphorus || 0,
                    potassium: data.potassium || 0,
                    puhunan: data.puhunan,
                    plantedDate: data.plantedDate,
                    createdAt: data.createdAt,
                    checklist: data.checklist || [] // Load checklist data
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

    const addCrop = async (cropData: Omit<Crop, 'id' | 'plantedDate' | 'createdAt' | 'userId'>) => {
        try {
            const userId = currentUserId || localStorage.getItem('userId') || localStorage.getItem('username');
            if (!userId) {
                throw new Error("No userId found. Please log in again.");
            }

            const newCropData = {
                ...cropData,
                userId: userId, // Ensure userId is set for Firestore security rules
                plantedDate: Timestamp.now(),
                createdAt: Timestamp.now()
            };

            // Add to Firestore
            const docRef = await addDoc(collection(db, "farmerCrops"), newCropData);

            // Add to local state
            const newCrop: Crop = {
                id: docRef.id,
                ...newCropData
            };

            setCrops(prev => [newCrop, ...prev]);
        } catch (error) {
            console.error("Error adding crop to Firestore:", error);
            throw error;
        }
    };

    const updateCrop = async (id: string, cropData: Partial<Omit<Crop, 'id' | 'plantedDate' | 'createdAt' | 'userId'>>) => {
        try {
            // Update in Firestore
            const cropRef = doc(db, "farmerCrops", id);
            await updateDoc(cropRef, cropData);

            // Update in local state
            setCrops(prev =>
                prev.map(crop =>
                    crop.id === id
                        ? { ...crop, ...cropData }
                        : crop
                )
            );
        } catch (error) {
            console.error("Error updating crop in Firestore:", error);
            throw error;
        }
    };

    const getCropById = (id: string) => {
        return crops.find(crop => crop.id === id);
    };

    return (
        <CropContext.Provider value={{ crops, addCrop, updateCrop, getCropById, loadCrops }}>
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