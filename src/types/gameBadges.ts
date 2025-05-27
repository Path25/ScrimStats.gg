
import { PlayerGameStats, GamePlayer } from './leagueGameStats';

export interface GameBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  criteria: string;
}

export interface PlayerBadge extends GameBadge {
  playerId: string;
  playerName: string;
}

export const BADGE_DEFINITIONS: GameBadge[] = [
  {
    id: 'mvp',
    name: 'MVP',
    description: 'Most Valuable Player',
    icon: 'Crown',
    color: 'text-gaming-gold',
    bgColor: 'bg-gaming-gold/20 border-gaming-gold/30',
    criteria: 'Highest KDA ratio in the game'
  },
  {
    id: 'carry',
    name: 'CARRY',
    description: 'Team Carry',
    icon: 'Sword',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20 border-red-500/30',
    criteria: 'Most damage dealt to champions'
  },
  {
    id: 'farm_king',
    name: 'FARM KING',
    description: 'CS Master',
    icon: 'Wheat',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20 border-green-500/30',
    criteria: 'Highest CS (minions + neutral minions)'
  },
  {
    id: 'tank',
    name: 'TANK',
    description: 'Damage Sponge',
    icon: 'Shield',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20 border-blue-500/30',
    criteria: 'Most damage taken'
  },
  {
    id: 'support',
    name: 'SUPPORT',
    description: 'Vision Master',
    icon: 'Eye',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20 border-purple-500/30',
    criteria: 'Highest vision score'
  },
  {
    id: 'assassin',
    name: 'ASSASSIN',
    description: 'Kill Leader',
    icon: 'Zap',
    color: 'text-gaming-neon-pink',
    bgColor: 'bg-gaming-neon-pink/20 border-gaming-neon-pink/30',
    criteria: 'Most kills'
  },
  {
    id: 'clutch',
    name: 'CLUTCH',
    description: 'Assist Master',
    icon: 'Users',
    color: 'text-gaming-neon-blue',
    bgColor: 'bg-gaming-neon-blue/20 border-gaming-neon-blue/30',
    criteria: 'Most assists'
  },
  {
    id: 'rich',
    name: 'GOLDMINE',
    description: 'Economy King',
    icon: 'DollarSign',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20 border-yellow-500/30',
    criteria: 'Most gold earned'
  }
];

// Calculate KDA ratio
const calculateKDA = (stats: PlayerGameStats): number => {
  const kills = stats.CHAMPIONS_KILLED ?? 0;
  const deaths = stats.NUM_DEATHS ?? 0;
  const assists = stats.ASSISTS ?? 0;
  
  if (deaths === 0) {
    return kills + assists; // Perfect KDA
  }
  
  return (kills + assists) / deaths;
};

// Calculate total CS
const calculateCS = (stats: PlayerGameStats): number => {
  return (stats.MINIONS_KILLED ?? 0) + (stats.NEUTRAL_MINIONS_KILLED ?? 0);
};

// Calculate total damage to champions
const calculateDamage = (stats: PlayerGameStats): number => {
  if (stats.TOTAL_DAMAGE_DEALT_TO_CHAMPIONS !== undefined) {
    return stats.TOTAL_DAMAGE_DEALT_TO_CHAMPIONS;
  }
  return (stats.PHYSICAL_DAMAGE_DEALT_TO_CHAMPIONS ?? 0) +
         (stats.MAGIC_DAMAGE_DEALT_TO_CHAMPIONS ?? 0) +
         (stats.TRUE_DAMAGE_DEALT_TO_CHAMPIONS ?? 0);
};

