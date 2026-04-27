import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, RefreshCw, Warehouse, Users, Sprout, ChevronDown, ChevronUp, TrendingUp, AlertCircle, Sparkles } from "lucide-react";

// Backend URL from environment variable or default to localhost
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

interface Recommendation {
  id: string;
  title: string;
  category: 'post-harvest' | 'cooperative' | 'soil-analysis' | 'climate' | 'pest-management' | 'general';
  priority: 'high' | 'medium' | 'low';
  description: string;
  reasoning: string;
  expectedImpact: string;
  dataInsights?: string; // Summary of data that triggered this recommendation
}

interface AIRecommendationsProps {
  reports: any[];
}

// Cache key and duration (1 week = 7 days)
const CACHE_KEY = 'adminAIRecommendations';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

const AIRecommendations = ({ reports }: AIRecommendationsProps) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Check if cache is still valid
  const getCachedRecommendations = (): { data: Recommendation[] | null, isExpired: boolean } => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return { data: null, isExpired: true };

      const { data, timestamp } = JSON.parse(cached);
      const isExpired = Date.now() - timestamp > CACHE_DURATION;
      
      return { data, isExpired };
    } catch {
      return { data: null, isExpired: true };
    }
  };

  // Cache recommendations
  const cacheRecommendations = (data: Recommendation[]) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error caching recommendations:', error);
    }
  };

  // Analyze data and generate recommendations using Gemini AI
  const generateRecommendations = async () => {
    setLoading(true);
    
    try {
      // Use the reports data passed as props (no Firestore fetching needed)
      const complaints = reports || [];
      
      console.log('Starting recommendation generation with', complaints.length, 'reports');

      // Analyze complaint patterns from reports
      const totalComplaints = complaints.length;
      const pestCount = complaints.filter((c: any) => 
        c.problem?.toLowerCase().includes('pest') || 
        c.problem?.toLowerCase().includes('insect') ||
        c.problemType?.toLowerCase().includes('pest') || 
        c.problemType?.toLowerCase().includes('insect')
      ).length;
      
      const diseaseCount = complaints.filter((c: any) => 
        c.problem?.toLowerCase().includes('disease') || 
        c.problem?.toLowerCase().includes('blight') ||
        c.problemType?.toLowerCase().includes('disease') || 
        c.problemType?.toLowerCase().includes('blight')
      ).length;

      const weatherCount = complaints.filter((c: any) => 
        c.problem?.toLowerCase().includes('weather') || 
        c.problem?.toLowerCase().includes('flood') ||
        c.problem?.toLowerCase().includes('drought') ||
        c.problemType?.toLowerCase().includes('weather') || 
        c.problemType?.toLowerCase().includes('flood') ||
        c.problemType?.toLowerCase().includes('drought')
      ).length;

      // Extract production data from reports (crops mentioned)
      const cropsMentioned = complaints
        .filter((c: any) => c.affectedCrop && c.affectedCrop !== 'unknown')
        .map((c: any) => c.affectedCrop);
      
      const uniqueCrops = [...new Set(cropsMentioned)];
      const postHarvestCrops = complaints.filter((c: any) => 
        c.status === 'post-harvest' || c.problem?.toLowerCase().includes('post-harvest')
      );

      // Get unique farmers from reports
      const uniqueFarmers = new Set(complaints.map((c: any) => c.userId)).size;
      // Estimate small farmers (we don't have exact data, assume 60% if we can't determine)
      const smallFarmers = Math.round(uniqueFarmers * 0.6);

      // Get recent complaints for context (last 50)
      const recentComplaints = complaints
        .slice(0, 50)
        .map((c: any) => ({
          problem: c.problem || c.problemType || 'unknown',
          crop: c.affectedCrop || 'unknown',
          text: c.reportText || '',
          status: c.status || 'pending',
          timestamp: c.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        }));

      // Prepare summary statistics
      const dataSummary = {
        totalComplaints,
        pestCount,
        diseaseCount,
        weatherCount,
        pestPercentage: totalComplaints > 0 ? Math.round((pestCount / totalComplaints) * 100) : 0,
        diseasePercentage: totalComplaints > 0 ? Math.round((diseaseCount / totalComplaints) * 100) : 0,
        weatherPercentage: totalComplaints > 0 ? Math.round((weatherCount / totalComplaints) * 100) : 0,
        postHarvestPercentage: complaints.length > 0 ? Math.round((postHarvestCrops.length / complaints.length) * 100) : 0,
        totalFarmers: uniqueFarmers,
        smallFarmers,
        smallFarmerPercentage: uniqueFarmers > 0 ? Math.round((smallFarmers / uniqueFarmers) * 100) : 60,
        totalProduction: cropsMentioned.length,
        uniqueCrops: uniqueCrops.length,
        recentComplaints: recentComplaints
      };

      // Call Gemini AI for recommendations
      console.log('Calling Gemini AI with data:', {
        totalComplaints,
        pestPercentage: dataSummary.pestPercentage,
        diseasePercentage: dataSummary.diseasePercentage,
        weatherPercentage: dataSummary.weatherPercentage,
        uniqueFarmers: dataSummary.totalFarmers
      });

      // Simplify the data sent to AI to avoid timeout
      const simplifiedDataSummary = {
        totalComplaints: dataSummary.totalComplaints,
        pestCount: dataSummary.pestCount,
        diseaseCount: dataSummary.diseaseCount,
        weatherCount: dataSummary.weatherCount,
        pestPercentage: dataSummary.pestPercentage,
        diseasePercentage: dataSummary.diseasePercentage,
        weatherPercentage: dataSummary.weatherPercentage,
        postHarvestPercentage: dataSummary.postHarvestPercentage,
        totalFarmers: dataSummary.totalFarmers,
        smallFarmers: dataSummary.smallFarmers,
        smallFarmerPercentage: dataSummary.smallFarmerPercentage
      };

      const geminiResponse = await fetch(`${BACKEND_URL}/gemini/generate-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `
E ikaw ay isang expert agricultural advisor para sa Department of Agriculture (DA) at mga magsasaka sa Majayjay, Laguna. Based sa actual data from the farm resource management system, magbigay ng 3-5 SMART recommendations para sa admin at farmers.

DATA SUMMARY:
${JSON.stringify(simplifiedDataSummary, null, 2)}

IMPORTANT GUIDELINES:
1. Gamitin ang Taglish na natural at madaling maintindihan (hindi masyadong malalim na terms)
2. I-focus ang recommendations sa pinaka-urgent na issues based sa data
3. Dapat specific at actionable - may clear steps na pwedeng gawin
4. Laging i-explain KUNG BAKIT recommended (based sa data insights)
5. I-explain PAANO makatutulong sa farmers at DA workflow
6. Priority: post-harvest facilities, farmer cooperatives, soil analysis (if applicable lang, hindi laging kasama)
7. Tone: friendly, helpful, professional pero approachable

Magbigay ng EXACTLY 3-5 recommendations. Consider these angles:
- Kung mataas ang pest/disease complaints -> soil analysis + integrated pest management
- Kung maraming small farmers (< 2 hectares) -> cooperative formation
- Kung maraming post-harvest issues -> post-harvest facilities
- Kung madalas weather-related -> climate resilience programs
- Always base sa actual data patterns, hindi generic advice

Respond in VALID JSON format only:
{
  "recommendations": [
    {
      "title": "Title ng recommendation",
      "category": "post-harvest|cooperative|soil-analysis|climate|pest-management|general",
      "priority": "high|medium|low",
      "description": "Brief description (Taglish, 1-2 sentences)",
      "reasoning": "Detailed explanation bakit ito recommended based sa data. Include specific percentages at numbers. (Taglish, 3-5 sentences)",
      "expectedImpact": "Ano ang benefit sa farmers at DA? Paano makakatulong? (Taglish, 2-3 sentences)",
      "dataInsights": "Summary ng data pattern na nag-trigger nito (e.g., '88% ng complaints ay pest-related sa nakaraang 3 months')"
    }
  ]
}

Make it natural, helpful, and data-driven. Ensure VALID JSON response only.
`
            }]
          }]
        }),
        signal: AbortSignal.timeout(30000) // 30 seconds timeout
      });

      console.log('Gemini response status:', geminiResponse.status);

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error('Gemini API error:', geminiResponse.status, errorText);
        throw new Error(`Failed to get AI recommendations: ${geminiResponse.status} ${errorText}`);
      }

      const geminiData = await geminiResponse.json();
      const aiResponse = geminiData.candidates[0].content.parts[0].text;
      
      // Extract and parse JSON from AI response
      const jsonStart = aiResponse.indexOf('{');
      const jsonEnd = aiResponse.lastIndexOf('}') + 1;
      const jsonString = aiResponse.substring(jsonStart, jsonEnd);
      const parsedData = JSON.parse(jsonString);

      // Format recommendations
      const generatedRecommendations: Recommendation[] = parsedData.recommendations.map((rec: any, index: number) => ({
        id: `ai-rec-${Date.now()}-${index}`,
        title: rec.title,
        category: rec.category,
        priority: rec.priority,
        description: rec.description,
        reasoning: rec.reasoning,
        expectedImpact: rec.expectedImpact,
        dataInsights: rec.dataInsights
      }));

      setRecommendations(generatedRecommendations);
      setLastUpdated(new Date());
      cacheRecommendations(generatedRecommendations);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      console.log('Falling back to rule-based recommendations');
      // Fallback to basic recommendations if AI fails
      generateFallbackRecommendations(reports || []);
    } finally {
      setLoading(false);
    }
  };

  // Fallback recommendations if AI API fails
  const generateFallbackRecommendations = (complaintsData: any[]) => {
    try {
      const totalComplaints = complaintsData.length;
      const pestCount = complaintsData.filter((c: any) => 
        c.problem?.toLowerCase().includes('pest') || 
        c.problem?.toLowerCase().includes('insect') ||
        c.problemType?.toLowerCase().includes('pest') || 
        c.problemType?.toLowerCase().includes('insect')
      ).length;
      
      const diseaseCount = complaintsData.filter((c: any) => 
        c.problem?.toLowerCase().includes('disease') || 
        c.problem?.toLowerCase().includes('blight') ||
        c.problemType?.toLowerCase().includes('disease') || 
        c.problemType?.toLowerCase().includes('blight')
      ).length;

      const weatherCount = complaintsData.filter((c: any) => 
        c.problem?.toLowerCase().includes('weather') || 
        c.problem?.toLowerCase().includes('flood') ||
        c.problem?.toLowerCase().includes('drought') ||
        c.problemType?.toLowerCase().includes('weather') || 
        c.problemType?.toLowerCase().includes('flood') ||
        c.problemType?.toLowerCase().includes('drought')
      ).length;

      const pestPercentage = totalComplaints > 0 ? Math.round((pestCount / totalComplaints) * 100) : 0;
      const diseasePercentage = totalComplaints > 0 ? Math.round((diseaseCount / totalComplaints) * 100) : 0;
      const weatherPercentage = totalComplaints > 0 ? Math.round((weatherCount / totalComplaints) * 100) : 0;

      const postHarvestCrops = complaintsData.filter((c: any) => 
        c.status === 'post-harvest' || c.problem?.toLowerCase().includes('post-harvest')
      );
      const needsPostHarvestSupport = postHarvestCrops.length > complaintsData.length * 0.3;

      const uniqueFarmers = new Set(complaintsData.map((c: any) => c.userId)).size;
      const smallFarmers = Math.round(uniqueFarmers * 0.6);
      const needsCooperation = smallFarmers > complaintsData.length * 0.5;
      const needsSoilAnalysis = pestPercentage > 20 || diseasePercentage > 15;

      const generatedRecommendations: Recommendation[] = [];

      // Post-Harvest Facilities - Only recommend if there's actual need
      if (needsPostHarvestSupport) {
        const postHarvestPercent = Math.round((postHarvestCrops.length / Math.max(totalComplaints, 1)) * 100);
        generatedRecommendations.push({
          id: 'post-harvest-001',
          title: 'Recommend Post-Harvest Facilities',
          category: 'post-harvest',
          priority: 'high',
          description: 'Mag-setup ng post-harvest facilities (drying centers, cold storage, processing areas) sa mga barangay na may mataas na crop production para mabawasan ang losses at mag-quality ng produce.',
          reasoning: `May total ${totalComplaints} reports sa system, at karamihan ay may concerns sa post-harvest handling. Pag nawala ang proper facilities tulad ng drying centers at cold storage, maraming produce ang nasasira o nabubulok bago pa ma-market. Ang post-harvest losses sa Philippines ay umaabot ng 15-25% ng total production. Kung may proper facilities na, makakabili ang farmers ng better prices kasi mas mataas ang quality ng kanilang produce. Para sa DA workflow, mas madali na i-monitor ang quality standards at makatutulong ito sa pag-improve ng farmer incomes sa Majayjay.`,
          expectedImpact: 'Mababawasan ang post-harvest losses ng 15-25%, tataas ang income ng farmers ng 20-30% dahil sa better quality produce, at magkakaroon ng standardized quality control para sa market. Makakatulong din ito sa DA monitoring programs.',
          dataInsights: `Base sa ${totalComplaints} total reports at analysis ng post-harvest handling issues sa Majayjay`
        });
      }

      // Farmer Cooperatives - Recommend if there are many small farmers
      if (needsCooperation || uniqueFarmers > 5) {
        generatedRecommendations.push({
          id: 'cooperative-001',
          title: 'Recommend Cooperative for Farmers',
          category: 'cooperative',
          priority: 'high',
          description: 'I-organize ang farmers into cooperatives o producer groups para mas maging efficient ang resource sharing, bulk purchasing ng inputs, at marketing ng produce.',
          reasoning: `May ${uniqueFarmers} active farmers sa system na nag-aoperate ng iba't ibang farm sizes. Kapag nag-coordinate sila sa cooperative, mas malaki ang bargaining power nila sa market. Pwede silang makabili ng discounted inputs (fertilizers, seeds, pesticides) na 10-20% mas mura kaysa sa individual purchasing. Para sa DA, mas madali mag-train at mag-provide ng services sa organized groups kaysa sa individual farmers. Ang cooperatives ay nakakatulong din sa risk sharing lalo na pag may weather-related issues o market fluctuations.`,
          expectedImpact: 'Mababawasan ang input costs ng 10-20% through bulk purchasing, tataas ang bargaining power sa buyers, mas madali ang access sa credit at insurance programs, at magiging organized ang farmer community para sa DA programs.',
          dataInsights: `${uniqueFarmers} active farmers sa system na pwedeng mag-coordinate sa cooperative model`
        });
      }

      // Soil Analysis - Recommend if pest/disease issues are significant
      if (needsSoilAnalysis) {
        generatedRecommendations.push({
          id: 'soil-analysis-001',
          title: 'Recommend Soil Analysis para sa Bawat Farmer Land',
          category: 'soil-analysis',
          priority: 'high',
          description: 'Mag-conduct ng comprehensive soil testing para sa bawat farmer\'s land para ma-determine ang nutrient deficiencies, soil pH, at ma-recommend ang tamang fertilizer application.',
          reasoning: `${pestPercentage}% ng reports ay pest-related at ${diseasePercentage}% ay disease-related issues. Madalas ang root cause nito ay improper fertilization dahil hindi alam ang actual nutrient content ng soil. Halimbawa, kung mababa ang potassium sa soil, mas prone ang crops sa pests at diseases. Kung alam natin ang soil composition sa bawat farm, pwede nating i-customize ang fertilizer recommendations instead ng generic approach. Ito ang magiging basehan para sa tamang fertilizer type, amount, at application schedule.`,
          expectedImpact: 'Mababawasan ang pest at disease incidence ng 30-40% dahil sa proper nutrition, ma-o-optimize ang fertilizer use (hindi over o under-fertilize), tataas ang crop yields ng 15-30%, at magkakaroon ng soil health database ang DA para sa future planning.',
          dataInsights: `${pestPercentage}% pest-related at ${diseasePercentage}% disease-related reports na pwedeng ma-address ng proper soil management`
        });
      }

      // Climate Resilience - Only if weather issues are significant
      if (generatedRecommendations.length < 3 && weatherPercentage > 25) {
        generatedRecommendations.push({
          id: 'climate-001',
          title: 'Implement Climate Resilience Programs',
          category: 'climate',
          priority: 'medium',
          description: 'Mag-develop ng climate-resilient farming practices, mag-establish ng early warning systems, at mag-train ng farmers para sa extreme weather events tulad ng floods, droughts, at typhoons.',
          reasoning: `${weatherPercentage}% ng reports ay weather-related issues (floods, droughts, typhoons). Ang climate change ay nagpapalala ng extreme weather conditions sa Majayjay at nearby areas. Important na mag-prepare ng contingency plans bago dumating ang bagyo o tagtuyot. Ang climate resilience programs ay kasama ang crop diversification, water management systems, weather-resistant crop varieties, at early warning systems para sa farmers.`,
          expectedImpact: 'Mababawasan ang weather-related crop losses ng 20-35%, magiging prepared ang farmers sa climate change impacts, mababawasan ang economic losses, at magkakaroon ng proactive approach ang DA sa disaster risk reduction.',
          dataInsights: `${weatherPercentage}% ng total reports ay weather-related (${weatherCount} out of ${totalComplaints})`
        });
      }

      // IPM Training - Only if pest issues are very high
      if (generatedRecommendations.length < 3 && pestPercentage > 30) {
        generatedRecommendations.push({
          id: 'ipm-001',
          title: 'Promote Integrated Pest Management (IPM) Training',
          category: 'pest-management',
          priority: 'medium',
          description: 'Mag-conduct ng comprehensive IPM training workshops para sa farmers para matutunan nila ang sustainable pest control methods na hindi lang nakadepende sa chemical pesticides.',
          reasoning: `${pestPercentage}% ng reports ay pest-related issues na nagpapakita ng heavy reliance sa chemical pesticides. Ang IPM ay nagtuturo ng biological control (natural predators), crop rotation, intercropping, at cultural practices para i-reduce ang pests. Mas sustainable ito at mas mura sa long-term. Ang过度使用 ng chemicals ay nagdudulot ng pesticide resistance at soil degradation.`,
          expectedImpact: 'Mababawasan ang pesticide costs ng 25-40%, magiging healthier ang soil at environment, mababawasan ang pesticide resistance ng pests, at magkakaroon ng sustainable pest management strategy ang farmers.',
          dataInsights: `${pestPercentage}% pest-related issues (${weatherCount} reports) na pwedeng ma-address ng IPM`
        });
      }

      // Always ensure at least 3 recommendations
      if (generatedRecommendations.length < 3) {
        generatedRecommendations.push({
          id: 'general-001',
          title: 'Enhance Digital Farming Records at Documentation',
          category: 'general',
          priority: 'low',
          description: 'I-encourage ang farmers na mag-maintain ng detailed digital records ng planting schedules, inputs used, harvest data, at sales para sa better decision making at traceability.',
          reasoning: 'Ang data-driven farming ay nakakatulong mag-identify ng patterns sa crop performance, pest cycles, at market trends. Kapag may complete records, mas accurate ang forecasting, budgeting, at planning. Makakatulong din ito sa DA para mabigyan ng tailored recommendations ang bawat farmer based sa kanilang actual farm data instead ng generic advice. Ang good documentation ay important din para sa certification programs at market access.',
          expectedImpact: 'Magiging better ang decision-making accuracy, mag-eenable ng predictive analytics para sa crop planning, magiging transparent ang supply chain, at magkakaroon ng comprehensive database ang DA para sa policy making.',
          dataInsights: 'General recommendation para sa better data management at digital transformation sa farming'
        });
      }

      setRecommendations(generatedRecommendations);
      setLastUpdated(new Date());
      cacheRecommendations(generatedRecommendations);
    } catch (error) {
      console.error('Error generating fallback recommendations:', error);
    }
  };
  // Load recommendations on mount
  useEffect(() => {
    const { data, isExpired } = getCachedRecommendations();
    
    if (data && !isExpired && reports.length > 0) {
      // Use cached data if not expired and we have reports
      setRecommendations(data);
      setLastUpdated(new Date(data[0]?.id ? parseInt(data[0].id.split('-')[1]) || Date.now() : Date.now()));
    } else if (reports.length > 0) {
      // Generate fresh recommendations if we have reports data
      console.log('Auto-generating recommendations on mount...');
      generateRecommendations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports]);

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'post-harvest':
        return <Warehouse className="h-5 w-5" />;
      case 'cooperative':
        return <Users className="h-5 w-5" />;
      case 'soil-analysis':
        return <Sprout className="h-5 w-5" />;
      default:
        return <Lightbulb className="h-5 w-5" />;
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              AI-Powered Recommendations
            </CardTitle>
            <CardDescription>
              Weekly AI-powered suggestions based sa actual complaints at production data
              {lastUpdated && (
                <span className="ml-2 text-xs">
                  • Last generated: {lastUpdated.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={generateRecommendations}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Sparkles className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Generating...' : 'Request AI Recommendation'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Force refresh by clearing cache
                localStorage.removeItem(CACHE_KEY);
                generateRecommendations();
              }}
              disabled={loading}
              className="hover:bg-blue-50"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-muted-foreground">Analyzing data with Gemini AI...</p>
              <p className="text-xs text-muted-foreground mt-1">Nag-generate ng smart recommendations</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.length === 0 && (
              <div className="flex items-center gap-3 p-6 border rounded-lg bg-yellow-50">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-yellow-900">Walang recommendations sa ngayon</p>
                  <p className="text-sm text-yellow-700 mt-1">Magaan ang mood! Pwede mong i-refresh para mag-generate ng bago based sa latest data.</p>
                </div>
              </div>
            )}
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="border rounded-lg hover:shadow-md transition-shadow bg-gradient-to-r from-white to-blue-50/30"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        {getCategoryIcon(rec.category)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{rec.title}</h3>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getPriorityColor(rec.priority)}`}
                          >
                            {rec.priority} priority
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{rec.description}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(rec.id)}
                      className="shrink-0"
                    >
                      {expandedId === rec.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {expandedId === rec.id && (
                    <div className="mt-4 pt-4 border-t space-y-4 bg-blue-50/50 rounded-lg p-4">
                      {rec.dataInsights && (
                        <div>
                          <h4 className="font-semibold text-sm text-purple-900 mb-2 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Data Insights
                          </h4>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {rec.dataInsights}
                          </p>
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-sm text-blue-900 mb-2 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Bakit ito recommended?
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {rec.reasoning}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-green-900 mb-2 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Benefit sa Farmers at DA
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {rec.expectedImpact}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIRecommendations;
