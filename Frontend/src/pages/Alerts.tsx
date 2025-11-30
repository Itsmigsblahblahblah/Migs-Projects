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

interface ReadStatus {
  read: boolean;
  deleted?: boolean;
  timestamp: any;
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
  const [userReadStatus, setUserReadStatus] = useState<Record<string, ReadStatus>>({}); // Track user read status
  const [currentPage, setCurrentPage] = useState(1); // Pagination state
  const alertsPerPage = 10; // Number of alerts per page

  // Check if current user is admin
  const currentUser = auth.currentUser;
  const isAdmin = currentUser && currentUser.email === 'admin@majayjay.farm';

  // Fetch user read status for both announcements and weather alerts
  useEffect(() => {
    if (!userId || userId === 'default-user') return;

    // Fetch announcement read status
    const announcementReadStatusQuery = query(
      collection(db, "userReadStatus", userId, "announcements")
    );

    const unsubscribeAnnouncements = onSnapshot(announcementReadStatusQuery, (snapshot) => {
      const readStatus: Record<string, ReadStatus> = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Handle backward compatibility with old boolean format
        if (typeof data === 'boolean') {
          readStatus[doc.id] = { read: data, timestamp: null };
        } else {
          readStatus[doc.id] = data as ReadStatus;
        }
      });
      setUserReadStatus(prev => ({
        ...prev,
        ...readStatus
      }));
    });

    // Fetch weather alert read status
    const weatherReadStatusQuery = query(
      collection(db, "userReadStatus", userId, "weather")
    );

    const unsubscribeWeather = onSnapshot(weatherReadStatusQuery, (snapshot) => {
      const readStatus: Record<string, ReadStatus> = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Handle backward compatibility with old boolean format
        if (typeof data === 'boolean') {
          readStatus[doc.id] = { read: data, timestamp: null };
        } else {
          readStatus[doc.id] = data as ReadStatus;
        }
      });

