import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Settings, Calendar, Users, FileText, LogOut } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';

const navItems = [
  { to: "/dashboard", icon: Home, label: "Dashboard" },
  { to: "/calendar", icon: Calendar, label: "Calendar" },
  { to: "/scrims", icon: FileText, label: "Scrims" },
  { to: "/players", icon: Users, label: "Players" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

const Sidebar: React.FC = () => {
  // Correctly destructure authLoading and profileLoading
  // The error was because 'loading' no longer exists on AuthContextType.
  // We now use authLoading for general authentication status (session/user)
  // and profileLoading for profile-specific data fetching.
  const { logout, user, profile, authLoading, profileLoading } = useAuth();

  const handleLogout = async () => {
    await logout();
    // Navigation is handled within the logout function in AuthContext or by AppRoutes
  };

  // Determine if we are still loading critical user data
  // For the welcome message, we need the user to be authenticated (authLoading false)
  // and profile data might still be loading (profileLoading true/false).
  // The UI handles profile being potentially null with `profile?.ign`.
  // For the logout button, we only need the user to be authenticated.
  const isContentLoading = authLoading; // Simplified: main concern is user session

  return (
    <aside className="bg-card text-card-foreground h-screen w-full p-4 flex flex-col shadow-soft">
      <div className="mb-8">
        <NavLink to="/dashboard">
          <h1 className="text-2xl font-bold text-primary font-gaming tracking-wider">ScrimStats.gg</h1>
        </NavLink>
        {/* Show welcome message if user is authenticated and auth process is complete */}
        {/* Profile data might still be loading, handled by optional chaining on `profile` */}
        {!isContentLoading && user && (
          <div className="mt-2 text-sm text-muted-foreground">
            <p>Welcome, {profile?.ign || profile?.full_name || user.email}</p>
            {/* Optionally, show a small loader if profile is loading: */}
            {/* {profileLoading && <span className="text-xs"> (loading profile...)</span>} */}
          </div>
        )}
         {/* Show a general loading indicator if auth is in progress and no user yet */}
        {isContentLoading && !user && (
          <div className="mt-2 text-sm text-muted-foreground">
            <p>Loading user...</p>
          </div>
        )}
      </div>
      <nav className="flex-grow">
        <ul>
          {navItems.map((item) => (
            <li key={item.label} className="mb-2">
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center p-2 rounded-lg hover:bg-muted transition-colors ${
                    isActive ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-muted'
                  }`
                }
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto space-y-4">
         {/* Show logout button if user is authenticated and auth process is complete */}
        {!isContentLoading && user && (
          <Button variant="ghost" onClick={handleLogout} className="w-full justify-start">
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </Button>
        )}
        <ThemeToggle />
      </div>
    </aside>
  );
};

export default Sidebar;
