import { useState, useEffect, useRef } from "react";

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognition extends EventTarget {
  new (): SpeechRecognition;
  start: () => void;
  stop: () => void;
  abort: () => void;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
  onnomatch?: (event: Event) => void;
  onsoundstart?: (event: Event) => void;
  onsoundend?: (event: Event) => void;
  onspeechstart?: (event: Event) => void;
  onspeechend?: (event: Event) => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptBufferRef = useRef<string>("");
  const retryCountRef = useRef<number>(0);
  const maxRetries = 3;
  const userInteractionRef = useRef<boolean>(false);

  // Function to initialize speech recognition
  const initSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "fil-PH";
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + " ";
        } else {
          interim += transcript;
        }
      }
      
      if (final) {
        const newTranscript = transcriptBufferRef.current + final;
        transcriptBufferRef.current = newTranscript;
        setTranscript(newTranscript);
      }
      
      setInterimTranscript(interim);
      retryCountRef.current = 0;
      setError(null);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error || event);
      setError(event.error || "Unknown error");
      setIsListening(false);
      
      // Handle iOS Safari specific errors
      if (event.error === "service-not-allowed" || event.error === "not-allowed") {
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          
          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
          }
          
          restartTimeoutRef.current = setTimeout(() => {
            // For iOS, we need to recreate everything
            if (userInteractionRef.current) {
              const newRecognition = initSpeechRecognition();
              if (newRecognition) {
                recognitionRef.current = newRecognition;
                if (isListening) {
                  startListeningInternal();
                }
              }
            }
          }, 1000);
        } else {
          console.error("Max retries reached for speech recognition");
          setIsListening(false);
        }
      } else if (event.error === "no-speech") {
        // This is normal, just restart if needed
        if (isListening) {
          setTimeout(() => {
            if (isListening && userInteractionRef.current) {
              startListeningInternal();
            }
          }, 300);
        }
      }
    };

    recognition.onend = () => {
      if (isListening && userInteractionRef.current) {
        setTimeout(() => {
          if (isListening && userInteractionRef.current) {
            startListeningInternal();
          }
        }, 300);
      } else {
        setIsListening(false);
      }
    };

    return recognition;
  };

  const startListeningInternal = () => {
    if (recognitionRef.current && !isListening && isSupported) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setError(null);
        return true;
      } catch (error) {
        console.error("Error starting speech recognition:", error);
        setError("Failed to start speech recognition. Please ensure microphone permissions are granted.");
        setIsListening(false);
        return false;
      }
    }
    return false;
  };

  useEffect(() => {
    recognitionRef.current = initSpeechRecognition();

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn("Error stopping recognition:", e);
        }
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, []);

  const startListening = () => {
    // Mark that user initiated this action
    userInteractionRef.current = true;
    
    // Reset state
    transcriptBufferRef.current = "";
    setTranscript("");
    setInterimTranscript("");
    setError(null);
    retryCountRef.current = 0;
    
    // Ensure we have a recognition object
    if (!recognitionRef.current) {
      recognitionRef.current = initSpeechRecognition();
    }
    
    // Start listening
    if (recognitionRef.current) {
      return startListeningInternal();
    }
    
    return false;
  };

  const stopListening = () => {
    userInteractionRef.current = false;
    
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn("Error stopping recognition:", e);
      }
      setIsListening(false);
    }
  };

  const resetTranscript = () => {
    transcriptBufferRef.current = "";
    setTranscript("");
    setInterimTranscript("");
  };

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
};