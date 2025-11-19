import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, ArrowLeft } from "lucide-react";
import AdminMessages from "@/components/dashboard/farmer/AdminMessages";
import { useAnnouncements } from "@/components/dashboard/farmer/UserAnnouncements";
import { useWeatherAlerts } from "@/hooks/custom/useWeatherAlerts";

// Get userId from localStorage
const getUserId = () => {
  return localStorage.getItem('userId') || 'default-user';
};

// Define alert types
type AlertCategory = 'all' | 'critical' | 'warning' | 'informational';

interface AlertItem {
  id: string;
  title: string;
  content: string;
  category: AlertCategory;
  date: string;
  type: string;
}

const Alerts = () => {
  const navigate = useNavigate();
  const userId = getUserId();
  const { weatherAlerts, loading: weatherLoading, error: weatherError } = useWeatherAlerts();
  const { announcements, loading: announcementsLoading } = useAnnouncements();
  const [activeCategory, setActiveCategory] = useState<AlertCategory>('all');

  // Function to transform weather alerts to our alert format
  const transformWeatherAlerts = (): AlertItem[] => {
    if (weatherLoading || weatherError || !weatherAlerts) return [];
    
    return weatherAlerts.map((alert, index) => ({
      id: `weather-${index}`,
      title: alert.description,
      content: alert.description,
      category: 'critical', // Weather alerts are always critical
      date: alert.date || new Date().toLocaleDateString(),
      type: 'weather'
    }));
  };

  // Function to transform announcements to our alert format
  const transformAnnouncements = (): AlertItem[] => {
    if (announcementsLoading || !announcements) return [];
    
    return announcements.map(announcement => ({
      id: `announcement-${announcement.id}`,
      title: announcement.title,
      content: announcement.content,
      category: 'informational', // Announcements are typically informational
      date: announcement.createdAt?.toDate?.().toLocaleDateString() || new Date().toLocaleDateString(),
      type: 'announcement'
    }));
  };

  // Combine all alerts
  const getAllAlerts = (): AlertItem[] => {
    const weatherAlertsFormatted = transformWeatherAlerts();
    const announcementsFormatted = transformAnnouncements();
    return [...weatherAlertsFormatted, ...announcementsFormatted];
  };

  // Filter alerts based on category
  const filterAlerts = (alerts: AlertItem[]) => {
    if (activeCategory === 'all') return alerts;
    return alerts.filter(alert => alert.category === activeCategory);
  };

  // Count alerts by category
  const countAlertsByCategory = () => {
    const allAlerts = getAllAlerts();
    return {
      all: allAlerts.length,
      critical: allAlerts.filter(a => a.category === 'critical').length,
      warning: allAlerts.filter(a => a.category === 'warning').length,
      informational: allAlerts.filter(a => a.category === 'informational').length
    };
  };

  const alertCounts = countAlertsByCategory();
  const filteredAlerts = filterAlerts(getAllAlerts());

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-primary rounded-lg p-6 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2 bg-white/10 text-white border-white/20 hover:bg-white/20">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Alerts & Notifications</h1>
                <p className="text-primary-foreground/90">
                  View alert & notifications
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter by Category */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Filter by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={activeCategory === 'all' ? 'default' : 'outline'}
                onClick={() => setActiveCategory('all')}
                className="flex items-center gap-2"
              >
                All Alerts
                <Badge variant="secondary" className="ml-2">
                  {alertCounts.all}
                </Badge>
              </Button>
              <Button
                variant={activeCategory === 'critical' ? 'default' : 'outline'}
                onClick={() => setActiveCategory('critical')}
                className="flex items-center gap-2"
              >
                Critical
                <Badge variant="destructive" className="ml-2">
                  {alertCounts.critical}
                </Badge>
              </Button>
              <Button
                variant={activeCategory === 'warning' ? 'default' : 'outline'}
                onClick={() => setActiveCategory('warning')}
                className="flex items-center gap-2"
              >
                Warning
                <Badge variant="secondary" className="ml-2">
                  {alertCounts.warning}
                </Badge>
              </Button>
              <Button
                variant={activeCategory === 'informational' ? 'default' : 'outline'}
                onClick={() => setActiveCategory('informational')}
                className="flex items-center gap-2"
              >
                Informational
                <Badge variant="secondary" className="ml-2">
                  {alertCounts.informational}
                </Badge>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Unified Alerts List */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Categorized Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {(weatherLoading || announcementsLoading) ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading alerts...
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No alerts found
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAlerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      alert.category === 'critical' ? 'bg-red-50 border-red-200' :
                      alert.category === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <span className="text-2xl">
                      {alert.type === 'weather' ? '🌤️' : '📢'}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="font-medium">{alert.title}</p>
                        <Badge 
                          variant={
                            alert.category === 'critical' ? 'destructive' :
                            alert.category === 'warning' ? 'secondary' : 'default'
                          }
                        >
                          {alert.category.charAt(0).toUpperCase() + alert.category.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-muted-foreground capitalize">
                          {alert.type === 'weather' ? 'Weather Alert' : 'Announcement'}
                        </p>
                        <span className="text-xs bg-secondary px-2 py-1 rounded">
                          {alert.date}
                        </span>
                      </div>
                      {alert.content && alert.type === 'announcement' && (
                        <p className="text-sm mt-2 text-muted-foreground">
                          {alert.content}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Messages */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <AdminMessages userId={userId} />
        </div>
      </div>

      {/* Alert Detail Dialog */}
      <Dialog open={false} onOpenChange={() => {}}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl">
                  {/* Empty */}
                </DialogTitle>
              </div>
              <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </DialogHeader>
          <ScrollArea className="flex-grow p-6">
            <div className="whitespace-pre-wrap">
              {/* Empty */}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Alerts;