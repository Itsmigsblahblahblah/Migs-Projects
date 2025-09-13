import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { 
  Calendar, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Filter,
  Download,
  Eye
} from "lucide-react";

const History = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [reportHistory, setReportHistory] = useState<any[]>([]);
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');

  useEffect(() => {
    if (!userRole) {
      navigate('/');
      return;
    }

    // Load history from localStorage (mock data)
    const history = JSON.parse(localStorage.getItem('reportHistory') || '[]');
    
    // Add some mock data if empty
    if (history.length === 0) {
      const mockHistory = [
        {
          id: 1,
          text: "Nalubog sa baha ang tanim kong mais",
          result: {
            problem: "flood",
            crop: "corn",
            recommend: ["Kangkong", "Gabi"],
            avoid: ["Corn", "Tomato"],
            advice: "Consider raised bed planting and improved drainage systems."
          },
          date: "2024-01-10T10:30:00Z",
          status: "resolved"
        },
        {
          id: 2,
          text: "May mga insektong kumakain sa dahon ng kamatis",
          result: {
            problem: "pest",
            crop: "tomato",
            recommend: ["Corn", "Root vegetables"],
            avoid: ["Cabbage", "Tomato"],
            advice: "Implement integrated pest management techniques."
          },
          date: "2024-01-08T14:15:00Z",
          status: "resolved"
        },
        {
          id: 3,
          text: "Tuyo na ang lupa, walang ulan sa loob ng dalawang linggo",
          result: {
            problem: "drought",
            crop: "general",
            recommend: ["Cassava", "Sweet potato"],
            avoid: ["Rice", "Leafy vegetables"],
            advice: "Install drip irrigation systems and use mulching."
          },
          date: "2024-01-05T09:20:00Z",
          status: "resolved"
        }
      ];
      setReportHistory(mockHistory);
      localStorage.setItem('reportHistory', JSON.stringify(mockHistory));
    } else {
      setReportHistory(history);
    }
  }, [navigate, userRole]);

  const filteredHistory = reportHistory.filter(report =>
    report.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.result.problem.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProblemColor = (problem: string) => {
    const colors = {
      flood: 'bg-blue-500/10 text-blue-700 border-blue-200',
      pest: 'bg-red-500/10 text-red-700 border-red-200',
      drought: 'bg-orange-500/10 text-orange-700 border-orange-200',
      disease: 'bg-purple-500/10 text-purple-700 border-purple-200',
      general: 'bg-gray-500/10 text-gray-700 border-gray-200'
    };
    return colors[problem as keyof typeof colors] || colors.general;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-primary rounded-lg p-6 text-primary-foreground">
          <h1 className="text-2xl font-bold mb-2">Report History</h1>
          <p className="text-primary-foreground/90">
            {userRole === 'farmer' 
              ? "View your past farm problem reports and recommendations" 
              : "Complete history of all farmer reports and system responses"
            }
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search & Filter Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by problem description or issue type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* History List */}
        <div className="space-y-4">
          {filteredHistory.length === 0 ? (
            <Card className="shadow-soft">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No reports found matching your search criteria.</p>
              </CardContent>
            </Card>
          ) : (
            filteredHistory.map((report) => (
              <Card key={report.id} className="shadow-soft hover:shadow-card transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge 
                        className={`${getProblemColor(report.result.problem)} border capitalize`}
                      >
                        {report.result.problem.replace('_', ' ')}
                      </Badge>
                      {report.result.crop !== 'unknown' && report.result.crop !== 'general' && (
                        <Badge variant="outline" className="capitalize">
                          {report.result.crop}
                        </Badge>
                      )}
                      <Badge 
                        variant={report.status === 'resolved' ? 'default' : 'secondary'}
                        className={report.status === 'resolved' ? 'bg-success text-success-foreground' : ''}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {report.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(report.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Original Problem */}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Problem Reported:</h4>
                    <p className="text-foreground bg-muted/50 p-3 rounded-lg">
                      "{report.text}"
                    </p>
                  </div>

                  {/* Recommendations Grid */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {report.result.recommend.length > 0 && (
                      <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                        <h4 className="text-sm font-medium text-success mb-2 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Recommended Crops
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {report.result.recommend.map((crop: string, index: number) => (
                            <Badge key={index} className="bg-success text-success-foreground text-xs">
                              {crop}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {report.result.avoid.length > 0 && (
                      <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                        <h4 className="text-sm font-medium text-destructive mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Crops to Avoid
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {report.result.avoid.map((crop: string, index: number) => (
                            <Badge key={index} variant="destructive" className="text-xs">
                              {crop}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expert Advice */}
                  <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                    <h4 className="text-sm font-medium text-accent-foreground mb-2">Expert Advice:</h4>
                    <p className="text-sm text-foreground/80">{report.result.advice}</p>
                  </div>

                  {/* Action Button */}
                  <div className="flex justify-end pt-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View Full Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Summary Stats */}
        {filteredHistory.length > 0 && (
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Summary Statistics</CardTitle>
              <CardDescription>Overview of your reporting activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-primary/5 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{filteredHistory.length}</div>
                  <div className="text-sm text-muted-foreground">Total Reports</div>
                </div>
                <div className="text-center p-4 bg-success/5 rounded-lg">
                  <div className="text-2xl font-bold text-success">
                    {filteredHistory.filter(r => r.status === 'resolved').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Resolved</div>
                </div>
                <div className="text-center p-4 bg-accent/5 rounded-lg">
                  <div className="text-2xl font-bold text-accent">
                    {Math.round((filteredHistory.filter(r => r.status === 'resolved').length / filteredHistory.length) * 100)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default History;