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
import AdminMessages from "@/components/dashboard/farmer/AdminMessages";
import { useWeatherAlerts } from "@/hooks/custom/useWeatherAlerts";

// Get userId from localStorage
const getUserId = () => {
  return localStorage.getItem('userId') || 'default-user';
};

const Alerts = () => {
  const navigate = useNavigate();
  const userId = getUserId();
  const { weatherAlerts, loading: weatherLoading, error: weatherError, getAlertColor } = useWeatherAlerts();

  // Debugging: Log the alerts to see what we're getting
  console.log("Weather alerts in Alerts page:", weatherAlerts);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-primary rounded-lg p-6 text-primary-foreground">
          <h1 className="text-2xl font-bold">Alerts & Notifications</h1>
          <p className="text-primary-foreground/90">
            View alert & notifications
          </p>
        </div>

        {/* Weather Alerts */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">🌤️</span>
              Weather Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weatherLoading ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading weather alerts...
              </div>
            ) : weatherError ? (
              <div className="text-center py-4 text-destructive">
                {weatherError}
              </div>
            ) : weatherAlerts.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No weather alerts at this time
              </div>
            ) : (
              <div className="space-y-3">
                {weatherAlerts.map((alert, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center gap-3 p-3 rounded-lg border ${getAlertColor(alert.severity)}`}
                  >
                    <span className="text-2xl">{alert.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium">{alert.description}</p>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-muted-foreground capitalize">
                          {alert.type.replace(/([A-Z])/g, ' $1').trim()} Alert
                        </p>
                        {alert.date && (
                          <span className="text-xs bg-secondary px-2 py-1 rounded">
                            {alert.date}
                          </span>
                        )}
                      </div>
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