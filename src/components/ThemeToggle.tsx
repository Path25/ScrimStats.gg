
import React from 'react';
import { Sun, Moon, SunMoon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === 'dark';
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleTheme} 
            aria-label="Toggle theme"
            className={`relative overflow-hidden transition-all duration-300 ${
              isDark ? 'bg-muted/30 hover:bg-muted/50' : ''
            }`}
          >
            <span className="sr-only">Toggle theme</span>
            {isDark ? (
              <Moon className="h-5 w-5 text-primary animate-in fade-in-50 duration-200" 
                style={{ filter: isDark ? 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))' : 'none' }} 
              />
            ) : (
              <Sun className="h-5 w-5 animate-in fade-in-50 duration-200" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">Switch to {isDark ? 'light' : 'dark'} mode</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ThemeToggle;
