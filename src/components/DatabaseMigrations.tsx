import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Database, Download, AlertTriangle, CheckCircle, Copy, RefreshCw, Wrench, Info, ExternalLink } from 'lucide-react';

interface Migration {
  version: string;
  description: string;
  sql_up: string;
}

interface BootstrapState {
  migrationSystemExists: boolean;
  detectedFeatures: {
    notificationPreferences: boolean;
    userManagementSystem: boolean; // Combined check for all user management features
  };
}

interface CoreMigrationCheck {
  hasCoreDefinitions: boolean;
  missingMigrations: string[];
  missingMigrationDetails: Migration[];
}

const coreScrimStatsMigrations: Migration[] = [
  {
    version: '002_notification_preferences',
    description: 'Add notification preferences to profiles table',
    sql_up: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT json_build_object('desktop_enabled', false, 'scrim_reminders', false);`
  },
  {
    version: '003_user_management_system',
    description: 'Add user roles, admin audit logging system, and app settings',
    sql_up: `-- Create enum type if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'coach', 'player');
  END IF;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE (user_id, role)
);

-- Create admin_audit_log table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_user_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_roles table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Enable RLS on admin_audit_log table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'admin_audit_log' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Enable RLS on app_settings table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'app_settings' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create user_roles policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles' 
    AND policyname = 'Users can view their own roles'
  ) THEN
    CREATE POLICY "Users can view their own roles" 
      ON public.user_roles 
      FOR SELECT 
      USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles' 
    AND policyname = 'Admins can manage user roles'
  ) THEN
    CREATE POLICY "Admins can manage user roles" 
      ON public.user_roles 
      FOR ALL 
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Create admin_audit_log policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'admin_audit_log' 
    AND policyname = 'Admins can view audit logs'
  ) THEN
    CREATE POLICY "Admins can view audit logs" 
      ON public.admin_audit_log 
      FOR SELECT 
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'admin_audit_log' 
    AND policyname = 'Admins can create audit logs'
  ) THEN
    CREATE POLICY "Admins can create audit logs" 
      ON public.admin_audit_log 
      FOR INSERT 
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Create app_settings policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'app_settings' 
    AND policyname = 'Anyone can view app settings'
  ) THEN
    CREATE POLICY "Anyone can view app settings" 
      ON public.app_settings 
      FOR SELECT 
      TO authenticated
      USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'app_settings' 
    AND policyname = 'Admins can manage app settings'
  ) THEN
    CREATE POLICY "Admins can manage app settings" 
      ON public.app_settings 
      FOR ALL 
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Insert default app settings
INSERT INTO public.app_settings (key, value) VALUES 
  ('registration_enabled', 'true'::jsonb),
  ('admin_approval_required', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Create trigger function for app_settings updated_at
CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for app_settings updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'app_settings_updated_at'
  ) THEN
    CREATE TRIGGER app_settings_updated_at
      BEFORE UPDATE ON public.app_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_app_settings_updated_at();
  END IF;
