import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useCrops } from "@/contexts/CropContext";
import { collection, addDoc, Timestamp, query, where, getDocs, doc, getDoc, updateDoc, writeBatch, setDoc } from "firebase/firestore"; // Added setDoc import
import { db, auth } from "@/firebaseConfig";
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { generateDeletionRequestId } from "@/lib/idUtils"; // Added import for ID generation

// Weather data interface
interface WeatherData {
    temperature: number;
    condition: string;
    humidity: number;
    rainfall: number;
    forecast: {
        day: string;
        condition: string;
        high: number;
        low: number;
    }[];
}

interface ExtendedWeatherData extends WeatherData {
    extendedForecast?: {
        date: string;
        dayOfWeek: string;
        condition: string;
        high: number;
        low: number;
        // Add detailed weather information
        humidity?: number;
        windSpeed?: number;
        precipitationProbability?: number;
        uvIndex?: number;
        // Add alert information for each day
        alerts?: WeatherAlert[];
    }[];
    // Add current alerts
    currentAlerts?: WeatherAlert[];
}

// Add new interface for weather alerts
interface WeatherAlert {
    type: 'typhoon' | 'monsoon' | 'cyclone' | 'thunderstorm' | 'heavyRain' | 'highWind' | 'extremeHeat' | 'extremeCold';
    severity: 'low' | 'moderate' | 'high' | 'severe';
    description: string;
    icon: string;
}

