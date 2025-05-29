
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NotificationPreferences {
  desktop_enabled: boolean;
  scrim_reminders: boolean;
}

interface NotificationContextType {
  preferences: NotificationPreferences;
  updatePreferences: (newPreferences: Partial<NotificationPreferences>) => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
  hasNotificationPermission: boolean;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    desktop_enabled: false,
    scrim_reminders: false,
  });
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check notification permission on mount
  useEffect(() => {
    const checkPermission = () => {
      if ('Notification' in window) {
        setHasNotificationPermission(Notification.permission === 'granted');
      }
    };
    
    checkPermission();
    setIsLoading(false);
  }, []);

  // Load user preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('notification_preferences')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading notification preferences:', error);
          return;
        }

        if (data?.notification_preferences) {
          // Safely cast the JSON data to NotificationPreferences
          const prefs = data.notification_preferences as unknown as NotificationPreferences;
          setPreferences(prefs);
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [user]);

  const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      toast.error('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      setHasNotificationPermission(true);
      return true;
    }

    if (Notification.permission === 'denied') {
      toast.error('Notifications are blocked. Please enable them in your browser settings.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setHasNotificationPermission(granted);
      
      if (!granted) {
        toast.error('Notification permission denied');
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to request notification permission');
      return false;
    }
  };

  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    if (!user) return;

    const updatedPreferences = { ...preferences, ...newPreferences };

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: updatedPreferences })
        .eq('id', user.id);

      if (error) throw error;

      setPreferences(updatedPreferences);
      toast.success('Notification preferences updated');
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      toast.error('Failed to update notification preferences');
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        preferences,
        updatePreferences,
        requestNotificationPermission,
        hasNotificationPermission,
        isLoading,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
