import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Send, Camera } from "lucide-react";
import { useState } from "react";

interface ReportFormProps {
    reportText: string;
    onReportTextChange: (text: string) => void;
    onSubmitReport: () => void;
    isProcessing: boolean;
}

const ReportForm = ({ reportText, onReportTextChange, onSubmitReport, isProcessing }: ReportFormProps) => {
    const [selectedImage, setSelectedImage] = useState<File | null>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
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
                    <Label htmlFor="problem">Problema sa Sakahan</Label>
                    <Textarea
                        id="problem"
                        placeholder="Halimbawa: 'Nalubog sa baha ang tanim kong mais sa nakaraang linggo...'"
                        value={reportText}
                        onChange={(e) => onReportTextChange(e.target.value)}
                        className="min-h-32 resize-none"
                    />
                </div>

                <div className="space-y-2">
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
                            <span className="text-sm text-muted-foreground">
                                {selectedImage.name}
                            </span>
                        )}
                    </div>
                </div>

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