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
import { X } from "lucide-react";

// Define alert types
type AlertCategory = "critical" | "warning" | "informational";

interface Alert {
  id: string;
  category: AlertCategory;
  title: string;
  description: string;
  fullMessage: string;
  date: string;
  read: boolean;
}

// Mock alerts data
const mockAlerts: Alert[] = [
  {
    id: "1",
    category: "critical",
    title: "Severe Weather Alert",
    description: "Heavy rainfall and strong winds expected in your area within the next 24 hours.",
    fullMessage: "SEVERE WEATHER ALERT\n\nHeavy rainfall and strong winds expected in your area within the next 24 hours. Precautionary measures:\n\n1. Secure all outdoor equipment and crops\n2. Check drainage systems\n3. Move livestock to sheltered areas\n4. Postpone any spraying activities\n5. Monitor water levels in irrigation channels\n\nEstimated impact: High risk of flooding in low-lying areas.\n\nContact local emergency services if immediate assistance is required.",
    date: "2025-10-15T08:30:00Z",
    read: false
  },
  {
    id: "2",
    category: "warning",
    title: "Pest Infestation Detected",
    description: "Increased activity of brown planthoppers observed in nearby fields.",
    fullMessage: "PEST INFESTATION WARNING\n\nOur monitoring system has detected increased activity of brown planthoppers in fields within a 2km radius of your farm.\n\nRecommended actions:\n1. Inspect your crops immediately, focusing on the lower portions of plants\n2. Look for honeydew deposits and sooty mold\n3. Consider applying appropriate insecticides if threshold levels are reached\n4. Avoid excessive nitrogen fertilization which attracts these pests\n5. Introduce natural predators if possible\n\nNext monitoring scheduled: 2025-10-17\n\nFor more information on brown planthopper management, visit our resources section.",
    date: "2025-10-14T14:15:00Z",
    read: true
  },
  {
    id: "3",
    category: "informational",
    title: "New Government Subsidy Available",
    description: "Organic fertilizer subsidy program now accepting applications until November 30.",
    fullMessage: "INFORMATIONAL UPDATE\n\nNEW GOVERNMENT SUBSIDY PROGRAM\n\nThe Department of Agriculture has launched a new Organic Fertilizer Subsidy Program for small-scale farmers.\n\nEligibility criteria:\n- Registered farmers with less than 5 hectares\n- Must be cultivating organic or transitioning to organic practices\n- Valid farmer's ID and land ownership documents\n\nBenefits:\n- 70% subsidy on certified organic fertilizers\n- Free delivery to farms within 50km radius\n- Technical support for application methods\n\nApplication process:\n1. Visit your local DA office or go to www.da.gov.ph/subsidies\n2. Submit required documents\n3. Await approval (processing time: 2-3 weeks)\n\nDeadline for applications: November 30, 2025\n\nFor inquiries, contact the DA helpline: 1-800-FARM-HELP",
    date: "2025-10-13T09:45:00Z",
    read: false
  },
  {
    id: "4",
    category: "critical",
    title: "Irrigation System Failure",
    description: "Main water pump malfunction detected. Immediate attention required.",
    fullMessage: "CRITICAL SYSTEM ALERT\n\nMAIN IRRIGATION PUMP FAILURE\n\nOur sensors have detected a malfunction in your main irrigation pump system.\n\nSymptoms:\n- Water pressure below normal levels\n- Unusual vibration patterns\n- Increased energy consumption\n\nImmediate actions required:\n1. Switch to backup pump if available\n2. Contact maintenance technician immediately\n3. Inspect for visible damage or leaks\n4. Document error codes if displayed\n\nEstimated repair cost: ₱15,000 - ₱25,000\nRecommended technician: Juan dela Cruz (0917-123-4567)\n\nFailure to address this issue promptly may result in:\n- Crop stress and reduced yields\n- Permanent pump damage\n- Higher repair/replacement costs",
    date: "2025-10-12T16:20:00Z",
    read: true
  },
  {
    id: "5",
    category: "warning",
    title: "Market Price Fluctuation",
    description: "Rice prices have dropped 15% in the past week. Consider timing your harvest sales.",
    fullMessage: "MARKET ADVISORY\n\nRICE PRICE FLUCTUATION ALERT\n\nMarket monitoring shows a 15% drop in rice prices over the past week:\nPrevious average: ₱45/kg\nCurrent average: ₱38/kg\n\nFactors contributing to price drop:\n- Increased supply from northern regions\n- Decreased demand from processing plants\n- Import activities affecting local markets\n\nRecommendations:\n1. Hold harvest if storage facilities are adequate\n2. Consider alternative markets or buyers\n3. Monitor prices daily for optimal selling point\n4. Explore value-added products (e.g., processed rice)\n\nProjected recovery period: 2-3 weeks\nNext market update: 2025-10-20\n\nFor personalized marketing advice, schedule a consultation with our agricultural economist.",
    date: "2025-10-11T11:30:00Z",
    read: false
  },
  {
    id: "6",
    category: "informational",
    title: "Workshop on Climate-Resilient Farming",
    description: "Join our free workshop on sustainable farming practices this Saturday.",
    fullMessage: "INFORMATIONAL ANNOUNCEMENT\n\nCLIMATE-RESILIENT FARMING WORKSHOP\n\nYou're invited to a FREE workshop on climate-resilient farming practices!\n\nDate: Saturday, October 18, 2025\nTime: 9:00 AM - 4:00 PM\nVenue: Majayjay Municipal Hall\n\nTopics covered:\n1. Drought-resistant crop varieties\n2. Flood mitigation techniques\n3. Soil conservation methods\n4. Water-efficient irrigation systems\n5. Crop diversification strategies\n6. Government programs for climate adaptation\n\nIncludes:\n- Expert presentations\n- Hands-on demonstrations\n- Resource materials\n- Lunch provided\n\nRegistration required: Contact Maria Santos at 0923-456-7890\nLimited slots available: 50 participants\n\nCertificate of attendance will be provided.\nBring notebook and pen.",
    date: "2025-10-10T13:15:00Z",
    read: true
  }
];

