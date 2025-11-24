import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db, auth } from "@/firebaseConfig";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, setDoc } from "firebase/firestore";
import { Bell, Trash2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: any;
  createdBy: string;
}

interface ReadStatus {
  read: boolean;
  deleted?: boolean;
  timestamp: any;
}

// Export the hook for fetching announcements
export const useAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userReadStatus, setUserReadStatus] = useState<Record<string, ReadStatus>>({});
  const userId = localStorage.getItem('userId') || 'default-user';

  // Fetch user read status
  useEffect(() => {
    if (!userId || userId === 'default-user') return;

    const readStatusQuery = query(
      collection(db, "userReadStatus", userId, "announcements")
    );

    const unsubscribe = onSnapshot(readStatusQuery, (snapshot) => {
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
      setUserReadStatus(readStatus);
    });

    return () => unsubscribe();
  }, [userId]);

  // Fetch announcements
  useEffect(() => {
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const announcementsData: Announcement[] = [];
      snapshot.forEach((doc) => {
        announcementsData.push({ id: doc.id, ...doc.data() } as Announcement);
      });
      setAnnouncements(announcementsData);
      
      // Calculate unread count based on read status
      if (userId && userId !== 'default-user') {
        const unread = announcementsData.filter(announcement => {
          const status = userReadStatus[announcement.id];
          // If there's no read status or it's not marked as read, it's unread
          if (!status) return true;
          // If status is a boolean (old format), check its value
          if (typeof status === 'boolean') return !status;
          // If status is an object, check its read property
          return !status.read;
        }).length;
        setUnreadCount(unread);
      } else {
        setUnreadCount(announcementsData.length);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userReadStatus, userId]);

  return { announcements, loading, unreadCount, userReadStatus, setUserReadStatus };
};

const UserAnnouncements = () => {
  const { announcements, loading, userReadStatus, setUserReadStatus } = useAnnouncements();
  const { toast } = useToast();
  const userId = localStorage.getItem('userId') || 'default-user';

  const deleteAnnouncement = async (announcementId: string) => {
    try {
      // Check if user is admin
      const currentUser = auth.currentUser;
      const isAdmin = currentUser && currentUser.email === 'admin@majayjay.farm';
      
      if (isAdmin) {
        // Admin can actually delete the announcement
        await deleteDoc(doc(db, "announcements", announcementId));
        toast({
          title: "Success",
          description: "Announcement deleted successfully.",
        });
      } else {
        // Farmer can mark as deleted to hide it from their view
        await setDoc(doc(db, "userReadStatus", userId, "announcements", announcementId), {
          read: true,
          deleted: true, // Add deleted flag
          timestamp: new Date()
        });
        
        // Update local read status immediately
        setUserReadStatus(prev => ({
          ...prev,
          [announcementId]: { read: true, deleted: true, timestamp: new Date() }
        }));
        
        toast({
          title: "Success",
          description: "Announcement removed from your view.",
        });
      }
    } catch (error) {
      console.error("Error processing announcement:", error);
      toast({
        title: "Error",
        description: "Failed to process announcement.",
        variant: "destructive",
      });
    }
  };

  const markAsRead = async (announcementId: string) => {
    try {
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
      
      toast({
        title: "Success",
        description: "Announcement marked as read.",
      });
    } catch (error) {
      console.error("Error marking announcement as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark announcement as read.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Loading announcements...
      </div>
    );
  }

  // Filter out announcements that the user has marked as deleted
  const visibleAnnouncements = announcements.filter(announcement => {
    // If there's no read status, show the announcement
    if (!userReadStatus[announcement.id]) return true;
    
    // If there's a read status, check if it's marked as deleted
    const status = userReadStatus[announcement.id];
    // If status is an object with a deleted property, check that
    if (typeof status === 'object' && status !== null) {
      return !status.deleted;
    }
    // If status is a boolean (old format), treat it as not deleted
    return true;
  });

  if (visibleAnnouncements.length === 0) {
    return null; // Don't show anything if there are no announcements
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5 text-blue-500" />
          Announcements
        </h3>
      </div>
      
      <div className="space-y-3">
        {visibleAnnouncements.slice(0, 3).map((announcement) => {
          const isRead = userReadStatus[announcement.id] && 
            (typeof userReadStatus[announcement.id] === 'boolean' ? 
              userReadStatus[announcement.id] : 
              userReadStatus[announcement.id].read);
          
          return (
            <div 
              key={announcement.id} 
              className={`border rounded-lg p-3 ${isRead ? 'bg-blue-50 border-blue-200' : 'bg-blue-100 border-blue-300'}`}
            >
              <div className="flex justify-between items-start">
                <h4 className="font-medium">{announcement.title}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {announcement.createdAt?.toDate().toLocaleDateString()}
                  </span>
                  <div className="flex gap-1">
                    {!isRead && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(announcement.id);
                        }}
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAnnouncement(announcement.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-sm mt-1 text-muted-foreground">{announcement.content}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UserAnnouncements;