
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon, Zap } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'gaming';
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Zap,
  title,
  description,
  action,
  className,
  size = 'md'
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'py-8',
          icon: 'w-12 h-12',
          iconContainer: 'w-16 h-16',
          title: 'text-lg',
          description: 'text-sm'
        };
      case 'lg':
        return {
          container: 'py-16',
          icon: 'w-10 h-10',
          iconContainer: 'w-20 h-20',
          title: 'text-2xl',
          description: 'text-base'
        };
      default:
        return {
          container: 'py-12',
          icon: 'w-8 h-8',
          iconContainer: 'w-16 h-16',
          title: 'text-xl',
          description: 'text-sm'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  return (
    <Card className={cn('border-dashed border-2 border-border/50 bg-muted/20', className)}>
      <CardContent className={cn('text-center', sizeClasses.container)}>
        <div className="flex flex-col items-center space-y-4">
          <div className={cn(
            'rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shadow-sm',
            sizeClasses.iconContainer
          )}>
            <Icon className={cn('text-muted-foreground', sizeClasses.icon)} />
          </div>
          
          <div className="space-y-2 max-w-md">
            <h3 className={cn('font-semibold text-foreground', sizeClasses.title)}>
              {title}
            </h3>
            <p className={cn('text-muted-foreground leading-relaxed', sizeClasses.description)}>
              {description}
            </p>
          </div>
          
          {action && (
            <div className="pt-2">
              <Button 
                onClick={action.onClick} 
                variant={action.variant || 'outline'}
                className="transition-all duration-300 hover:scale-105"
              >
                {action.label}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EmptyState;
