
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { Toaster } from '@/components/ui/toaster';
import PrivateRoute from './components/PrivateRoute';
import PublicRoute from './components/PublicRoute';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SettingsPage from './pages/SettingsPage';
import CalendarPage from './pages/CalendarPage';
import ScrimListPage from './pages/ScrimListPage';
import PlayersPage from './pages/PlayersPage';
import PlayerAnalyticsPage from './pages/PlayerAnalyticsPage';
import SoloQTrackerPage from './pages/SoloQTrackerPage';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider>
            <Toaster />
            <Router>
              <Routes>
                <Route path="/" element={
                  <PrivateRoute>
                    <DashboardPage />
                  </PrivateRoute>
                } />
                <Route path="/dashboard" element={
                  <PrivateRoute>
                    <DashboardPage />
                  </PrivateRoute>
                } />
                <Route path="/calendar" element={
                  <PrivateRoute>
                    <CalendarPage />
                  </PrivateRoute>
                } />
                <Route path="/scrims" element={
                  <PrivateRoute>
                    <ScrimListPage />
                  </PrivateRoute>
                } />
                <Route path="/players" element={
                  <PrivateRoute>
                    <PlayersPage />
                  </PrivateRoute>
                } />
                <Route path="/player-analytics" element={
                  <PrivateRoute>
                    <PlayerAnalyticsPage />
                  </PrivateRoute>
                } />
                <Route path="/soloq-tracker" element={
                  <PrivateRoute>
                    <SoloQTrackerPage />
                  </PrivateRoute>
                } />
                <Route path="/settings" element={
                  <PrivateRoute>
                    <SettingsPage />
                  </PrivateRoute>
                } />
                <Route path="/login" element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                } />
                <Route path="/register" element={
                  <PublicRoute>
                    <RegisterPage />
                  </PublicRoute>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Router>
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
