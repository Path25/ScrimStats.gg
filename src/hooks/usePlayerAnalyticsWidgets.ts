
import { useState, useEffect } from 'react';
import { BarChart2, Target, Users, TrendingUp, Clock, Gamepad2, Trophy, Activity } from 'lucide-react';

export interface PlayerAnalyticsWidget {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  enabled: boolean;
  order: number;
  category: 'performance' | 'mastery' | 'synergy' | 'gameplay';
  size: 'small' | 'medium' | 'large';
}

const defaultPlayerWidgets: PlayerAnalyticsWidget[] = [
  {
    id: 'kda-trends',
    title: 'KDA Trends',
    description: 'Kills, Deaths, and Assists over time',
    icon: BarChart2,
    enabled: true,
    order: 0,
    category: 'performance',
    size: 'medium'
  },
  {
    id: 'champion-mastery',
    title: 'Champion Mastery',
    description: 'Win rates and performance per champion',
    icon: Trophy,
    enabled: true,
    order: 1,
    category: 'mastery',
    size: 'medium'
  },
  {
    id: 'role-metrics',
    title: 'Role-Specific Metrics',
    description: 'CS/min, vision score, damage share by role',
    icon: Target,
    enabled: true,
    order: 2,
    category: 'performance',
    size: 'small'
  },
  {
    id: 'game-phase-performance',
    title: 'Game Phase Performance',
    description: 'Early, mid, and late game effectiveness',
    icon: Clock,
    enabled: true,
    order: 3,
    category: 'gameplay',
    size: 'medium'
  },
  {
    id: 'team-synergy',
    title: 'Team Synergy',
    description: 'Performance with different teammates',
    icon: Users,
    enabled: false,
    order: 4,
    category: 'synergy',
    size: 'large'
  },
  {
    id: 'improvement-trends',
    title: 'Improvement Trends',
    description: 'Skills progression over time',
    icon: TrendingUp,
    enabled: true,
    order: 5,
    category: 'performance',
    size: 'small'
  },
  {
    id: 'playstyle-analysis',
    title: 'Playstyle Analysis',
    description: 'Aggressive vs defensive patterns',
    icon: Activity,
    enabled: false,
    order: 6,
    category: 'gameplay',
    size: 'medium'
  },
  {
    id: 'objective-control',
    title: 'Objective Control',
    description: 'Dragon, Baron, Herald participation',
    icon: Gamepad2,
    enabled: false,
    order: 7,
    category: 'gameplay',
    size: 'small'
  }
];

export const usePlayerAnalyticsWidgets = () => {
  const [widgets, setWidgets] = useState<PlayerAnalyticsWidget[]>(defaultPlayerWidgets);

  // Load widgets from localStorage on mount
  useEffect(() => {
    const savedWidgets = localStorage.getItem('player-analytics-widgets');
    if (savedWidgets) {
      try {
        const parsed = JSON.parse(savedWidgets);
        setWidgets(parsed);
      } catch (error) {
        console.error('Failed to parse saved player analytics widgets:', error);
      }
    }
  }, []);

  // Save widgets to localStorage whenever they change
  const updateWidgets = (newWidgets: PlayerAnalyticsWidget[]) => {
    setWidgets(newWidgets);
    localStorage.setItem('player-analytics-widgets', JSON.stringify(newWidgets));
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

  // Get widgets by category
  const getWidgetsByCategory = (category: string) => {
    return widgets.filter(widget => widget.category === category);
  };

  return {
    widgets,
    updateWidgets,
    getEnabledWidgets,
    isWidgetEnabled,
    getWidgetsByCategory
  };
};
