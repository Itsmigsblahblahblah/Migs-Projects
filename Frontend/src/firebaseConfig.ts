import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

// Backend URL - Use environment variable (set in .env.production for production)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// Firebase instances - initialized as null but will be set async
let app: any = null;
let db: any = null;
let auth: any = null;
let functions: any = null;
let firebaseConfig: any = null;
let initializationPromise: Promise<any> | null = null;
let initError: Error | null = null;

// Create a Promise that resolves when Firebase is ready
let firebaseReadyPromise: Promise<void> | null = null;

const initializeFirebaseAndWait = async (): Promise<void> => {
  if (!initializationPromise) {
    initializationPromise = initializeFirebase();
  }
  await initializationPromise;
};

// Function to initialize Firebase with config from backend
export const initializeFirebase = async (): Promise<any> => {
  // If already initialized with real config, return
  if (app && firebaseConfig && firebaseConfig.apiKey) {
    console.log('[Firebase] Already initialized, returning existing app');
    return app;
  }

  // Return existing initialization if already in progress
  if (initializationPromise) {
    console.log('[Firebase] Initialization already in progress, returning promise');
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      console.log('[Firebase] Starting Firebase initialization...');
      console.log('[Firebase] Backend URL:', BACKEND_URL);
      
      // Try to fetch Firebase config from backend
      let configResponse;
      try {
        configResponse = await fetch(`${BACKEND_URL}/config/firebase`);
        console.log('[Firebase] Backend config response status:', configResponse.status);
      } catch (fetchError) {
        console.warn('[Firebase] Backend fetch failed:', fetchError);
        console.warn('[Firebase] Using fallback Firebase configuration');
        // Will use fallback below
        configResponse = { ok: false };
      }
      
      if (configResponse.ok) {
        const data = await configResponse.json();
        console.log('[Firebase] Backend config data:', data);
        
        if (data.success && data.config && data.config.apiKey) {
          console.log('[Firebase] Using backend Firebase configuration');
          firebaseConfig = data.config;
          
          // Verify config is complete
          const requiredKeys = ['apiKey', 'authDomain', 'projectId'];
          const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);
          if (missingKeys.length > 0) {
            console.warn('[Firebase] Missing config values from backend:', missingKeys);
            throw new Error(`Missing Firebase config values: ${missingKeys.join(', ')}`);
          }
        } else {
          console.warn('[Firebase] Backend returned invalid config, using fallback');
          throw new Error('Invalid backend config');
        }
      } else {
        // Backend not available or returned error - use fallback
        console.warn('[Firebase] Backend config endpoint not available');
        console.warn('[Firebase] Using fallback Firebase configuration');
        
        // FALLBACK Firebase config - Hardcoded for development
        firebaseConfig = {
          apiKey: "AIzaSyARlJB0r_M_VieMV9E2yv2eFRuQXDv6Z2w",
          authDomain: "majayjay-farm.firebaseapp.com",
          projectId: "majayjay-farm",
          storageBucket: "majayjay-farm.firebasestorage.app",
          messagingSenderId: "704446587483",
          appId: "1:704446587483:web:611f1dc0e5b826eacb957e",
          measurementId: "G-65QYLYWQ6F"
        };
        
        console.warn('[Firebase] ⚠️  FALLBACK CONFIG DETECTED');
        console.warn('[Firebase] ⚠️  Backend /config/firebase endpoint is not working');
        console.warn('[Firebase] ⚠️  Using hardcoded Firebase credentials for development');
        console.warn('[Firebase] ✅ Data fetching WILL work with this fallback config');
        
        // Initialize Firebase even with fallback config
        console.log('[Firebase] Initializing Firebase with fallback config...');
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        functions = getFunctions(app);
        
        console.log('[Firebase] ✅ Firebase initialization successful with fallback config!');
        console.log('[Firebase] ✅ Database (Firestore) ready:', !!db);
        console.log('[Firebase] ✅ Authentication ready:', !!auth);
        
        return app;
      }
      
      console.log('[Firebase] Initializing Firebase app with config:', {
        apiKey: firebaseConfig.apiKey?.substring(0, 10) + '...',
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId
      });
      
      // Initialize Firebase with config
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      auth = getAuth(app);
      functions = getFunctions(app);
      
      console.log('[Firebase] ✅ Firebase initialization successful!');
      console.log('[Firebase] ✅ Database (Firestore) ready:', !!db);
      console.log('[Firebase] ✅ Authentication ready:', !!auth);
      
      return app;
    } catch (error) {
      console.error('[Firebase] ❌ Failed to initialize Firebase:', error);
      console.error('[Firebase] Error details:', error instanceof Error ? error.message : error);
      throw error;
    }
  })();

  return initializationPromise;
};

// Start initialization immediately but don't throw errors
// Create a promise that resolves when initialization completes (success or failure)
export const firebaseInitializationPromise = initializeFirebase().then((result) => {
  console.log('[Firebase] Initialization completed successfully');
  console.log('[Firebase] db ready:', !!db);
  console.log('[Firebase] auth ready:', !!auth);
  return result;
}).catch(err => {
  console.error('[Firebase] Initialization failed:', err);
  initError = err;
  // Set fallback values so the app can still function
  if (!app) {
    console.warn('[Firebase] App not initialized, continuing without Firebase');
  }
});

// Lazy getters for async access
export const getApp = async () => {
  if (!app) {
    await initializeFirebase();
  }
  return app;
};

export const getDb = async () => {
  if (!db) {
    await initializeFirebase();
  }
  return db;
};

export const getAuthInstance = async () => {
  if (!auth) {
    await initializeFirebase();
  }
  if (!auth) {
    throw new Error('Firebase auth not initialized. Please check backend connection.');
  }
  return auth;
};

export const getFunctionsInstance = async () => {
  if (!functions) {
    await initializeFirebase();
  }
  return functions;
};

// Export config getter
export const getFirebaseConfig = () => firebaseConfig;

// Export helper to check if Firebase is ready
export const isFirebaseReady = (): boolean => {
  const ready = app !== null && auth !== null && db !== null;
  console.log('[Firebase] isFirebaseReady check:', { app: !!app, auth: !!auth, db: !!db, ready });
  return ready;
};

// Export a function to get db only when ready
export const getDbWhenReady = async () => {
  if (!initializationPromise) {
    initializationPromise = initializeFirebase();
  }
  
  try {
    await initializationPromise;
  } catch (error) {
    throw error;
  }
  
  if (!db) {
    throw new Error('Firebase database not initialized.');
  }
  
  return db;
};

// Export a function to get auth only when ready
export const getAuthWhenReady = async () => {
  if (!initializationPromise) {
    initializationPromise = initializeFirebase();
  }
  
  try {
    await initializationPromise;
  } catch (error) {
    throw error;
  }
  
  if (!auth) {
    throw new Error('Firebase auth not initialized.');
  }
  
  return auth;
};

// Export instances (will be null until initialization completes)
export { db, auth, functions };