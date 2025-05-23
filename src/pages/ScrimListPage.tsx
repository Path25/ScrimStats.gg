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
import { Eye, PlusCircle, Loader2, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AddScrimDialog from '@/components/AddScrimDialog';
import { format } from 'date-fns';
import { Database, Constants } from '@/integrations/supabase/types';

type ScrimRow = Database['public']['Tables']['scrims']['Row'];
type ScrimStatusEnum = Database['public']['Enums']['scrim_status_enum'];

const scrimStatusOptions = ["All", ...Constants.public.Enums.scrim_status_enum];

// Fetcher function for scrims
const fetchScrims = async (): Promise<ScrimRow[]> => { // Removed userId parameter for selection
  console.log(`fetchScrims: Fetching all scrims`);
  const { data, error } = await supabase
    .from('scrims')
    .select('*') // Fetches all scrims, RLS allows all authenticated to read
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
  const { user } = useAuth(); // authLoading can also be used if needed
  const [isAddScrimDialogOpen, setIsAddScrimDialogOpen] = useState(false);

  const [opponentFilter, setOpponentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<ScrimStatusEnum | 'All'>('All');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'scrim_date', direction: 'descending' });

  const scrimsQueryKey = ['scrims']; // Simplified query key

  const { data: scrims, isLoading, error } = useQuery<ScrimRow[], Error, ScrimRow[], string[]>({
    queryKey: scrimsQueryKey,
    queryFn: fetchScrims, // Uses updated fetchScrims
    enabled: !!user, // Query enabled if user is logged in
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
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg">Loading scrims...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-4 rounded-md bg-destructive text-destructive-foreground">
          <h1 className="text-2xl font-bold">Error Loading Scrims</h1>
          <p>{error.message}</p>
        </div>
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
          <h1 className="text-3xl font-bold text-foreground">All Scrims</h1>
          {canManageScrims && (
            <Button onClick={() => setIsAddScrimDialogOpen(true)}>
              <PlusCircle className="mr-2 h-5 w-5" /> Add New Scrim
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters & Sorting</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-grow">
              <label htmlFor="opponentFilter" className="block text-sm font-medium text-muted-foreground mb-1">Filter by Opponent</label>
              <Input
                id="opponentFilter"
                placeholder="Enter opponent name..."
                value={opponentFilter}
                onChange={(e) => setOpponentFilter(e.target.value)}
                className="max-w-xs bg-input text-foreground placeholder-muted-foreground"
              />
            </div>
            <div className="flex-grow">
              <label htmlFor="statusFilter" className="block text-sm font-medium text-muted-foreground mb-1">Filter by Status</label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ScrimStatusEnum | 'All')}>
                <SelectTrigger className="w-full sm:w-[180px] bg-input text-foreground">
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
        
        <Card className="scrim-card">
          <CardHeader>
            <CardTitle>Scrim History</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredAndSortedScrims && filteredAndSortedScrims.length > 0 ? (
              <Table>
                <TableCaption>A list of your recent and upcoming scrims.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px] cursor-pointer group" onClick={() => requestSort('opponent')}>
                      Opponent
                      <span className="ml-1">{getSortIndicator('opponent')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer group" onClick={() => requestSort('scrim_date')}>
                      Date
                      <span className="ml-1">{getSortIndicator('scrim_date')}</span>
                    </TableHead>
                    <TableHead>Overall Result</TableHead>
                    <TableHead className="cursor-pointer group" onClick={() => requestSort('status')}>
                      Status
                      <span className="ml-1">{getSortIndicator('status')}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer group" onClick={() => requestSort('patch')}>
                      Patch
                      <span className="ml-1">{getSortIndicator('patch')}</span>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedScrims.map((scrim) => (
                    <TableRow key={scrim.id}>
                      <TableCell className="font-medium">{scrim.opponent}</TableCell>
                      <TableCell>{format(new Date(scrim.scrim_date), "PPP")}</TableCell>
                      <TableCell>{scrim.overall_result || 'N/A'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          scrim.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                          scrim.status === 'Scheduled' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 
                          scrim.status === 'Cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          scrim.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {scrim.status}
                        </span>
                      </TableCell>
                      <TableCell>{scrim.patch || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(scrim.id)}>
                          <Eye className="mr-2 h-4 w-4" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">
                {scrims && scrims.length > 0 ? 'No scrims match your current filters.' : 'No scrims found. Add your first scrim to get started!'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      {canManageScrims && <AddScrimDialog isOpen={isAddScrimDialogOpen} onOpenChange={setIsAddScrimDialogOpen} />}
    </Layout>
  );
};

export default ScrimListPage;
