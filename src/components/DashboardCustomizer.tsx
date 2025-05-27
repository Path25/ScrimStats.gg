
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Settings, Eye, EyeOff, Move, BarChart2, Calendar, Users, TrendingUp, Clock } from 'lucide-react';

export interface DashboardWidget {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  enabled: boolean;
  order: number;
  category: 'stats' | 'charts' | 'calendar';
}

interface DashboardCustomizerProps {
  widgets: DashboardWidget[];
  onUpdateWidgets: (widgets: DashboardWidget[]) => void;
}

const DashboardCustomizer: React.FC<DashboardCustomizerProps> = ({
  widgets,
  onUpdateWidgets,
}) => {
  const [localWidgets, setLocalWidgets] = useState<DashboardWidget[]>(widgets);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  const toggleWidget = (widgetId: string) => {
    const updatedWidgets = localWidgets.map(widget =>
      widget.id === widgetId ? { ...widget, enabled: !widget.enabled } : widget
    );
    setLocalWidgets(updatedWidgets);
  };

  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    setDraggedWidget(widgetId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault();
    
    if (!draggedWidget || draggedWidget === targetWidgetId) return;

    const draggedIndex = localWidgets.findIndex(w => w.id === draggedWidget);
    const targetIndex = localWidgets.findIndex(w => w.id === targetWidgetId);

    const newWidgets = [...localWidgets];
    const [removed] = newWidgets.splice(draggedIndex, 1);
    newWidgets.splice(targetIndex, 0, removed);

    // Update order values
    const updatedWidgets = newWidgets.map((widget, index) => ({
      ...widget,
      order: index
    }));

    setLocalWidgets(updatedWidgets);
    setDraggedWidget(null);
  };

  const handleSave = () => {
    onUpdateWidgets(localWidgets);
  };

  const handleReset = () => {
    setLocalWidgets(widgets);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'stats': return 'bg-blue-500/20 text-blue-600 border-blue-500/30';
      case 'charts': return 'bg-green-500/20 text-green-600 border-green-500/30';
      case 'calendar': return 'bg-purple-500/20 text-purple-600 border-purple-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const enabledCount = localWidgets.filter(w => w.enabled).length;
  const totalCount = localWidgets.length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 hover:bg-accent/50 transition-colors">
          <Settings className="h-4 w-4" />
          Customize Dashboard
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-gaming tracking-wide">
            <Settings className="h-5 w-5 text-primary" />
            DASHBOARD CUSTOMIZATION
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Drag to reorder widgets and toggle visibility. {enabledCount}/{totalCount} widgets enabled.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border">
            <Move className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Drag widgets to reorder them on your dashboard</span>
          </div>

          <div className="space-y-3">
            {localWidgets
              .sort((a, b) => a.order - b.order)
              .map((widget) => (
                <div
                  key={widget.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, widget.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, widget.id)}
                  className={`
                    group p-4 border rounded-lg transition-all duration-200 cursor-move
                    hover:shadow-md hover:border-primary/30 bg-card
                    ${draggedWidget === widget.id ? 'opacity-50 scale-95' : ''}
                    ${widget.enabled ? 'border-border' : 'border-dashed border-muted-foreground/30 opacity-60'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center gap-2">
                        <Move className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <widget.icon className="h-5 w-5 text-primary" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium font-gaming tracking-wide">{widget.title}</h4>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getCategoryColor(widget.category)}`}
                          >
                            {widget.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{widget.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {widget.enabled ? (
                          <Eye className="h-4 w-4 text-green-500" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Switch
                          checked={widget.enabled}
                          onCheckedChange={() => toggleWidget(widget.id)}
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          <div className="flex justify-between gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={handleReset}
              className="gap-2"
            >
              Reset to Default
            </Button>
            
            <div className="flex gap-2">
              <DialogTrigger asChild>
                <Button variant="outline">Cancel</Button>
              </DialogTrigger>
              <DialogTrigger asChild>
                <Button onClick={handleSave} className="gap-2">
                  <Settings className="h-4 w-4" />
                  Save Changes
                </Button>
              </DialogTrigger>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DashboardCustomizer;
