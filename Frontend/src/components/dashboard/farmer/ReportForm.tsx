import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Send, Camera, Mic, Square } from "lucide-react";
import { useState, useEffect } from "react";
import { useSpeechRecognition } from "@/hooks/custom/useSpeechRecognition";
import { useToast } from "@/hooks/use-toast";

interface ReportFormProps {
    reportText: string;
    onReportTextChange: (text: string) => void;
    onSubmitReport: () => void;
    isProcessing: boolean;
}

const ReportForm = ({ reportText, onReportTextChange, onSubmitReport, isProcessing }: ReportFormProps) => {
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const { toast } = useToast();
    const {
        isListening,
        transcript,
        interimTranscript,
        isSupported,
        error,
        startListening,
        stopListening,
        resetTranscript,
    } = useSpeechRecognition();

    // Update the report text when speech recognition transcript changes
    useEffect(() => {
        if (transcript || interimTranscript) {
            onReportTextChange(transcript + interimTranscript);
        }
    }, [transcript, interimTranscript]);

    // Show error toast when speech recognition fails
    useEffect(() => {
        if (error) {
            toast({
                title: "Speech Recognition Error",
                description: error === "not-allowed"
                    ? "Microphone access denied. Please allow microphone access to use this feature."
                    : `Error: ${error}`,
                variant: "destructive",
            });
        }
    }, [error, toast]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
        }
    };

    const handleRemoveImage = () => {
        setSelectedImage(null);
        // Reset the file input value to allow selecting the same file again
        const fileInput = document.getElementById('image') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
    };

    const toggleSpeechRecognition = () => {
        if (!isSupported) {
            toast({
                title: "Speech Recognition Not Supported",
                description: "Your browser does not support speech recognition. Please try Chrome, Edge, or Safari.",
                variant: "destructive",
            });
            return;
        }

        if (isListening) {
            stopListening();
        } else {
            resetTranscript();
            startListening();
        }
    };

    return (
        <Card className="shadow-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    Report Farm Problem
                </CardTitle>
                <CardDescription>
                    Describe your farming issue in detail to get personalized recommendations
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="problem">Problema sa Sakahan</Label>
                        {isSupported && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={toggleSpeechRecognition}
                                className={`flex items-center gap-1 ${isListening ? 'bg-red-500 hover:bg-red-600 text-white' : ''}`}
                            >
                                {isListening ? (
                                    <>
                                        <Square className="h-4 w-4" />
                                        Stop Recording
                                    </>
                                ) : (
                                    <>
                                        <Mic className="h-4 w-4" />
                                        Use Microphone
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                    <Textarea
                        id="problem"
                        placeholder="Halimbawa: 'Nalubog sa baha ang tanim kong mais sa nakaraang linggo...'"
                        value={reportText}
                        onChange={(e) => onReportTextChange(e.target.value)}
                        className="min-h-64 resize-none"
                    />
                    {isListening && (
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            Listening... Please speak now
                        </div>
                    )}
                    {!isSupported && (
                        <div className="text-sm text-muted-foreground">
                            Speech recognition not supported in your browser
                        </div>
                    )}
                </div>

                {/* <div className="space-y-2">
                    <Label htmlFor="image">Upload Larawan (Optional)</Label>
                    <div className="flex items-center gap-2">
                        <Input
                            id="image"
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                        />
                        <Button
                            variant="outline"
                            onClick={() => document.getElementById('image')?.click()}
                            className="flex w-full items-center gap-2"
                        >
                            <Camera className="h-4 w-4" />
                            {selectedImage ? 'Change Photo' : 'Add Photo'}
                        </Button>
                        {selectedImage && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                    {selectedImage.name}
                                </span>
                                <button
                                    onClick={handleRemoveImage}
                                    className="text-red-500 hover:text-red-700 font-bold"
                                    aria-label="Remove image"
                                >
                                    X
                                </button>
                            </div>
                        )}
                    </div>
                </div> */}

                <Button
                    onClick={onSubmitReport}
                    disabled={isProcessing}
                    className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                    size="lg"
                >
                    {isProcessing ? (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                            Processing...
                        </div>
                    ) : (
                        <>
                            <Send className="h-4 w-4 mr-2" />
                            Get Recommendation
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
};

export default ReportForm;