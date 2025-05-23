
import React from 'react';
import { LolGameSummaryData, TeamDetails, GamePlayer, PlayerGameStats, getKDA, getTotalCS, getTotalDamageToChampions, formatGameLength } from '@/types/leagueGameStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

interface DetailedGameSummaryViewProps {
  summaryData: LolGameSummaryData;
}

// Using a plausible patch version for May 2025. Update as needed.
const DDRAGON_PATCH_VERSION = "15.10.1";
const DDRAGON_BASE_URL = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_PATCH_VERSION}`;

const PlayerRow: React.FC<{ player: GamePlayer, teamId: number }> = ({ player, teamId }) => {
  const kda = getKDA(player.stats);
  const cs = getTotalCS(player.stats);
  const gold = player.stats?.GOLD_EARNED?.toLocaleString() ?? 'N/A';
  const vision = player.stats?.VISION_SCORE ?? 'N/A';
  const damageDealt = getTotalDamageToChampions(player.stats).toLocaleString() ?? 'N/A';
  const damageTaken = player.stats?.TOTAL_DAMAGE_TAKEN?.toLocaleString() ?? 'N/A';
  
  const playerName = player.summonerName || player.riotIdGameName || 'Player';

  // Display up to 6 items, fill with placeholder if less
  const displayItems = [...(player.items || [])].slice(0, 6);
  while (displayItems.length < 6) {
    displayItems.push(null);
  }

  return (
    <TableRow className={teamId === 100 ? "bg-blue-900/10 hover:bg-blue-900/20" : "bg-red-900/10 hover:bg-red-900/20"}>
      <TableCell className="font-medium py-2 px-3">
        <div>{playerName}</div>
        <div className="text-xs text-muted-foreground">{player.championName}</div>
      </TableCell>
      <TableCell className="py-2 px-3">{kda}</TableCell>
      <TableCell className="py-2 px-3">{cs}</TableCell>
      <TableCell className="py-2 px-3">{gold}</TableCell>
      <TableCell className="py-2 px-3">{vision}</TableCell>
      <TableCell className="py-2 px-3">{damageDealt}</TableCell>
      <TableCell className="py-2 px-3">{damageTaken}</TableCell>
      <TableCell className="py-2 px-3">
        <div className="flex space-x-1">
          {displayItems.map((itemId, index) => (
            <div key={index} className="w-6 h-6 flex items-center justify-center border border-muted-foreground/50 rounded bg-muted/20 overflow-hidden">
              {itemId ? (
                <img 
                  src={`${DDRAGON_BASE_URL}/img/item/${itemId}.png`} 
                  alt={`Item ${itemId}`} 
                  title={`Item ID: ${itemId}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback if image fails to load (e.g., show ID or placeholder)
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none'; // Hide broken image icon
                    if (target.parentElement) {
                      target.parentElement.innerHTML = `<span class="text-xs text-muted-foreground">${itemId % 100}</span>`; // Show last 2 digits as fallback
                    }
                  }}
                />
              ) : (
                <span className="text-xs text-muted-foreground">-</span>
              )}
            </div>
          ))}
        </div>
      </TableCell>
    </TableRow>
  );
};

const TeamSummary: React.FC<{ team: TeamDetails }> = ({ team }) => {
  const teamColor = team.teamId === 100 ? 'Blue' : 'Red';
  const outcome = team.isWinningTeam ? 'Victory' : 'Defeat';
  const teamKills = team.stats?.CHAMPIONS_KILLED ?? 'N/A';
  const teamGold = team.stats?.GOLD_EARNED?.toLocaleString() ?? 'N/A';
  const teamTurrets = team.stats?.TURRETS_KILLED ?? 'N/A';
  const teamInhibs = team.stats?.BARRACKS_KILLED ?? 'N/A';
  
  const dragonsKilled = team.stats?.DRAGONS_KILLED ?? 0;
  const elderDragonsKilled = team.stats?.ELDER_DRAGONS_KILLED ?? 0;
  const heraldsKilled = team.stats?.RIFT_HERALDS_KILLED ?? 0;
  const baronsKilled = team.stats?.BARON_NASHORS_KILLED ?? 0;
  const voidGrubsKilled = team.stats?.VOID_GRUBS_KILLED ?? 0;

  return (
    <Card className={`border-${teamColor.toLowerCase()}-500/50 scrim-card-alt`}>
      <CardHeader className={`py-3 px-4 ${team.teamId === 100 ? 'bg-blue-600/20' : 'bg-red-600/20'}`}>
        <div className="flex justify-between items-center">
          <CardTitle className={`text-lg ${team.teamId === 100 ? 'text-blue-400' : 'text-red-400'}`}>{teamColor} Team ({outcome})</CardTitle>
          <div className="text-xs text-muted-foreground space-y-1 text-right">
            <div>
              <span className="mr-2">Kills: {teamKills}</span>
              <span className="mr-2">Gold: {teamGold}</span>
              <span className="mr-2">Turrets: {teamTurrets}</span>
              <span>Inhibs: {teamInhibs}</span>
            </div>
            <div>
              <span className="mr-2">Dragons: {dragonsKilled}</span>
              <span className="mr-2">Elders: {elderDragonsKilled}</span>
              <span className="mr-2">Heralds: {heraldsKilled}</span>
              <span className="mr-2">Barons: {baronsKilled}</span>
              <span>Grubs: {voidGrubsKilled}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="text-xs uppercase">
              <TableHead className="py-2 px-3">Player / Champion</TableHead>
              <TableHead className="py-2 px-3">KDA</TableHead>
              <TableHead className="py-2 px-3">CS</TableHead>
              <TableHead className="py-2 px-3">Gold</TableHead>
              <TableHead className="py-2 px-3">Vision</TableHead>
              <TableHead className="py-2 px-3">Damage</TableHead>
              <TableHead className="py-2 px-3">Dmg. Taken</TableHead>
              <TableHead className="py-2 px-3">Items</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {team.players?.map((player, index) => (
              <PlayerRow key={player.summonerName || player.championName || index} player={player} teamId={team.teamId} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const DetailedGameSummaryView: React.FC<DetailedGameSummaryViewProps> = ({ summaryData }) => {
  if (!summaryData || !summaryData.teams || summaryData.teams.length === 0) {
    return <p className="text-muted-foreground">Detailed game summary data is incomplete or missing.</p>;
  }

  const blueTeam = summaryData.teams.find(t => t.teamId === 100);
  const redTeam = summaryData.teams.find(t => t.teamId === 200);

  return (
    <div className="space-y-4 my-4 p-4 border rounded-lg bg-card scrim-card">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xl font-semibold text-foreground">Game Summary</h3>
        <div className="text-sm text-muted-foreground">
          <span>Mode: {summaryData.gameMode || 'N/A'}</span> | <span>Length: {formatGameLength(summaryData.gameLength)}</span>
        </div>
      </div>
      <Separator />
      
      {blueTeam && <TeamSummary team={blueTeam} />}
      {redTeam && <TeamSummary team={redTeam} />}

      {!blueTeam && !redTeam && <p className="text-center text-muted-foreground">No team data available in summary.</p>}
    </div>
  );
};

export default DetailedGameSummaryView;
