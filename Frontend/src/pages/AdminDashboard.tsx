import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { Settings, Users, FileText, BarChart3, Bell } from "lucide-react";
import AdminStatsOverview from "@/components/dashboard/admin/AdminStatsOverview";
import FarmersList from "@/components/dashboard/admin/FarmersList";
import DeletionRequests from "@/components/dashboard/admin/DeletionRequests";
import AnalyticsCharts from "@/components/dashboard/admin/AnalyticsCharts";
import ReportsList from "@/components/dashboard/admin/ReportsList";
import AdminAnnouncements from "@/components/dashboard/admin/AdminAnnouncements";
import { useAdminDashboard } from "@/hooks/custom/useAdminDashboard";

const AdminDashboard = () => {
  const [username, setUsername] = useState("");
  const [activeSection, setActiveSection] = useState(() => {
    // Initialize from localStorage or URL hash, default to analytics
    const hash = window.location.hash.replace('#', '');
    const savedSection = localStorage.getItem('adminActiveSection');

    if (hash && ['farmers', 'deletion-requests', 'analytics', 'reports', 'announcements'].includes(hash)) {
      return hash;
    } else if (savedSection && ['farmers', 'deletion-requests', 'analytics', 'reports', 'announcements'].includes(savedSection)) {
      return savedSection;
    } else {
      return "analytics"; // Default to analytics
    }
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const {
    loading,
    reports,
    problemsData,
    monthlyTrends,
    cropRecommendations,
    farmers,
    deletionRequests,
    stats,
    deleteMode,
    selectedRequests,
    loadDashboardData,
    handleDeletionRequestAction,
    toggleDeleteMode,
    toggleRequestSelection,
    handleBulkDelete,
    updateReportStatus,
    exportData
  } = useAdminDashboard();

  // Update active section and persist it
  const handleSetActiveSection = (section) => {
    setActiveSection(section);
    localStorage.setItem('adminActiveSection', section);
    window.location.hash = section;
  };

  // Sync with URL hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && ['farmers', 'deletion-requests', 'analytics', 'reports', 'announcements'].includes(hash)) {
        setActiveSection(hash);
      }
    };

    // Check initial hash
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Load user data
  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const user = localStorage.getItem('username');

    setUsername(user || 'Admin');
    loadDashboardData();
  }, [navigate]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading dashboard data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-white/90">
                Welcome back, {username}. Here's your farm management overview.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <AdminStatsOverview stats={stats} />

        {/* Quick Actions Style Navigation */}
        <Card className="shadow-card border-blue-200">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <Button
                variant={activeSection === "farmers" ? "default" : "outline"}
                className={`h-20 flex flex-col gap-2 ${activeSection === "farmers" ? "bg-blue-600 hover:bg-blue-700 text-white" : "hover:bg-blue-50"}`}
                onClick={() => handleSetActiveSection("farmers")}
              >
                <Users className="h-5 w-5" />
                <span>Registered Farmers</span>
              </Button>
              <Button
                variant={activeSection === "deletion-requests" ? "default" : "outline"}
                className={`h-20 flex flex-col gap-2 ${activeSection === "deletion-requests" ? "bg-blue-600 hover:bg-blue-700 text-white" : "hover:bg-blue-50"}`}
                onClick={() => handleSetActiveSection("deletion-requests")}
              >
                <FileText className="h-5 w-5" />
                <span>Deletion Requests</span>
              </Button>
              <Button
                variant={activeSection === "analytics" ? "default" : "outline"}
                className={`h-20 flex flex-col gap-2 ${activeSection === "analytics" ? "bg-blue-600 hover:bg-blue-700 text-white" : "hover:bg-blue-50"}`}
                onClick={() => handleSetActiveSection("analytics")}
              >
                <BarChart3 className="h-5 w-5" />
                <span>Analytics</span>
              </Button>
              <Button
                variant={activeSection === "reports" ? "default" : "outline"}
                className={`h-20 flex flex-col gap-2 ${activeSection === "reports" ? "bg-blue-600 hover:bg-blue-700 text-white" : "hover:bg-blue-50"}`}
                onClick={() => handleSetActiveSection("reports")}
              >
                <FileText className="h-5 w-5" />
                <span>Reports</span>
              </Button>
              <Button
                variant={activeSection === "announcements" ? "default" : "outline"}
                className={`h-20 flex flex-col gap-2 ${activeSection === "announcements" ? "bg-blue-600 hover:bg-blue-700 text-white" : "hover:bg-blue-50"}`}
                onClick={() => handleSetActiveSection("announcements")}
              >
                <Bell className="h-5 w-5" />
                <span>Announcements</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Section Content */}
        <div className="space-y-6">
          {/* Registered Farmers Section */}
          {activeSection === "farmers" && (
            <FarmersList farmers={farmers} />
          )}

          {/* Deletion Requests Section */}
          {activeSection === "deletion-requests" && (
            <DeletionRequests
              deletionRequests={deletionRequests}
              deleteMode={deleteMode}
              selectedRequests={selectedRequests}
              onDeleteModeToggle={toggleDeleteMode}
              onRefresh={loadDashboardData}
              onBulkDelete={handleBulkDelete}
              onRequestSelect={toggleRequestSelection}
              onApproveRequest={(id) => handleDeletionRequestAction(id, 'approved')}
              onDenyRequest={(id) => handleDeletionRequestAction(id, 'denied')}
            />
          )}

          {/* Analytics Section */}
          {activeSection === "analytics" && (
            <AnalyticsCharts
              problemsData={problemsData}
              monthlyTrends={monthlyTrends}
              cropRecommendations={cropRecommendations}
              onExport={exportData}
              reports={reports} // Pass reports data to AnalyticsCharts
              onUpdateStatus={updateReportStatus} // Pass updateReportStatus function to AnalyticsCharts
            />
          )}

          {/* Reports Section */}
          {activeSection === "reports" && (
            <ReportsList
              reports={reports}
              farmers={farmers} // Pass farmers data to get barangay information
              onExport={() => exportData('reports')}
              onUpdateStatus={updateReportStatus}
            />
          )}

          {/* Announcements Section */}
          {activeSection === "announcements" && (
            <AdminAnnouncements />
          )}

        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;