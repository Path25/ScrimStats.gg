
import React, { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
// useIsMobile can be used for conditional rendering inside components if needed,
// but Tailwind's responsive prefixes handle the overall layout structure.

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-layout-desktop">
      {/* Desktop Sidebar: shown on lg and up */}
      <div className="hidden lg:block lg:col-start-1 lg:col-end-2 print:hidden">
        <Sidebar />
      </div>

      {/* Mobile/Tablet Navbar: shown below lg */}
      <div className="lg:hidden print:hidden">
        <Navbar />
      </div>
      
      {/* Main Content Area */}
      {/* On lg and up, it's the second column. Below lg, it's the main content after Navbar. */}
      <main className="flex-1 lg:col-start-2 lg:col-end-3 p-4 sm:p-6 md:p-8 overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  );
};

export default Layout;
