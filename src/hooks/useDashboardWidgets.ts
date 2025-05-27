
import { useState, useEffect } from 'react';
import { BarChart2, CalendarCheck, Users, TrendingUp, Calendar, Clock } from 'lucide-react';
import { DashboardWidget } from '@/components/DashboardCustomizer';

const defaultWidgets: DashboardWidget[] = [
  {
    id: 'total-scrims',
    title: 'Total Scrims',
    description: 'Number of practice sessions completed',
    icon: BarChart2,
    enabled: true,
    order: 0,
    category: 'stats'
  },
  {
    id: 'win-rate',
    title: 'Win Rate',
    description: 'Overall performance percentage',
    icon: TrendingUp,
    enabled: true,
    order: 1,
    category: 'stats'
  },
  {
    id: 'upcoming-blocks',
    title: 'Upcoming Blocks',
    description: 'Scheduled practice sessions',
    icon: CalendarCheck,
    enabled: true,
    order: 2,
    category: 'stats'
  },
  {
    id: 'active-players',
    title: 'Active Players',
    description: 'Current roster members',
    icon: Users,
    enabled: true,
    order: 3,
    category: 'stats'
  },
  {
    id: 'match-timeline',
    title: 'Match Timeline',
    description: 'Visual timeline of recent matches',
    icon: Calendar,
    enabled: true,
    order: 4,
    category: 'charts'
  },
  {
    id: 'upcoming-scrims',
    title: 'Upcoming Scrims',
    description: 'Next scheduled practice sessions',
    icon: Clock,
    enabled: true,
    order: 5,
    category: 'calendar'
  }
];

export const useDashboardWidgets = () => {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(defaultWidgets);

  // Load widgets from localStorage on mount
  useEffect(() => {
    const savedWidgets = localStorage.getItem('dashboard-widgets');
    if (savedWidgets) {
      try {
        const parsed = JSON.parse(savedWidgets);
        setWidgets(parsed);
      } catch (error) {
        console.error('Failed to parse saved widgets:', error);
      }
    }
  }, []);

  // Save widgets to localStorage whenever they change
  const updateWidgets = (newWidgets: DashboardWidget[]) => {
    setWidgets(newWidgets);
    localStorage.setItem('dashboard-widgets', JSON.stringify(newWidgets));
  };

  // Get enabled widgets sorted by order
  const getEnabledWidgets = () => {
    return widgets
      .filter(widget => widget.enabled)
      .sort((a, b) => a.order - b.order);
  };

  // Check if a specific widget is enabled
  const isWidgetEnabled = (widgetId: string) => {
    return widgets.find(widget => widget.id === widgetId)?.enabled ?? false;
  };

  return {
    widgets,
    updateWidgets,
    getEnabledWidgets,
    isWidgetEnabled
  };
};