END $$;`
  }
];

const DatabaseMigrations: React.FC = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMigration, setSelectedMigration] = useState<Migration | null>(null);
  const [showSqlDialog, setShowSqlDialog] = useState(false);
  const [showBootstrapDialog, setShowBootstrapDialog] = useState(false);
  const [generatedSql, setGeneratedSql] = useState('');

  // Check if migration system exists and detect current schema state
  const { data: bootstrapState, isLoading: bootstrapLoading, refetch: refetchBootstrap } = useQuery({
    queryKey: ['bootstrap-state'],
    queryFn: async (): Promise<BootstrapState> => {
      try {
        // Try to call the RPC function - if it works, migration system exists
        const { data: currentVersion, error: rpcError } = await supabase.rpc('get_current_schema_version');
        
        if (!rpcError && currentVersion !== undefined) {
          return {
            migrationSystemExists: true,
            detectedFeatures: {
              notificationPreferences: false,
              userManagementSystem: false
            }
          };
        }
      } catch (error) {
        console.log('RPC functions not available - migration system needs bootstrap');
      }

      // If RPC function doesn't exist, detect current schema features using direct table queries
      const detectedFeatures = {
        notificationPreferences: false,
        userManagementSystem: false
      };

      // Check for notification_preferences column by trying to select it
      try {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('notification_preferences')
          .limit(1);
        
        if (!profilesError) {
          detectedFeatures.notificationPreferences = true;
        }
      } catch (error) {
        console.log('Could not check notification_preferences column - likely does not exist');
      }

      // Check for user management system by attempting to query the tables
      try {
        const tableChecks = await Promise.all([
          supabase.from('user_roles').select('id').limit(1),
          supabase.from('admin_audit_log').select('id').limit(1), 
          supabase.from('app_settings').select('key').limit(1)
        ]);

        // Only mark as setup if ALL three queries succeed (meaning all tables exist)
        const allTablesExist = tableChecks.every(check => !check.error);
        if (allTablesExist) {
          detectedFeatures.userManagementSystem = true;
        }
      } catch (error) {
        console.log('Could not check user management system tables - likely do not exist');
      }

      return {
        migrationSystemExists: false,
        detectedFeatures
      };
    },
  });

  // Check if core migrations are defined in schema_migrations table
  const { data: coreMigrationCheck, isLoading: coreMigrationLoading, refetch: refetchCoreMigrations } = useQuery({
    queryKey: ['core-migration-check'],
    queryFn: async (): Promise<CoreMigrationCheck> => {
      try {
        const { data: existingMigrations, error } = await supabase
          .from('schema_migrations')
          .select('version')
          .in('version', ['002_notification_preferences', '003_user_management_system']);
        
        if (error) throw error;

        const existingVersions = existingMigrations.map(m => m.version);
        const expectedMigrations = ['002_notification_preferences', '003_user_management_system'];
        const missingMigrations = expectedMigrations.filter(v => !existingVersions.includes(v));
        
        // Get the full migration details for missing ones
        const missingMigrationDetails = coreScrimStatsMigrations.filter(m => 
          missingMigrations.includes(m.version)
        );

        return {
          hasCoreDefinitions: missingMigrations.length === 0,
          missingMigrations,
          missingMigrationDetails
        };
      } catch (error) {
        console.log('Error checking core migrations:', error);
        return {
          hasCoreDefinitions: false,
          missingMigrations: ['002_notification_preferences', '003_user_management_system'],
          missingMigrationDetails: coreScrimStatsMigrations
        };
      }
    },
    enabled: bootstrapState?.migrationSystemExists === true,
  });

  // Get current schema version (only if migration system exists)
  const { data: currentVersion, isLoading: versionLoading } = useQuery({
    queryKey: ['current-schema-version'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_current_schema_version');
      if (error) throw error;
      return data;
    },
    enabled: bootstrapState?.migrationSystemExists === true,
  });

  // Get pending migrations (only if migration system exists)
  const { data: pendingMigrations, isLoading: migrationsLoading, refetch: refetchMigrations } = useQuery({
    queryKey: ['pending-migrations'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_pending_migrations');
      if (error) throw error;
      return data as Migration[];
    },
    enabled: bootstrapState?.migrationSystemExists === true,
  });

  // Updated apply migration mutation that handles core migrations properly
  const applyMigrationMutation = useMutation({
    mutationFn: async ({ migration, isCoreMigration }: { migration: Migration, isCoreMigration: boolean }) => {
      console.log('Applying migration:', migration.version, 'isCore:', isCoreMigration);
      
      if (isCoreMigration) {
        // For core migrations, we need to ensure the definition exists first
        try {
          // Check if migration definition exists
          const { data: existingMigration } = await supabase
            .from('schema_migrations')
            .select('version')
            .eq('version', migration.version)
            .single();

          // If it doesn't exist, add it first
          if (!existingMigration) {
            console.log('Adding core migration definition first:', migration.version);
            const { error: insertError } = await supabase
              .from('schema_migrations')
              .insert({
                version: migration.version,
                description: migration.description,
                sql_up: migration.sql_up,
                sql_down: migration.version === '002_notification_preferences' 
                  ? 'ALTER TABLE public.profiles DROP COLUMN IF EXISTS notification_preferences;'
                  : 'DROP TABLE IF EXISTS public.app_settings; DROP TABLE IF EXISTS public.admin_audit_log; DROP TABLE IF EXISTS public.user_roles; DROP TYPE IF EXISTS public.app_role;'
              });
            
            if (insertError) {
              console.error('Failed to add migration definition:', insertError);
              throw new Error(`Failed to add migration definition: ${insertError.message}`);
            }
            
            console.log('Core migration definition added successfully');
          }

          // Now apply the migration using RPC
          console.log('Applying migration via RPC:', migration.version);
          const { data: applyResult, error: applyError } = await supabase.rpc('apply_migration', {
            migration_version: migration.version
          });
          
          if (applyError) {
            console.error('RPC apply failed:', applyError);
            throw new Error(`Migration application failed: ${applyError.message}. You may need to apply this migration manually using the SQL script.`);
          }
          
          if (!applyResult) {
            throw new Error('Migration was not applied successfully. This might indicate the migration was already applied or there was an issue with the SQL execution.');
          }
          
          console.log('Migration applied successfully via RPC');
          return true;
          
        } catch (error) {
          console.error('Core migration application failed:', error);
          throw error;
        }
      } else {
        // For regular migrations, use the RPC function directly
        const { data, error } = await supabase.rpc('apply_migration', {
          migration_version: migration.version
        });
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (success, { migration }) => {
      if (success) {
        toast.success(`Migration ${migration.version} applied successfully! Your database now includes the latest ScrimStats.GG features.`);
        queryClient.invalidateQueries({ queryKey: ['current-schema-version'] });
        queryClient.invalidateQueries({ queryKey: ['pending-migrations'] });
        queryClient.invalidateQueries({ queryKey: ['core-migration-check'] });
        queryClient.invalidateQueries({ queryKey: ['bootstrap-state'] });
      } else {
        toast.error('Migration failed to apply');
      }
    },
    onError: (error, { migration }) => {
      console.error('Failed to apply migration:', error);
      toast.error(`Failed to apply migration ${migration.version}: ${error.message}`);
    },
  });

  const handleApplyMigration = (migration: Migration, isCoreMigration = false) => {
    if (!isAdmin) {
      toast.error('Only admins can apply migrations');
      return;
    }
    applyMigrationMutation.mutate({ migration, isCoreMigration });
  };

  const generateBootstrapScript = () => {
    if (!bootstrapState) return;

    const { detectedFeatures } = bootstrapState;
    
    // Base migration system setup with ALL core ScrimStats.GG migrations AND the fixed apply_migration function
    let bootstrapSql = `-- Bootstrap Migration System for ScrimStats.GG
