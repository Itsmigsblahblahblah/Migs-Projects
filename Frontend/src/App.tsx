import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CropProvider } from "@/contexts/CropContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import PublicOnlyRoute from "@/components/PublicOnlyRoute";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import FarmerDashboard from "@/pages/FarmerDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import History from "@/pages/History";
import RulesManager from "@/pages/RulesManager";
import CropHistory from "@/pages/CropHistory";
import CropDetails from "@/pages/CropDetails";
import Alerts from "@/pages/Alerts";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
              path="/farmer" 
              element={
                <ProtectedRoute requiredRole="farmer">
                  <FarmerDashboard />
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </CropProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;