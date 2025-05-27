
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Trophy, Skull, Minus, Zap } from 'lucide-react';

interface ResultBadgeProps {
  result: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const ResultBadge: React.FC<ResultBadgeProps> = ({ 
  result, 
  className, 
  size = 'md',
  showIcon = true 
}) => {
  if (!result) return null;
  
  const getResultConfig = () => {
    switch (result.toLowerCase()) {
      case 'win':
        return {
          variant: 'success' as const,
          icon: Trophy,
          label: 'Victory',
          customClass: 'bg-gradient-to-r from-gaming-green/20 to-gaming-green/15 text-gaming-green border-gaming-green/40 shadow-lg shadow-gaming-green/25 hover:shadow-gaming-green/40 hover:from-gaming-green/25 hover:to-gaming-green/20'
        };
      case 'loss':
        return {
          variant: 'destructive' as const,
          icon: Skull,
          label: 'Defeat',
          customClass: 'bg-gradient-to-r from-destructive/20 to-destructive/15 text-destructive border-destructive/40 shadow-lg shadow-destructive/25 hover:shadow-destructive/40 hover:from-destructive/25 hover:to-destructive/20'
        };
      case 'draw':
        return {
          variant: 'outline' as const,
          icon: Minus,
          label: 'Draw',
          customClass: 'bg-gradient-to-r from-gaming-gold/20 to-gaming-gold/15 text-gaming-gold border-gaming-gold/40 shadow-lg shadow-gaming-gold/25 hover:shadow-gaming-gold/40 hover:from-gaming-gold/25 hover:to-gaming-gold/20'
        };
      default:
        return {
          variant: 'outline' as const,
          icon: Zap,
          label: result,
          customClass: 'bg-gradient-to-r from-muted/50 to-muted/30 text-muted-foreground border-border/50 hover:bg-muted/70'
        };
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs gap-1';
      case 'lg':
        return 'px-4 py-2.5 text-sm gap-2';
      default:
        return 'px-3 py-1.5 text-xs gap-1.5';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'h-3 w-3';
      case 'lg':
        return 'h-4 w-4';
      default:
        return 'h-3.5 w-3.5';
    }
  };

  const { variant, icon: Icon, label, customClass } = getResultConfig();

  return (
    <Badge 
      variant={variant} 
      className={cn(
        'inline-flex items-center font-bold transition-all duration-300 transform hover:scale-110 backdrop-blur-sm',
        getSizeClass(),
        customClass,
        className
      )}
    >
      {showIcon && <Icon className={cn('flex-shrink-0', getIconSize())} />}
      <span className="truncate">{label}</span>
    </Badge>
  );
};

export default ResultBadge;
