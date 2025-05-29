
import React from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Target } from 'lucide-react';

const SoloQTrackerPage: React.FC = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <Card className="scrim-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-6 w-6 text-primary" />
              SoloQ Tracker
            </CardTitle>
            <CardDescription>
              Track player Solo Queue performance, rank, and game history. This feature is under construction.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              SoloQ Tracker functionality will be implemented here. You'll be able to see player rankings, match history from Solo Queue, champion statistics, and more.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SoloQTrackerPage;
