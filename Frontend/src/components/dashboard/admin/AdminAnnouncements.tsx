import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { db } from "@/firebaseConfig";
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, deleteDoc, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Bell, Send, Trash2, Filter } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: any;
  createdBy: string;
}

const AdminAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<Announcement[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", content: "" });
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const { toast } = useToast();

  // Fetch announcements
  useEffect(() => {
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const announcementsData: Announcement[] = [];
      snapshot.forEach((doc) => {
        announcementsData.push({ id: doc.id, ...doc.data() } as Announcement);
      });
      setAnnouncements(announcementsData);
      setFilteredAnnouncements(announcementsData); // Initially show all announcements
      setLoading(false);
    }, (error) => {
      console.error("Error fetching announcements:", error);
      toast({
        title: "Error",
        description: "Failed to load announcements",
        variant: "destructive",
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  // Filter announcements by selected month
  useEffect(() => {
    if (!selectedMonth) {
      setFilteredAnnouncements(announcements);
      return;
    }

    const filtered = announcements.filter(announcement => {
      if (!announcement.createdAt) return false;
      const date = announcement.createdAt.toDate ? announcement.createdAt.toDate() : new Date(announcement.createdAt);
      const announcementMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return announcementMonth === selectedMonth;
    });

    setFilteredAnnouncements(filtered);
  }, [selectedMonth, announcements]);

  // Get unique months from announcements
  const getUniqueMonths = () => {
    const months = new Set<string>();
    announcements.forEach(announcement => {
      if (announcement.createdAt) {
        const date = announcement.createdAt.toDate ? announcement.createdAt.toDate() : new Date(announcement.createdAt);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.add(month);
      }
    });
    return Array.from(months).sort().reverse(); // Sort in descending order
  };

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both title and content",
        variant: "destructive",
      });
      return;
    }

    try {
      const adminName = localStorage.getItem('username') || 'Admin';
      
      await addDoc(collection(db, "announcements"), {
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        createdAt: Timestamp.now(),
        createdBy: adminName,
      });

      setNewAnnouncement({ title: "", content: "" });
      toast({
        title: "Success",
        description: "Announcement created successfully",
      });
    } catch (error: any) {
      console.error("Error creating announcement:", error);
      toast({
        title: "Error",
        description: `Failed to create announcement: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const openDeleteDialog = (id: string) => {
    setAnnouncementToDelete(id);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setAnnouncementToDelete(null);
    setDeleteDialogOpen(false);
  };

  const handleDeleteAnnouncement = async () => {
    if (!announcementToDelete) return;

    try {
      await deleteDoc(doc(db, "announcements", announcementToDelete));
      toast({
        title: "Success",
        description: "Announcement deleted successfully",
      });
      closeDeleteDialog();
    } catch (error: any) {
      console.error("Error deleting announcement:", error);
      toast({
        title: "Error",
        description: `Failed to delete announcement: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const clearFilter = () => {
    setSelectedMonth("");
  };

  return (
    <div className="space-y-6">
      {/* Create Announcement Card */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Create New Announcement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={newAnnouncement.title}
              onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
              className="w-full p-2 border rounded"
              placeholder="Enter announcement title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Content</label>
            <Textarea
              value={newAnnouncement.content}
              onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
              placeholder="Enter announcement content"
              rows={4}
            />
          </div>
          <Button onClick={handleCreateAnnouncement} className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Post Announcement
          </Button>
        </CardContent>
      </Card>

      {/* Announcements List */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Recent Announcements</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="border rounded p-2 text-sm"
                >
                  <option value="">All Months</option>
                  {getUniqueMonths().map(month => (
                    <option key={month} value={month}>
                      {formatMonth(month)}
                    </option>
                  ))}
                </select>
              </div>
              {selectedMonth && (
                <Button variant="outline" size="sm" onClick={clearFilter}>
                  Clear Filter
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">
              Loading announcements...
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              {selectedMonth ? `No announcements found for ${formatMonth(selectedMonth)}` : "No announcements yet"}
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto pr-2 space-y-4">
              {filteredAnnouncements.map((announcement) => (
                <div key={announcement.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg">{announcement.title}</h3>
                    <span className="text-xs text-muted-foreground">
                      {announcement.createdAt?.toDate().toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-2 text-muted-foreground">{announcement.content}</p>
                  <div className="mt-3 text-xs text-muted-foreground">
                    Posted by: {announcement.createdBy}
                  </div>
                  <Button onClick={() => openDeleteDialog(announcement.id)} variant="destructive" size="sm" className="flex items-center gap-2 mt-3">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this announcement? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDeleteDialog}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAnnouncement}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAnnouncements;