
import React from 'react';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import AdminUserManagement from '@/components/AdminUserManagement';
import ApiTokenManager from '@/components/ApiTokenManager';
import GeneralSettings from '@/components/GeneralSettings';
import DatabaseMigrations from '@/components/DatabaseMigrations';
import SupportTab from '@/components/SupportTab';
import { Settings, Users, Key, Database, HelpCircle } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const { isAdmin } = useAuth();

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and platform settings
          </p>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Tokens
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Support
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="migrations" className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Database
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  User Management
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="general">
            <GeneralSettings />
          </TabsContent>

          <TabsContent value="api">
            <ApiTokenManager />
          </TabsContent>

          <TabsContent value="support">
            <SupportTab />
          </TabsContent>

          {isAdmin && (
            <>
              <TabsContent value="migrations">
                <DatabaseMigrations />
              </TabsContent>
              
              <TabsContent value="admin">
                <AdminUserManagement />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </Layout>
  );
};

export default SettingsPage;
