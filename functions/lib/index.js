"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeatherData = exports.cleanupOrphanedData = exports.deleteFarmerAccount = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const node_fetch_1 = __importDefault(require("node-fetch"));
// Initialize Firebase Admin
admin.initializeApp();
/**
 * Cloud Function to delete a farmer account
 * Deletes both Firestore data AND Firebase Authentication account
 *
 * Only callable by admin users (admin@majayjay.farm)
 */
exports.deleteFarmerAccount = functions.https.onCall(async (data, context) => {
    // 1. Verify user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to delete accounts');
    }
    // 2. Verify user is admin
    const userEmail = context.auth.token.email;
    if (userEmail !== 'admin@majayjay.farm') {
        throw new functions.https.HttpsError('permission-denied', 'Only admin users can delete farmer accounts');
    }
    // 3. Validate input
    const { farmerId } = data;
    if (!farmerId || typeof farmerId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'farmerId is required and must be a string');
    }
    try {
        const db = admin.firestore();
        // Start a batch write for atomic Firestore operations
        const batch = db.batch();
        // Count how many items will be deleted for logging
        let deletedCrops = 0;
        let deletedReports = 0;
        // 4. Delete farmer profile document
        const farmerRef = db.collection('farmers').doc(farmerId);
        // Verify farmer exists
        const farmerDoc = await farmerRef.get();
        if (!farmerDoc.exists) {
            throw new functions.https.HttpsError('not-found', `Farmer with ID ${farmerId} not found`);
        }
        const farmerData = farmerDoc.data();
        batch.delete(farmerRef);
        functions.logger.info(`Deleting farmer: ${farmerData === null || farmerData === void 0 ? void 0 : farmerData.fullName} (${farmerData === null || farmerData === void 0 ? void 0 : farmerData.email})`);
        // 5. Delete all farmer's crops
        const cropsSnapshot = await db
            .collection('farmerCrops')
            .where('userId', '==', farmerId)
            .get();
        cropsSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
            deletedCrops++;
        });
        functions.logger.info(`Found ${deletedCrops} crops to delete`);
        // 6. Delete all farmer's farm reports
        const reportsSnapshot = await db
            .collection('farmReports')
            .where('userId', '==', farmerId)
            .get();
        reportsSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
            deletedReports++;
        });
        functions.logger.info(`Found ${deletedReports} reports to delete`);
        // 7. Commit all Firestore deletions atomically
        await batch.commit();
        functions.logger.info('Firestore data deleted successfully');
        // 8. Delete Firebase Authentication user
        try {
            await admin.auth().deleteUser(farmerId);
            functions.logger.info(`Firebase Auth user deleted: ${farmerId}`);
        }
        catch (authError) {
            // Log but don't fail if Auth user doesn't exist or already deleted
            if (authError.code === 'auth/user-not-found') {
                functions.logger.warn(`Auth user ${farmerId} not found (already deleted or never existed)`);
            }
            else {
                throw authError;
            }
        }
        // 9. Return success response
        return {
            success: true,
            message: `Farmer account deleted successfully`,
            deleted: {
                farmer: farmerData === null || farmerData === void 0 ? void 0 : farmerData.fullName,
                email: farmerData === null || farmerData === void 0 ? void 0 : farmerData.email,
                crops: deletedCrops,
                reports: deletedReports,
                authUser: true
            }
        };
    }
    catch (error) {
        functions.logger.error('Error deleting farmer account:', error);
        // If it's already an HttpsError, re-throw it
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        // Otherwise, wrap in internal error
        throw new functions.https.HttpsError('internal', 'Failed to delete farmer account', error.message);
    }
});
/**
 * Optional: Background function to clean up orphaned data
 * Runs daily to check for any inconsistencies
 */
exports.cleanupOrphanedData = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async (context) => {
    const db = admin.firestore();
    try {
        // Get all farmers
        const farmersSnapshot = await db.collection('farmers').get();
        const farmerIds = new Set(farmersSnapshot.docs.map((doc) => doc.id));
        let orphanedCrops = 0;
        let orphanedReports = 0;
        // Check for orphaned crops
        const cropsSnapshot = await db.collection('farmerCrops').get();
        const batch1 = db.batch();
        cropsSnapshot.forEach((doc) => {
            const userId = doc.data().userId;
            if (!farmerIds.has(userId)) {
                batch1.delete(doc.ref);
                orphanedCrops++;
            }
        });
        if (orphanedCrops > 0) {
            await batch1.commit();
        }
        // Check for orphaned reports
        const reportsSnapshot = await db.collection('farmReports').get();
        const batch2 = db.batch();
        reportsSnapshot.forEach((doc) => {
            const userId = doc.data().userId;
            if (!farmerIds.has(userId)) {
                batch2.delete(doc.ref);
                orphanedReports++;
            }
        });
        if (orphanedReports > 0) {
            await batch2.commit();
        }
        functions.logger.info(`Cleanup complete: ${orphanedCrops} crops, ${orphanedReports} reports removed`);
        return {
            orphanedCrops,
            orphanedReports
        };
    }
    catch (error) {
        functions.logger.error('Error during cleanup:', error);
        throw error;
    }
});
/**
 * Weather API function to fetch current weather and forecast data for Majayjay, Laguna
 * Uses Open-Meteo API to get weather information
 */
