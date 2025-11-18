import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { db } from "@/firebaseConfig";
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, Timestamp, deleteDoc, getDocs } from "firebase/firestore";
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
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch admin messages for this farmer
  useEffect(() => {
    // Reset loading state when userId changes
    setLoading(true);
    
    // If userId is not available, don't fetch messages
    if (!userId || userId === 'default-user') {
      console.log("AdminMessages: No valid userId, setting empty messages");
      setMessages([]);
      setLoading(false);
      return;
    }

    console.log("AdminMessages: Fetching messages for userId:", userId);

    // First try the query without orderBy to avoid index issues
    const simpleQuery = query(
      collection(db, "adminMessages"),
      where("receiverId", "==", userId)
    );

    console.log("AdminMessages: Trying simple query first");
    
    getDocs(simpleQuery).then((simpleSnapshot) => {
      console.log("AdminMessages: Simple query results:", simpleSnapshot.size, "messages");
      if (simpleSnapshot.size > 0) {
        // If we get results, set up the real-time listener with orderBy
        const messagesQuery = query(
          collection(db, "adminMessages"),
          where("receiverId", "==", userId),
          orderBy("timestamp", "desc")
        );

        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
          console.log("AdminMessages: Received snapshot with", snapshot.size, "messages");
          console.log("AdminMessages: Snapshot metadata:", snapshot.metadata);
          
          const messagesData: AdminMessage[] = [];
          
          snapshot.forEach((doc) => {
            console.log("AdminMessages: Processing document:", doc.id, doc.data());
            messagesData.push({
              id: doc.id,
              ...doc.data()
            } as AdminMessage);
          });

          console.log("AdminMessages: Final messages array:", messagesData);
          setMessages(messagesData);
          setLoading(false);
        }, (error) => {
          console.error("Error in onSnapshot listener:", error);
          console.error("UserId used for query:", userId);
          console.error("Query details:", {
            collection: "adminMessages",
            receiverId: userId,
            orderBy: "timestamp"
          });
          
          // Log more detailed error information
          if (error.code) {
            console.error("Firebase error code:", error.code);
          }
          if (error.name) {
            console.error("Error name:", error.name);
          }
          if (error.message) {
            console.error("Error message:", error.message);
          }
          
          // If it's an index error, fall back to simple query without orderBy
          if (error.code === 'failed-precondition' || (error.message && error.message.includes('index'))) {
            console.log("AdminMessages: Falling back to simple query without orderBy due to missing index");
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
            setMessages(fallbackMessages);
            setLoading(false);
            return;
          }
          
          setLoading(false);
          toast({
            title: "Error",
            description: `Failed to load messages. Error: ${error.message || 'Unknown error'}`,
            variant: "destructive",
          });
        });

        return () => {
          console.log("AdminMessages: Cleaning up listener");
          unsubscribe();
          setLoading(false);
        };
      } else {
        // No messages found, set empty array and stop loading
        console.log("AdminMessages: No messages found for user");
        setMessages([]);
        setLoading(false);
      }
    }).catch((error) => {
      console.error("AdminMessages: Error in simple query:", error);
      setLoading(false);
      toast({
        title: "Error",
        description: `Failed to load messages. Error: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    });
  }, [userId, toast]);

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

  // Calculate dynamic height based on number of messages
  const calculateDynamicHeight = () => {
    if (messages.length === 0) {
      return "auto";
    }
    // Base height for one message + padding
    const baseHeight = 120;
    // Additional height per message
    const perMessageHeight = 100;
    // Maximum height
    const maxHeight = 400;
    
    const calculatedHeight = baseHeight + (messages.length - 1) * perMessageHeight;
    return Math.min(calculatedHeight, maxHeight);
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
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
            <p>Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Send className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" />
            <p>No messages from admin yet.</p>
            <p className="text-sm mt-1">When admins send you messages, they will appear here.</p>
          </div>
        ) : (
          <div 
            className="pr-4"
            style={{ 
              maxHeight: `${calculateDynamicHeight()}px`,
              overflowY: messages.length > 3 ? 'auto' : 'visible'
            }}
          >
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
                    <span>From sender:</span>
                    <span className="font-mono">{message.senderId.substring(0, 8)}...</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminMessages;