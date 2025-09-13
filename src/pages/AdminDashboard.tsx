import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  FileText,
  MapPin,
  Calendar,
  Download,
  Settings,
  Eye,
  CheckCircle
} from "lucide-react";

// Mock data
const problemsData = [
  { name: 'Flooding', count: 45, color: '#3b82f6' },
  { name: 'Pests', count: 32, color: '#ef4444' },
  { name: 'Drought', count: 28, color: '#f97316' },
  { name: 'Disease', count: 22, color: '#8b5cf6' },
  { name: 'Other', count: 18, color: '#10b981' },
];

const monthlyTrends = [
  { month: 'Jan', reports: 65, resolved: 58 },
  { month: 'Feb', reports: 78, resolved: 72 },
  { month: 'Mar', reports: 85, resolved: 79 },
  { month: 'Apr', reports: 92, resolved: 88 },
  { month: 'May', reports: 88, resolved: 82 },
  { month: 'Jun', reports: 75, resolved: 70 },
];

const cropRecommendations = [
  { crop: 'Kangkong', frequency: 45 },
  { crop: 'Gabi', frequency: 38 },
  { crop: 'Rice', frequency: 35 },
  { crop: 'Cassava', frequency: 28 },
  { crop: 'Sweet Potato', frequency: 22 },
];

const recentReports = [
  {
    id: 1,
    farmer: "Juan Cruz",
    problem: "Flooding in rice field",
    location: "Brgy. San Miguel",
    date: "2024-01-15",
    status: "resolved",
    recommendation: "Plant flood-tolerant rice varieties"
  },
  {
    id: 2,
    farmer: "Maria Santos",
    problem: "Pest infestation on tomatoes",
    location: "Brgy. Poblacion",
    date: "2024-01-14",
    status: "pending",
    recommendation: "Use integrated pest management"
  },
  {
    id: 3,
    farmer: "Pedro Reyes",
    problem: "Drought affecting corn",
    location: "Brgy. Taytay",
    date: "2024-01-13",
    status: "resolved",
    recommendation: "Install drip irrigation system"
  }
];

const AdminDashboard = () => {
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const user = localStorage.getItem('username');
    
    if (role !== 'admin') {
      navigate('/');
      return;
    }
    
    setUsername(user || 'Admin');
  }, [navigate]);

  const exportData = (type: string) => {
    // Mock export functionality
    const data = type === 'reports' ? recentReports : problemsData;
    console.log(`Exporting ${type}:`, data);
    // In real app, this would generate and download CSV/PDF
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-primary rounded-lg p-6 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-primary-foreground/90">
                Welcome back, {username}. Here's your farm management overview.
              </p>
            </div>
            <Button 
              variant="outline" 
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              onClick={() => navigate('/admin/rules')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage Rules
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Farmers</p>
                  <p className="text-2xl font-bold">248</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Reports</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Resolved This Month</p>
                  <p className="text-2xl font-bold">145</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">89%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="map">Location Map</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Problem Types Chart */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Most Common Problems</CardTitle>
                  <CardDescription>Distribution of farming issues this month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={problemsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Monthly Trends */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Monthly Trends</CardTitle>
                  <CardDescription>Reports vs resolved issues over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="reports" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="resolved" 
                        stroke="hsl(var(--success))" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Crop Recommendations */}
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Top Crop Recommendations</CardTitle>
                    <CardDescription>Most frequently suggested crops</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportData('crops')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={cropRecommendations} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="crop" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="frequency" fill="hsl(var(--success))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Farmer Reports</CardTitle>
                    <CardDescription>Latest submissions from farmers</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => exportData('reports')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentReports.map((report) => (
                    <div 
                      key={report.id} 
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="font-medium">{report.farmer}</div>
                          <Badge 
                            variant={report.status === 'resolved' ? 'default' : 'secondary'}
                            className={report.status === 'resolved' ? 'bg-success text-success-foreground' : ''}
                          >
                            {report.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {new Date(report.date).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Problem: </span>
                          {report.problem}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {report.location}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Recommendation: </span>
                          {report.recommendation}
                        </div>
                      </div>
                      
                      <div className="flex justify-end mt-3">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="map" className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Barangay Problem Distribution</CardTitle>
                <CardDescription>Geographic distribution of farming issues</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 rounded-lg p-8 text-center">
                  <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Interactive Map Coming Soon</h3>
                  <p className="text-muted-foreground">
                    This will show the geographic distribution of farming problems across different barangays in Majayjay.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdminDashboard;