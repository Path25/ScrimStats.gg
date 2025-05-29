
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Palette, Bell, User, KeyRound, Trash2 } from 'lucide-react';

const GeneralSettings: React.FC = () => {
  const { theme, toggleTheme, accentColor, setAccentColorState } = useTheme();
  const { profile, logout } = useAuth();
  const { 
    preferences, 
    updatePreferences, 
    requestNotificationPermission, 
    hasNotificationPermission,
    isLoading: notificationsLoading 
  } = useNotifications();
  const queryClient = useQueryClient();
  
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: { full_name?: string; ign?: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update profile: ' + error.message);
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { newPassword: string }) => {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Password updated successfully');
      setChangePasswordOpen(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error) => {
      toast.error('Failed to update password: ' + error.message);
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      // First delete the user's profile and related data
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profile?.id);
      
      if (profileError) throw profileError;

      // Then delete the auth user (this will cascade delete other related data)
      const { error: authError } = await supabase.auth.admin.deleteUser(profile?.id || '');
      
      if (authError) throw authError;
    },
    onSuccess: () => {
      toast.success('Account deleted successfully');
      logout();
    },
    onError: (error) => {
      toast.error('Failed to delete account: ' + error.message);
    },
  });

  const handleProfileUpdate = (field: string, value: string) => {
    updateProfileMutation.mutate({ [field]: value });
  };

  const handleChangePassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    changePasswordMutation.mutate({ newPassword: passwordData.newPassword });
  };

  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate();
  };

  const handleDesktopNotificationToggle = async (enabled: boolean) => {
    if (enabled && !hasNotificationPermission) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        return; // Don't update preferences if permission was denied
      }
    }
    
    await updatePreferences({ desktop_enabled: enabled });
  };

  const handleScrimRemindersToggle = async (enabled: boolean) => {
    if (enabled && !hasNotificationPermission) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        return; // Don't update preferences if permission was denied
      }
    }
    
    await updatePreferences({ scrim_reminders: enabled });
  };

  return (
    <div className="space-y-6">
      {/* Theme & Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme & Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Theme Mode</Label>
              <p className="text-sm text-muted-foreground">
                Choose between light and dark mode
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Light</span>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
              />
              <span className="text-sm">Dark</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>Accent Color</Label>
            <p className="text-sm text-muted-foreground">
              Choose your preferred accent color for the interface
            </p>
            <div className="flex items-center gap-3">
              <Input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColorState(e.target.value)}
                className="w-20 h-10 border border-border cursor-pointer"
              />
              <div className="flex-1">
                <Input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColorState(e.target.value)}
                  placeholder="#2563EB"
                  className="font-mono"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full-name">Full Name</Label>
              <Input
                id="full-name"
                defaultValue={profile?.full_name || ''}
                onBlur={(e) => handleProfileUpdate('full_name', e.target.value)}
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ign">In-Game Name (IGN)</Label>
              <Input
                id="ign"
                defaultValue={profile?.ign || ''}
                onBlur={(e) => handleProfileUpdate('ign', e.target.value)}
                placeholder="Enter your IGN"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {profile?.created_at && (
              <Badge variant="secondary">
                Member since {new Date(profile.created_at).toLocaleDateString()}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Desktop Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Allow desktop notifications from the browser
              </p>
            </div>
            <Switch
              checked={preferences.desktop_enabled}
              onCheckedChange={handleDesktopNotificationToggle}
              disabled={notificationsLoading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Scrim Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about upcoming scrims and matches
              </p>
            </div>
            <Switch
              checked={preferences.scrim_reminders}
              onCheckedChange={handleScrimRemindersToggle}
              disabled={notificationsLoading || !preferences.desktop_enabled}
            />
          </div>

          {!hasNotificationPermission && (preferences.desktop_enabled || preferences.scrim_reminders) && (
            <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md">
              Browser notification permission is required for these features to work.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Account Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <KeyRound className="h-4 w-4 mr-2" />
                Change Password
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change Password</DialogTitle>
                <DialogDescription>
                  Enter your new password below. Make sure it's at least 6 characters long.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setChangePasswordOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleChangePassword}
                  disabled={changePasswordMutation.isPending}
                >
                  {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account
                  and remove all your data from our servers including scrims, game stats,
                  and profile information.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={deleteAccountMutation.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteAccountMutation.isPending ? 'Deleting...' : 'Delete Account'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default GeneralSettings;
