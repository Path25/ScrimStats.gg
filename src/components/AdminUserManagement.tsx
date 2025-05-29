import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Edit, UserX, UserCheck, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRoles {
  id: string;
  full_name: string | null;
  ign: string | null;
  status: string;
  last_login_at: string | null;
  created_at: string;
  roles: AppRole[];
}

const AdminUserManagement: React.FC = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [editingRoles, setEditingRoles] = useState(false);

  // Fetch app settings
  const { data: appSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*');
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch all users with their roles
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profilesError) throw profilesError;

      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRoles[] = profiles.map(profile => ({
        ...profile,
        roles: userRoles.filter(role => role.user_id === profile.id).map(role => role.role)
      }));

      return usersWithRoles;
    },
    enabled: isAdmin,
  });

  // Update app settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: value, updated_at: new Date().toISOString() })
        .eq('key', key);
      
      if (error) throw error;
      
      await supabase.rpc('log_admin_action', {
        action_type: `update_setting_${key}`,
        action_details: { old_value: !value, new_value: value }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
      toast.success('Setting updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update setting: ' + error.message);
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // First delete user roles
      await supabase.from('user_roles').delete().eq('user_id', userId);
      
      // Then delete profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      if (error) throw error;
      
      await supabase.rpc('log_admin_action', {
        action_type: 'delete_user',
        target_user_id: userId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success('User deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete user: ' + error.message);
    },
  });

  // Update user status mutation
  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', userId);
      
      if (error) throw error;
      
      await supabase.rpc('log_admin_action', {
        action_type: 'update_user_status',
        target_user_id: userId,
        action_details: { new_status: status }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success('User status updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update user status: ' + error.message);
    },
  });

  // Update user roles mutation
  const updateUserRolesMutation = useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: AppRole[] }) => {
      // Delete existing roles
      await supabase.from('user_roles').delete().eq('user_id', userId);
      
      // Insert new roles
      if (roles.length > 0) {
        const { error } = await supabase
          .from('user_roles')
          .insert(roles.map(role => ({ user_id: userId, role })));
        
        if (error) throw error;
      }
      
      await supabase.rpc('log_admin_action', {
        action_type: 'update_user_roles',
        target_user_id: userId,
        action_details: { new_roles: roles }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setEditingRoles(false);
      setSelectedUser(null);
      toast.success('User roles updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update user roles: ' + error.message);
    },
  });

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </CardContent>
      </Card>
    );
  }

  const registrationEnabled = appSettings?.find(s => s.key === 'registration_enabled')?.value === true;
  const requireAdminApproval = appSettings?.find(s => s.key === 'require_admin_approval')?.value === true;

  const filteredUsers = users?.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.ign?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      case 'pending_approval':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRolesBadges = (roles: AppRole[]) => {
    return roles.map(role => (
      <Badge key={role} variant="outline" className="mr-1">
        {role}
      </Badge>
    ));
  };

  return (
    <div className="space-y-6">
      {/* Registration Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Registration Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="registration-enabled">Allow New Registrations</Label>
              <p className="text-sm text-muted-foreground">
                When disabled, new users cannot register for the platform
              </p>
            </div>
            <Switch
              id="registration-enabled"
              checked={registrationEnabled}
              onCheckedChange={(checked) => 
                updateSettingsMutation.mutate({ key: 'registration_enabled', value: checked })
              }
              disabled={updateSettingsMutation.isPending || settingsLoading}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="require-approval">Require Admin Approval</Label>
              <p className="text-sm text-muted-foreground">
                New users will need admin approval before accessing the platform
              </p>
            </div>
            <Switch
              id="require-approval"
              checked={requireAdminApproval}
              onCheckedChange={(checked) => 
                updateSettingsMutation.mutate({ key: 'require_admin_approval', value: checked })
              }
              disabled={updateSettingsMutation.isPending || settingsLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* User Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search users by name or IGN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {usersLoading ? (
            <p>Loading users...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>IGN</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.full_name || 'N/A'}</TableCell>
                    <TableCell>{user.ign || 'N/A'}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell>{getRolesBadges(user.roles)}</TableCell>
                    <TableCell>
                      {user.last_login_at 
                        ? new Date(user.last_login_at).toLocaleDateString()
                        : 'Never'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setEditingRoles(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateUserStatusMutation.mutate({
                            userId: user.id,
                            status: user.status === 'active' ? 'suspended' : 'active'
                          })}
                        >
                          {user.status === 'active' ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {user.full_name || user.ign}? 
                                This action cannot be undone and will remove all associated data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteUserMutation.mutate(user.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Roles Dialog */}
      {editingRoles && selectedUser && (
        <AlertDialog open={editingRoles} onOpenChange={setEditingRoles}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Edit User Roles</AlertDialogTitle>
              <AlertDialogDescription>
                Manage roles for {selectedUser.full_name || selectedUser.ign}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <EditUserRolesForm
                user={selectedUser}
                onSave={(roles) => updateUserRolesMutation.mutate({ 
                  userId: selectedUser.id, 
                  roles 
                })}
                onCancel={() => {
                  setEditingRoles(false);
                  setSelectedUser(null);
                }}
              />
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

const EditUserRolesForm: React.FC<{
  user: UserWithRoles;
  onSave: (roles: AppRole[]) => void;
  onCancel: () => void;
}> = ({ user, onSave, onCancel }) => {
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>(user.roles);

  const availableRoles: AppRole[] = ['admin', 'coach', 'player'];

  const toggleRole = (role: AppRole) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Roles</Label>
        {availableRoles.map(role => (
          <div key={role} className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={role}
              checked={selectedRoles.includes(role)}
              onChange={() => toggleRole(role)}
              className="rounded border-border"
            />
            <Label htmlFor={role} className="capitalize">{role}</Label>
          </div>
        ))}
      </div>
      
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSave(selectedRoles)}>
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default AdminUserManagement;
