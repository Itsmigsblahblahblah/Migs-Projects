import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/firebaseConfig";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { Bell } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: any;
  createdBy: string;
}

const UserAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch announcements
  useEffect(() => {
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const announcementsData: Announcement[] = [];
      snapshot.forEach((doc) => {
        announcementsData.push({ id: doc.id, ...doc.data() } as Announcement);
      });
      setAnnouncements(announcementsData);
      setUnreadCount(announcementsData.length); // In a real app, you'd track which ones are actually unread
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Loading announcements...
      </div>
    );
  }

  if (announcements.length === 0) {
    return null; // Don't show anything if there are no announcements
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5 text-blue-500" />
          Announcements
          {unreadCount > 0 && (
            <span className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </h3>
      </div>
      
      <div className="space-y-3">
        {announcements.slice(0, 3).map((announcement) => (
          <div 
            key={announcement.id} 
            className="border rounded-lg p-3 bg-blue-50 border-blue-200"
          >
            <div className="flex justify-between items-start">
              <h4 className="font-medium">{announcement.title}</h4>
              <span className="text-xs text-muted-foreground">
                {announcement.createdAt?.toDate().toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm mt-1 text-muted-foreground">{announcement.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserAnnouncements;