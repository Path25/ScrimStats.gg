
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return <div>Loading...</div>;
  }

  return !user ? <>{children}</> : <Navigate to="/" />;
};

export default PublicRoute;
