import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, FileText, Users, Settings, Trophy, Zap, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import ThemeToggle from './ThemeToggle';

const navItems = [
  { to: "/dashboard", icon: Home, label: "Command Center", description: "Overview & Stats" },
  { to: "/calendar", icon: Calendar, label: "Schedule", description: "Upcoming Matches" },
  { to: "/scrims", icon: FileText, label: "Scrims", description: "Match History" },
  { to: "/players", icon: Users, label: "Roster", description: "Team Members" },
  { to: "/settings", icon: Settings, label: "Settings", description: "Configuration" },
];

const GamingSidebar: React.FC = () => {
  const { logout, user, profile, authLoading } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const handleLogout = async () => {
    await logout();
  };

  return (
    <Sidebar className="border-r border-border/30 bg-card/80 backdrop-blur-sm transition-all duration-300">
      <SidebarHeader className="p-6 border-b border-border/30">
        <div className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary via-primary/90 to-accent/80 flex items-center justify-center shadow-lg shadow-primary/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-primary/30">
            <Trophy className="w-6 h-6 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="transition-all duration-300">
              <h1 className="text-xl font-bold tracking-tight font-gaming bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                ScrimStats.gg
              </h1>
              <p className="text-xs text-muted-foreground">Esports Management</p>
            </div>
          )}
        </div>
        
        {!authLoading && user && !isCollapsed && (
          <div className="mt-4 p-3 rounded-lg bg-background/50 border border-border/40 backdrop-blur-sm hover:border-border/60 hover:bg-background/60 transition-all duration-300 group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/80 to-accent/80 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300">
                <Zap className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {profile?.ign || profile?.full_name || user.email}
                </p>
                <p className="text-xs text-muted-foreground">Team Captain</p>
              </div>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) => {
                      return `
                        group relative flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-300 ease-out
                        ${isActive 
                          ? 'bg-gradient-to-r from-primary/15 via-primary/10 to-accent/15 text-primary border border-primary/20 shadow-lg shadow-primary/10' 
                          : 'hover:bg-muted/40 text-foreground hover:text-primary hover:shadow-md'}
                        ${isActive ? 'transform translate-x-1' : 'hover:translate-x-0.5'}
                      `;
                    }}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-primary to-accent rounded-r-full transition-all duration-300" />
                        )}
                        
                        <div className="flex items-center gap-3 w-full relative z-10">
                          <div className={`p-1.5 rounded-md transition-all duration-300 ${
                            isActive 
                              ? 'bg-primary/20 text-primary shadow-sm' 
                              : 'group-hover:bg-primary/10 group-hover:text-primary'
                          }`}>
                            <item.icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                          </div>
                          {!isCollapsed && (
                            <div className="flex-1 transition-all duration-300">
                              <span className={`font-medium text-sm transition-colors duration-300 ${
                                isActive ? 'text-primary' : 'group-hover:text-primary'
                              }`}>
                                {item.label}
                              </span>
                              <p className="text-xs text-muted-foreground group-hover:text-muted-foreground/80 transition-colors duration-300">
                                {item.description}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        <div className={`absolute inset-0 rounded-lg transition-opacity duration-300 ${
                          isActive 
                            ? 'opacity-100 bg-gradient-to-r from-primary/5 to-accent/5' 
                            : 'opacity-0 group-hover:opacity-100 bg-gradient-to-r from-primary/3 to-accent/3'
                        }`} />
                      </>
                    )}
                  </NavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/30 mt-auto">
        <div className="space-y-3">
          <div className="transition-all duration-300 hover:scale-105">
            <ThemeToggle />
          </div>
          {!authLoading && user && (
            <Button 
              variant="ghost" 
              onClick={handleLogout} 
              className="w-full justify-start hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all duration-300 hover:translate-x-1 group"
              size="sm"
            >
              <LogOut className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:scale-110" />
              {!isCollapsed && "Logout"}
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default GamingSidebar;
