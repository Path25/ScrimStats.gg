import React, { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, PlusCircle, Loader2, ArrowUpDown, Trophy, Target, Zap, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AddScrimDialog from '@/components/AddScrimDialog';
import { format } from 'date-fns';
import { Database, Constants } from '@/integrations/supabase/types';
import StatusBadge from '@/components/StatusBadge';
import ResultBadge from '@/components/ResultBadge';
import EmptyState from '@/components/EmptyState';

type ScrimRow = Database['public']['Tables']['scrims']['Row'];
type ScrimStatusEnum = Database['public']['Enums']['scrim_status_enum'];

const scrimStatusOptions = ["All", ...Constants.public.Enums.scrim_status_enum];

// Fetcher function for scrims
const fetchScrims = async (): Promise<ScrimRow[]> => {
  console.log(`fetchScrims: Fetching all scrims`);
  const { data, error } = await supabase
    .from('scrims')
    .select('*')
    .order('scrim_date', { ascending: false });

  if (error) {
    console.error('Error fetching scrims:', error);
    throw new Error(error.message);
  }
  console.log('Fetched scrims data:', data);
  return data || [];
};

type SortConfig = {
  key: keyof ScrimRow | null;
  direction: 'ascending' | 'descending';
};

const ScrimListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAddScrimDialogOpen, setIsAddScrimDialogOpen] = useState(false);

  const [opponentFilter, setOpponentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<ScrimStatusEnum | 'All'>('All');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'scrim_date', direction: 'descending' });

  const scrimsQueryKey = ['scrims'];

  const { data: scrims, isLoading, error } = useQuery<ScrimRow[], Error, ScrimRow[], string[]>({
    queryKey: scrimsQueryKey,
    queryFn: fetchScrims,
    enabled: !!user,
  });

  const userRoles = user?.app_metadata?.roles as string[] || [];
  const isAdmin = userRoles.includes('admin');
  const isCoach = userRoles.includes('coach');
  const canManageScrims = isAdmin || isCoach;

  const handleViewDetails = (scrimId: string) => {
    navigate(`/scrims/${scrimId}`);
  };

  const requestSort = (key: keyof ScrimRow) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedScrims = useMemo(() => {
    if (!scrims) return [];
    let sortableItems = [...scrims];

    // Filtering
    sortableItems = sortableItems.filter(scrim => {
      const opponentMatch = scrim.opponent.toLowerCase().includes(opponentFilter.toLowerCase());
      const statusMatch = statusFilter === 'All' || scrim.status === statusFilter;
      return opponentMatch && statusMatch;
    });

    // Sorting
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key!];
        const valB = b[sortConfig.key!];

        if (valA === null || valA === undefined) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valB === null || valB === undefined) return sortConfig.direction === 'ascending' ? 1 : -1;
        
        if (typeof valA === 'string' && typeof valB === 'string') {
          return valA.localeCompare(valB) * (sortConfig.direction === 'ascending' ? 1 : -1);
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
          return (valA - valB) * (sortConfig.direction === 'ascending' ? 1 : -1);
        }
        // For dates (assuming they are string 'YYYY-MM-DD' or Date objects)
        if (sortConfig.key === 'scrim_date') {
           const dateA = new Date(valA as string).getTime();
           const dateB = new Date(valB as string).getTime();
           return (dateA - dateB) * (sortConfig.direction === 'ascending' ? 1 : -1);
        }
        return 0;
      });
    }
    return sortableItems;
  }, [scrims, opponentFilter, statusFilter, sortConfig]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center pulse-glow">
              <Loader2 className="h-8 w-8 animate-spin text-primary-foreground" />
            </div>
            <p className="text-lg font-semibold neon-text">Loading Match History...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <EmptyState
          icon={Target}
          title="Connection Error"
          description={`There was an issue fetching data: ${error.message}`}
          action={{
            label: "Try Again",
            onClick: () => window.location.reload(),
            variant: "outline"
          }}
          className="border-destructive bg-destructive/5"
        />
      </Layout>
    );
  }

  const getSortIndicator = (key: keyof ScrimRow) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? '↑' : '↓';
    }
    return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50 group-hover:opacity-100" />;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-gaming">
              <Trophy className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-4xl font-bold neon-text" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Match Archives
              </h1>
              <p className="text-muted-foreground">View and manage your scrim history</p>
            </div>
          </div>
          {canManageScrims && (
            <Button onClick={() => setIsAddScrimDialogOpen(true)} variant="gaming" size="lg" className="shadow-gaming">
              <PlusCircle className="mr-2 h-5 w-5" /> Schedule New Match
            </Button>
          )}
        </div>

        <Card className="gaming-card shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Battle Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-grow">
              <label htmlFor="opponentFilter" className="block text-sm font-medium text-muted-foreground mb-2">
                Enemy Team
              </label>
              <Input
                id="opponentFilter"
                placeholder="Search opponents..."
                value={opponentFilter}
                onChange={(e) => setOpponentFilter(e.target.value)}
                className="gaming-card border-border shadow-sm"
              />
            </div>
            <div className="flex-grow">
              <label htmlFor="statusFilter" className="block text-sm font-medium text-muted-foreground mb-2">
                Battle Status
              </label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ScrimStatusEnum | 'All')}>
                <SelectTrigger className="gaming-card border-border shadow-sm">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {scrimStatusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        <Card className="gaming-table shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-gaming-gold" />
              Battle History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredAndSortedScrims && filteredAndSortedScrims.length > 0 ? (
              <Table>
                <TableCaption>Complete record of your team's battles and skirmishes.</TableCaption>
                <TableHeader className="gaming-table-header">
                  <TableRow>
                    <TableHead className="w-[200px] cursor-pointer group font-semibold" onClick={() => requestSort('opponent')}>
                      Enemy Team
                      <span className="ml-1">{getSortIndicator('opponent')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer group font-semibold" onClick={() => requestSort('scrim_date')}>
                      Battle Date
                      <span className="ml-1">{getSortIndicator('scrim_date')}</span>
                    </TableHead>
                    <TableHead className="font-semibold">Victory Status</TableHead>
                    <TableHead className="cursor-pointer group font-semibold" onClick={() => requestSort('status')}>
                      Status
                      <span className="ml-1">{getSortIndicator('status')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer group font-semibold" onClick={() => requestSort('patch')}>
                      Game Patch
                      <span className="ml-1">{getSortIndicator('patch')}</span>
                    </TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedScrims.map((scrim, index) => (
                    <TableRow 
                      key={scrim.id} 
                      className={`gaming-table-row table-row-animate-in`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <TableCell className="font-medium text-foreground">{scrim.opponent}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {format(new Date(scrim.scrim_date), "PPP")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {scrim.overall_result ? (
                          <ResultBadge result={scrim.overall_result} />
                        ) : (
                          <span className="text-muted-foreground text-sm">TBD</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={scrim.status} size="sm" />
                          {scrim.status === 'Cancelled' && scrim.cancellation_reason && (
                            <p className="text-xs text-muted-foreground italic">
                              Reason: {scrim.cancellation_reason}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {scrim.patch ? (
                          <span className="px-2 py-1 bg-muted/30 text-sm rounded font-mono text-muted-foreground">
                            {scrim.patch}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleViewDetails(scrim.id)}
                          className="group hover:bg-primary/10 hover:text-primary transition-all"
                        >
                          <Eye className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" /> View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6">
                <EmptyState
                  icon={scrims && scrims.length > 0 ? Target : Trophy}
                  title={scrims && scrims.length > 0 ? 'No matches found' : 'No battles recorded yet'}
                  description={
                    scrims && scrims.length > 0 
                      ? 'No battles match your current search filters. Try adjusting your criteria or clearing filters to see more results.'
                      : 'Ready to dominate the competition? Schedule your first scrim match to start building your legendary battle history!'
                  }
                  action={
                    scrims && scrims.length === 0 && canManageScrims ? {
                      label: "Schedule First Battle",
                      onClick: () => setIsAddScrimDialogOpen(true),
                      variant: "gaming" as const
                    } : undefined
                  }
                  size="lg"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {canManageScrims && <AddScrimDialog isOpen={isAddScrimDialogOpen} onOpenChange={setIsAddScrimDialogOpen} />}
    </Layout>
  );
};

export default ScrimListPage;