      // Merge with existing read status
      setUserReadStatus(prev => ({
        ...prev,
        ...readStatus
      }));
    });

    return () => {
      unsubscribeAnnouncements();
      unsubscribeWeather();
    };
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
        // If we get results, set up the real-time listener without orderBy to avoid index issues
        // We'll sort manually instead
        const messagesQuery = query(
          collection(db, "adminMessages"),
          where("receiverId", "==", userId)
          // Removed orderBy to avoid composite index requirement
        );

        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
          const messagesData: AdminMessage[] = [];
          snapshot.forEach((doc) => {
            messagesData.push({
              id: doc.id,
              ...doc.data()
            } as AdminMessage);
          });

          // Sort by timestamp manually
          messagesData.sort((a, b) => {
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

          setAdminMessages(messagesData);
          setMessagesLoading(false);
        }, (error) => {
          console.error("Error fetching admin messages:", error);

          // If it's an index error, fall back to simple query without orderBy
          // Log the full error for debugging
          console.log("Full error object:", JSON.stringify(error, null, 2));

          // Check for various types of index errors
          const isIndexError = error.code === 'failed-precondition' ||
            (error.message && error.message.includes('index')) ||
            (error.code === 'resource-exhausted' && error.message && error.message.includes('composite index')) ||
            (error.message && error.message.includes('FirebaseError') && error.message.includes('requires an index')) ||
            (error.code === 'permission-denied' && error.message && error.message.includes('Missing or insufficient permissions')) ||
            (error.message && error.message.includes('query requires an index'));

          if (isIndexError) {
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
          // Check if this is specifically an index error that provides a creation link
          let errorMessage = error.message || 'Unknown error';
          if (errorMessage.includes('query requires an index') && errorMessage.includes('https://console.firebase.google.com')) {
            errorMessage += '. The system will continue to work but may be slower. An administrator can fix this by creating the required index.';
          }
          toast({
            title: "Error",
            description: `Failed to load messages: ${errorMessage}`,
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
      // Check if this is specifically an index error that provides a creation link
      let errorMessage = error.message || 'Unknown error';
      if (errorMessage.includes('query requires an index') && errorMessage.includes('https://console.firebase.google.com')) {
        errorMessage += '. The system will continue to work but may be slower. An administrator can fix this by creating the required index.';
      }
      toast({
        title: "Error",
        description: `Failed to load messages: ${errorMessage}`,
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
          msg.id === messageId ? { ...msg, read: true } : msg
        ));
      } else if (alert.type === 'announcement') {
        // For announcements, create a read status record
        const announcementId = alert.id.replace('announcement-', '');
        await setDoc(doc(db, "userReadStatus", userId, "announcements", announcementId), {
          read: true,
          // Don't set deleted flag for mark as read
          timestamp: new Date()
        });

        // Update local read status immediately
        setUserReadStatus(prev => ({
          ...prev,
          [announcementId]: { read: true, timestamp: new Date() }
        }));
      } else if (alert.type === 'weather') {
        // For weather alerts, create a read status record
        // Create the same stable ID based on the alert description and date
        const weatherAlertId = createWeatherAlertId(alert.title, alert.date);
        await setDoc(doc(db, "userReadStatus", userId, "weather", weatherAlertId), {
          read: true,
          // Remove deleted flag if it was previously deleted
          deleted: false,
          timestamp: new Date()
        });

        // Update local read status immediately
        setUserReadStatus(prev => ({
          ...prev,
          [weatherAlertId]: { read: true, deleted: false, timestamp: new Date() }
        }));
      }

      // Also mark as read in the selected alert if it's the same one
      if (selectedAlert && selectedAlert.type === 'weather') {
        // For weather alerts, we need to generate the ID the same way to compare
        const selectedAlertWeatherId = createWeatherAlertId(selectedAlert.title, selectedAlert.date);
        const currentAlertWeatherId = createWeatherAlertId(alert.title, alert.date);
        if (selectedAlertWeatherId === currentAlertWeatherId) {
          setSelectedAlert(prev => prev ? { ...prev, read: true } : null);
        }
      } else if (selectedAlert && selectedAlert.id === alert.id) {
        setSelectedAlert(prev => prev ? { ...prev, read: true } : null);
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

  // Function to create a stable ID for weather alerts
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

  // Function to transform weather alerts to our alert format
  const transformWeatherAlerts = (): AlertItem[] => {
    if (weatherLoading || weatherError || !weatherAlerts) return [];

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

      return {
        id: weatherAlertId,
        title: alert.description,
        content: alert.description,
        category: 'critical', // Weather alerts are always critical
        date: alert.date || new Date().toLocaleDateString(),
        type: 'weather',
        read: isRead
      };
    }).filter(alert => alert !== null) as AlertItem[];
  };

  // Function to transform announcements to our alert format
  const transformAnnouncements = (): AlertItem[] => {
    if (announcementsLoading || !announcements) return [];

    return announcements.map(announcement => {
      const announcementId = announcement.id;
      const status = userReadStatus[announcementId];
      const isRead = status ? (typeof status === 'boolean' ? status : status.read) : false;

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
    // Filter out announcements that the user has marked as deleted
    const filteredAlerts = alerts.filter(alert => {
      // Keep all non-announcement alerts
      if (alert.type !== 'announcement') return true;

      // For announcements, check if they're marked as deleted
      const announcementId = alert.id.replace('announcement-', '');
      const status = userReadStatus[announcementId];

      // If there's no read status, show the announcement
      if (!status) return true;

      // If there's a read status, check if it's marked as deleted
      if (typeof status === 'boolean') {
        // Old format - boolean means read but not deleted
        return true;
      }

      // New format - check deleted flag
      return !status.deleted;
    }).filter(alert => {
      // Also filter out weather alerts that have been cleared
      if (alert.type !== 'weather') return true;

      // For weather alerts, check if they've been cleared (deleted from userReadStatus)
      const weatherAlertId = createWeatherAlertId(alert.title, alert.date);
      const status = userReadStatus[weatherAlertId];

      // If there's no read status, show the weather alert
      if (!status) return true;

      // If there's a read status, check if it's marked as deleted
      if (typeof status === 'boolean') {
        // Old format - boolean means read but not deleted
        return true;
      }

      // New format - check deleted flag
      return !status.deleted;
    });

    if (activeCategory === 'all') return filteredAlerts;
    return filteredAlerts.filter(alert => alert.category === activeCategory);
  };

  // Count alerts by category
  const countAlertsByCategory = () => {
    // Filter out announcements that the user has marked as deleted
    const filteredAlerts = getAllAlerts().filter(alert => {
      // Keep all non-announcement alerts
      if (alert.type !== 'announcement') return true;

      // For announcements, check if they're marked as deleted
      const announcementId = alert.id.replace('announcement-', '');
      const status = userReadStatus[announcementId];

      // If there's no read status, show the announcement
      if (!status) return true;

      // If there's a read status, check if it's marked as deleted
      if (typeof status === 'boolean') {
        // Old format - boolean means read but not deleted
        return true;
      }

      // New format - check deleted flag
      return !status.deleted;
    }).filter(alert => {
      // Also filter out weather alerts that have been cleared
      if (alert.type !== 'weather') return true;

      // For weather alerts, check if they've been cleared (deleted from userReadStatus)
      const weatherAlertId = createWeatherAlertId(alert.title, alert.date);
      return !userReadStatus[weatherAlertId]?.deleted;
    });

    return {
      all: filteredAlerts.filter(a => !a.read).length,
      critical: filteredAlerts.filter(a => a.category === 'critical' && !a.read).length,
      informational: filteredAlerts.filter(a => a.category === 'informational' && !a.read).length,
      messages: filteredAlerts.filter(a => a.category === 'messages' && !a.read).length
    };
  };

  // Handle alert click to open dialog
  const handleAlertClick = (alert: AlertItem) => {
    // Check if this is a message linked to a report
    if (alert.type === 'message') {
      // Find the corresponding admin message to get the reportId
      const messageId = alert.id.replace('message-', '');
      const adminMessage = adminMessages.find(msg => msg.id === messageId);

      // If this message is linked to a report, navigate to the report detail page
      if (adminMessage && adminMessage.reportId) {
        // Navigate to the report detail page
        navigate(`/farmer/reports/${adminMessage.reportId}`);
        return;
      }
    }

    // For all other alerts, open the dialog as before
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
        // Check if user is admin
        const currentUser = auth.currentUser;
        const isAdmin = currentUser && currentUser.email === 'admin@majayjay.farm';

        const announcementId = alertToDelete.id.replace('announcement-', '');

        if (isAdmin) {
          // Admin can actually delete the announcement
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
          // Farmer can only mark as read and hide it from their view
          await setDoc(doc(db, "userReadStatus", userId, "announcements", announcementId), {
            read: true,
            deleted: true, // Add deleted flag
            timestamp: new Date()
          });

          toast({
            title: "Success",
            description: "Announcement removed from your view.",
          });
        }
      } else if (alertToDelete.type === 'weather') {
        // For weather alerts, remove from read status if it exists
        // Create the same stable ID based on the alert description and date
        const weatherAlertId = createWeatherAlertId(alertToDelete.title, alertToDelete.date);

        // Optimistically update UI
        setUserReadStatus(prev => ({
          ...prev,
          [weatherAlertId]: { read: true, deleted: true, timestamp: new Date() }
        }));

        // Also remove from selected alert if it's the same one
        if (selectedAlert && selectedAlert.type === 'weather') {
          const selectedAlertWeatherId = createWeatherAlertId(selectedAlert.title, selectedAlert.date);
          if (selectedAlertWeatherId === weatherAlertId) {
            setSelectedAlert(null);
            setIsDialogOpen(false);
          }
        }

        try {
          // Instead of deleting the document, mark it as deleted
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
  const allAlerts = getAllAlerts();
  const filteredAlerts = filterAlerts(allAlerts);

  // Pagination logic
  const totalPages = Math.ceil(filteredAlerts.length / alertsPerPage);
  const startIndex = (currentPage - 1) * alertsPerPage;
  const endIndex = startIndex + alertsPerPage;
  const currentAlerts = filteredAlerts.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory]);

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
                Weather
                <Badge variant="destructive" className="ml-2">
                  {alertCounts.critical}
                </Badge>
              </Button>
              <Button
                variant={activeCategory === 'informational' ? 'default' : 'outline'}
                onClick={() => setActiveCategory('informational')}
                className="flex items-center gap-2"
              >
                Announcements
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
              {activeCategory === 'critical' && 'Weather Alerts'}
              {activeCategory === 'informational' && 'Announcements'}
              {activeCategory === 'messages' && 'Messages'}
            </CardTitle>
          </CardHeader>
          <div className="flex-grow flex flex-col">
            <CardContent className="flex-grow">
              {loading ? (
                <div className="text-center py-4 text-muted-foreground">
                  Loading alerts...
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No alerts found
                </div>
              ) : (
                <div className="space-y-3">
                  {currentAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 mb-3 last:mb-0 ${alert.category === 'critical' ? 'bg-red-50 border-red-200' :
                        alert.category === 'messages' ? 'bg-green-50 border-green-200' :
                          'bg-blue-50 border-blue-200'
                        } ${alert.read ? 'opacity-75' : ''}`}
                      onClick={() => handleAlertClick(alert)}
                    >
                      <span className="text-2xl mt-1">
                        {alert.type === 'weather' ? '🌤️' : alert.type === 'message' ? '✉️' : '📢'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="font-medium truncate max-w-[70%]">{alert.title}</p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge
                              variant="secondary"
                              className={`
                                ml-2
                                ${alert.category === 'critical' ? 'bg-red-500 hover:bg-red-600' : ''}
                                ${alert.category === 'informational' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                                ${alert.category === 'messages' ? 'bg-green-500 hover:bg-green-600' : ''}
                                text-white
                                whitespace-nowrap
                              `}
                            >
                              {alert.category.charAt(0).toUpperCase() + alert.category.slice(1)}
                            </Badge>
                            {/* Show action buttons for messages, announcements, and weather alerts */}
                            {(alert.type === 'message' || alert.type === 'announcement' || alert.type === 'weather') && (
                              <div className="flex gap-1 flex-shrink-0">
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
                                  title={alert.type === 'message' ? 'Delete message' : alert.type === 'weather' ? 'Clear weather alert' : 'Delete announcement'}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-xs text-muted-foreground capitalize truncate">
                            {alert.type === 'weather' ? 'Weather Alert' : alert.type === 'message' ? 'Message' : 'Announcement'}
                          </p>
                          <span className="text-xs bg-secondary px-2 py-1 rounded flex-shrink-0">
                            {alert.date}
                          </span>
                        </div>
                        {alert.content && (
                          <p className="text-sm mt-2 text-muted-foreground line-clamp-2 overflow-hidden">
                            {alert.content}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>

            {/* Pagination Controls - Always visible */}
            <div className="border-t pt-1 px-4" style={{ paddingBottom: '15px', marginTop: 'auto' }}>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground" style={{ margin: '1px 0' }}>
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredAlerts.length)} of {filteredAlerts.length} alerts
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-3 text-sm"
                  >
                    Previous
                  </Button>

                  {/* Page Number Buttons */}
                  {(() => {
                    const pageButtons = [];
                    // Show more pages (7 instead of 5) to reduce ellipsis
                    let startPage = Math.max(1, currentPage - 3);
                    let endPage = Math.min(totalPages, startPage + 6);

                    // Adjust startPage if we're near the end
                    if (endPage - startPage < 6) {
                      startPage = Math.max(1, endPage - 6);
                    }

                    // First page button
                    if (startPage > 1) {
                      pageButtons.push(
                        <Button
                          key={1}
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(1)}
                          className="h-8 w-8 p-0 text-sm"
                        >
                          1
                        </Button>
                      );
                      // Only show ellipsis if there's a significant gap
                      if (startPage > 2) {
                        pageButtons.push(
                          <span key="start-ellipsis" className="px-1 py-0 text-muted-foreground text-sm">⋯</span>
                        );
                      }
                    }

                    // Page number buttons
                    for (let i = startPage; i <= endPage; i++) {
                      pageButtons.push(
                        <Button
                          key={i}
                          variant={currentPage === i ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(i)}
                          className={`h-8 w-8 p-0 text-sm ${currentPage === i ? "bg-primary text-primary-foreground" : ""}`}
                        >
                          {i}
                        </Button>
                      );
                    }

                    // Last page button
                    if (endPage < totalPages) {
                      // Only show ellipsis if there's a significant gap
                      if (endPage < totalPages - 1) {
                        pageButtons.push(
                          <span key="end-ellipsis" className="px-1 py-0 text-muted-foreground text-sm">⋯</span>
                        );
                      }
                      pageButtons.push(
                        <Button
                          key={totalPages}
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          className="h-8 w-8 p-0 text-sm"
                        >
                          {totalPages}
                        </Button>
                      );
                    }

                    return pageButtons;
                  })()}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="h-8 px-3 text-sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Alert Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className={`flex-shrink-0 p-6 pb-4 border-b text-white ${selectedAlert?.category === 'critical' ? 'bg-red-500' : selectedAlert?.category === 'messages' ? 'bg-green-500' : 'bg-blue-500'}`}>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl text-white">
                  {selectedAlert?.title}
                </DialogTitle>
                <DialogDescription className={`mt-2 ${selectedAlert?.category === 'critical' ? 'text-red-100' : selectedAlert?.category === 'messages' ? 'text-green-100' : 'text-blue-100'}`}>
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
                      : alertToDelete?.type === 'weather'
                        ? 'Are you sure you want to clear this weather alert?'
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