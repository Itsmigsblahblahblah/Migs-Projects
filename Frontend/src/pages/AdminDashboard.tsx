import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
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
      console.log('Hash changed to:', hash);
      if (hash && ['farmers', 'deletion-requests', 'analytics', 'reports', 'announcements'].includes(hash)) {
        setActiveSection(hash);
        localStorage.setItem('adminActiveSection', hash);
      }
    };

    // Check initial hash on mount
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    // Also listen for popstate (browser back/forward)
    window.addEventListener('popstate', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  // Also sync with location from React Router
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    console.log('Location hash from router:', hash);
    if (hash && ['farmers', 'deletion-requests', 'analytics', 'reports', 'announcements'].includes(hash)) {
      setActiveSection(hash);
      localStorage.setItem('adminActiveSection', hash);
    }
  }, [location.hash]);

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
        {/* Header - Only show on Analytics page */}
        {activeSection === "analytics" && (
          <>
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

            {/* Stats Overview - Only for Analytics */}
            <AdminStatsOverview stats={stats} />
          </>
        )}

        {/* Section Content */}
        <div className="space-y-6">
          {/* Registered Farmers Section */}
          {activeSection === "farmers" && (
            <>
              <div className="bg-blue-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold">Registered Farmers</h1>
                    <p className="text-white/90">
                      View and manage all registered farmers in the system.
                    </p>
                  </div>
                </div>
              </div>
              <FarmersList farmers={farmers} />
            </>
          )}

          {/* Deletion Requests Section */}
          {activeSection === "deletion-requests" && (
            <>
              <div className="bg-blue-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold">Deletion Requests</h1>
                    <p className="text-white/90">
                      Review and manage farmer account deletion requests.
                    </p>
                  </div>
                </div>
              </div>
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
            </>
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
            <>
              <div className="bg-blue-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold">Reports</h1>
                    <p className="text-white/90">
                      View and manage all farmer reports and submissions.
                    </p>
                  </div>
                </div>
              </div>
              <ReportsList
                reports={reports}
                farmers={farmers} // Pass farmers data to get barangay information
                onExport={() => exportData('reports')}
                onUpdateStatus={updateReportStatus}
              />
            </>
          )}

          {/* Announcements Section */}
          {activeSection === "announcements" && (
            <>
              <div className="bg-blue-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold">Announcements</h1>
                    <p className="text-white/90">
                      Create and manage system-wide announcements for farmers.
                    </p>
                  </div>
                </div>
              </div>
              <AdminAnnouncements />
            </>
          )}

        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;