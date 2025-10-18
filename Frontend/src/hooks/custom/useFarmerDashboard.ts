import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useCrops } from "@/contexts/CropContext";
import { collection, addDoc, Timestamp, query, where, getDocs, doc, getDoc, updateDoc, writeBatch } from "firebase/firestore";
import { db, auth } from "@/firebaseConfig";
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

export const useFarmerDashboard = () => {
    const [username, setUsername] = useState("");
    const [userId, setUserId] = useState("");
    const [monthlyReports, setMonthlyReports] = useState(0);
    const [deletionRequest, setDeletionRequest] = useState<any>(null);
    const [farmerProfile, setFarmerProfile] = useState({
        fullName: "",
        email: "",
        contactNumber: "",
        homeAddress: "",
        farmAddress: "",
        farmArea: "",
        photoURL: ""
    });
    const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
    const { addCrop, crops, updateCrop } = useCrops();
    const { toast } = useToast();
    const navigate = useNavigate();

    // Initialize user data
    useEffect(() => {
        const role = localStorage.getItem('userRole');
        const user = localStorage.getItem('username');
        const uid = localStorage.getItem('userId') || user || 'default-user';

        if (role !== 'farmer') {
            navigate('/');
            return;
        }

        setUsername(user || 'Farmer');
        setUserId(uid);

        // Load monthly report count
        loadMonthlyReportCount(uid);

        // Load farmer profile
        loadFarmerProfile(uid);

        // Check for deletion requests
        checkDeletionRequest(uid);
    }, [navigate]);

    const loadFarmerProfile = async (uid: string) => {
        try {
            const farmerDoc = await getDoc(doc(db, "farmers", uid));
            if (farmerDoc.exists()) {
                const data = farmerDoc.data();
                setFarmerProfile({
                    fullName: data.fullName || "",
                    email: data.email || "",
                    contactNumber: data.contactNumber || "",
                    homeAddress: data.homeAddress || "",
                    farmAddress: data.farmAddress || "",
                    farmArea: data.farmArea || "2.5 hectares",
                    photoURL: data.photoURL || ""
                });
            }
        } catch (error) {
            console.error("Error loading farmer profile:", error);
        }
    };

    const loadMonthlyReportCount = async (uid: string) => {
        try {
            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            const reportsRef = collection(db, "farmReports");
            const q = query(
                reportsRef,
                where("userId", "==", uid),
                where("createdAt", ">=", Timestamp.fromDate(firstDayOfMonth))
            );

            const querySnapshot = await getDocs(q);
            setMonthlyReports(querySnapshot.size);
        } catch (error) {
            console.error("Error loading monthly report count:", error);
        }
    };

    const checkDeletionRequest = async (uid: string) => {
        try {
            const requestsRef = collection(db, "deletionRequests");
            const q = query(requestsRef, where("userId", "==", uid));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // Sort by requestedAt in memory to get the most recent one
                const sortedDocs = querySnapshot.docs.sort((a, b) => {
                    const dateA = a.data().requestedAt?.toDate?.() || new Date(0);
                    const dateB = b.data().requestedAt?.toDate?.() || new Date(0);
                    return dateB.getTime() - dateA.getTime(); // Most recent first
                });

                const requestDoc = sortedDocs[0]; // Get the most recent one
                setDeletionRequest({ id: requestDoc.id, ...requestDoc.data() });

                // Log if there are multiple requests (for debugging)
                if (sortedDocs.length > 1) {
                    console.warn(`[Farmer] Found ${sortedDocs.length} deletion requests for user ${uid}. Using the most recent one.`);
                    console.log("[Farmer] All requests:", sortedDocs.map(d => ({ id: d.id, status: d.data().status, requestedAt: d.data().requestedAt?.toDate?.() })));
                }
            } else {
                setDeletionRequest(null);
            }
        } catch (error) {
            console.error("Error checking deletion request:", error);
        }
    };

    const handleProfileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFarmerProfile(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProfileImageFile(file);
            // Create preview URL
            const reader = new FileReader();
            reader.onloadend = () => {
                setFarmerProfile(prev => ({
                    ...prev,
                    photoURL: reader.result as string
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpdateProfile = async () => {
        try {
            const updates: any = {
                fullName: farmerProfile.fullName,
                contactNumber: farmerProfile.contactNumber,
                homeAddress: farmerProfile.homeAddress,
                farmAddress: farmerProfile.farmAddress,
                farmArea: farmerProfile.farmArea
            };

            // If there's a new profile image, save it (for now just save the data URL)
            // In production, you'd upload to Firebase Storage
            if (profileImageFile) {
                updates.photoURL = farmerProfile.photoURL;
            }

            await updateDoc(doc(db, "farmers", userId), updates);

            // Update username in localStorage if name changed
            if (farmerProfile.fullName !== username) {
                localStorage.setItem('username', farmerProfile.fullName);
                setUsername(farmerProfile.fullName);
            }

            toast({
                title: "Profile Updated",
                description: "Your profile has been updated successfully.",
            });

        } catch (error) {
            console.error("Error updating profile:", error);
            toast({
                title: "Error",
                description: "Failed to update profile. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleRequestAccountDeletion = async () => {
        try {
            // Check if there's already a pending or approved request
            if (deletionRequest) {
                if (deletionRequest.status === 'denied') {
                    // User is re-requesting after denial - delete ALL old requests
                    console.log("[Farmer] Deleting old denied request before creating new one...");
                    try {
                        // Query ALL requests for this user to ensure cleanup
                        const requestsRef = collection(db, "deletionRequests");
                        const q = query(requestsRef, where("userId", "==", userId));
                        const querySnapshot = await getDocs(q);

                        console.log(`[Farmer] Found ${querySnapshot.size} old request(s) to delete`);

                        // Delete all old requests using batch
                        const batch = writeBatch(db);
                        querySnapshot.forEach((doc) => {
                            console.log(`[Farmer] Deleting old request: ${doc.id}`);
                            batch.delete(doc.ref);
                        });
                        await batch.commit();

                        console.log("[Farmer] All old requests deleted successfully");
                        setDeletionRequest(null);
                    } catch (error) {
                        console.error("Error deleting old requests:", error);
                        throw new Error("Failed to clean up old requests. Please try again.");
                    }
                } else {
                    toast({
                        title: "Request Already Exists",
                        description: deletionRequest.status === 'approved'
                            ? "Your deletion request has been approved. You can now delete your account."
                            : "You already have a pending deletion request. Please wait for admin approval.",
                        variant: "default",
                    });
                    return;
                }
            }

            // Validate required data
            if (!userId || !username) {
                throw new Error("User information is missing. Please log out and log in again.");
            }

            // Get current user email from auth
            const currentUser = auth.currentUser;
            if (!currentUser || !currentUser.email) {
                throw new Error("Could not retrieve user email. Please log out and log in again.");
            }

            // Create a new deletion request
            const requestData = {
                userId: userId,
                username: username,
                email: currentUser.email,
                fullName: farmerProfile.fullName || username,
                status: 'pending' as const,
                requestedAt: Timestamp.now(),
            };

            console.log("Creating deletion request:", requestData);

            const docRef = await addDoc(collection(db, "deletionRequests"), requestData);
            console.log("Deletion request created with ID:", docRef.id);

            // Reload deletion request
            await checkDeletionRequest(userId);

            toast({
                title: "Request Submitted",
                description: "Your account deletion request has been submitted. Please wait for admin approval.",
            });

        } catch (error: any) {
            console.error("Error requesting account deletion:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to submit deletion request. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleDeleteAccount = async (deleteConfirmPassword: string) => {
        // Check if deletion request is approved
        if (!deletionRequest || deletionRequest.status !== 'approved') {
            toast({
                title: "Deletion Not Approved",
                description: "You need admin approval before deleting your account. Please request account deletion first.",
                variant: "destructive",
            });
            return;
        }

        // Check if user signed in with Google (no password)
        const user = auth.currentUser;
        if (!user) {
            toast({
                title: "Authentication Error",
                description: "No authenticated user found. Please log out and log in again.",
                variant: "destructive",
            });
            return;
        }

        // Check if user signed in with Google (provider ID check)
        const isGoogleUser = user.providerData.some(provider => provider.providerId === 'google.com');

        // For Google users, we don't require password, but we do require confirmation text
        if (isGoogleUser && deleteConfirmPassword !== 'DELETE') {
            toast({
                title: "Confirmation Required",
                description: "For Google accounts, type DELETE in the confirmation field to proceed.",
                variant: "destructive",
            });
            return;
        }

        // For email/password users, require password
        if (!isGoogleUser && !deleteConfirmPassword.trim()) {
            toast({
                title: "Password Required",
                description: "Please enter your password to confirm account deletion.",
                variant: "destructive",
            });
            return;
        }

        try {
            // Re-authenticate user before deletion (required by Firebase)
            // Only for email/password users
            if (!isGoogleUser) {
                if (!user.email) {
                    throw new Error("No email found for user");
                }
                const credential = EmailAuthProvider.credential(user.email, deleteConfirmPassword);
                await reauthenticateWithCredential(user, credential);
            }

            // Delete all user data from Firestore using batch
            const batch = writeBatch(db);

            // Delete farmer document
            batch.delete(doc(db, "farmers", userId));

            // Delete all farmer crops
            const cropsQuery = query(collection(db, "farmerCrops"), where("userId", "==", userId));
            const cropsSnapshot = await getDocs(cropsQuery);
            cropsSnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            // Delete all farm reports
            const reportsQuery = query(collection(db, "farmReports"), where("userId", "==", userId));
            const reportsSnapshot = await getDocs(reportsQuery);
            reportsSnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            // Delete the deletion request
            if (deletionRequest && deletionRequest.id) {
                batch.delete(doc(db, "deletionRequests", deletionRequest.id));
            }

            // Commit all Firestore deletions
            await batch.commit();

            // Delete Firebase Auth account (must be last)
            await deleteUser(user);

            // Clear local storage
            localStorage.removeItem('userRole');
            localStorage.removeItem('userId');
            localStorage.removeItem('username');

            toast({
                title: "Account Deleted",
                description: "Your account has been permanently deleted.",
            });

            // Redirect to login page
            navigate('/login');
        } catch (error: any) {
            console.error("Error deleting account:", error);

            let errorMessage = "Failed to delete account. Please try again.";

            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                errorMessage = "Incorrect password. Please try again.";
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = "Too many attempts. Please try again later.";
            } else if (error.code === 'auth/requires-recent-login') {
                errorMessage = "Please log out and log in again before deleting your account.";
            }

            toast({
                title: "Deletion Failed",
                description: errorMessage,
                variant: "destructive",
            });
        }
    };

    return {
        username,
        userId,
        monthlyReports,
        deletionRequest,
        farmerProfile,
        profileImageFile,
        crops,
        setUsername,
        setProfileImageFile,
        handleProfileInputChange,
        handleProfileImageUpload,
        handleUpdateProfile,
        handleRequestAccountDeletion,
        handleDeleteAccount,
        loadFarmerProfile,
        loadMonthlyReportCount,
        checkDeletionRequest
    };
};