import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Trash2, Check, AlertTriangle } from "lucide-react";
import { db, auth } from "@/firebaseConfig";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useWeatherAlerts } from "@/hooks/custom/useWeatherAlerts";
import { useAnnouncements } from "@/components/dashboard/farmer/UserAnnouncements";
import { useNavigate } from "react-router-dom";

// Define alert types
interface AdvisoryItem {
  id: string;
  title: string;
  content?: string;
  category: string;
  date: string;
  type: string;
  read?: boolean;
  severity?: string;
  timestamp?: number; // Add timestamp for accurate sorting
}

// Function to create a stable ID for weather alerts (copied from Alerts.tsx)
const createWeatherAlertId = (description: string, date: string) => {
  // Create a simple hash-based ID to avoid issues with special characters in btoa
  let hash = 0;
  const str = description + date;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `weather-${Math.abs(hash)}`;
};

// Function to check if a date string represents today
const isToday = (dateString: string): boolean => {
  try {
    // Handle empty or invalid date strings
    if (!dateString || typeof dateString !== 'string') {
      return false;
    }
    
    // Trim whitespace
    const trimmedDate = dateString.trim();
    
    // Get today's date in the same format
    const todayFormatted = new Date().toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
    
    // Direct comparison first
    if (trimmedDate === todayFormatted) {
      return true;
    }
    
    // If direct comparison fails, try to parse both dates and compare
    // This handles cases where the date might be in a slightly different format
    try {
      // Parse the date string - try multiple formats
      const today = new Date();
      
      // Try to match the format: "Wed, Oct 18" or similar
      const dateParts = trimmedDate.split(' ');
      if (dateParts.length === 3) {
        const [, month, day] = dateParts;
        const parsedDate = new Date(`${month} ${day}, ${today.getFullYear()}`);
        
        // Check if it's today (accounting for year boundaries)
        return (
          parsedDate.getDate() === today.getDate() &&
          parsedDate.getMonth() === today.getMonth() &&
          parsedDate.getFullYear() === today.getFullYear()
        );
      }
      
      // Fallback to standard date parsing
      const parsedDate = new Date(trimmedDate);
      if (!isNaN(parsedDate.getTime())) {
        return (
          parsedDate.getDate() === today.getDate() &&
          parsedDate.getMonth() === today.getMonth() &&
          parsedDate.getFullYear() === today.getFullYear()
        );
      }
    } catch (parseError) {
      // If parsing fails, fall back to direct string comparison
      return trimmedDate === todayFormatted;
    }
    
    return false;
  } catch (error) {
    console.error('Error in isToday function:', error);
    return false;
  }
};

