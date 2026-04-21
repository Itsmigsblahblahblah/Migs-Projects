import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { collection, addDoc, updateDoc, doc, query, where, getDocs, Timestamp, orderBy, setDoc, deleteDoc } from "firebase/firestore"; // Added deleteDoc import
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/firebaseConfig";
import { generateFarmerCropId } from "@/lib/idUtils";
import { clearInsightsCache } from "@/services/farmLedgerService";
import { clearAllCropCaches } from "@/services/cropDataService";

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
    const [authReady, setAuthReady] = useState(false);

    console.log('[CropContext] Provider initialized, crops:', crops.length, 'userId:', currentUserId);

    // Listen for auth state changes - wait for auth to be ready
    useEffect(() => {
        // Wait a bit for Firebase to initialize
        const initAuth = async () => {
            try {
                // Use getAuthWhenReady to ensure Firebase is initialized
                const { getAuthWhenReady } = await import("@/firebaseConfig");
                let auth;
                try {
                    auth = await getAuthWhenReady();
                } catch (authError) {
                    console.warn('[CropContext] Auth initialization failed, retrying...', authError);
                    // Retry after a delay
                    setTimeout(() => initAuth(), 1000);
                    return;
                }
                
                if (!auth) {
                    console.warn('[CropContext] Auth is null after initialization');
                    setTimeout(() => initAuth(), 1000);
                    return;
                }
                
                setAuthReady(true);
                const { onAuthStateChanged } = await import("firebase/auth");
                
                const unsubscribe = onAuthStateChanged(auth, (user) => {
                    console.log('[CropContext] Auth state changed, user:', user ? user.uid : 'null');
                    console.log('[CropContext] User email:', user?.email);
                    console.log('[CropContext] User displayName:', user?.displayName);
                    
                    if (user) {
                        const userId = user.uid;
                        setCurrentUserId(userId);
                        console.log('[CropContext] Setting userId and loading crops...');
                        // Load crops immediately when user is detected
                        loadCrops(userId);
                    } else {
                        console.warn('[CropContext] No user detected, clearing crops');
                        setCurrentUserId(null);
                        setCrops([]);
                    }
                });

                return () => unsubscribe();
            } catch (error) {
                console.error('[CropContext] Error initializing auth:', error);
                // Retry after a delay
                setTimeout(() => initAuth(), 1000);
            }
        };
        
        initAuth();
    }, []);

    // REMOVED: Duplicate loading effect - crops are now loaded in onAuthStateChanged only
    // This prevents double-loading which slows down initial page load

    const loadCrops = async (userId?: string) => {
        try {
            // Use getDbWhenReady to ensure Firebase is initialized
            const { getDbWhenReady } = await import("@/firebaseConfig");
            let db;
            try {
                db = await getDbWhenReady();
            } catch (dbError) {
                console.error('[CropContext] Database initialization failed:', dbError);
                return;
            }

            if (!db) {
                console.warn('[CropContext] Database is null after initialization');
                return;
            }

            const effectiveUserId = userId || currentUserId || localStorage.getItem('userId') || 'default-user';

            if (!effectiveUserId) {
                console.warn("No userId found");
                setCrops([]);
                return;
            }

            console.log("[CropContext] Loading crops for userId:", effectiveUserId);
            console.log("[CropContext] Using db instance:", !!db);

            const cropsRef = collection(db, "farmerCrops");
            console.log("[CropContext] Created collection reference for farmerCrops");
            // Query without orderBy to get ALL data including old records without createdAt
            const q = query(
                cropsRef,
                where("userId", "==", effectiveUserId)
            );

            // OPTIMIZATION: Check localStorage cache first for instant loading
            const cacheKey = `crops_${effectiveUserId}`;
            const cachedCrops = localStorage.getItem(cacheKey);
            let cacheLoaded = false;
            
            if (cachedCrops) {
                try {
                    const parsedCrops = JSON.parse(cachedCrops);
                    // Only use cache if it's less than 5 minutes old
                    const cacheAge = Date.now() - (parsedCrops._timestamp || 0);
                    if (cacheAge < 5 * 60 * 1000) {
                        console.log('[CropContext] Using cached crops (instant load)');
                        setCrops(parsedCrops.crops || []);
                        cacheLoaded = true;
                    }
                } catch (e) {
                    // Ignore cache parse errors
                }
            }

            // If cache was loaded, fetch fresh data in BACKGROUND (non-blocking)
            // Don't await - let it run in background
            if (cacheLoaded) {
                // Use setTimeout to ensure it runs after the current render cycle
                setTimeout(async () => {
                    try {
                        console.log('[CropContext] Fetching fresh data in background...');
                        const querySnapshot = await getDocs(q);
                        console.log('[CropContext] Fresh data fetched, docs:', querySnapshot.size);
                        
                        const loadedCrops: Crop[] = [];
                        querySnapshot.forEach((doc) => {
                            const data = doc.data();
                            loadedCrops.push({
                                id: doc.id,
                                userId: data.userId,
                                name: data.name,
                                landArea: data.landArea,
                                soilType: data.soilType,
                                plantedDate: data.plantedDate,
                                puhunan: data.puhunan,
                                createdAt: data.createdAt,
                                checklist: data.checklist || [],
                                harvestData: data.harvestData || null,
                                marketData: data.marketData || null,
                            });
                        });

                        // Sort in memory
                        loadedCrops.sort((a, b) => {
                            const dateA = a.createdAt?.toDate?.() || new Date(0);
                            const dateB = b.createdAt?.toDate?.() || new Date(0);
                            return dateB.getTime() - dateA.getTime();
                        });

                        // Update state with fresh data
                        setCrops(loadedCrops);
                        
                        // Update cache
                        const cacheData = {
                            crops: loadedCrops,
                            _timestamp: Date.now()
                        };
                        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
                    } catch (error) {
                        console.error('[CropContext] Background fetch error:', error);
                    }
                }, 0);
                
                // Return early so cache shows immediately
                return;
            }

            const querySnapshot = await getDocs(q);
            console.log("[CropContext] Query executed, found docs:", querySnapshot.size);
            const loadedCrops: Crop[] = [];

            if (querySnapshot.empty) {
                console.log("[CropContext] No crops found for this user");
                console.log("[CropContext] UserId used for query:", effectiveUserId);
            }

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

            console.log("[CropContext] Processed crops:", loadedCrops.length);
            console.log("[CropContext] Setting crops to state...");
            setCrops(loadedCrops);
            console.log("[CropContext] Crops set successfully!");

            // OPTIMIZATION: Cache to localStorage for faster subsequent loads
            try {
                const cacheData = {
                    crops: loadedCrops,
                    _timestamp: Date.now()
                };
                localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            } catch (e) {
                // Ignore cache storage errors (e.g., quota exceeded)
            }
        } catch (error) {
            console.error("Error loading crops from Firestore:", error);
            setCrops([]);
        }
    };

    const addCrop = async (cropData: Omit<Crop, 'id' | 'createdAt' | 'userId'> & { checklist?: ChecklistItem[] }) => {
        try {
            const { getDbWhenReady } = await import("@/firebaseConfig");
            const db = await getDbWhenReady();

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

            // OPTIMIZATION: Invalidate caches when crops change
            const cacheKey = `crops_${userId}`;
            localStorage.removeItem(cacheKey);
            
            // Clear insights cache for new crop type
            console.log('[CropContext] Clearing insights cache for new crop');
            clearInsightsCache();
            clearAllCropCaches();

            // Return the ID of the newly added crop
            return docRef.id;
        } catch (error) {
            console.error("Error adding crop to Firestore:", error);
            throw error;
        }
    };

    const updateCrop = async (id: string, cropData: Partial<Omit<Crop, 'id' | 'plantedDate' | 'createdAt' | 'userId'>>) => {
        try {
            const { getDbWhenReady } = await import("@/firebaseConfig");
            const db = await getDbWhenReady();

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

            // OPTIMIZATION: Invalidate caches when crops change
            const userId = currentUserId || localStorage.getItem('userId');
            if (userId) {
                const cacheKey = `crops_${userId}`;
                localStorage.removeItem(cacheKey);
            }
            
            // CRITICAL: Clear insights cache when puhunan/capital changes
            // This ensures ledger recalculates with new investment values
            if (cropData.puhunan !== undefined || cropData.landArea !== undefined || cropData.soilType !== undefined || cropData.name !== undefined) {
                console.log('[CropContext] Clearing insights cache due to crop data change');
                clearInsightsCache();
                clearAllCropCaches();
            }
        } catch (error) {
            console.error("Error updating crop in Firestore:", error);
            throw error;
        }
    };

    const deleteCrop = async (id: string) => {
        try {
            const { getDbWhenReady } = await import("@/firebaseConfig");
            const db = await getDbWhenReady();

            // Delete from Firestore
            const cropRef = doc(db, "farmerCrops", id);
            await deleteDoc(cropRef);

            // Update local state
            setCrops(prev => prev.filter(crop => crop.id !== id));

            // OPTIMIZATION: Invalidate caches when crops change
            const userId = currentUserId || localStorage.getItem('userId');
            if (userId) {
                const cacheKey = `crops_${userId}`;
                localStorage.removeItem(cacheKey);
            }
            
            // Clear insights cache when crop is deleted
            console.log('[CropContext] Clearing insights cache due to crop deletion');
            clearInsightsCache();
            clearAllCropCaches();
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