-- This will install the migration tracking system and all core ScrimStats.GG migrations

-- Create schema versioning and migration tracking tables
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  sql_up TEXT NOT NULL,
  sql_down TEXT,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.applied_migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_version TEXT NOT NULL REFERENCES public.schema_migrations(version),
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  applied_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on both tables
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applied_migrations ENABLE ROW LEVEL SECURITY;

-- Create policies for schema_migrations
CREATE POLICY "Users can view schema migrations" 
  ON public.schema_migrations 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage schema migrations" 
  ON public.schema_migrations 
  FOR ALL 
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create policies for applied_migrations  
CREATE POLICY "Users can view applied migrations" 
  ON public.applied_migrations 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert applied migrations" 
  ON public.applied_migrations 
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = applied_by);

-- Create helper functions
CREATE OR REPLACE FUNCTION public.get_current_schema_version()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT sm.version 
     FROM public.applied_migrations am
     JOIN public.schema_migrations sm ON am.migration_version = sm.version
     ORDER BY sm.created_at DESC 
     LIMIT 1),
    'no_migrations'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_pending_migrations()
RETURNS TABLE (
  version TEXT,
  description TEXT,
  sql_up TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT sm.version, sm.description, sm.sql_up
  FROM public.schema_migrations sm
  WHERE sm.version NOT IN (
    SELECT am.migration_version 
    FROM public.applied_migrations am
  )
  ORDER BY sm.version;
$$;

-- Fixed apply_migration function (resolves ambiguous column reference)
CREATE OR REPLACE FUNCTION public.apply_migration(migration_version TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  migration_sql TEXT;
  user_has_admin_role BOOLEAN;
BEGIN
  -- Check if user has admin role
  SELECT public.has_role(auth.uid(), 'admin') INTO user_has_admin_role;
  
  IF NOT user_has_admin_role THEN
    RAISE EXCEPTION 'Only admins can apply migrations';
  END IF;
  
  -- Check if migration exists and hasn't been applied (using table aliases to avoid ambiguity)
  SELECT sm.sql_up INTO migration_sql
  FROM public.schema_migrations sm
  WHERE sm.version = migration_version
  AND sm.version NOT IN (
    SELECT am.migration_version 
    FROM public.applied_migrations am
  );
  
  IF migration_sql IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Execute the migration SQL
  EXECUTE migration_sql;
  
  -- Record the migration as applied
  INSERT INTO public.applied_migrations (migration_version, applied_by)
  VALUES (migration_version, auth.uid());
  
  RETURN TRUE;
END;
$$;

-- Insert ALL core ScrimStats.GG migrations (regardless of current state)
-- These will show as pending migrations for users to apply`;

    // Add the notification preferences migration with fixed JSON syntax
    bootstrapSql += `

-- Migration 1: Notification Preferences (Using json_build_object function)
INSERT INTO public.schema_migrations (version, description, sql_up, sql_down) VALUES 
('002_notification_preferences', 
 'Add notification preferences to profiles table',
 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT json_build_object(''desktop_enabled'', false, ''scrim_reminders'', false);',
 'ALTER TABLE public.profiles DROP COLUMN IF EXISTS notification_preferences;')
ON CONFLICT (version) DO NOTHING;`;

    // Add the user management system migration
    bootstrapSql += `

-- Migration 2: User Management System (with app_settings included)
INSERT INTO public.schema_migrations (version, description, sql_up, sql_down) VALUES 
('003_user_management_system',
 'Add user roles, admin audit logging system, and app settings',
 '-- Create enum type if it doesn''t exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = ''app_role'') THEN
    CREATE TYPE public.app_role AS ENUM (''admin'', ''coach'', ''player'');
  END IF;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone(''utc''::text, now()),
  UNIQUE (user_id, role)
);

-- Create admin_audit_log table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_user_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_roles table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = ''public'' 
    AND tablename = ''user_roles'' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Enable RLS on admin_audit_log table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = ''public'' 
    AND tablename = ''admin_audit_log'' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Enable RLS on app_settings table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = ''public'' 
    AND tablename = ''app_settings'' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create user_roles policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = ''public'' 
    AND tablename = ''user_roles'' 
    AND policyname = ''Users can view their own roles''
  ) THEN
    CREATE POLICY "Users can view their own roles" 
      ON public.user_roles 
      FOR SELECT 
      USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = ''public'' 
    AND tablename = ''user_roles'' 
    AND policyname = ''Admins can manage user roles''
  ) THEN
    CREATE POLICY "Admins can manage user roles" 
      ON public.user_roles 
      FOR ALL 
      USING (public.has_role(auth.uid(), ''admin''));
  END IF;