// Add new types for forecast view
type ForecastView = 'now' | 'tomorrow' | 'specific' | 'week' | 'sixteen';

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
        photoURL: "",
        createdAt: ""
    });
    const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
    // Add a separate state for the edit profile dialog
    const [editProfileData, setEditProfileData] = useState({
        fullName: "",
        email: "",
        contactNumber: "",
        homeAddress: "",
        farmAddress: "",
        farmArea: "",
        photoURL: "",
        createdAt: ""
    });
    const [weatherData, setWeatherData] = useState<ExtendedWeatherData | null>(null);
    const [weatherLoading, setWeatherLoading] = useState(false);
    const [weatherError, setWeatherError] = useState<string | null>(null);
    const [forecastView, setForecastView] = useState<ForecastView>('now');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const { addCrop, crops, updateCrop } = useCrops();
    const { toast } = useToast();
    const navigate = useNavigate();

    // Initialize user data
    useEffect(() => {
        const role = localStorage.getItem('userRole');
        const user = localStorage.getItem('username');
        const uid = localStorage.getItem('userId') || 'default-user';

        console.log("useFarmerDashboard: role=", role, "user=", user, "uid=", uid);

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

        // Load weather data
        loadWeatherData();
    }, [navigate]);

    const loadFarmerProfile = async (uid: string) => {
        try {
            const farmerDoc = await getDoc(doc(db, "farmers", uid));
            if (farmerDoc.exists()) {
                const data = farmerDoc.data();
                const profileData = {
                    fullName: data.fullName || "",
                    email: data.email || "",
                    contactNumber: data.contactNumber || "",
                    homeAddress: data.homeAddress || "",
                    farmAddress: data.farmAddress || "",
                    farmArea: data.farmArea || "2.5 hectares",
                    photoURL: data.photoURL || "",
                    createdAt: data.createdAt || ""
                };
                setFarmerProfile(profileData);
                // Also initialize the edit profile data with the same values
                setEditProfileData(profileData);
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
            // Query only by userId first, then filter by date in memory
            // This avoids the need for a composite index
            const q = query(
                reportsRef,
                where("userId", "==", uid)
            );

            const querySnapshot = await getDocs(q);
            
            // Filter by date in memory
            const monthlyReportsCount = querySnapshot.docs.filter(doc => {
                const data = doc.data();
                const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                return createdAt >= firstDayOfMonth;
            }).length;
            
            setMonthlyReports(monthlyReportsCount);
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

    // Function to fetch weather data from Open-Meteo API
    const loadWeatherData = async () => {
        try {
            setWeatherLoading(true);
            setWeatherError(null);
            
            // Coordinates for Majayjay, Laguna, Philippines
            const LATITUDE = 14.1463;
            const LONGITUDE = 121.4729;
            
            // Current weather API endpoint
            const currentUrl = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&forecast_days=1`;
            
            // Daily forecast API endpoint (extended to 16 days)
            const dailyUrl = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,relative_humidity_2m_mean,sunrise,sunset,uv_index_max,uv_index_clear_sky_max,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_hours,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,shortwave_radiation_sum,et0_fao_evapotranspiration&forecast_days=16`;
            
            // Fetch current weather data
            const currentResponse = await fetch(currentUrl);
            if (!currentResponse.ok) {
                throw new Error(`Failed to fetch current weather data: ${currentResponse.status}`);
            }
            const currentData = await currentResponse.json();
            
            // Fetch daily forecast data (16 days)
            const dailyResponse = await fetch(dailyUrl);
            if (!dailyResponse.ok) {
                throw new Error(`Failed to fetch forecast data: ${dailyResponse.status}`);
            }
            const dailyData = await dailyResponse.json();
            
            // Process the data to match our WeatherData interface
            const processedWeatherData: ExtendedWeatherData = {
                temperature: currentData.current?.temperature_2m || 0,
                condition: getWeatherDescription(currentData.current?.weather_code || 0),
                humidity: currentData.current?.relative_humidity_2m || 0,
                rainfall: currentData.current?.rain || 0,
                forecast: processForecastData(dailyData.daily, 3), // Keep the original 3-day forecast for backward compatibility
                extendedForecast: processExtendedForecastData(dailyData.daily),
                // Add current alerts based on current conditions
                currentAlerts: detectWeatherAlerts(currentData.current?.weather_code || 0, currentData.current)
            };
            
            setWeatherData(processedWeatherData);
            // Save to localStorage so other components can access it
            console.log("Saving weather data to localStorage:", processedWeatherData);
            localStorage.setItem('weatherData', JSON.stringify(processedWeatherData));
        } catch (error: any) {
            console.error("Error loading weather data:", error);
            setWeatherError(error.message || "Failed to load weather data");
        } finally {
            setWeatherLoading(false);
        }
    };

    // Helper function to convert weather codes to descriptions
    const getWeatherDescription = (code: number): string => {
        const weatherCodes: Record<number, string> = {
            0: 'Clear sky',
            1: 'Mainly clear',
            2: 'Partly cloudy',
            3: 'Overcast',
            45: 'Fog',
            48: 'Depositing rime fog',
            51: 'Light drizzle',
            53: 'Moderate drizzle',
            55: 'Dense drizzle',
            56: 'Light freezing drizzle',
            57: 'Dense freezing drizzle',
            61: 'Slight rain',
            63: 'Moderate rain',
            65: 'Heavy rain',
            66: 'Light freezing rain',
            67: 'Heavy freezing rain',
            71: 'Slight snow fall',
            73: 'Moderate snow fall',
            75: 'Heavy snow fall',
            77: 'Snow grains',
            80: 'Slight rain showers',
            81: 'Moderate rain showers',
            82: 'Violent rain showers',
            85: 'Slight snow showers',
            86: 'Heavy snow showers',
            95: 'Thunderstorm',
            96: 'Thunderstorm with slight hail',
            99: 'Thunderstorm with heavy hail'
        };
        
        return weatherCodes[code] || 'Unknown';
    };

    // Helper function to process forecast data (limited days)
    const processForecastData = (daily: any, days: number): WeatherData['forecast'] => {
        if (!daily || !daily.time || !daily.time.length) {
            return [];
        }
        
        const forecast = [];
        const daysToShow = Math.min(days, daily.time.length);
        
        for (let i = 0; i < daysToShow; i++) {
            const date = new Date(daily.time[i]);
            const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short' });
            
            forecast.push({
                day: dayName,
                condition: getWeatherDescription(daily.weather_code[i]),
                high: daily.temperature_2m_max[i],
                low: daily.temperature_2m_min[i]
            });
        }
        
        return forecast;
    };

    // Helper function to detect weather alerts based on conditions
    const detectWeatherAlerts = (weatherCode: number, weatherData: any): WeatherAlert[] => {
        const alerts: WeatherAlert[] = [];
        
        // Thunderstorm alerts (codes 95, 96, 99)
        if ([95, 96, 99].includes(weatherCode)) {
            alerts.push({
                type: 'thunderstorm',
                severity: weatherCode === 99 ? 'severe' : weatherCode === 96 ? 'high' : 'moderate',
                description: weatherCode === 99 ? 'Thunderstorm with heavy hail' : 
                            weatherCode === 96 ? 'Thunderstorm with slight hail' : 'Thunderstorm',
                icon: '⚡'
            });
        }
        
        // Heavy rain alerts (codes 65, 82)
        if ([65, 82].includes(weatherCode)) {
            alerts.push({
                type: 'heavyRain',
                severity: 'high',
                description: weatherCode === 65 ? 'Heavy rain' : 'Heavy showers',
                icon: '🌧️'
            });
        }
        
        // High wind alerts (wind speed > 40 km/h)
        if (weatherData?.wind_speed_10m > 40) {
            // Typhoon alerts for very high winds (> 118 km/h)
            if (weatherData.wind_speed_10m > 118) {
                alerts.push({
                    type: 'typhoon',
                    severity: 'severe',
                    description: `Typhoon conditions (${Math.round(weatherData.wind_speed_10m)} km/h winds)`,
                    icon: '🌪️'
                });
            } 
            // Cyclone alerts for high winds (> 63 km/h)
            else if (weatherData.wind_speed_10m > 63) {
                alerts.push({
                    type: 'cyclone',
                    severity: weatherData.wind_speed_10m > 89 ? 'severe' : 'high',
                    description: `Cyclone conditions (${Math.round(weatherData.wind_speed_10m)} km/h winds)`,
                    icon: '🌀'
                });
            }
            // General high wind alert
            else {
                alerts.push({
                    type: 'highWind',
                    severity: weatherData.wind_speed_10m > 60 ? 'severe' : 'high',
                    description: `High winds (${Math.round(weatherData.wind_speed_10m)} km/h)`,
                    icon: '💨'
                });
            }
        }
        
        // Extreme heat alerts (temperature > 35°C)
        if (weatherData?.temperature_2m > 35) {
            alerts.push({
                type: 'extremeHeat',
                severity: weatherData.temperature_2m > 40 ? 'severe' : 'moderate',
                description: `Extreme heat (${Math.round(weatherData.temperature_2m)}°C)`,
                icon: '🌡️'
            });
        }
        
        // Heavy precipitation probability alerts (> 80%)
        if (weatherData?.precipitation_probability > 80) {
            alerts.push({
                type: 'heavyRain',
                severity: 'moderate',
                description: `High chance of rain (${weatherData.precipitation_probability}%)`,
                icon: '☔'
            });
        }
        
        // Monsoon alerts based on sustained high humidity and rain
        if (weatherData?.relative_humidity_2m > 80 && weatherData?.rain > 5) {
            alerts.push({
                type: 'monsoon',
                severity: 'moderate',
                description: 'Monsoon conditions detected',
                icon: '🌊'
            });
        }
        
        return alerts;
    };

    // Helper function to detect alerts for forecast days
    const detectForecastAlerts = (weatherCode: number, dailyData: any, index: number): WeatherAlert[] => {
        const alerts: WeatherAlert[] = [];
        
        // Thunderstorm alerts (codes 95, 96, 99)
        if ([95, 96, 99].includes(weatherCode)) {
            alerts.push({
                type: 'thunderstorm',
                severity: weatherCode === 99 ? 'severe' : weatherCode === 96 ? 'high' : 'moderate',
                description: weatherCode === 99 ? 'Thunderstorm with heavy hail' : 
                            weatherCode === 96 ? 'Thunderstorm with slight hail' : 'Thunderstorm',
                icon: '⚡'
            });
        }
        
        // Heavy rain alerts based on precipitation sum
        if (dailyData?.precipitation_sum?.[index] > 20) {
            alerts.push({
                type: 'heavyRain',
                severity: dailyData.precipitation_sum[index] > 50 ? 'severe' : 'high',
                description: `Heavy rain expected (${Math.round(dailyData.precipitation_sum[index])}mm)`,
                icon: '🌧️'
            });
        }
        
        // High wind alerts
        if (dailyData?.wind_speed_10m_max?.[index] > 40) {
            // Typhoon alerts for very high winds (> 118 km/h)
            if (dailyData.wind_speed_10m_max[index] > 118) {
                alerts.push({
                    type: 'typhoon',
                    severity: 'severe',
                    description: `Typhoon expected (${Math.round(dailyData.wind_speed_10m_max[index])} km/h winds)`,
                    icon: '🌪️'
                });
            } 
            // Cyclone alerts for high winds (> 63 km/h)
            else if (dailyData.wind_speed_10m_max[index] > 63) {
                alerts.push({
                    type: 'cyclone',
                    severity: dailyData.wind_speed_10m_max[index] > 89 ? 'severe' : 'high',
                    description: `Cyclone expected (${Math.round(dailyData.wind_speed_10m_max[index])} km/h winds)`,
                    icon: '🌀'
                });
            }
            // General high wind alert
            else {
                alerts.push({
                    type: 'highWind',
                    severity: dailyData.wind_speed_10m_max[index] > 60 ? 'severe' : 'high',
                    description: `High winds expected (${Math.round(dailyData.wind_speed_10m_max[index])} km/h)`,
                    icon: '💨'
                });
            }
        }
        
        // High precipitation probability alerts
        if (dailyData?.precipitation_probability_max?.[index] > 80) {
            alerts.push({
                type: 'heavyRain',
                severity: 'moderate',
                description: `High chance of rain (${dailyData.precipitation_probability_max[index]}%)`,
                icon: '☔'
            });
        }
        
        // Monsoon alerts based on high precipitation and wind patterns
        if (dailyData?.precipitation_sum?.[index] > 15 && dailyData?.wind_speed_10m_max?.[index] > 30) {
            alerts.push({
                type: 'monsoon',
                severity: 'moderate',
                description: 'Monsoon conditions expected',
                icon: '🌊'
            });
        }
        
        return alerts;
    };

    // Helper function to process extended forecast data (16 days)
    const processExtendedForecastData = (daily: any) => {
        if (!daily || !daily.time || !daily.time.length) {
            return [];
        }
        
        const extendedForecast = [];
        const daysToShow = Math.min(16, daily.time.length);
        
        for (let i = 0; i < daysToShow; i++) {
            const date = new Date(daily.time[i]);
            
            extendedForecast.push({
                date: daily.time[i],
                dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
                condition: getWeatherDescription(daily.weather_code[i]),
                high: daily.temperature_2m_max[i],
                low: daily.temperature_2m_min[i],
                // Add detailed weather information
                humidity: daily.relative_humidity_2m_mean?.[i] || 0,
                windSpeed: daily.wind_speed_10m_max?.[i] || 0,
                precipitationProbability: daily.precipitation_probability_max?.[i] || 0,
                uvIndex: daily.uv_index_max?.[i] || 0,
                // Add alerts for this day
                alerts: detectForecastAlerts(daily.weather_code[i], daily, i)
            });
        }
        
        return extendedForecast;
    };

    const handleProfileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditProfileData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleProfileImageSelection = (imagePath: string) => {
        setEditProfileData(prev => ({
            ...prev,
            photoURL: imagePath
        }));
    };

    const handleUpdateProfile = async () => {
        try {
            const updates: any = {
                fullName: editProfileData.fullName,
                contactNumber: editProfileData.contactNumber,
                homeAddress: editProfileData.homeAddress,
                farmAddress: editProfileData.farmAddress,
                farmArea: editProfileData.farmArea
            };

            // If there's a profile image selected, save it
            if (editProfileData.photoURL) {
                updates.photoURL = editProfileData.photoURL;
            }

            await updateDoc(doc(db, "farmers", userId), updates);

            // Update the main profile state with the new data
            setFarmerProfile(editProfileData);

            // Update username in localStorage if name changed
            if (editProfileData.fullName !== username) {
                localStorage.setItem('username', editProfileData.fullName);
                setUsername(editProfileData.fullName);
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

    // Add a function to reset the edit profile data to match the current profile
    const resetEditProfileData = () => {
        setEditProfileData(farmerProfile);
    };

    const handleRequestAccountDeletion = async (reason?: string) => {
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
            const requestData: any = {
                userId: userId,
                username: username,
                email: currentUser.email,
                fullName: farmerProfile.fullName || username,
                status: 'pending' as const,
                requestedAt: Timestamp.now(),
            };

            // Add reason if provided
            if (reason) {
                requestData.reason = reason;
            }

            console.log("Creating deletion request:", requestData);

            // Generate a readable document ID using username instead of userId
            const documentId = generateDeletionRequestId(username);
            
            // Add to Firestore with custom ID
            const requestRef = doc(db, "deletionRequests", documentId);
            await setDoc(requestRef, requestData);
            console.log("Deletion request created with ID:", documentId);

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

    // Get available dates for specific day selection
    const getAvailableDates = (): string[] => {
        if (!weatherData?.extendedForecast) return [];
        return weatherData.extendedForecast.map(item => item.date);
    };

    return {
        username,
        userId,
        monthlyReports,
        deletionRequest,
        farmerProfile,
        weatherData,
        weatherLoading,
        weatherError,
        crops,
        setUsername,
        handleProfileInputChange,
        handleProfileImageSelection,
        handleUpdateProfile,
        handleRequestAccountDeletion,
        handleDeleteAccount,
        loadFarmerProfile,
        loadMonthlyReportCount,
        checkDeletionRequest,
        loadWeatherData,
        // New weather forecast view properties
        forecastView,
        setForecastView,
        selectedDate,
        setSelectedDate,
        getAvailableDates,
        // Add the edit profile data and reset function to the return object
        editProfileData,
        resetEditProfileData
    };
};