
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  HelpCircle, 
  MessageSquare, 
  Bug, 
  Lightbulb, 
  ExternalLink,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  History,
  Plus,
  Wrench,
  Sparkles
} from 'lucide-react';

const SupportTab: React.FC = () => {
  const handleDiscordClick = () => {
    window.open('https://discord.gg/RPbspJCctU', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Discord Community */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Join Our Discord Community
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Connect with the ScrimStats.GG community for support, feedback, and updates.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Bug className="h-4 w-4 text-destructive" />
                <span className="font-medium">Bug Reports & Support</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Report issues and get help from our team and community
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">Feature Suggestions</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Share ideas and help shape the future of ScrimStats.GG
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Experimental Updates</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Get early access to new features and beta releases
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium">Community Support</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Connect with other teams and share best practices
              </p>
            </div>
          </div>

          <Button onClick={handleDiscordClick} className="w-full" size="lg">
            <MessageSquare className="h-4 w-4 mr-2" />
            Join Discord Server
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>

      {/* Changelog */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Changelog
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Alpha v1.1.0 */}
          <div className="border-l-4 border-primary pl-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="default">Alpha v1.1.0</Badge>
              <span className="text-sm text-muted-foreground">Current Version</span>
            </div>
            
            <div className="space-y-3">
              <div>
                <h4 className="font-medium flex items-center gap-2 text-green-600">
                  <Plus className="h-4 w-4" />
                  New Features
                </h4>
                <ul className="text-sm text-muted-foreground mt-1 ml-6 space-y-1">
                  <li>• Enhanced Settings page with tabbed interface</li>
                  <li>• Database migration system with user-friendly interface</li>
                  <li>• API token management for Riot API integration</li>
                  <li>• Support tab with Discord community integration</li>
                  <li>• Admin user management functionality</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium flex items-center gap-2 text-blue-600">
                  <Bug className="h-4 w-4" />
                  Bug Fixes
                </h4>
                <ul className="text-sm text-muted-foreground mt-1 ml-6 space-y-1">
                  <li>• Fixed dashboard component rendering issues</li>
                  <li>• Resolved calendar event creation problems for non-scrim events</li>
                  <li>• Improved schedule functionality for custom events</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium flex items-center gap-2 text-purple-600">
                  <Sparkles className="h-4 w-4" />
                  Quality of Life Improvements
                </h4>
                <ul className="text-sm text-muted-foreground mt-1 ml-6 space-y-1">
                  <li>• Better visual feedback for system status</li>
                  <li>• Clearer migration instructions and SQL export</li>
                  <li>• Enhanced troubleshooting documentation</li>
                  <li>• Improved user interface consistency</li>
                  <li>• Better mobile responsiveness</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Alpha v1.0.0 */}
          <div className="border-l-4 border-muted pl-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">Alpha v1.0.0</Badge>
              <span className="text-sm text-muted-foreground">Initial Release</span>
            </div>
            
            <div className="space-y-3">
              <div>
                <h4 className="font-medium flex items-center gap-2 text-green-600">
                  <Plus className="h-4 w-4" />
                  Core Features
                </h4>
                <ul className="text-sm text-muted-foreground mt-1 ml-6 space-y-1">
                  <li>• Team dashboard with basic overview</li>
                  <li>• Scrim management and match tracking</li>
                  <li>• Player roster management</li>
                  <li>• Calendar integration for scheduling</li>
                  <li>• Basic authentication system</li>
                  <li>• Supabase database integration</li>
                  <li>• Responsive design foundation</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Common Issues & Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Common Issues & Troubleshooting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Login Issues
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                Try clearing your browser cache and cookies. Make sure you're using the correct email and password.
              </p>
            </div>

            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Data Not Loading
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                Check your internet connection. If the issue persists, try refreshing the page or logging out and back in.
              </p>
            </div>

            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                API Token Problems
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                Ensure your Riot API token is valid and hasn't expired. Generate a new token if needed from the API Tokens tab.
              </p>
            </div>

            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Database Migration Issues
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                If migrations fail, check the Database tab for detailed error messages. Make sure your database permissions are correct.
              </p>
            </div>

            <div className="border-l-4 border-amber-500 pl-4">
              <h4 className="font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Still Having Issues?
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                Join our Discord community for personalized support from our team and fellow users.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Quick System Check
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm font-medium">Platform Status</span>
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Online
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm font-medium">Your Session</span>
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm font-medium">Database</span>
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportTab;