exports.getWeatherData = functions.https.onCall(async (data, context) => {
    try {
        // Coordinates for Majayjay, Laguna, Philippines
        const LATITUDE = 14.1463;
        const LONGITUDE = 121.4729;
        // Get forecast days from request (default to 7)
        const forecastDays = (data === null || data === void 0 ? void 0 : data.forecastDays) || 7;
        const forecastType = (data === null || data === void 0 ? void 0 : data.forecastType) || 'daily'; // daily, hourly, current
        let apiUrl = '';
        // Build API URL based on forecast type
        if (forecastType === 'current') {
            // Current weather
            apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&forecast_days=1`;
        }
        else if (forecastType === 'hourly') {
            // Hourly forecast
            apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,soil_temperature_0cm,soil_temperature_6cm,soil_temperature_18cm,soil_moisture_0_to_1cm,soil_moisture_1_to_3cm,soil_moisture_3_to_9cm&forecast_days=${forecastDays}`;
        }
        else {
            // Daily forecast (default)
            apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,uv_index_clear_sky_max,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_hours,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,shortwave_radiation_sum,et0_fao_evapotranspiration&forecast_days=${forecastDays}`;
        }
        // Fetch weather data from Open-Meteo API
        const response = await (0, node_fetch_1.default)(apiUrl);
        if (!response.ok) {
            throw new functions.https.HttpsError('internal', `Failed to fetch weather data: ${response.status} ${response.statusText}`);
        }
        const weatherData = await response.json();
        // Process and format the weather data
        const processedData = {
            location: {
                name: 'Majayjay, Laguna',
                latitude: LATITUDE,
                longitude: LONGITUDE
            },
            current: forecastType === 'current' ? processCurrentWeather(weatherData.current) : null,
            hourly: forecastType === 'hourly' ? processHourlyWeather(weatherData.hourly) : null,
            daily: forecastType !== 'hourly' ? processDailyWeather(weatherData.daily) : null,
            forecastType,
            forecastDays
        };
        return {
            success: true,
            data: processedData
        };
    }
    catch (error) {
        functions.logger.error('Error fetching weather data:', error);
        throw new functions.https.HttpsError('internal', 'Failed to fetch weather data', error.message);
    }
});
// Helper function to process current weather data
function processCurrentWeather(current) {
    return {
        time: current.time,
        temperature: current.temperature_2m,
        humidity: current.relative_humidity_2m,
        apparentTemperature: current.apparent_temperature,
        isDay: current.is_day,
        precipitation: current.precipitation,
        rain: current.rain,
        showers: current.showers,
        snowfall: current.snowfall,
        weatherCode: current.weather_code,
        cloudCover: current.cloud_cover,
        pressure: current.pressure_msl,
        surfacePressure: current.surface_pressure,
        windSpeed: current.wind_speed_10m,
        windDirection: current.wind_direction_10m,
        windGusts: current.wind_gusts_10m,
        weatherDescription: getWeatherDescription(current.weather_code)
    };
}
// Helper function to process hourly weather data
function processHourlyWeather(hourly) {
    if (!hourly)
        return null;
    return {
        time: hourly.time,
        temperature: hourly.temperature_2m,
        humidity: hourly.relative_humidity_2m,
        apparentTemperature: hourly.apparent_temperature,
        precipitation: hourly.precipitation,
        rain: hourly.rain,
        showers: hourly.showers,
        snowfall: hourly.snowfall,
        weatherCode: hourly.weather_code,
        cloudCover: hourly.cloud_cover,
        pressure: hourly.pressure_msl,
        surfacePressure: hourly.surface_pressure,
        windSpeed: hourly.wind_speed_10m,
        windDirection: hourly.wind_direction_10m,
        windGusts: hourly.wind_gusts_10m,
        soilTemperature: {
            surface: hourly.soil_temperature_0cm,
            depth6cm: hourly.soil_temperature_6cm,
            depth18cm: hourly.soil_temperature_18cm
        },
        soilMoisture: {
            surface: hourly.soil_moisture_0_to_1cm,
            depth1to3cm: hourly.soil_moisture_1_to_3cm,
            depth3to9cm: hourly.soil_moisture_3_to_9cm
        }
    };
}
// Helper function to process daily weather data
function processDailyWeather(daily) {
    if (!daily)
        return null;
    return {
        time: daily.time,
        weatherCode: daily.weather_code,
        temperature: {
            max: daily.temperature_2m_max,
            min: daily.temperature_2m_min
        },
        apparentTemperature: {
            max: daily.apparent_temperature_max,
            min: daily.apparent_temperature_min
        },
        sunrise: daily.sunrise,
        sunset: daily.sunset,
        uvIndex: {
            max: daily.uv_index_max,
            clearSkyMax: daily.uv_index_clear_sky_max
        },
        precipitation: {
            sum: daily.precipitation_sum,
            rainSum: daily.rain_sum,
            showersSum: daily.showers_sum,
            snowfallSum: daily.snowfall_sum,
            hours: daily.precipitation_hours,
            probabilityMax: daily.precipitation_probability_max
        },
        wind: {
            speedMax: daily.wind_speed_10m_max,
            gustsMax: daily.wind_gusts_10m_max,
            directionDominant: daily.wind_direction_10m_dominant
        },
        shortwaveRadiationSum: daily.shortwave_radiation_sum,
        evapotranspiration: daily.et0_fao_evapotranspiration
    };
}
// Helper function to convert weather codes to descriptions
function getWeatherDescription(code) {
    const weatherCodes = {
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
}
//# sourceMappingURL=index.js.map