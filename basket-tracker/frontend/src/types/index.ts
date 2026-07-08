export interface Team {
  id: string;
  name: string;
  city: string;
  abbreviation: string;
  logoUrl?: string;
  headCoach?: string;
  division?: string;
}

export interface Player {
  id: string;
  teamId: string;
  firstName: string;
  lastName: string;
  jerseyNumber: string;
  position: string;
  height?: string; // e.g. "6'6\""
  weight?: number; // lbs
}

export interface Game {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  date: string;
  status: "SCHEDULED" | "LIVE" | "COMPLETED" | "FINISHED";
  homeScore?: number;
  awayScore?: number;
  venue?: string;
}

export type BasketballEventType =
  | "MADE_2PT"
  | "MISSED_2PT"
  | "MADE_3PT"
  | "MISSED_3PT"
  | "MADE_FT"
  | "MISSED_FT"
  | "REBOUND_OFFENSIVE"
  | "REBOUND_DEFENSIVE"
  | "ASSIST"
  | "STEAL"
  | "BLOCK"
  | "TURNOVER"
  | "FOUL"
  | "SUBSTITUTION"
  | "TIMEOUT";

export interface GameEvent {
  id: string;
  gameId: string;
  timestamp: string; // game clock, e.g. "08:24"
  quarter: number; // 1, 2, 3, 4, OT
  type: BasketballEventType;
  playerId?: string;
  teamId: string;
  xCoord?: number; // shot chart placement X
  yCoord?: number; // shot chart placement Y
  description: string;
}

export interface TeamStats {
  points: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  fieldGoalPercentage: number;
  threePointersMade: number;
  threePointersAttempted: number;
  threePointPercentage: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  freeThrowPercentage: number;
  reboundsOffensive: number;
  reboundsDefensive: number;
  reboundsTotal: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
}

export interface PlayerStatsData {
  PTS: number;
  FGM: number;
  FGA: number;
  "3PM": number;
  "3PA": number;
  FTM: number;
  FTA: number;
  OREB: number;
  DREB: number;
  AST: number;
  TOV: number;
  STL: number;
  BLK: number;
  PF: number;
  eFG_pct: number;
  TS_pct: number;
}

export interface BoxscorePlayer {
  player_id: string;
  name: string;
  jersey_number: number | null;
  position: string | null;
  stats: PlayerStatsData;
}

export interface BoxscoreTeam {
  team_name: string;
  team_abbreviation: string;
  players: BoxscorePlayer[];
  totals: PlayerStatsData;
}

export interface ShotChartPoint {
  id: string;
  event_id: string;
  x: number;
  y: number;
  court_zone: string;
  shot_value: number;
  made: boolean;
  player_name: string;
  player_id?: string;
}

export interface GameBoxscore {
  home_team: BoxscoreTeam;
  away_team: BoxscoreTeam;
  shots: ShotChartPoint[];
}

