import { useState, useEffect } from "react";
import { firebaseInitializationPromise, isFirebaseReady } from "@/firebaseConfig";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

interface FirebaseProviderProps {
  children: React.ReactNode;
}

/**
 * FirebaseProvider waits for Firebase to initialize before rendering children
 * This prevents errors when components try to use Firebase before it's ready
 */
const FirebaseProvider = ({ children }: FirebaseProviderProps) => {
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log('[FirebaseProvider] Rendering, firebaseReady:', firebaseReady);

  useEffect(() => {
    const waitForFirebase = async () => {
      console.log('[FirebaseProvider] Starting to wait for Firebase...');
      try {
        // Wait for Firebase initialization promise to resolve
        await firebaseInitializationPromise;
        console.log('[FirebaseProvider] Promise resolved, checking if ready...');
        
        // Double-check that Firebase is actually ready
        if (isFirebaseReady()) {
          console.log('[FirebaseProvider] Firebase is fully ready!');
          setFirebaseReady(true);
        } else {
          // If promise resolved but Firebase isn't ready, wait a bit more
          console.warn("[FirebaseProvider] Promise resolved but Firebase not ready, waiting 500ms...");
          setTimeout(() => {
            console.log('[FirebaseProvider] Second attempt, setting ready');
            setFirebaseReady(true);
          }, 500);
        }
      } catch (err) {
        console.error("[FirebaseProvider] Firebase initialization failed:", err);
        setError(err instanceof Error ? err.message : "Firebase initialization failed");
        // Still render children even if Firebase fails - they should handle errors gracefully
        console.warn("[FirebaseProvider] Continuing with degraded functionality");
        setFirebaseReady(true);
      }
    };

    waitForFirebase();
  }, []);

  if (!firebaseReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-muted-foreground">Initializing Firebase...</p>
      </div>
    );
  }

  if (error) {
    console.warn("[FirebaseProvider] Continuing with degraded functionality due to Firebase error:", error);
  }

  return <>{children}</>;
};

export default FirebaseProvider;
