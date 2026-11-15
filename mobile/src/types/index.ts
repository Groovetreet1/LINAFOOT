export type MatchStatus = 'LIVE' | 'UPCOMING' | 'FINISHED';
export type SelectionId = 'home' | 'draw' | 'away';

export interface Selection {
  id: string;
  label: string;
  odds: number;
  probability?: number;
}

export interface Market {
  id: string;
  name: string;
  selections: Selection[];
}

export type MatchEventType = 'goal' | 'card' | 'sub' | 'var' | 'info';

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  team: 'home' | 'away' | 'neutral';
  player?: string;
  text: string;
}

export interface MatchStats {
  possessionHome: number;
  possessionAway: number;
  shotsHome: number;
  shotsAway: number;
  shotsOnTargetHome: number;
  shotsOnTargetAway: number;
  cornersHome: number;
  cornersAway: number;
  foulsHome: number;
  foulsAway: number;
  yellowCardsHome: number;
  yellowCardsAway: number;
  redCardsHome: number;
  redCardsAway: number;
  savesHome: number;
  savesAway: number;
  passesHome: number;
  passesAway: number;
}

export interface MatchDetails {
  venue: string;
  referee: string;
  stage: string;
  broadcast: string;
  weather: string;
  events: MatchEvent[];
  stats: MatchStats;
  summary: string;
}

export interface FootballMatch {
  id: string;
  league: string;
  leagueLogo?: string;
  homeTeam: string;
  homeTeamLogo?: string;
  awayTeam: string;
  awayTeamLogo?: string;
  kickoff: string;
  status: MatchStatus;
  minute: number | null;
  displayMinute?: string | null;
  homeScore: number;
  awayScore: number;
  info?: string;
  details?: MatchDetails;
  markets: Market[];
}

export type BetStatus = 'PENDING' | 'WON' | 'LOST' | 'REFUNDED';

export interface Bet {
  id: string;
  matchId: string;
  homeTeam: string;
  homeTeamLogo?: string;
  awayTeam: string;
  awayTeamLogo?: string;
  league?: string;
  leagueLogo?: string;
  selection: SelectionId;
  selectionLabel: string;
  odds: number;
  stake: number;
  potentialPayout: number;
  payoutAmount?: number;
  status: BetStatus;
  settledAt?: string | null;
  createdAt: string;
  match?: string;
}

export interface WalletTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface User {
  id: string;
  displayName: string;
  email?: string;
}

export interface SelectedOutcome {
  match: FootballMatch;
  selection: Selection;
}

export interface ApiErrorShape {
  error?: {
    code?: string;
    message?: string;
  };
}
