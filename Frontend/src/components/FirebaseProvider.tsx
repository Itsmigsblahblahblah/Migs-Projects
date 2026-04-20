import { useState, useEffect } from "react";
import { firebaseInitializationPromise, isFirebaseReady } from "@/firebaseConfig";

interface FirebaseProviderProps {
  children: React.ReactNode;
}

/**
 * FirebaseProvider initializes Firebase but DOESN'T block rendering
 * App renders immediately, components handle their own loading states
 */
const FirebaseProvider = ({ children }: FirebaseProviderProps) => {
  const [firebaseReady, setFirebaseReady] = useState(false);

  useEffect(() => {
    // Start Firebase initialization in background
    const waitForFirebase = async () => {
      try {
        await firebaseInitializationPromise;
        if (isFirebaseReady()) {
          setFirebaseReady(true);
        } else {
          // If not ready yet, wait a bit more
          setTimeout(() => setFirebaseReady(true), 200);
        }
      } catch (err) {
        console.error("[FirebaseProvider] Firebase initialization failed:", err);
        // Still mark as ready - app should render even without Firebase
        setFirebaseReady(true);
      }
    };

    waitForFirebase();
  }, []);

  // Render children IMMEDIATELY - don't block the UI
  // Components will handle their own loading states when they need Firebase
  return <>{children}</>;
};

export default FirebaseProvider;
