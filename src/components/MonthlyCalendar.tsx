
import React, { useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { CalendarEvent, EventType } from '@/types/event';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

interface MonthlyCalendarProps {
  events: CalendarEvent[];
  selectedDate?: Date;
  onDateSelect: (date: Date | undefined) => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

const eventTypeColors: Record<EventType, { bg: string; text: string; border: string }> = {
  scrim: { bg: 'bg-purple-500/20', text: 'text-purple-600', border: 'border-purple-500/30' },
  theory: { bg: 'bg-sky-500/20', text: 'text-sky-600', border: 'border-sky-500/30' },
  official: { bg: 'bg-amber-500/20', text: 'text-amber-600', border: 'border-amber-500/30' },
  meeting: { bg: 'bg-emerald-500/20', text: 'text-emerald-600', border: 'border-emerald-500/30' },
  other: { bg: 'bg-slate-500/20', text: 'text-slate-600', border: 'border-slate-500/30' },
};

const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({
  events,
  selectedDate,
  onDateSelect,
  currentMonth,
  onMonthChange,
}) => {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const eventsByDate = useMemo(() => {
    const eventsMap = new Map<string, CalendarEvent[]>();
    
    events.forEach(event => {
      const dateKey = format(event.date, 'yyyy-MM-dd');
      if (!eventsMap.has(dateKey)) {
        eventsMap.set(dateKey, []);
      }
      eventsMap.get(dateKey)!.push(event);
    });
    
    return eventsMap;
  }, [events]);

  const CustomDay = ({ date, displayMonth }: { date: Date; displayMonth: Date }) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayEvents = eventsByDate.get(dateKey) || [];
    const isSelected = selectedDate && isSameDay(date, selectedDate);
    const isToday = isSameDay(date, new Date());
    const isCurrentMonth = date.getMonth() === displayMonth.getMonth();

    return (
      <div
        className={cn(
          "h-24 w-full p-1 border border-border/20 rounded-md cursor-pointer transition-all duration-200 hover:bg-muted/30 hover:border-border/40",
          isSelected && "bg-primary/10 border-primary/50 shadow-sm",
          isToday && "bg-accent/10 border-accent/40",
          !isCurrentMonth && "opacity-50"
        )}
        onClick={() => onDateSelect(date)}
      >
        <div className="flex flex-col h-full">
          <div className={cn(
            "text-sm font-medium mb-1",
            isSelected && "text-primary font-semibold",
            isToday && "text-accent-foreground font-semibold",
            !isCurrentMonth && "text-muted-foreground"
          )}>
            {format(date, 'd')}
          </div>
          
          <div className="flex-1 space-y-0.5 overflow-hidden">
            {dayEvents.slice(0, 3).map((event, index) => {
              const colors = eventTypeColors[event.type];
              return (
                <div
                  key={`${event.id}-${index}`}
                  className={cn(
                    "text-xs px-1 py-0.5 rounded border truncate",
                    colors.bg,
                    colors.text,
                    colors.border
                  )}
                  title={`${event.startTime ? event.startTime + ' - ' : ''}${event.title}`}
                >
                  {event.startTime && (
                    <span className="font-medium">{event.startTime.slice(0, 5)} </span>
                  )}
                  <span className="truncate">{event.title}</span>
                </div>
              );
            })}
            
            {dayEvents.length > 3 && (
              <div className="text-xs text-muted-foreground px-1">
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="gaming-card">
      <div className="p-6 border-b border-border/30">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-2 hover:bg-muted/50 rounded-md transition-colors"
            >
              ←
            </button>
            <button
              onClick={() => onMonthChange(new Date())}
              className="px-3 py-1 text-sm bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-2 hover:bg-muted/50 rounded-md transition-colors"
            >
              →
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Previous month's trailing days */}
          {Array.from({ length: monthStart.getDay() }, (_, i) => {
            const date = new Date(monthStart);
            date.setDate(date.getDate() - (monthStart.getDay() - i));
            return <CustomDay key={`prev-${i}`} date={date} displayMonth={currentMonth} />;
          })}
          
          {/* Current month days */}
          {daysInMonth.map(date => (
            <CustomDay key={format(date, 'yyyy-MM-dd')} date={date} displayMonth={currentMonth} />
          ))}
          
          {/* Next month's leading days */}
          {Array.from({ length: 42 - (monthStart.getDay() + daysInMonth.length) }, (_, i) => {
            const date = new Date(monthEnd);
            date.setDate(date.getDate() + i + 1);
            return <CustomDay key={`next-${i}`} date={date} displayMonth={currentMonth} />;
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-border/30">
          <div className="flex flex-wrap gap-3">
            {Object.entries(eventTypeColors).map(([type, colors]) => (
              <div key={type} className="flex items-center gap-1">
                <div className={cn("w-3 h-3 rounded border", colors.bg, colors.border)} />
                <span className="text-sm text-muted-foreground capitalize">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyCalendar;
