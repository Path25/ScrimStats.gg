
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface KPIData {
  title: string;
  value: string;
  icon: LucideIcon;
  trend: string;
  trendIcon?: LucideIcon;
  gradient: string;
  iconColor: string;
  change: string;
}

interface CustomizableKPIGridProps {
  kpiData: KPIData[];
  enabledWidgetIds: string[];
}

const CustomizableKPIGrid: React.FC<CustomizableKPIGridProps> = ({
  kpiData,
  enabledWidgetIds
}) => {
  // Map KPI data to widget IDs
  const widgetKPIMap: { [key: string]: number } = {
    'total-scrims': 0,
    'win-rate': 1,
    'upcoming-blocks': 2,
    'active-players': 3
  };

  // Filter KPI data based on enabled widgets
  const filteredKPIData = kpiData.filter((_, index) => {
    const widgetId = Object.keys(widgetKPIMap).find(id => widgetKPIMap[id] === index);
    return widgetId && enabledWidgetIds.includes(widgetId);
  });

  if (filteredKPIData.length === 0) {
    return null;
  }

  // Calculate grid columns based on number of enabled widgets
  const getGridCols = (count: number) => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2';
    if (count === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
  };

  return (
    <div className={`grid ${getGridCols(filteredKPIData.length)} gap-6`}>
      {filteredKPIData.map((kpi, index) => (
        <Card key={kpi.title} className="group relative overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 cursor-pointer">
          <div className={`absolute inset-0 bg-gradient-to-br ${kpi.gradient} opacity-50 group-hover:opacity-70 transition-opacity duration-300`} />
          <div className="absolute inset-0 bg-gradient-to-t from-background/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium text-muted-foreground tracking-wide uppercase font-gaming">
                {kpi.title}
              </CardTitle>
            </div>
            <div className={`p-2 rounded-lg bg-background/80 ${kpi.iconColor} group-hover:scale-125 group-hover:rotate-6 transition-all duration-500 shadow-sm group-hover:shadow-lg`}>
              <kpi.icon className="h-5 w-5" />
            </div>
          </CardHeader>
          
          <CardContent className="relative">
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <div className="text-3xl font-bold text-foreground tracking-tight font-gaming group-hover:scale-105 transition-transform duration-300">
                  {kpi.value}
                </div>
                <div className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  kpi.change.includes('+') ? 'bg-green-500/20 text-green-600' : 
                  kpi.change.includes('-') ? 'bg-red-500/20 text-red-600' : 
                  'bg-muted text-muted-foreground'
                } transition-all duration-300 group-hover:scale-110`}>
                  {kpi.change}
                </div>
              </div>
              
              <div className="flex items-center gap-1 text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300">
                {kpi.trendIcon && <kpi.trendIcon className="h-3 w-3 group-hover:scale-110 transition-transform duration-300" />}
                <span className="line-clamp-1">{kpi.trend}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CustomizableKPIGrid;
