
import React, { useState } from 'react';
import { Trophy, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { PlayerBadge } from '@/types/gameBadges';
import GameBadge from './GameBadge';

interface GameBadgesSectionProps {
  badges: PlayerBadge[];
}

const GameBadgesSection: React.FC<GameBadgesSectionProps> = ({ badges }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [highlightedPlayer, setHighlightedPlayer] = useState<string | null>(null);
  
  if (!badges || badges.length === 0) {
    return null;
  }

  // Group badges by player for better organization
  const badgesByPlayer = badges.reduce((acc, badge) => {
    if (!acc[badge.playerName]) {
      acc[badge.playerName] = [];
    }
    acc[badge.playerName].push(badge);
    return acc;
  }, {} as Record<string, PlayerBadge[]>);

  const handlePlayerHover = (playerName: string | null) => {
    setHighlightedPlayer(playerName);
  };

  const toggleExpanded = () => {
    setIsExpanded(prev => !prev);
  };

  return (
    <div className="bg-card/50 border border-border/30 rounded-lg p-4 space-y-4 animate-in slide-in-from-bottom-4 hover:border-primary/30 transition-colors duration-300 dark:bg-card/40 dark:backdrop-blur-sm dark:bg-noise-subtle dark:border-opacity-20 dark:shadow-dark-soft">
      <div 
        className="flex items-center gap-2 border-b border-border/30 pb-2 cursor-pointer dark:border-opacity-20"
        onClick={toggleExpanded}
      >
        <div className={`p-2 rounded-lg bg-primary/10 text-primary transition-transform duration-500 ${isExpanded ? 'scale-100' : 'scale-90'} dark:bg-primary/15 dark:shadow-dark-glow`}>
          <Trophy className={`h-5 w-5 transition-all duration-300 ${isExpanded ? '' : 'rotate-12'}`} />
        </div>
        <div className="flex-1">
          <h4 className="font-gaming font-semibold text-lg tracking-wide text-foreground">
            ACHIEVEMENT BADGES
          </h4>
          <p className="text-xs text-muted-foreground">
            Outstanding performances in this game
          </p>
        </div>
        <button 
          className="p-1 rounded-full hover:bg-muted/50 transition-colors"
          aria-label={isExpanded ? "Collapse badges" : "Expand badges"}
        >
          {isExpanded ? 
            <ChevronUp className="h-4 w-4 text-muted-foreground" /> : 
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          }
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-3 animate-in fade-in-50">
          {Object.entries(badgesByPlayer).map(([playerName, playerBadges], playerIndex) => (
            <div 
              key={playerName} 
              className={`space-y-2 rounded-md p-2 transition-colors duration-300 ${
                highlightedPlayer === playerName ? 'bg-muted/30 dark:bg-muted/20 dark:backdrop-blur-sm' : ''
              }`}
              onMouseEnter={() => handlePlayerHover(playerName)}
              onMouseLeave={() => handlePlayerHover(null)}
            >
              <div className="flex items-center gap-2">
                <Award 
                  className={`h-4 w-4 ${
                    highlightedPlayer === playerName 
                      ? 'text-primary dark:text-primary dark:drop-shadow-glow' 
                      : 'text-muted-foreground'
                  } transition-colors duration-300`} 
                />
                <span className={`font-gaming font-medium text-sm tracking-wide ${
                  highlightedPlayer === playerName 
                    ? 'text-foreground' 
                    : 'text-foreground/90'
                } transition-colors duration-300`}>
                  {playerName}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 ml-6">
                {playerBadges.map((badge, badgeIndex) => (
                  <GameBadge 
                    key={`${badge.id}-${badge.playerId}`}
                    badge={badge}
                    size="md"
                    animationDelay={(playerIndex * 200) + (badgeIndex * 100)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {isExpanded && badges.length > 5 && (
        <div className="text-center pt-2 border-t border-border/20 animate-in fade-in-50 duration-700 dark:border-opacity-10">
          <p className="text-xs text-muted-foreground font-gaming hover:text-primary transition-colors">
            {badges.length} total achievements earned this game
          </p>
        </div>
      )}
    </div>
  );
};

export default GameBadgesSection;
