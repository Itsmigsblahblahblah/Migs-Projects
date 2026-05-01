import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

// Backend URL - Use environment variable (set in .env.production for production)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// Firebase instances - initialized synchronously from environment variables
let app: any = null;
let db: any = null;
let auth: any = null;
let functions: any = null;
let firebaseConfig: any = null;
let initializationPromise: Promise<any> | null = null;
let initError: Error | null = null;

// Function to initialize Firebase using environment variables ONLY
export const initializeFirebase = async (): Promise<any> => {
  // If already initialized, return
  if (app && firebaseConfig) {
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
      console.log('[Firebase] Starting Firebase initialization from environment variables...');
      // Use environment variables directly from Frontend/.env
      firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
      };
      
      // Verify config is complete
      const requiredKeys = ['apiKey', 'authDomain', 'projectId'];
      const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);
      if (missingKeys.length > 0) {
        console.error('[Firebase] Missing required Firebase config values:', missingKeys);
        throw new Error(`Missing Firebase config values: ${missingKeys.join(', ')}`);
      }
      
      console.log('[Firebase] Using Firebase configuration from environment variables');
      console.log('[Firebase] Project ID:', firebaseConfig.projectId);
      console.log('[Firebase] Auth Domain:', firebaseConfig.authDomain);
      
      // Initialize Firebase with config from environment variables
      console.log('[Firebase] Initializing Firebase app...');
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      auth = getAuth(app);
      functions = getFunctions(app);
      
      console.log('[Firebase] ✅ Firebase initialization successful!');
      console.log('[Firebase] ✅ Database (Firestore) ready:', !!db);
      console.log('[Firebase] ✅ Authentication ready:', !!auth);
      console.log('[Firebase] ✅ Login will work independently of backend status');
      
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