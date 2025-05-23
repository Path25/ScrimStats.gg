
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Import new pages
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import SettingsPage from "./pages/SettingsPage";
import CalendarPage from "./pages/CalendarPage";
import ScrimListPage from "./pages/ScrimListPage";
import ScrimDetailPage from "./pages/ScrimDetailPage";
import PlayersPage from "./pages/PlayersPage";

const queryClient = new QueryClient();

interface ProtectedRouteProps {
  children: JSX.Element;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { session, authLoading } = useAuth();
  console.log('ProtectedRoute RENDER: authLoading:', authLoading, 'session:', session);

  if (authLoading) {
    console.log('ProtectedRoute: Condition met (authLoading is true). Showing "Authenticating..."');
    return <div className="min-h-screen flex items-center justify-center bg-background"><p>Authenticating...</p></div>;
  }

  if (!session) {
    console.log('ProtectedRoute: Condition met (!session is true, authLoading is false). Redirecting to /login');
    return <Navigate to="/login" replace />;
  }
  console.log('ProtectedRoute: Conditions not met for loading or redirect. Rendering children.');
  return children;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppRoutes />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
);

const AppRoutes = () => {
  const { session, authLoading } = useAuth();
  // Log at the very start of the component function
  console.log('AppRoutes RENDER: authLoading:', authLoading, 'session:', session);

  if (authLoading) {
    console.log('AppRoutes: Condition met (authLoading is true). Showing "Loading application..."');
    return <div className="min-h-screen flex items-center justify-center bg-background"><p>Loading application...</p></div>;
  }
  
  console.log('AppRoutes: authLoading is false. Proceeding to render routes.');
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/register" element={session ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
      
      {/* Root path: Redirect based on auth status once authLoading is false */}
      <Route 
        path="/" 
        element={
          // authLoading is already confirmed false at this point by the check above
          session ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        } 
      />

      {/* Protected routes */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
      <Route path="/scrims" element={<ProtectedRoute><ScrimListPage /></ProtectedRoute>} /> 
      <Route path="/scrims/:scrimId" element={<ProtectedRoute><ScrimDetailPage /></ProtectedRoute>} />
      <Route path="/players" element={<ProtectedRoute><PlayersPage /></ProtectedRoute>} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;

