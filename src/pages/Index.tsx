
// src/pages/Index.tsx
// This page will now primarily serve as an entry point that redirects.
// The actual "home" for an authenticated user will be /dashboard.
// If not authenticated, they'll be directed to /login.
// The logic for this is handled in App.tsx routing.
// This component might not be rendered directly if App.tsx handles all root path logic.

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Index: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Since Supabase is now directly configured, let normal routing handle redirection
    console.log("Index.tsx rendered - check App.tsx for root path ('/') handling.");
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary mb-4">ScrimStats.gg</h1>
        <p className="text-lg text-muted-foreground">Loading your experience...</p>
        {/* Optional: Add a loading spinner */}
      </div>
    </div>
  );
};

export default Index;