END $$;

-- Create admin_audit_log policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = ''public'' 
    AND tablename = ''admin_audit_log'' 
    AND policyname = ''Admins can view audit logs''
  ) THEN
    CREATE POLICY "Admins can view audit logs" 
      ON public.admin_audit_log 
      FOR SELECT 
      USING (public.has_role(auth.uid(), ''admin''));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = ''public'' 
    AND tablename = ''admin_audit_log'' 
    AND policyname = ''Admins can create audit logs''
  ) THEN
    CREATE POLICY "Admins can create audit logs" 
      ON public.admin_audit_log 
      FOR INSERT 
      WITH CHECK (public.has_role(auth.uid(), ''admin''));
  END IF;
END $$;

-- Create app_settings policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = ''public'' 
    AND tablename = ''app_settings'' 
    AND policyname = ''Anyone can view app settings''
  ) THEN
    CREATE POLICY "Anyone can view app settings" 
      ON public.app_settings 
      FOR SELECT 
      TO authenticated
      USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = ''public'' 
    AND tablename = ''app_settings'' 
    AND policyname = ''Admins can manage app settings''
  ) THEN
    CREATE POLICY "Admins can manage app settings" 
      ON public.app_settings 
      FOR ALL 
      TO authenticated
      USING (public.has_role(auth.uid(), ''admin''));
  END IF;
END $$;

-- Insert default app settings
INSERT INTO public.app_settings (key, value) VALUES 
  (''registration_enabled'', ''true''::jsonb),
  (''admin_approval_required'', ''false''::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Create trigger function for app_settings updated_at
CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for app_settings updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = ''app_settings_updated_at''
  ) THEN
    CREATE TRIGGER app_settings_updated_at
      BEFORE UPDATE ON public.app_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_app_settings_updated_at();
  END IF;
