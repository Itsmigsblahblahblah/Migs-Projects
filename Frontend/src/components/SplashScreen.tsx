import { useState, useEffect } from "react";
import { Sprout } from "lucide-react";
import herobg from "@/assets/herobg.jpg";

interface SplashScreenProps {
  onLoadingComplete: () => void;
}

const SplashScreen = ({ onLoadingComplete }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    // Create an image element to preload the hero background
    const img = new Image();
    
    // Set up event listeners
    const handleLoad = () => {
      // Add a minimum display time of 2 seconds for branding
      setTimeout(() => {
        setIsVisible(false);
        // Wait for fade out animation to complete before unmounting
        setTimeout(() => {
          setShouldRender(false);
          onLoadingComplete();
        }, 500); // Match the CSS transition duration
      }, 2000);
    };
    
    const handleError = () => {
      // Even if there's an error, we still want to hide the splash screen
      setTimeout(() => {
        setIsVisible(false);
        // Wait for fade out animation to complete before unmounting
        setTimeout(() => {
          setShouldRender(false);
          onLoadingComplete();
        }, 500); // Match the CSS transition duration
      }, 2000);
    };
    
    // Attach event listeners
    img.onload = handleLoad;
    img.onerror = handleError;
    
    // Start loading the image
    img.src = herobg;
    
    // Fallback timeout in case neither onload nor onerror fires
    const fallbackTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        setShouldRender(false);
        onLoadingComplete();
      }, 500);
    }, 7000); // 7 seconds fallback
    
    // Cleanup function
    return () => {
      img.onload = null;
      img.onerror = null;
      clearTimeout(fallbackTimer);
    };
  }, [onLoadingComplete]);

  if (!shouldRender) return null;

  return (
    <div className={`fixed inset-0 bg-gradient-earth z-[9999] flex flex-col items-center justify-center transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <style>{`
        .splash-loader {
          font-weight: bold;
          font-family: monospace;
          font-size: 30px;
          display: inline-grid;
          color: hsl(120 70% 30%); /* primary color to match header */
        }
        .splash-loader:before,
        .splash-loader:after {
          content: "Harvestify...";
          grid-area: 1/1;
          line-height: 1em;
          -webkit-mask: linear-gradient(90deg,#000 50%,#0000 0) 0 50%/2ch 100%;
          -webkit-mask-position: calc(var(--s,0)*1ch) 50%;
          animation: l30 2s infinite;
          font-weight: bold; /* Ensure bold text in animation */
        }
        .splash-loader:after {
          --s:-1;
        }
        @keyframes l30 {
           33%  {transform: translateY(calc(var(--s,1)*50%));-webkit-mask-position:calc(var(--s,0)*1ch) 50%}
           66%  {transform: translateY(calc(var(--s,1)*50%));-webkit-mask-position:calc(var(--s,0)*1ch + 1ch) 50%}
           100% {transform: translateY(calc(var(--s,1)*0%)); -webkit-mask-position:calc(var(--s,0)*1ch + 1ch) 50%}
        }
      `}</style>
      
      <div className="flex flex-col items-center">
        <div className="p-6 rounded-full bg-gradient-primary mb-8">
          <Sprout className="h-16 w-16 text-primary-foreground" />
        </div>
        <div className="splash-loader"></div>
      </div>
    </div>
  );
};

export default SplashScreen;