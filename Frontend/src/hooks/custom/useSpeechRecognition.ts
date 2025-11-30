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

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = "fil-PH";
    recognitionRef.current.maxAlternatives = 3;

    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
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
      
      // Prevent duplication by using a buffer
      if (final) {
        const newTranscript = transcriptBufferRef.current + final;
        transcriptBufferRef.current = newTranscript;
        setTranscript(newTranscript);
      }
      
      setInterimTranscript(interim);
      retryCountRef.current = 0; // Reset retry count on successful result
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error("Speech recognition error", event.error || event);
      setError(event.error || "Unknown error");
      setIsListening(false);
      
      // Handle iOS Safari specific errors
      if (event.error === "service-not-allowed" || event.error === "not-allowed") {
        // For iOS, we need to completely recreate the recognition object
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          
          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
          }
          
          restartTimeoutRef.current = setTimeout(() => {
            // Completely recreate the recognition object for iOS
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition && recognitionRef.current) {
              // Clean up existing recognition
              try {
                recognitionRef.current.abort();
              } catch (e) {
                console.warn("Error aborting recognition:", e);
              }
              
              // Create new recognition object
              try {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = false;
                recognitionRef.current.interimResults = true;
                recognitionRef.current.lang = "fil-PH";
                recognitionRef.current.maxAlternatives = 3;
                
                // Reattach event handlers
                recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
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
                };
                
                recognitionRef.current.onerror = recognitionRef.current.onerror;
                recognitionRef.current.onend = recognitionRef.current.onend;
                
                // Try to start again
                if (isListening) {
                  try {
                    recognitionRef.current.start();
                  } catch (e) {
                    console.error("Failed to restart speech recognition after recreation:", e);
                    setIsListening(false);
                  }
                }
              } catch (e) {
                console.error("Failed to recreate speech recognition object:", e);
              }
            }
          }, 500);
        } else {
          // Max retries reached
          console.error("Max retries reached for speech recognition");
          setIsListening(false);
        }
      }
    };

    recognitionRef.current.onend = () => {
      // Auto-restart if we were listening
      if (isListening) {
        setTimeout(() => {
          if (isListening && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error("Failed to restart speech recognition:", e);
              // For iOS, try recreating the object
              const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
              if (SpeechRecognition) {
                try {
                  recognitionRef.current = new SpeechRecognition();
                  recognitionRef.current.continuous = false;
                  recognitionRef.current.interimResults = true;
                  recognitionRef.current.lang = "fil-PH";
                  recognitionRef.current.maxAlternatives = 3;
                  recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
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
                  };
                  recognitionRef.current.onerror = recognitionRef.current.onerror;
                  recognitionRef.current.onend = recognitionRef.current.onend;
                  
                  if (isListening) {
                    recognitionRef.current.start();
                  }
                } catch (recreateError) {
                  console.error("Failed to recreate speech recognition object:", recreateError);
                  setIsListening(false);
                }
              } else {
                setIsListening(false);
              }
            }
          }
        }, 300);
      } else {
        setIsListening(false);
      }
    };

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
    if (recognitionRef.current && !isListening && isSupported) {
      transcriptBufferRef.current = "";
      setTranscript("");
      setInterimTranscript("");
      setError(null);
      retryCountRef.current = 0; // Reset retry count
      
      try {
        // Ensure we have a fresh recognition object
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!recognitionRef.current && SpeechRecognition) {
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = false;
          recognitionRef.current.interimResults = true;
          recognitionRef.current.lang = "fil-PH";
          recognitionRef.current.maxAlternatives = 3;
          
          // Reattach event handlers if needed
          recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
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
          };
          
          recognitionRef.current.onerror = recognitionRef.current.onerror;
          recognitionRef.current.onend = recognitionRef.current.onend;
        }
        
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error("Error starting speech recognition:", error);
        setError("Failed to start speech recognition. Please ensure microphone permissions are granted.");
        setIsListening(false);
      }
    }
  };

  const stopListening = () => {
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