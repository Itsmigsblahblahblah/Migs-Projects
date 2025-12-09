import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { formatAiGuidance } from "@/utils/aiGuidanceFormatter";
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  AlertTriangle,
  CheckCircle,
  Lightbulb
} from "lucide-react";

interface DSSRule {
  id: number;
  problemType: string;
  cropType: string;
  avoidCrops: string[];
  recommendCrops: string[];
  advice: string;
  isActive: boolean;
}

const RulesManager = () => {
  const [rules, setRules] = useState<DSSRule[]>([]);
  const [editingRule, setEditingRule] = useState<DSSRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'admin') {
      navigate('/');
      return;
    }

    // Load existing rules from localStorage or set defaults
    const savedRules = localStorage.getItem('dssRules');
    if (savedRules) {
      setRules(JSON.parse(savedRules));
    } else {
      // Default DSS rules
      const defaultRules: DSSRule[] = [
        {
          id: 1,
          problemType: "flooding",
          cropType: "any",
          avoidCrops: ["Corn", "Tomato", "Eggplant"],
          recommendCrops: ["Kangkong", "Gabi", "Rice (flood-tolerant variety)"],
          advice: "Consider raised bed planting and improved drainage systems. Plant flood-tolerant crops during rainy season.",
          isActive: true
        },
        {
          id: 2,
          problemType: "pest",
          cropType: "any",
          avoidCrops: ["Cabbage", "Tomato"],
          recommendCrops: ["Corn", "Root vegetables", "Herbs"],
          advice: "Implement integrated pest management. Use organic pesticides and companion planting techniques.",
          isActive: true
        },
        {
          id: 3,
          problemType: "drought",
          cropType: "any",
          avoidCrops: ["Rice", "Leafy vegetables"],
          recommendCrops: ["Cassava", "Sweet potato", "Drought-resistant corn varieties"],
          advice: "Install drip irrigation systems. Mulch around plants to retain moisture.",
          isActive: true
        },
        {
          id: 4,
          problemType: "disease",
          cropType: "any",
          avoidCrops: ["Tomato", "Eggplant"],
          recommendCrops: ["Root crops", "Legumes"],
          advice: "Ensure proper crop rotation and soil sterilization. Remove infected plants immediately.",
          isActive: true
        }
      ];
      setRules(defaultRules);
      localStorage.setItem('dssRules', JSON.stringify(defaultRules));
    }
  }, [navigate]);

  const handleSaveRule = (rule: Partial<DSSRule>) => {
    if (!rule.problemType || !rule.advice) {
      toast({
        title: "Validation Error",
        description: "Problem type and advice are required fields.",
        variant: "destructive"
      });
      return;
    }

    let updatedRules: DSSRule[];
    
    if (editingRule) {
      // Update existing rule
      updatedRules = rules.map(r => 
        r.id === editingRule.id ? { ...editingRule, ...rule } : r
      );
      toast({
        title: "Rule Updated",
        description: "DSS rule has been successfully updated.",
      });
    } else {
      // Create new rule
      const newRule: DSSRule = {
        id: Date.now(),
        problemType: rule.problemType || '',
        cropType: rule.cropType || 'any',
        avoidCrops: rule.avoidCrops || [],
        recommendCrops: rule.recommendCrops || [],
        advice: rule.advice || '',
        isActive: true
      };
      updatedRules = [...rules, newRule];
      toast({
        title: "Rule Created",
        description: "New DSS rule has been successfully created.",
      });
    }

    setRules(updatedRules);
    localStorage.setItem('dssRules', JSON.stringify(updatedRules));
    setEditingRule(null);
    setIsCreating(false);
  };

  const handleDeleteRule = (ruleId: number) => {
    const updatedRules = rules.filter(r => r.id !== ruleId);
    setRules(updatedRules);
    localStorage.setItem('dssRules', JSON.stringify(updatedRules));
    
    toast({
      title: "Rule Deleted",
      description: "DSS rule has been successfully removed.",
    });
  };

  const toggleRuleStatus = (ruleId: number) => {
    const updatedRules = rules.map(rule =>
      rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
    );
    setRules(updatedRules);
    localStorage.setItem('dssRules', JSON.stringify(updatedRules));
  };

  const RuleForm = ({ rule }: { rule: Partial<DSSRule> }) => {
    const [formData, setFormData] = useState<Partial<DSSRule>>(rule);
    const [avoidInput, setAvoidInput] = useState('');
    const [recommendInput, setRecommendInput] = useState('');

    const addCrop = (type: 'avoid' | 'recommend', value: string) => {
      if (!value.trim()) return;
      
      const key = type === 'avoid' ? 'avoidCrops' : 'recommendCrops';
      const currentCrops = formData[key] || [];
      
      if (!currentCrops.includes(value.trim())) {
        setFormData({
          ...formData,
          [key]: [...currentCrops, value.trim()]
        });
      }
      
      if (type === 'avoid') setAvoidInput('');
      else setRecommendInput('');
    };

    const removeCrop = (type: 'avoid' | 'recommend', index: number) => {
      const key = type === 'avoid' ? 'avoidCrops' : 'recommendCrops';
      const currentCrops = formData[key] || [];
      
      setFormData({
        ...formData,
        [key]: currentCrops.filter((_, i) => i !== index)
      });
    };

    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {editingRule ? 'Edit DSS Rule' : 'Create New DSS Rule'}
          </CardTitle>
          <CardDescription>
            Define how the system should respond to specific farming problems
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="problemType">Problem Type *</Label>
              <Input
                id="problemType"
                placeholder="e.g., flooding, pest, drought, disease"
                value={formData.problemType || ''}
                onChange={(e) => setFormData({...formData, problemType: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cropType">Crop Type</Label>
              <Input
                id="cropType"
                placeholder="e.g., corn, rice, any"
                value={formData.cropType || 'any'}
                onChange={(e) => setFormData({...formData, cropType: e.target.value})}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Avoid Crops */}
            <div className="space-y-2">
              <Label>Crops to Avoid</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter crop name"
                  value={avoidInput}
                  onChange={(e) => setAvoidInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCrop('avoid', avoidInput)}
                />
                <Button 
                  type="button"
                  onClick={() => addCrop('avoid', avoidInput)}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {(formData.avoidCrops || []).map((crop, index) => (
                  <Badge 
                    key={index} 
                    variant="destructive" 
                    className="cursor-pointer"
                    onClick={() => removeCrop('avoid', index)}
                  >
                    {crop} ×
                  </Badge>
                ))}
              </div>
            </div>

            {/* Recommend Crops */}
            <div className="space-y-2">
              <Label>Recommended Crops</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter crop name"
                  value={recommendInput}
                  onChange={(e) => setRecommendInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCrop('recommend', recommendInput)}
                />
                <Button 
                  type="button"
                  onClick={() => addCrop('recommend', recommendInput)}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {(formData.recommendCrops || []).map((crop, index) => (
                  <Badge 
                    key={index} 
                    className="bg-success text-success-foreground cursor-pointer"
                    onClick={() => removeCrop('recommend', index)}
                  >
                    {crop} ×
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="advice">Expert Advice *</Label>
            <Textarea
              id="advice"
              placeholder="Provide detailed farming advice for this problem..."
              value={formData.advice || ''}
              onChange={(e) => setFormData({...formData, advice: e.target.value})}
              className="min-h-20"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => {
                setEditingRule(null);
                setIsCreating(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => handleSaveRule(formData)}
              className="bg-gradient-primary hover:opacity-90"
            >
              <Save className="h-4 w-4 mr-2" />
              {editingRule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-primary rounded-lg p-6 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">DSS Rules Manager</h1>
              <p className="text-primary-foreground/90">
                Configure decision support system rules for crop recommendations
              </p>
            </div>
            <Button 
              onClick={() => setIsCreating(true)}
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>
        </div>

        {/* Create/Edit Form */}
        {(isCreating || editingRule) && (
          <RuleForm rule={editingRule || {}} />
        )}

        {/* Rules List */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Active DSS Rules</CardTitle>
            <CardDescription>
              Manage how the system responds to different farming problems
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rules.map((rule) => (
                <div key={rule.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={rule.isActive ? "default" : "secondary"}
                        className={rule.isActive ? "bg-success text-success-foreground" : ""}
                      >
                        {rule.isActive ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {rule.problemType.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline">
                        Crop: {rule.cropType}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleRuleStatus(rule.id)}
                      >
                        {rule.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingRule(rule)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    {rule.avoidCrops.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Avoid: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {rule.avoidCrops.map((crop, index) => (
                            <Badge key={index} variant="destructive" className="text-xs">
                              {crop}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {rule.recommendCrops.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Recommend: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {rule.recommendCrops.map((crop, index) => (
                            <Badge key={index} className="bg-success text-success-foreground text-xs">
                              {crop}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Lightbulb className="h-4 w-4 text-accent" />
                      <span className="text-sm font-medium">Advice:</span>
                    </div>
                    <p className="text-sm text-foreground/80">{formatAiGuidance(rule.advice)}</p>
                  </div>
                </div>
              ))}

              {rules.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No DSS rules configured yet.</p>
                  <p>Click "Add Rule" to create your first decision support rule.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default RulesManager;