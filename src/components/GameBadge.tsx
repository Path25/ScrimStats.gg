
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Crown, Sword, Wheat, Shield, Eye, Zap, Users, DollarSign } from 'lucide-react';
import { PlayerBadge } from '@/types/gameBadges';

const iconMap = {
  Crown,
  Sword,
  Wheat,
  Shield,
  Eye,
  Zap,
  Users,
  DollarSign,
};

interface GameBadgeProps {
  badge: PlayerBadge;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  animationDelay?: number;
}

const GameBadge: React.FC<GameBadgeProps> = ({ 
  badge, 
  size = 'md', 
  showTooltip = true,
  animationDelay = 0 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const IconComponent = iconMap[badge.icon as keyof typeof iconMap] || Crown;
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-xs',
    lg: 'px-4 py-2 text-sm'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4', 
    lg: 'h-5 w-5'
  };

  // Enhanced animation classes
  const hoverEffects = isHovered ? 'scale-110 shadow-gaming' : 'scale-100';
  const pulseAnimation = isHovered ? 'animate-none' : 'animate-pulse';

  const badgeContent = (
    <div 
      className={`
        inline-flex items-center gap-1.5 font-gaming font-semibold tracking-wide
        ${sizeClasses[size]} ${badge.bgColor} ${badge.color}
        border rounded-full transition-all duration-300 ${hoverEffects} hover:shadow-lg
        animate-in fade-in slide-in-from-bottom-2 cursor-help
        shadow-sm hover:shadow-md dark:backdrop-blur-sm dark:bg-opacity-80
        dark:border-opacity-40 dark:shadow-dark-glow
      `}
      style={{ 
        animationDelay: `${animationDelay}ms`,
        animationDuration: '600ms'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <IconComponent 
        className={`${iconSizes[size]} ${pulseAnimation} ${isHovered ? 'rotate-12 transform' : ''}`} 
        style={{
          transition: 'transform 0.3s ease',
          filter: isHovered ? 'drop-shadow(0 0 2px currentColor)' : 'none'
        }}
      />
      <span className={`select-none transition-transform duration-300 ${isHovered ? 'scale-105' : ''}`}>
        {badge.name}
      </span>
    </div>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className={`bg-card/95 backdrop-blur-sm border border-border/50 max-w-xs animate-in zoom-in-50 duration-300 
            ${isHovered ? 'shadow-gaming-lg' : ''} 
            dark:bg-card/80 dark:border-opacity-30 dark:backdrop-blur-md
            dark:bg-noise-subtle`}
          sideOffset={5}
        >
          <div className="space-y-2 p-1">
            <div className="flex items-center gap-2">
              <IconComponent 
                className={`h-4 w-4 text-primary ${isHovered ? 'animate-pulse' : ''}`} 
                style={{
                  filter: isHovered ? 'drop-shadow(0 0 3px currentColor)' : 'none'
                }}
              />
              <span className="font-gaming font-semibold text-foreground">
                {badge.description}
              </span>
            </div>
            <div className="text-xs text-muted-foreground border-t border-border/30 pt-2 dark:border-opacity-20">
              <p className="animate-in slide-in-from-right-2" style={{ animationDelay: '100ms' }}>
                <span className="font-medium">Awarded to:</span> {badge.playerName}
              </p>
              <p className="animate-in slide-in-from-right-2" style={{ animationDelay: '200ms' }}>
                <span className="font-medium">Criteria:</span> {badge.criteria}
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default GameBadge;
