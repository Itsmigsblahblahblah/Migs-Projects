import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { Settings, Users, FileText, BarChart3 } from "lucide-react";
import AdminStatsOverview from "@/components/dashboard/admin/AdminStatsOverview";
import FarmersList from "@/components/dashboard/admin/FarmersList";
import DeletionRequests from "@/components/dashboard/admin/DeletionRequests";
import AnalyticsCharts from "@/components/dashboard/admin/AnalyticsCharts";
import ReportsList from "@/components/dashboard/admin/ReportsList";
import { useAdminDashboard } from "@/hooks/custom/useAdminDashboard";

const AdminDashboard = () => {
  const [username, setUsername] = useState("");
  const [activeSection, setActiveSection] = useState("analytics"); // Default to analytics
  const navigate = useNavigate();
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

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const user = localStorage.getItem('username');

    // Removed navigation check since it's now handled by ProtectedRoute

    setUsername(user || 'Admin');
    loadDashboardData();
  }, [navigate]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
        <div className="bg-gradient-primary rounded-lg p-6 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-primary-foreground/90">
                Welcome back, {username}. Here's your farm management overview.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <AdminStatsOverview stats={stats} />

        {/* Quick Actions Style Navigation */}
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <Button
                variant={activeSection === "farmers" ? "default" : "outline"}
                className="h-20 flex flex-col gap-2"
                onClick={() => setActiveSection("farmers")}
              >
                <Users className="h-5 w-5" />
                <span>Registered Farmers</span>
              </Button>
              <Button
                variant={activeSection === "deletion-requests" ? "default" : "outline"}
                className="h-20 flex flex-col gap-2"
                onClick={() => setActiveSection("deletion-requests")}
              >
                <FileText className="h-5 w-5" />
                <span>Deletion Requests</span>
              </Button>
              <Button
                variant={activeSection === "analytics" ? "default" : "outline"}
                className="h-20 flex flex-col gap-2"
                onClick={() => setActiveSection("analytics")}
              >
                <BarChart3 className="h-5 w-5" />
                <span>Analytics</span>
              </Button>
              <Button
                variant={activeSection === "reports" ? "default" : "outline"}
                className="h-20 flex flex-col gap-2"
                onClick={() => setActiveSection("reports")}
              >
                <FileText className="h-5 w-5" />
                <span>Reports</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2"
                onClick={() => navigate('/admin/rules')}
              >
                <Settings className="h-5 w-5" />
                <span>Manage Rules</span>
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
            />
          )}

          {/* Reports Section */}
          {activeSection === "reports" && (
            <ReportsList
              reports={reports}
              onExport={() => exportData('reports')}
              onUpdateStatus={updateReportStatus}
            />
          )}


        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;