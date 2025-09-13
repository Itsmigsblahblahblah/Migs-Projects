import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { 
  Sprout, 
  AlertTriangle, 
  CheckCircle, 
  Lightbulb, 
  Camera, 
  Send,
  TrendingUp,
  Calendar,
  MapPin
} from "lucide-react";

// Mock NLP and DSS System
const processReport = (text: string) => {
  const problems = {
    flood: ['baha', 'flood', 'tubig', 'ulan', 'nalubog'],
    pest: ['insekto', 'pest', 'uod', 'peste', 'damage'],
    drought: ['tuyo', 'dry', 'walang tubig', 'drought', 'init'],
    disease: ['sakit', 'disease', 'bulok', 'rot', 'fungus']
  };
  
  const crops = {
    corn: ['mais', 'corn'],
    rice: ['bigas', 'rice', 'palay'],
    tomato: ['kamatis', 'tomato'],
    cabbage: ['repolyo', 'cabbage'],
    eggplant: ['talong', 'eggplant']
  };

  let detectedProblem = 'general';
  let affectedCrop = 'unknown';

  // Simple NLP simulation
  const lowerText = text.toLowerCase();
  
  for (const [problem, keywords] of Object.entries(problems)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      detectedProblem = problem;
      break;
    }
  }

  for (const [crop, keywords] of Object.entries(crops)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      affectedCrop = crop;
      break;
    }
  }

  // DSS Logic
  const recommendations = {
    flood: {
      avoid: ['Corn', 'Tomato', 'Eggplant'],
      recommend: ['Kangkong', 'Gabi', 'Rice (flood-tolerant variety)'],
      advice: 'Consider raised bed planting and improved drainage systems. Plant flood-tolerant crops during rainy season.'
    },
    pest: {
      avoid: ['Cabbage', 'Tomato'],
      recommend: ['Corn', 'Root vegetables', 'Herbs'],
      advice: 'Implement integrated pest management. Use organic pesticides and companion planting techniques.'
    },
    drought: {
      avoid: ['Rice', 'Leafy vegetables'],
      recommend: ['Cassava', 'Sweet potato', 'Drought-resistant corn varieties'],
      advice: 'Install drip irrigation systems. Mulch around plants to retain moisture.'
    },
    disease: {
      avoid: ['Tomato', 'Eggplant'],
      recommend: ['Root crops', 'Legumes'],
      advice: 'Ensure proper crop rotation and soil sterilization. Remove infected plants immediately.'
    },
    general: {
      avoid: [],
      recommend: ['Seasonal vegetables', 'Local varieties'],
      advice: 'Consult with local agricultural officer for specific recommendations.'
    }
  };

  return {
    problem: detectedProblem,
    crop: affectedCrop,
    ...recommendations[detectedProblem as keyof typeof recommendations]
  };
};

const FarmerDashboard = () => {
  const [reportText, setReportText] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [username, setUsername] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const user = localStorage.getItem('username');
    
    if (role !== 'farmer') {
      navigate('/');
      return;
    }
    
    setUsername(user || 'Farmer');
  }, [navigate]);

  const handleSubmitReport = () => {
    if (!reportText.trim()) {
      toast({
        title: "Walang input",
        description: "Pakitype ang inyong problema sa sakahan.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    // Simulate processing time
    setTimeout(() => {
      const result = processReport(reportText);
      setRecommendation(result);
      setIsProcessing(false);
      
      toast({
        title: "Recommendation Ready",
        description: "Nakuha na namin ang inyong crop recommendation!",
      });
      
      // Save to history (mock)
      const history = JSON.parse(localStorage.getItem('reportHistory') || '[]');
      history.unshift({
        id: Date.now(),
        text: reportText,
        result,
        date: new Date().toISOString()
      });
      localStorage.setItem('reportHistory', JSON.stringify(history.slice(0, 10)));
      
    }, 2000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      toast({
        title: "Image uploaded",
        description: "Larawan ay nai-upload na para sa analysis.",
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-primary rounded-lg p-6 text-primary-foreground">
          <div className="flex items-center gap-3 mb-2">
            <Sprout className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Mabuhay, {username}!</h1>
          </div>
          <p className="text-primary-foreground/90">
            I-type ang inyong problema sa sakahan para makakuha ng crop recommendations.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Report Input Form */}
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
                  onChange={(e) => setReportText(e.target.value)}
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
                    className="flex items-center gap-2"
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
                onClick={handleSubmitReport}
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

          {/* Recommendation Results */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-accent" />
                AI Recommendation
              </CardTitle>
              <CardDescription>
                Smart farming guidance based on your reported issue
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!recommendation ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Sprout className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>Submit your farming problem to get personalized recommendations</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Problem Detection */}
                  <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <span className="font-medium">Detected Problem</span>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {recommendation.problem.replace('_', ' ')}
                    </Badge>
                    {recommendation.crop !== 'unknown' && (
                      <Badge variant="outline" className="ml-2 capitalize">
                        Affected: {recommendation.crop}
                      </Badge>
                    )}
                  </div>

                  <Separator />

                  {/* Recommendations */}
                  <div className="space-y-4">
                    {recommendation.recommend.length > 0 && (
                      <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle className="h-4 w-4 text-success" />
                          <span className="font-medium text-success">Recommended Crops</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {recommendation.recommend.map((crop: string, index: number) => (
                            <Badge key={index} className="bg-success text-success-foreground">
                              {crop}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {recommendation.avoid.length > 0 && (
                      <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <span className="font-medium text-destructive">Avoid These Crops</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {recommendation.avoid.map((crop: string, index: number) => (
                            <Badge key={index} variant="destructive">
                              {crop}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Expert Advice */}
                    <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-accent" />
                        <span className="font-medium">Expert Advice</span>
                      </div>
                      <p className="text-sm text-foreground/80">
                        {recommendation.advice}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reports This Month</p>
                <p className="text-lg font-bold">12</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-lg font-bold">85%</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <MapPin className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Fields</p>
                <p className="text-lg font-bold">3</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default FarmerDashboard;