const AdvisoryContainer = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId') || 'default-user';
  const { weatherAlerts, loading: weatherLoading } = useWeatherAlerts();
  const { announcements, loading: announcementsLoading, userReadStatus, setUserReadStatus } = useAnnouncements();
  
  const [advisoryItems, setAdvisoryItems] = useState<AdvisoryItem[]>([]);
  const [todayItems, setTodayItems] = useState<AdvisoryItem[]>([]);
  const [previousItems, setPreviousItems] = useState<AdvisoryItem[]>([]);

  // Transform weather alerts to advisory format
  const transformWeatherAlerts = (): AdvisoryItem[] => {
    if (weatherLoading || !weatherAlerts) return [];

    return weatherAlerts.map((alert) => {
      // Create a stable ID based on the alert description and date
      const weatherAlertId = createWeatherAlertId(alert.description, alert.date || '');
      const status = userReadStatus[weatherAlertId];
      const isRead = status ? (typeof status === 'boolean' ? status : status.read) : false;
      const isDeleted = status && typeof status !== 'boolean' ? status.deleted : false;

      // Skip deleted weather alerts
      if (isDeleted) {
        return null;
      }

      // Use the date from the alert if available, otherwise use today's date
      // Ensure consistent formatting with the same format used in useWeatherAlerts
      const alertDate = alert.date || new Date().toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });

      return {
        id: weatherAlertId,
        title: alert.description,
        content: alert.description,
        category: 'weather',
        date: alertDate,
        type: 'weather',
        read: isRead,
        severity: alert.severity,
        timestamp: (alert as any).timestamp || new Date().getTime() // Use timestamp if available
      };
    }).filter(alert => alert !== null) as AdvisoryItem[];
  };

  // Transform announcements to advisory format
  const transformAnnouncements = (): AdvisoryItem[] => {
    if (announcementsLoading || !announcements) return [];

    return announcements.map(announcement => {
      const announcementId = announcement.id;
      const status = userReadStatus[announcementId];
      const isRead = status ? (typeof status === 'boolean' ? status : status.read) : false;
      const isDeleted = status && typeof status !== 'boolean' ? status.deleted : false;

      // Skip deleted announcements
      if (isDeleted) {
        return null;
      }

      // Format the date consistently with the same format used in useWeatherAlerts
      const announcementDate = announcement.createdAt?.toDate().toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      }) || new Date().toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });

      return {
        id: `announcement-${announcementId}`,
        title: announcement.title,
        content: announcement.content,
        category: 'announcement',
        date: announcementDate,
        type: 'announcement',
        read: isRead,
        timestamp: announcement.createdAt?.toDate().getTime() || new Date().getTime() // Use actual timestamp
      };
    }).filter(alert => alert !== null) as AdvisoryItem[];
  };

  // Combine and sort all advisory items
  useEffect(() => {
    const weatherItems = transformWeatherAlerts();
    const announcementItems = transformAnnouncements();
    
    // Combine all items
    const allItems = [...weatherItems, ...announcementItems];
    
    // Sort by timestamp (newest first) - use actual timestamp for accurate sorting
    allItems.sort((a, b) => {
      // Use timestamp if available, fallback to date parsing
      const timeA = a.timestamp || new Date(a.date).getTime() || 0;
      const timeB = b.timestamp || new Date(b.date).getTime() || 0;
      return timeB - timeA; // Descending order (newest first)
    });
    
    setAdvisoryItems(allItems);
  }, [weatherAlerts, announcements, userReadStatus, weatherLoading, announcementsLoading]);

  // Categorize items into today and previous items
  useEffect(() => {
    // Filter today's items using the precise date comparison
    const todayFiltered = advisoryItems.filter(item => {
      return isToday(item.date);
    });
    
    setTodayItems(todayFiltered);
    
    // Get previous items (excluding today's)
    const previousFiltered = advisoryItems.filter(item => !isToday(item.date));
    
    // Take only the last 3 previous items
    setPreviousItems(previousFiltered.slice(0, 3));
  }, [advisoryItems]);

  // Function to get alert color based on severity
  const getAlertColor = (severity: string | undefined, category: string) => {
    if (category === 'weather') {
      // Use the same color scheme as the Alerts page for weather alerts
      return 'bg-red-50 border-red-200 text-red-800';
    } else {
      return 'text-blue-500 bg-blue-50 border-blue-200';
    }
  };

  // Function to mark an item as read
  const markAsRead = async (item: AdvisoryItem) => {
    try {
      if (item.type === 'announcement') {
        // For announcements, create a read status record
        const announcementId = item.id.replace('announcement-', '');
        await setDoc(doc(db, "userReadStatus", userId, "announcements", announcementId), {
          read: true,
          timestamp: new Date()
        });

        // Update local read status immediately
        setUserReadStatus(prev => ({
          ...prev,
          [announcementId]: { read: true, timestamp: new Date() }
        }));
      } else if (item.type === 'weather') {
        // For weather alerts, create a read status record
        const weatherAlertId = item.id;
        await setDoc(doc(db, "userReadStatus", userId, "weather", weatherAlertId), {
          read: true,
          deleted: false,
          timestamp: new Date()
        });

        // Update local read status immediately
        setUserReadStatus(prev => ({
          ...prev,
          [weatherAlertId]: { read: true, deleted: false, timestamp: new Date() }
        }));
      }

      toast({
        title: "Success",
        description: "Advisory marked as read.",
      });
    } catch (error) {
      console.error("Error marking advisory as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark advisory as read.",
        variant: "destructive",
      });
    }
  };

  // Function to delete/clear an item
  const deleteItem = async (item: AdvisoryItem) => {
    try {
      if (item.type === 'announcement') {
        // Check if user is admin
        const currentUser = auth.currentUser;
        const isAdmin = currentUser && currentUser.email === 'admin@majayjay.farm';

        const announcementId = item.id.replace('announcement-', '');

        if (isAdmin) {
          // Admin can actually delete the announcement
          await deleteDoc(doc(db, "announcements", announcementId));
          toast({
            title: "Success",
            description: "Announcement deleted successfully.",
          });
        } else {
          // Farmer can only mark as read and hide it from their view
          await setDoc(doc(db, "userReadStatus", userId, "announcements", announcementId), {
            read: true,
            deleted: true,
            timestamp: new Date()
          });

          toast({
            title: "Success",
            description: "Announcement removed from your view.",
          });
        }
      } else if (item.type === 'weather') {
        // For weather alerts, mark as deleted in user read status
        const weatherAlertId = item.id;

        try {
          // Mark it as deleted
          await setDoc(doc(db, "userReadStatus", userId, "weather", weatherAlertId), {
            read: true,
            deleted: true,
            timestamp: new Date()
          });
        } catch (e) {
          // If setting the document fails, try deleting it
          try {
            await deleteDoc(doc(db, "userReadStatus", userId, "weather", weatherAlertId));
          } catch (deleteError) {
            console.error("Error deleting weather alert:", deleteError);
          }
        }

        toast({
          title: "Success",
          description: "Weather alert cleared successfully.",
        });
      }
    } catch (error) {
      console.error("Error processing advisory:", error);
      toast({
        title: "Error",
        description: "Failed to process advisory.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Advisories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Today's advisories */}
        <div>
          <h3 className="font-medium mb-2 text-black">Today</h3>
          <div className="space-y-3">
            {todayItems.length > 0 ? (
              todayItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${getAlertColor(item.severity, item.category)} ${item.read ? 'opacity-75' : ''}`}
                >
                  <span className="text-xl mt-1">
                    {item.type === 'weather' ? '🌤️' : '📢'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="font-medium truncate max-w-[70%]">{item.title}</p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!item.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(item);
                            }}
                            className="h-6 w-6 p-0 hover:bg-green-100"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4 text-green-600 stroke-[2.5]" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteItem(item);
                          }}
                          className="h-6 w-6 p-0 hover:bg-red-100"
                          title={item.type === 'weather' ? 'Clear weather alert' : 'Delete announcement'}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-muted-foreground capitalize truncate">
                        {item.type === 'weather' ? 'Weather Alert' : 'Announcement'}
                      </p>
                      <span className="text-xs bg-secondary px-2 py-1 rounded flex-shrink-0">
                        {item.date}
                      </span>
                    </div>
                    {item.content && (
                      <p className="text-sm mt-2 text-muted-foreground line-clamp-2 overflow-hidden">
                        {item.content}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No new advisories as of now
              </div>
            )}
          </div>
        </div>

        {/* Previous advisories - only shown if todayItems has less than 3 items */}
        {todayItems.length < 3 && previousItems.length > 0 && (
          <div>
            <h3 className="font-medium mb-2 text-black">Previous</h3>
            <div className="space-y-3">
              {previousItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${getAlertColor(item.severity, item.category)} ${item.read ? 'opacity-75' : ''}`}
                >
                  <span className="text-xl mt-1">
                    {item.type === 'weather' ? '🌤️' : '📢'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="font-medium truncate max-w-[70%]">{item.title}</p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!item.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(item);
                            }}
                            className="h-6 w-6 p-0 hover:bg-green-100"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4 text-green-600 stroke-[2.5]" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteItem(item);
                          }}
                          className="h-6 w-6 p-0 hover:bg-red-100"
                          title={item.type === 'weather' ? 'Clear weather alert' : 'Delete announcement'}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-muted-foreground capitalize truncate">
                        {item.type === 'weather' ? 'Weather Alert' : 'Announcement'}
                      </p>
                      <span className="text-xs bg-secondary px-2 py-1 rounded flex-shrink-0">
                        {item.date}
                      </span>
                    </div>
                    {item.content && (
                      <p className="text-sm mt-2 text-muted-foreground line-clamp-2 overflow-hidden">
                        {item.content}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* See More button - shown at the bottom of Previous section */}
            <div className="flex justify-center mt-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/alerts')}
                className="w-full text-white bg-gradient-primary hover:opacity-90 hover:text-white transition-opacity"
              >
                See More
              </Button>
            </div>
          </div>
        )}

        {/* See More button - shown only when todayItems has 3 or more items (no Previous section displayed) */}
        {todayItems.length >= 3 && (
          <div className="flex justify-center mt-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/alerts')}
              className="w-full max-w-xs"
            >
              See More
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdvisoryContainer;