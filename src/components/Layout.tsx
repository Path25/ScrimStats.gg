
import React, { ReactNode } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import GamingSidebar from './GamingSidebar';
import { Menu } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <GamingSidebar />
        <SidebarInset className="flex-1">
          <header className="flex h-16 items-center gap-4 border-b border-border/30 bg-background/95 backdrop-blur-sm px-6 sticky top-0 z-20">
            <SidebarTrigger className="hover:bg-background/80 rounded-md p-1.5">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <div className="flex-1" />
            <div className="text-sm font-medium text-foreground/80 flex items-center gap-2">
              <span className="w-2 h-2 bg-gaming-green rounded-full pulse-glow"></span>
              <span className="font-gaming tracking-wide text-gaming-neon-blue font-semibold">COMMAND CENTER ONLINE</span>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
