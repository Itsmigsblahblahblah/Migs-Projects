import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { db } from "@/firebaseConfig";
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, Timestamp, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Send, CheckCircle, Trash2 } from "lucide-react";

interface AdminMessage {
  id: string;
  reportId: string;
  senderId: string;
  receiverId: string;
  message: string;
  timestamp: any;
  read: boolean;
}

interface AdminMessagesProps {
  userId: string;
}

const AdminMessages = ({ userId }: AdminMessagesProps) => {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch admin messages for this farmer
  useEffect(() => {
    if (!userId) return;

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

      setMessages(messagesData);
    }, (error) => {
      console.error("Error in onSnapshot listener:", error);
    });

    return () => unsubscribe();
  }, [userId]);

  // Mark message as read
  const markAsRead = async (messageId: string) => {
    try {
      // Optimistically update UI first
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === messageId ? { ...msg, read: true } : msg
        )
      );
      
      // Then update in Firestore
      const messageRef = doc(db, "adminMessages", messageId);
      await updateDoc(messageRef, {
        read: true,
        readAt: Timestamp.now()
      });
    } catch (error) {
      console.error("Error marking message as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark message as read.",
        variant: "destructive",
      });
      
      // Revert UI update if Firestore update fails
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === messageId ? { ...msg, read: false } : msg
        )
      );
    }
  };

  // Delete a message
  const deleteMessage = async (messageId: string) => {
    try {
      // Optimistically remove from UI first
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
      
      // Then delete from Firestore
      await deleteDoc(doc(db, "adminMessages", messageId));
      
      toast({
        title: "Success",
        description: "Message deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      toast({
        title: "Error",
        description: "Failed to delete message.",
        variant: "destructive",
      });
      
      // If delete fails, we might want to re-fetch messages to restore UI state
      // But for now, let's keep it simple
    }
  };

  // Navigate to report detail page and mark message as read
  const goToReport = async (messageId: string, reportId: string) => {
    // Mark the message as read when navigating to the report
    await markAsRead(messageId);
    navigate(`/farmer/reports/${reportId}`);
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-500" />
            Messages from Admin
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Send className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" />
            <p>No messages from admin yet.</p>
            <p className="text-sm mt-1">When admins send you messages, they will appear here.</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`border rounded-lg p-4 transition-colors cursor-pointer hover:bg-muted/50 ${
                    message.read 
                      ? "bg-muted/30 border-muted-foreground/20" 
                      : "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900"
                  }`}
                  onClick={() => goToReport(message.id, message.reportId)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Admin</span>
                      {!message.read && (
                        <span className="inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {message.timestamp?.toDate().toLocaleDateString()}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMessage(message.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {!message.read && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(message.id);
                          }}
                        >
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap">{message.message}</p>
                  <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                    <span>Click to view report:</span>
                    <span className="font-mono">{message.reportId.substring(0, 8)}...</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminMessages;