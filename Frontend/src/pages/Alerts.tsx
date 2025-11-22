import { useState, useEffect } from "react";
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
import { X, ArrowLeft, Trash2, Check } from "lucide-react";
import { db, auth } from "@/firebaseConfig";
import { collection, query, where, orderBy, onSnapshot, getDocs, deleteDoc, doc, setDoc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import AdminMessages from "@/components/dashboard/farmer/AdminMessages";
import { useAnnouncements } from "@/components/dashboard/farmer/UserAnnouncements";
import { useWeatherAlerts } from "@/hooks/custom/useWeatherAlerts";

// Get userId from localStorage
const getUserId = () => {
  return localStorage.getItem('userId') || 'default-user';
};

// Define alert types
type AlertCategory = 'all' | 'critical' | 'warning' | 'informational' | 'messages';

interface AlertItem {
  id: string;
  title: string;
  content: string;
  category: AlertCategory;
  date: string;
  type: string;
  read?: boolean; // Add read status
}

interface AdminMessage {
  id: string;
  reportId: string;
  senderId: string;
  receiverId: string;
  message: string;
  timestamp: any;
  read: boolean;
}

const Alerts = () => {
  const navigate = useNavigate();
  const userId = getUserId();
  const { toast } = useToast();
  const { weatherAlerts, loading: weatherLoading, error: weatherError } = useWeatherAlerts();
  const { announcements, loading: announcementsLoading } = useAnnouncements();
  const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<AlertCategory>('all');
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [alertToDelete, setAlertToDelete] = useState<AlertItem | null>(null);
  const [userReadStatus, setUserReadStatus] = useState<Record<string, boolean>>({}); // Track user read status
  
  // Check if current user is admin
  const currentUser = auth.currentUser;
  const isAdmin = currentUser && currentUser.email === 'admin@majayjay.farm';

  // Fetch user read status
  useEffect(() => {
    if (!userId || userId === 'default-user') return;

    const readStatusQuery = query(
      collection(db, "userReadStatus", userId, "announcements")
    );

    const unsubscribe = onSnapshot(readStatusQuery, (snapshot) => {
      const readStatus: Record<string, boolean> = {};
      snapshot.forEach((doc) => {
        readStatus[doc.id] = true;
      });
      setUserReadStatus(readStatus);
    });

    return () => unsubscribe();
  }, [userId]);

  // Fetch admin messages
  useEffect(() => {
    if (!userId || userId === 'default-user') {
      setMessagesLoading(false);
      return;
    }

    setMessagesLoading(true);
    
    // First try the query without orderBy to avoid index issues
    const simpleQuery = query(
      collection(db, "adminMessages"),
      where("receiverId", "==", userId)
    );

    getDocs(simpleQuery).then((simpleSnapshot) => {
      if (simpleSnapshot.size > 0) {
        // If we get results, set up the real-time listener with orderBy
        const messagesQuery = query(
          collection(db, "adminMessages"),
          where("receiverId", "==", userId),
          orderBy("timestamp", "desc")
        );

        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
          const messagesData: AdminMessage[] = [];
          snapshot.forEach((doc) => {
            messagesData.push({
              id: doc.id,
              ...doc.data()
            } as AdminMessage);
          });
          setAdminMessages(messagesData);
          setMessagesLoading(false);
        }, (error) => {
          console.error("Error fetching admin messages:", error);
          
          // If it's an index error, fall back to simple query without orderBy
          if (error.code === 'failed-precondition' || (error.message && error.message.includes('index'))) {
            const fallbackMessages: AdminMessage[] = [];
            simpleSnapshot.docs.forEach((doc) => {
              fallbackMessages.push({
                id: doc.id,
                ...doc.data()
              } as AdminMessage);
            });
            // Sort by timestamp manually if it exists
            fallbackMessages.sort((a, b) => {
              if (a.timestamp && b.timestamp) {
                try {
                  const dateA = a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
                  const dateB = b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
                  return dateB.getTime() - dateA.getTime(); // Descending order
                } catch (e) {
                  return 0;
                }
              }
              return 0;
            });
            setAdminMessages(fallbackMessages);
            setMessagesLoading(false);
            return;
          }
          
          setMessagesLoading(false);
          toast({
            title: "Error",
            description: "Failed to load messages.",
            variant: "destructive",
          });
        });

        return () => unsubscribe();
      } else {
        // No messages found
        setAdminMessages([]);
        setMessagesLoading(false);
      }
    }).catch((error) => {
      console.error("Error in simple query:", error);
      setMessagesLoading(false);
      toast({
        title: "Error",
        description: "Failed to load messages.",
        variant: "destructive",
      });
    });
  }, [userId, toast]);

  // Function to mark an alert as read
  const markAsRead = async (alert: AlertItem) => {
    try {
      if (alert.type === 'message') {
        // For admin messages, update the message document
        const messageId = alert.id.replace('message-', '');
        await updateDoc(doc(db, "adminMessages", messageId), {
          read: true
        });
        
        // Update local state immediately
        setAdminMessages(prev => prev.map(msg => 
          msg.id === messageId ? {...msg, read: true} : msg
        ));
      } else if (alert.type === 'announcement') {
        // For announcements, create a read status record
        const announcementId = alert.id.replace('announcement-', '');
        await setDoc(doc(db, "userReadStatus", userId, "announcements", announcementId), {
          read: true,
          timestamp: new Date()
        });
        
        // Update local read status immediately
        setUserReadStatus(prev => ({
          ...prev,
          [announcementId]: true
        }));
      }
      
      // Also mark as read in the selected alert if it's the same one
      if (selectedAlert && selectedAlert.id === alert.id) {
        setSelectedAlert(prev => prev ? {...prev, read: true} : null);
      }
      
      toast({
        title: "Success",
        description: "Alert marked as read.",
      });
    } catch (error) {
      console.error("Error marking alert as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark alert as read.",
        variant: "destructive",
      });
    }
  };

  // Function to transform weather alerts to our alert format
  const transformWeatherAlerts = (): AlertItem[] => {
    if (weatherLoading || weatherError || !weatherAlerts) return [];
    
    return weatherAlerts.map((alert, index) => ({
      id: `weather-${index}`,
      title: alert.description,
      content: alert.description,
      category: 'critical', // Weather alerts are always critical
      date: alert.date || new Date().toLocaleDateString(),
      type: 'weather',
      read: true // Weather alerts are considered read by default
    }));
  };

  // Function to transform announcements to our alert format
  const transformAnnouncements = (): AlertItem[] => {
    if (announcementsLoading || !announcements) return [];
    
    return announcements.map(announcement => {
      const announcementId = announcement.id;
      const isRead = userReadStatus[announcementId] || false;
      
      return {
        id: `announcement-${announcementId}`,
        title: announcement.title,
        content: announcement.content,
        category: 'informational', // Announcements are typically informational
        date: announcement.createdAt?.toDate().toLocaleDateString() || new Date().toLocaleDateString(),
        type: 'announcement',
        read: isRead
      };
    });
  };

  // Function to transform admin messages to our alert format
  const transformAdminMessages = (): AlertItem[] => {
    if (messagesLoading || !adminMessages) return [];
    
    return adminMessages.map(message => ({
      id: `message-${message.id}`,
      title: "Message from Admin",
      content: message.message,
      category: 'messages',
      date: message.timestamp?.toDate().toLocaleDateString() || new Date().toLocaleDateString(),
      type: 'message',
      read: message.read || false
    }));
  };

  // Combine all alerts
  const getAllAlerts = (): AlertItem[] => {
    const weatherAlertsFormatted = transformWeatherAlerts();
    const announcementsFormatted = transformAnnouncements();
    const messagesFormatted = transformAdminMessages();
    return [...weatherAlertsFormatted, ...announcementsFormatted, ...messagesFormatted];
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
      all: allAlerts.filter(a => !a.read).length,
      critical: allAlerts.filter(a => a.category === 'critical' && !a.read).length,
      warning: allAlerts.filter(a => a.category === 'warning' && !a.read).length,
      informational: allAlerts.filter(a => a.category === 'informational' && !a.read).length,
      messages: allAlerts.filter(a => a.category === 'messages' && !a.read).length
    };
  };

  // Handle alert click to open dialog
  const handleAlertClick = (alert: AlertItem) => {
    setSelectedAlert(alert);
    setIsDialogOpen(true);
    
    // Mark as read when opening the alert
    if (!alert.read) {
      markAsRead(alert);
    }
  };

  // Function to handle delete button click
  const handleDeleteClick = (e: React.MouseEvent, alert: AlertItem) => {
    e.stopPropagation(); // Prevent the alert click handler from firing
    setAlertToDelete(alert);
    setIsDeleteDialogOpen(true);
  };

  // Function to handle mark as read button click
  const handleMarkAsReadClick = (e: React.MouseEvent, alert: AlertItem) => {
    e.stopPropagation(); // Prevent the alert click handler from firing
    markAsRead(alert);
  };

  // Function to confirm deletion
  const confirmDelete = async () => {
    if (!alertToDelete) return;

    try {
      // Determine the collection based on alert type
      if (alertToDelete.type === 'message') {
        // Optimistically update UI
        const messageId = alertToDelete.id.replace('message-', '');
        setAdminMessages(prev => prev.filter(msg => msg.id !== messageId));
        
        // Delete admin message
        await deleteDoc(doc(db, "adminMessages", messageId));
        toast({
          title: "Success",
          description: "Message deleted successfully.",
        });
      } else if (alertToDelete.type === 'announcement') {
        // Delete announcement
        const announcementId = alertToDelete.id.replace('announcement-', '');
        await deleteDoc(doc(db, "announcements", announcementId));
        
        // Also remove from read status if it exists
        try {
          await deleteDoc(doc(db, "userReadStatus", userId, "announcements", announcementId));
        } catch (e) {
          // Ignore if read status doesn't exist
        }
        
        toast({
          title: "Success",
          description: "Announcement deleted successfully.",
        });
      } else {
        // For any other type, show an error
        throw new Error(`Cannot delete alert of type: ${alertToDelete.type}`);
      }
      
      // Close the delete confirmation dialog
      setIsDeleteDialogOpen(false);
      setAlertToDelete(null);
    } catch (error) {
      console.error("Error deleting alert:", error);
      toast({
        title: "Error",
        description: `Failed to delete alert: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
      
      // Close the delete confirmation dialog
      setIsDeleteDialogOpen(false);
      setAlertToDelete(null);
    }
  };

  // Function to cancel deletion
  const cancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setAlertToDelete(null);
  };

  const alertCounts = countAlertsByCategory();
  const filteredAlerts = filterAlerts(getAllAlerts());
  const loading = weatherLoading || announcementsLoading || messagesLoading;

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
                <Badge 
                  variant="secondary" 
                  className="ml-2 bg-yellow-500 text-white hover:bg-yellow-600"
                >
                  {alertCounts.warning}
                </Badge>
              </Button>
              <Button
                variant={activeCategory === 'informational' ? 'default' : 'outline'}
                onClick={() => setActiveCategory('informational')}
                className="flex items-center gap-2"
              >
                Informational
                <Badge 
                  variant="secondary" 
                  className="ml-2 bg-blue-500 text-white hover:bg-blue-600"
                >
                  {alertCounts.informational}
                </Badge>
              </Button>
              <Button
                variant={activeCategory === 'messages' ? 'default' : 'outline'}
                onClick={() => setActiveCategory('messages')}
                className="flex items-center gap-2"
              >
                Messages
                <Badge 
                  variant="secondary" 
                  className="ml-2 bg-green-500 text-white hover:bg-green-600"
                >
                  {alertCounts.messages}
                </Badge>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Unified Alerts List */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>
              {activeCategory === 'all' && 'All Alerts'}
              {activeCategory === 'critical' && 'Critical Alerts'}
              {activeCategory === 'warning' && 'Warning Alerts'}
              {activeCategory === 'informational' && 'Informational Alerts'}
              {activeCategory === 'messages' && 'Messages'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading alerts...
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No alerts found
              </div>
            ) : (
              <div className="max-h-[320px] overflow-y-auto pr-2">
                {filteredAlerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 mb-3 last:mb-0 ${
                      alert.category === 'critical' ? 'bg-red-50 border-red-200' :
                      alert.category === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                      alert.category === 'messages' ? 'bg-green-50 border-green-200' :
                      'bg-blue-50 border-blue-200'
                    } ${alert.read ? 'opacity-75' : ''}`}
                    onClick={() => handleAlertClick(alert)}
                  >
                    <span className="text-2xl">
                      {alert.type === 'weather' ? '🌤️' : alert.type === 'message' ? '✉️' : '📢'}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="font-medium">{alert.title}</p>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="secondary"
                            className={`
                              ml-2
                              ${alert.category === 'critical' ? 'bg-red-500 hover:bg-red-600' : ''}
                              ${alert.category === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                              ${alert.category === 'informational' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                              ${alert.category === 'messages' ? 'bg-green-500 hover:bg-green-600' : ''}
                              text-white
                            `}
                          >
                            {alert.category.charAt(0).toUpperCase() + alert.category.slice(1)}
                          </Badge>
                          {/* Show action buttons for messages and announcements */}
                          {(alert.type === 'message' || alert.type === 'announcement') && (
                            <div className="flex gap-1">
                              {!alert.read && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={(e) => handleMarkAsReadClick(e, alert)}
                                  className="h-6 w-6 p-0"
                                  title="Mark as read"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => handleDeleteClick(e, alert)}
                                className="h-6 w-6 p-0"
                                title={alert.type === 'message' ? 'Delete message' : 'Delete announcement'}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-muted-foreground capitalize">
                          {alert.type === 'weather' ? 'Weather Alert' : alert.type === 'message' ? 'Message' : 'Announcement'}
                        </p>
                        <span className="text-xs bg-secondary px-2 py-1 rounded">
                          {alert.date}
                        </span>
                      </div>
                      {alert.content && (
                        <p className="text-sm mt-2 text-muted-foreground line-clamp-2">
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
      </div>

      {/* Alert Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b bg-green-500 text-white">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl text-white">
                  {selectedAlert?.title}
                </DialogTitle>
                <DialogDescription className="mt-2 text-green-100">
                  <div className="flex items-center gap-2">
                    <span className="capitalize">
                      {selectedAlert?.type === 'weather' ? 'Weather Alert' : 
                       selectedAlert?.type === 'message' ? 'Message' : 'Announcement'}
                    </span>
                    <span>•</span>
                    <span>{selectedAlert?.date}</span>
                  </div>
                </DialogDescription>
              </div>
              <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                <X className="h-4 w-4 text-white" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </DialogHeader>
          <ScrollArea className="flex-grow p-6">
            <div className="whitespace-pre-wrap">
              {selectedAlert?.content || "No content available."}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setAlertToDelete(null);
        }
        setIsDeleteDialogOpen(open);
      }}>
        <DialogContent className="max-w-sm max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b bg-red-500 text-white">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl text-white">
                  Confirm Deletion
                </DialogTitle>
                <DialogDescription className="mt-2 text-red-100">
                  {alertToDelete?.type === 'message' 
                    ? 'Are you sure you want to delete this message?' 
                    : alertToDelete?.type === 'announcement'
                    ? 'Are you sure you want to delete this announcement?'
                    : 'This alert cannot be deleted.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex justify-end p-6 gap-2">
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Alerts;