END $$;',
 'DROP TABLE IF EXISTS public.app_settings; DROP TABLE IF EXISTS public.admin_audit_log; DROP TABLE IF EXISTS public.user_roles; DROP TYPE IF EXISTS public.app_role;')
ON CONFLICT (version) DO NOTHING;`;

    // Now mark as applied only if features already exist
    if (detectedFeatures.notificationPreferences) {
      bootstrapSql += `

-- Mark notification preferences as applied since column already exists
INSERT INTO public.applied_migrations (migration_version, applied_by) 
SELECT '002_notification_preferences', auth.uid() WHERE NOT EXISTS (
  SELECT 1 FROM public.applied_migrations WHERE migration_version = '002_notification_preferences'
);`;
    }

    if (detectedFeatures.userManagementSystem) {
      bootstrapSql += `

-- Mark user management system as applied since all tables already exist
INSERT INTO public.applied_migrations (migration_version, applied_by) 
SELECT '003_user_management_system', auth.uid() WHERE NOT EXISTS (
  SELECT 1 FROM public.applied_migrations WHERE migration_version = '003_user_management_system'
);`;
    }

    setGeneratedSql(bootstrapSql);
    setShowBootstrapDialog(true);
  };

  const generateMigrationScript = () => {
    const allPendingMigrations = [
      ...(coreMigrationCheck?.missingMigrationDetails || []),
      ...(pendingMigrations || [])
    ];

    if (allPendingMigrations.length === 0) {
      toast.error('No pending migrations to generate script for');
      return;
    }

    const sqlScript = allPendingMigrations
      .map(migration => `-- Migration: ${migration.version}\n-- Description: ${migration.description}\n${migration.sql_up}\n\n-- Mark migration as applied\nINSERT INTO public.applied_migrations (migration_version, applied_by) VALUES ('${migration.version}', auth.uid());`)
      .join('\n\n');
    
    setGeneratedSql(sqlScript);
    setShowSqlDialog(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedSql);
    toast.success('SQL script copied to clipboard');
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Migrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Only administrators can view and manage database migrations.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const isLoading = bootstrapLoading || versionLoading || migrationsLoading || coreMigrationLoading;

  // Show bootstrap state if migration system doesn't exist
  if (bootstrapState && !bootstrapState.migrationSystemExists) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Migration System
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Set up automatic database schema management for ScrimStats.GG
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>What is this?</strong>
              <br />
              The migration system tracks and applies database schema changes automatically. This ensures your database structure stays up-to-date with new ScrimStats.GG features as they're released.
            </AlertDescription>
          </Alert>

          <Alert>
            <Wrench className="h-4 w-4" />
            <AlertDescription>
              <strong>One-Time Setup Required</strong>
              <br />
              Your database needs the migration tracking system installed. This will set up automatic schema management and make all core ScrimStats.GG features available for installation.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Available ScrimStats.GG Features</h3>
            <p className="text-sm text-muted-foreground">
              We've detected your current database setup. Here are the core features available for installation:
            </p>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <span className="font-medium">Notification System</span>
                  <p className="text-xs text-muted-foreground">User notification preferences and desktop alerts</p>
                </div>
                <Badge variant={bootstrapState.detectedFeatures.notificationPreferences ? "secondary" : "outline"}>
                  {bootstrapState.detectedFeatures.notificationPreferences ? "Already Setup" : "Available to Install"}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <span className="font-medium">Admin & User Management</span>
                  <p className="text-xs text-muted-foreground">User roles, admin controls, audit logging, and app settings</p>
                </div>
                <Badge variant={bootstrapState.detectedFeatures.userManagementSystem ? "secondary" : "outline"}>
                  {bootstrapState.detectedFeatures.userManagementSystem ? "Already Setup" : "Available to Install"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">How to Apply the Setup:</h4>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>Click "Generate Bootstrap SQL" below</li>
              <li>Copy the generated SQL script</li>
              <li>Go to your Supabase project → SQL Editor</li>
              <li>Paste and run the SQL script</li>
              <li>Return here and click "Refresh" to see available migrations</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={generateBootstrapScript}
              className="flex-1"
            >
              <Wrench className="h-4 w-4 mr-2" />
              Generate Bootstrap SQL
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                refetchBootstrap();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Bootstrap SQL Dialog */}
          <Dialog open={showBootstrapDialog} onOpenChange={setShowBootstrapDialog}>
            <DialogContent className="max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Bootstrap Migration System</DialogTitle>
                <DialogDescription>
                  <strong>Instructions:</strong>
                  <br />
                  1. Copy the SQL script below
                  <br />
                  2. Open your Supabase project dashboard
                  <br />
                  3. Go to SQL Editor (left sidebar)
                  <br />
                  4. Paste the script and click "Run"
                  <br />
                  5. Return here and click "Refresh" to see available migrations
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  value={generatedSql}
                  readOnly
                  className="min-h-[400px] font-mono text-sm"
                  placeholder="No bootstrap script generated..."
                />
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ExternalLink className="h-4 w-4" />
                  <span>Need help? The SQL Editor is in your Supabase dashboard under "SQL Editor"</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowBootstrapDialog(false)}>
                    Close
                  </Button>
                  <Button onClick={copyToClipboard}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy to Clipboard
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  // Show normal migration interface if system exists
  const allPendingMigrations = [
    ...(coreMigrationCheck?.missingMigrationDetails || []),
    ...(pendingMigrations || [])
  ];
  const hasPendingMigrations = allPendingMigrations.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Migration Manager
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Track and apply database schema updates for new ScrimStats.GG features
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>What are migrations?</strong> They're database updates that add new features to ScrimStats.GG. When you update your codebase, new migrations may appear here that need to be applied to your database.
          </AlertDescription>
        </Alert>

        {/* Current Version Display */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Current Database Version</p>
            <p className="text-xs text-muted-foreground">
              This shows which database features are currently installed
            </p>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Checking version...</span>
              </div>
            ) : (
              <Badge variant={currentVersion === 'no_migrations' ? 'destructive' : 'secondary'}>
                {currentVersion || 'Unknown'}
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['current-schema-version'] });
              refetchMigrations();
              refetchCoreMigrations();
            }}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Separator />

        {/* Migration Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Available Updates</h3>
              <p className="text-sm text-muted-foreground">
                New database features that can be installed
              </p>
            </div>
            {hasPendingMigrations && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateMigrationScript}
                  disabled={isLoading}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Generate SQL Script
                </Button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Checking for updates...</span>
            </div>
          ) : hasPendingMigrations ? (
            <div className="space-y-3">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>You have {allPendingMigrations.length} database update(s) available.</strong>
                  <br />
                  These add new ScrimStats.GG features to your database. You can apply them automatically using the "Apply Update" button, or generate a SQL script to run manually in Supabase.
                </AlertDescription>
              </Alert>
              
              {/* Show all pending migrations together */}
              {allPendingMigrations.map((migration) => {
                const isCoreMigration = coreMigrationCheck?.missingMigrationDetails.some(m => m.version === migration.version);
                
                return (
                  <div
                    key={migration.version}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{migration.version}</p>
                        {isCoreMigration && (
                          <Badge variant="outline" className="text-xs">Core ScrimStats.GG Migration</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{migration.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApplyMigration(migration, isCoreMigration)}
                        disabled={applyMigrationMutation.isPending}
                        size="sm"
                      >
                        {applyMigrationMutation.isPending ? 'Applying...' : 'Apply Update'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Your database is up to date!</strong>
                <br />
                All available ScrimStats.GG features are installed and ready to use.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* SQL Script Dialog */}
        <Dialog open={showSqlDialog} onOpenChange={setShowSqlDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Complete Database Update Script</DialogTitle>
              <DialogDescription>
                <strong>How to apply these updates:</strong>
                <br />
                1. Copy the SQL script below
                <br />
                2. Open your Supabase project dashboard
                <br />
                3. Go to SQL Editor (left sidebar)
                <br />
                4. Paste the script and click "Run"
                <br />
                5. Return here and click "Refresh" to see the updates applied
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={generatedSql}
                readOnly
                className="min-h-[400px] font-mono text-sm"
                placeholder="No migrations to generate..."
              />
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ExternalLink className="h-4 w-4" />
                <span>Tip: Run this in your Supabase SQL Editor for all updates at once</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowSqlDialog(false)}>
                  Close
                </Button>
                <Button onClick={copyToClipboard}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default DatabaseMigrations;
