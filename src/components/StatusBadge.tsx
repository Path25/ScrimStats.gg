
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, XCircle, AlertCircle, Play } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className, size = 'md' }) => {
  const getStatusConfig = () => {
    switch (status.toLowerCase()) {
      case 'completed':
        return {
          variant: 'success' as const,
          icon: CheckCircle2,
          label: 'Completed',
          customClass: 'bg-gaming-green/15 text-gaming-green border-gaming-green/30 shadow-sm shadow-gaming-green/20 hover:bg-gaming-green/25 hover:shadow-gaming-green/30'
        };
      case 'scheduled':
        return {
          variant: 'info' as const,
          icon: Clock,
          label: 'Scheduled',
          customClass: 'bg-gaming-neon-blue/15 text-gaming-neon-blue border-gaming-neon-blue/30 shadow-sm shadow-gaming-neon-blue/20 hover:bg-gaming-neon-blue/25 hover:shadow-gaming-neon-blue/30'
        };
      case 'cancelled':
        return {
          variant: 'destructive' as const,
          icon: XCircle,
          label: 'Cancelled',
          customClass: 'bg-destructive/15 text-destructive border-destructive/30 shadow-sm shadow-destructive/20 hover:bg-destructive/25 hover:shadow-destructive/30'
        };
      case 'in progress':
        return {
          variant: 'warning' as const,
          icon: Play,
          label: 'In Progress',
          customClass: 'bg-gaming-orange/15 text-gaming-orange border-gaming-orange/30 shadow-sm shadow-gaming-orange/20 hover:bg-gaming-orange/25 hover:shadow-gaming-orange/30 pulse-glow'
        };
      default:
        return {
          variant: 'outline' as const,
          icon: AlertCircle,
          label: status,
          customClass: 'bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted/70'
        };
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs gap-1';
      case 'lg':
        return 'px-4 py-2 text-sm gap-2';
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

  const { variant, icon: Icon, label, customClass } = getStatusConfig();

  return (
    <Badge 
      variant={variant} 
      className={cn(
        'inline-flex items-center font-semibold transition-all duration-300 transform hover:scale-105 backdrop-blur-sm',
        getSizeClass(),
        customClass,
        className
      )}
    >
      <Icon className={cn('flex-shrink-0', getIconSize())} />
      <span className="truncate">{label}</span>
    </Badge>
  );
};

export default StatusBadge;