export const calculateGameBadges = (players: GamePlayer[]): PlayerBadge[] => {
  if (!players || players.length === 0) return [];

  const badges: PlayerBadge[] = [];
  
  // Calculate metrics for all players
  const playerMetrics = players.map(player => ({
    player,
    kda: calculateKDA(player.stats),
    damage: calculateDamage(player.stats),
    cs: calculateCS(player.stats),
    damageTaken: player.stats.TOTAL_DAMAGE_TAKEN ?? 0,
    visionScore: player.stats.VISION_SCORE ?? 0,
    kills: player.stats.CHAMPIONS_KILLED ?? 0,
    assists: player.stats.ASSISTS ?? 0,
    gold: player.stats.GOLD_EARNED ?? 0
  }));

  // Find winners for each category
  const mvpPlayer = playerMetrics.reduce((prev, current) => 
    current.kda > prev.kda ? current : prev
  );
  
  const carryPlayer = playerMetrics.reduce((prev, current) => 
    current.damage > prev.damage ? current : prev
  );
  
  const farmKingPlayer = playerMetrics.reduce((prev, current) => 
    current.cs > prev.cs ? current : prev
  );
  
  const tankPlayer = playerMetrics.reduce((prev, current) => 
    current.damageTaken > prev.damageTaken ? current : prev
  );
  
  const supportPlayer = playerMetrics.reduce((prev, current) => 
    current.visionScore > prev.visionScore ? current : prev
  );
  
  const assassinPlayer = playerMetrics.reduce((prev, current) => 
    current.kills > prev.kills ? current : prev
  );
  
  const clutchPlayer = playerMetrics.reduce((prev, current) => 
    current.assists > prev.assists ? current : prev
  );
  
  const richPlayer = playerMetrics.reduce((prev, current) => 
    current.gold > prev.gold ? current : prev
  );

  // Create badges (only if the stat is meaningful)
  if (mvpPlayer.kda > 0) {
    badges.push({
      ...BADGE_DEFINITIONS.find(b => b.id === 'mvp')!,
      playerId: mvpPlayer.player.summonerName || mvpPlayer.player.riotIdGameName || 'Unknown',
      playerName: mvpPlayer.player.summonerName || mvpPlayer.player.riotIdGameName || 'Unknown'
    });
  }

  if (carryPlayer.damage > 0) {
    badges.push({
      ...BADGE_DEFINITIONS.find(b => b.id === 'carry')!,
      playerId: carryPlayer.player.summonerName || carryPlayer.player.riotIdGameName || 'Unknown',
      playerName: carryPlayer.player.summonerName || carryPlayer.player.riotIdGameName || 'Unknown'
    });
  }

  if (farmKingPlayer.cs > 0) {
    badges.push({
      ...BADGE_DEFINITIONS.find(b => b.id === 'farm_king')!,
      playerId: farmKingPlayer.player.summonerName || farmKingPlayer.player.riotIdGameName || 'Unknown',
      playerName: farmKingPlayer.player.summonerName || farmKingPlayer.player.riotIdGameName || 'Unknown'
    });
  }

  if (tankPlayer.damageTaken > 0) {
    badges.push({
      ...BADGE_DEFINITIONS.find(b => b.id === 'tank')!,
      playerId: tankPlayer.player.summonerName || tankPlayer.player.riotIdGameName || 'Unknown',
      playerName: tankPlayer.player.summonerName || tankPlayer.player.riotIdGameName || 'Unknown'
    });
  }

  if (supportPlayer.visionScore > 0) {
    badges.push({
      ...BADGE_DEFINITIONS.find(b => b.id === 'support')!,
      playerId: supportPlayer.player.summonerName || supportPlayer.player.riotIdGameName || 'Unknown',
      playerName: supportPlayer.player.summonerName || supportPlayer.player.riotIdGameName || 'Unknown'
    });
  }

  if (assassinPlayer.kills > 0) {
    badges.push({
      ...BADGE_DEFINITIONS.find(b => b.id === 'assassin')!,
      playerId: assassinPlayer.player.summonerName || assassinPlayer.player.riotIdGameName || 'Unknown',
      playerName: assassinPlayer.player.summonerName || assassinPlayer.player.riotIdGameName || 'Unknown'
    });
  }

  if (clutchPlayer.assists > 0) {
    badges.push({
      ...BADGE_DEFINITIONS.find(b => b.id === 'clutch')!,
      playerId: clutchPlayer.player.summonerName || clutchPlayer.player.riotIdGameName || 'Unknown',
      playerName: clutchPlayer.player.summonerName || clutchPlayer.player.riotIdGameName || 'Unknown'
    });
  }

  if (richPlayer.gold > 0) {
    badges.push({
      ...BADGE_DEFINITIONS.find(b => b.id === 'rich')!,
      playerId: richPlayer.player.summonerName || richPlayer.player.riotIdGameName || 'Unknown',
      playerName: richPlayer.player.summonerName || richPlayer.player.riotIdGameName || 'Unknown'
    });
  }

  return badges;
};
