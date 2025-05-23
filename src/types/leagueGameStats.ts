
export interface PlayerGameStats {
  WIN?: number;
  LEVEL?: number;
  CHAMPIONS_KILLED?: number;
  NUM_DEATHS?: number;
  ASSISTS?: number;
  MINIONS_KILLED?: number;
  NEUTRAL_MINIONS_KILLED?: number;
  GOLD_EARNED?: number;
  VISION_SCORE?: number;
  TOTAL_DAMAGE_DEALT_TO_CHAMPIONS?: number; // May need to sum components
  PHYSICAL_DAMAGE_DEALT_TO_CHAMPIONS?: number;
  MAGIC_DAMAGE_DEALT_TO_CHAMPIONS?: number;
  TRUE_DAMAGE_DEALT_TO_CHAMPIONS?: number;
  TOTAL_DAMAGE_TAKEN?: number;
  PERK_PRIMARY_STYLE?: number; // Primary rune tree ID
  PERK_SUB_STYLE?: number; // Secondary rune tree ID
  // Add other specific stats as needed
}

export interface GamePlayer {
  championName: string;
  championId?: number;
  items: (number | null)[]; // Item IDs, can be null for empty slots
  spell1Id: number; // Summoner spell ID
  spell2Id: number; // Summoner spell ID
  stats: PlayerGameStats;
  summonerName?: string; // This might be the one from player profile, or from riotIdGameName
  riotIdGameName?: string;
  riotIdTagLine?: string;
  teamId?: number;
  // Add other player details as needed
}

export interface TeamDetails {
  teamId: number; // 100 for Blue, 200 for Red
  isWinningTeam: boolean;
  players: GamePlayer[];
  stats?: { // Team-level aggregated stats
    CHAMPIONS_KILLED?: number;
    GOLD_EARNED?: number;
    TURRETS_KILLED?: number;
    BARRACKS_KILLED?: number; // Inhibitors
    DRAGONS_KILLED?: number; // Total dragons (excluding Elder)
    ELDER_DRAGONS_KILLED?: number;
    RIFT_HERALDS_KILLED?: number;
    BARON_NASHORS_KILLED?: number;
    VOID_GRUBS_KILLED?: number;
    // Add other team stats as needed
  };
}

export interface LolGameSummaryData {
  gameMode?: string;
  gameType?: string;
  gameLength?: number; // in seconds
  teams?: TeamDetails[];
  // Add other game-wide details as needed
}

// Helper to get KDA string
export const getKDA = (stats: PlayerGameStats | undefined): string => {
  if (!stats) return "N/A";
  const kills = stats.CHAMPIONS_KILLED ?? 0;
  const deaths = stats.NUM_DEATHS ?? 0;
  const assists = stats.ASSISTS ?? 0;
  return `${kills} / ${deaths} / ${assists}`;
};

// Helper to get total CS
export const getTotalCS = (stats: PlayerGameStats | undefined): number => {
  if (!stats) return 0;
  return (stats.MINIONS_KILLED ?? 0) + (stats.NEUTRAL_MINIONS_KILLED ?? 0);
};

// Helper to get total damage to champions
export const getTotalDamageToChampions = (stats: PlayerGameStats | undefined): number => {
  if (!stats) return 0;
  if (stats.TOTAL_DAMAGE_DEALT_TO_CHAMPIONS !== undefined) {
    return stats.TOTAL_DAMAGE_DEALT_TO_CHAMPIONS;
  }
  return (stats.PHYSICAL_DAMAGE_DEALT_TO_CHAMPIONS ?? 0) +
         (stats.MAGIC_DAMAGE_DEALT_TO_CHAMPIONS ?? 0) +
         (stats.TRUE_DAMAGE_DEALT_TO_CHAMPIONS ?? 0);
};

// Format game length from seconds to M:SS
export const formatGameLength = (seconds: number | undefined): string => {
  if (seconds === undefined) return "N/A";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};

