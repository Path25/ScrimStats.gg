
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X, Home, Settings, Calendar, Users, FileText } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet"; // shadcn Sheet for mobile drawer

const navItems = [
  { to: "/dashboard", icon: Home, label: "Dashboard" },
  { to: "/calendar", icon: Calendar, label: "Calendar" },
  { to: "/scrims", icon: FileText, label: "Scrims" },
  { to: "/players", icon: Users, label: "Players" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

const Navbar: React.FC = () => {
  return (
    <header className="bg-card text-card-foreground shadow-soft p-4 sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <NavLink to="/dashboard">
         <h1 className="text-xl font-bold text-primary font-gaming tracking-wider">ScrimStats.gg</h1>
        </NavLink>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[250px] sm:w-[300px] bg-card p-6">
              <div className="flex flex-col h-full">
                <div className="mb-6 flex justify-between items-center">
                   <h2 className="text-lg font-semibold text-primary font-gaming tracking-wide">MENU</h2>
                   <SheetClose asChild>
                      <Button variant="ghost" size="icon"><X className="h-5 w-5"/></Button>
                   </SheetClose>
                </div>
                <nav className="flex-grow">
                  <ul>
                    {navItems.map((item) => (
                      <li key={item.label} className="mb-2">
                        <SheetClose asChild>
                          <NavLink
                            to={item.to}
                            className={({ isActive }) =>
                              `flex items-center p-3 rounded-lg hover:bg-muted transition-colors text-base ${
                                isActive ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'text-foreground hover:bg-muted'
                              }`
                            }
                          >
                            <item.icon className="h-5 w-5 mr-3" />
                            {item.label}
                          </NavLink>
                        </SheetClose>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
