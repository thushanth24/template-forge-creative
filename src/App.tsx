import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import Index from "./pages/Index";
import Editor from "./pages/Editor";
import Login from "./pages/Login";
import MyProjects from "./pages/MyProjects";
import NotFound from "./pages/NotFound";
import AdminTemplates from "./pages/AdminTemplates";

const queryClient = new QueryClient();

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/login" element={<Login />} />
    <Route
      path="/editor/:templateId"
      element={
        <ProtectedRoute>
          <Editor />
        </ProtectedRoute>
      }
    />
    <Route
      path="/my-projects"
      element={
        <ProtectedRoute>
          <MyProjects />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin-templates"
      element={
        <ProtectedRoute>
          <AdminTemplates />
        </ProtectedRoute>
      }
    />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
