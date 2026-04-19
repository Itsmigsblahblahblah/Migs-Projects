import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CropProvider } from "@/contexts/CropContext";
import FirebaseProvider from "@/components/FirebaseProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import PublicOnlyRoute from "@/components/PublicOnlyRoute";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import FarmerDashboard from "@/pages/FarmerDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import History from "@/pages/History";
import RulesManager from "@/pages/RulesManager";
import CropHistory from "@/pages/CropHistory";
import CropDetails from "@/pages/CropDetails";
import Alerts from "@/pages/Alerts";
import MarketDemand from "@/pages/MarketDemand";
import CropPrescriptionPage from "@/pages/CropPrescriptionPage";
import FarmerDetailPage from "@/pages/FarmerDetailPage";
import FarmerReportDetail from "@/pages/FarmerReportDetail";
import FarmLedger from "@/pages/FarmLedger";
import FarmLedgerDetail from "@/pages/FarmLedgerDetail";
import SplashScreen from "@/components/SplashScreen";
import { useState } from "react";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  // Function to handle when splash screen completes
  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  return (
    <>
      {showSplash && <SplashScreen onLoadingComplete={handleSplashComplete} />}
      <div className={`${showSplash ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <FirebaseProvider>
                <CropProvider>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route 
                    path="/login" 
                    element={
                      <PublicOnlyRoute>
                        <Login />
                      </PublicOnlyRoute>
                    } 
                  />
                  <Route 
                    path="/forgot-password" 
                    element={
                      <PublicOnlyRoute>
                        <ForgotPassword />
                      </PublicOnlyRoute>
                    } 
                  />
                  <Route 
                    path="/farmer" 
                    element={
                      <ProtectedRoute requiredRole="farmer">
                        <FarmerDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/farmer/ledger" 
                    element={
                      <ProtectedRoute requiredRole="farmer">
                        <FarmLedger />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/farmer/ledger/:ledgerId" 
                    element={
                      <ProtectedRoute requiredRole="farmer">
                        <FarmLedgerDetail />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/farmer/reports/:reportId" 
                    element={
                      <ProtectedRoute requiredRole="farmer">
                        <FarmerReportDetail />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin" 
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <AdminDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/rules" 
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <RulesManager />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/farmer/:farmerId" 
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <FarmerDetailPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/history" 
                    element={
                      <ProtectedRoute>
                        <History />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/crop-history" 
                    element={
                      <ProtectedRoute>
                        <CropHistory />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/crop/:id" 
                    element={
                      <ProtectedRoute>
                        <CropDetails />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/alerts" 
                    element={
                      <ProtectedRoute>
                        <Alerts />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/market-demand" 
                    element={
                      <ProtectedRoute>
                        <MarketDemand />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/prescribe-crop" 
                    element={
                      <ProtectedRoute>
                        <CropPrescriptionPage />
                      </ProtectedRoute>
                    } 
                  />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </CropProvider>
              </FirebaseProvider>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </div>
    </>
  );
};

export default App;