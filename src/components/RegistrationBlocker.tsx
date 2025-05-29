
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldX, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

const RegistrationBlocker: React.FC = () => {
  const { data: appSettings, isLoading } = useQuery({
    queryKey: ['publicAppSettings'],
    queryFn: async () => {
      // Try to fetch settings, but don't fail if RLS blocks it
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('*')
          .in('key', ['registration_enabled']);
        
        if (error) {
          // If RLS blocks access, assume registration is enabled for safety
          return [{ key: 'registration_enabled', value: true }];
        }
        
        return data;
      } catch {
        // Fallback to assuming registration is enabled
        return [{ key: 'registration_enabled', value: true }];
      }
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p>Loading...</p>
      </div>
    );
  }

  const registrationEnabled = appSettings?.find(s => s.key === 'registration_enabled')?.value !== false;

  if (registrationEnabled) {
    return null; // Allow normal registration flow
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldX className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Registration Disabled</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            New user registration is currently disabled by the administrators.
          </p>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              If you need access to this platform, please contact the team administrators.
            </p>
            
            <Button variant="outline" className="w-full" asChild>
              <a href="mailto:admin@scrimstats.gg">
                <Mail className="h-4 w-4 mr-2" />
                Contact Admin
              </a>
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              Already have an account?
            </p>
            <Button asChild className="w-full">
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegistrationBlocker;
