import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { Settings, MapPin } from "lucide-react";
import AdminStatsOverview from "@/components/dashboard/admin/AdminStatsOverview";
import FarmersList from "@/components/dashboard/admin/FarmersList";
import DeletionRequests from "@/components/dashboard/admin/DeletionRequests";
import AnalyticsCharts from "@/components/dashboard/admin/AnalyticsCharts";
import ReportsList from "@/components/dashboard/admin/ReportsList";
import { useAdminDashboard } from "@/hooks/custom/useAdminDashboard";

const AdminDashboard = () => {
  const [username, setUsername] = useState("");
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
            <Button
              variant="outline"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              onClick={() => navigate('/admin/rules')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage Rules
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <AdminStatsOverview stats={stats} />

        {/* Main Content Tabs */}
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="flex flex-col sm:flex-row flex-wrap gap-2 w-full">
            <TabsTrigger
              value="farmers"
              className="flex-1 min-w-[120px] text-center whitespace-nowrap"
            >
              Registered Farmers
            </TabsTrigger>
            <TabsTrigger
              value="deletion-requests"
              className="flex-1 min-w-[120px] text-center whitespace-nowrap"
            >
              Deletion Requests
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="flex-1 min-w-[120px] text-center whitespace-nowrap"
            >
              Analytics
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="flex-1 min-w-[120px] text-center whitespace-nowrap"
            >
              Reports
            </TabsTrigger>
            <TabsTrigger
              value="map"
              className="flex-1 min-w-[120px] text-center whitespace-nowrap"
            >
              Location Map
            </TabsTrigger>
          </TabsList>

          {/* Registered Farmers Tab */}
          <TabsContent value="farmers" className="space-y-6">
            <FarmersList farmers={farmers} />
          </TabsContent>

          {/* Deletion Requests Tab */}
          <TabsContent value="deletion-requests" className="space-y-6">
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
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsCharts
              problemsData={problemsData}
              monthlyTrends={monthlyTrends}
              cropRecommendations={cropRecommendations}
              onExport={exportData}
            />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <ReportsList
              reports={reports}
              onExport={() => exportData('reports')}
              onUpdateStatus={updateReportStatus}
            />
          </TabsContent>

          {/* Map Tab */}
          <TabsContent value="map" className="space-y-6">
            <div className="shadow-card rounded-lg border p-6">
              <div className="bg-muted/30 rounded-lg p-8 text-center">
                <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Interactive Map Coming Soon</h3>
                <p className="text-muted-foreground">
                  This will show the geographic distribution of farming problems across different barangays in Majayjay.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdminDashboard;