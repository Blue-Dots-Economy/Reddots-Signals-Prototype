import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AuthPage from "./pages/AuthPage";
import LaunchPage from "./pages/LaunchPage";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import MetricBreakdown from "./pages/MetricBreakdown";
import ManageDots from "./pages/ManageDots";
import RequireAuth from "./components/RequireAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Single phone-based login */}
          <Route path="/" element={<AuthPage />} />

          {/* Post-login map + chat routing */}
          <Route path="/home" element={<LaunchPage />} />

          {/* Admin */}
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin" element={<RequireAuth loginPath="/admin-login"><AdminDashboard /></RequireAuth>} />
          <Route path="/admin/metric" element={<RequireAuth loginPath="/admin-login"><MetricBreakdown /></RequireAuth>} />
          <Route path="/admin/manage-dots" element={<RequireAuth loginPath="/admin-login"><ManageDots /></RequireAuth>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