const Alerts = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<AlertCategory | "all">("all");
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filter alerts based on selected category
  const filteredAlerts = selectedCategory === "all" 
    ? mockAlerts 
    : mockAlerts.filter(alert => alert.category === selectedCategory);

  // Handle alert click to show details
  const handleAlertClick = (alert: Alert) => {
    setSelectedAlert(alert);
    setIsDialogOpen(true);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedAlert(null);
  };

  // Get category display info
  const getCategoryInfo = (category: AlertCategory) => {
    switch (category) {
      case "critical":
        return { label: "Critical", color: "bg-red-500", textColor: "text-red-500" };
      case "warning":
        return { label: "Warning", color: "bg-yellow-500", textColor: "text-yellow-500" };
      case "informational":
        return { label: "Informational", color: "bg-blue-500", textColor: "text-blue-500" };
      default:
        return { label: category, color: "bg-gray-500", textColor: "text-gray-500" };
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-primary rounded-lg p-6 text-primary-foreground">
          <h1 className="text-2xl font-bold">Alerts & Notifications</h1>
          <p className="text-primary-foreground/90">
            Stay informed about important updates, warnings, and recommendations for your farm.
          </p>
        </div>

        {/* Category Filters */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Filter by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                onClick={() => setSelectedCategory("all")}
                className="flex items-center gap-2"
              >
                <span>All Alerts</span>
                <Badge variant="secondary" className="rounded-full">
                  {mockAlerts.length}
                </Badge>
              </Button>
              
              <Button
                variant={selectedCategory === "critical" ? "default" : "outline"}
                onClick={() => setSelectedCategory("critical")}
                className="flex items-center gap-2"
              >
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  Critical
                </span>
                <Badge variant="destructive" className="rounded-full">
                  {mockAlerts.filter(a => a.category === "critical").length}
                </Badge>
              </Button>
              
              <Button
                variant={selectedCategory === "warning" ? "default" : "outline"}
                onClick={() => setSelectedCategory("warning")}
                className="flex items-center gap-2"
              >
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                  Warning
                </span>
                <Badge variant="secondary" className="rounded-full bg-yellow-500 text-yellow-900">
                  {mockAlerts.filter(a => a.category === "warning").length}
                </Badge>
              </Button>
              
              <Button
                variant={selectedCategory === "informational" ? "default" : "outline"}
                onClick={() => setSelectedCategory("informational")}
                className="flex items-center gap-2"
              >
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  Informational
                </span>
                <Badge variant="secondary" className="rounded-full bg-blue-500 text-blue-50">
                  {mockAlerts.filter(a => a.category === "informational").length}
                </Badge>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Alerts List */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>
              {selectedCategory === "all" 
                ? "All Alerts" 
                : `${getCategoryInfo(selectedCategory as AlertCategory).label} Alerts`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No alerts found in this category.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAlerts.map((alert) => {
                  const categoryInfo = getCategoryInfo(alert.category);
                  return (
                    <div
                      key={alert.id}
                      className={`border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                        !alert.read ? "bg-muted/30 border-primary/30" : ""
                      }`}
                      onClick={() => handleAlertClick(alert)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`w-3 h-3 rounded-full ${categoryInfo.color}`}></span>
                            <Badge 
                              variant={alert.category === "critical" ? "destructive" : "secondary"}
                              className={
                                alert.category === "warning" 
                                  ? "bg-yellow-500 text-yellow-900" 
                                  : alert.category === "informational" 
                                    ? "bg-blue-500 text-blue-50" 
                                    : ""
                              }
                            >
                              {categoryInfo.label}
                            </Badge>
                            {!alert.read && (
                              <Badge variant="default" className="text-xs">
                                New
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-lg mb-1">{alert.title}</h3>
                          <p className="text-muted-foreground mb-2">{alert.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(alert.date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alert Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl">
                  {selectedAlert?.title}
                </DialogTitle>
                {selectedAlert && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`w-3 h-3 rounded-full ${getCategoryInfo(selectedAlert.category).color}`}></span>
                    <Badge 
                      variant={selectedAlert.category === "critical" ? "destructive" : "secondary"}
                      className={
                        selectedAlert.category === "warning" 
                          ? "bg-yellow-500 text-yellow-900" 
                          : selectedAlert.category === "informational" 
                            ? "bg-blue-500 text-blue-50" 
                            : ""
                      }
                    >
                      {getCategoryInfo(selectedAlert.category).label}
                    </Badge>
                  </div>
                )}
              </div>
              {/* Using the same close button style as FarmerDashboard dialogs */}
              <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
            {selectedAlert && (
              <DialogDescription className="mt-2">
                {new Date(selectedAlert.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </DialogDescription>
            )}
          </DialogHeader>
          
          <ScrollArea className="flex-grow p-6">
            <div className="whitespace-pre-wrap">
              {selectedAlert?.fullMessage}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Alerts;