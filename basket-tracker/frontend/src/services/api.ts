import { Player, Team, Game, GameBoxscore } from "../types";

const getApiBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  return envUrl ? envUrl.replace(/\/$/, "") : "";
};

const BASE_URL = getApiBaseUrl();
const API_BASE_URL = `${BASE_URL}/api/v1`;

// Helper to handle response and errors
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = "An error occurred";
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

// Map backend Player schema to frontend Player interface
function mapBackendPlayerToFrontend(p: any): Player {
  const nameParts = p.name ? p.name.trim().split(/\s+/) : ["", ""];
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";
  return {
    id: p.id,
    teamId: p.team_id || "",
    firstName: firstName,
    lastName: lastName,
    jerseyNumber: p.jersey_number !== null && p.jersey_number !== undefined ? String(p.jersey_number) : "",
    position: p.position || "G",
    height: p.height || "",
    weight: p.weight || undefined,
  };
}

// Map frontend Player data to backend Player schema
function mapFrontendPlayerToBackend(p: Partial<Player>) {
  const firstName = p.firstName?.trim() || "";
  const lastName = p.lastName?.trim() || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  
  // Ensure team_id is a valid UUID string, otherwise send null
  let teamId: string | null = null;
  if (p.teamId && typeof p.teamId === "string" && p.teamId.trim() !== "" && p.teamId !== "none" && p.teamId !== "undefined") {
    teamId = p.teamId.trim();
  }

  return {
    name: fullName || "Unnamed Player",
    jersey_number: p.jerseyNumber ? parseInt(p.jerseyNumber, 10) : null,
    position: p.position || "G",
    height: p.height?.trim() || null,
    weight: p.weight ? Number(p.weight) : null,
    team_id: teamId,
  };
}

// Map backend Team schema to frontend Team interface
function mapBackendTeamToFrontend(t: any): Team {
  return {
    id: t.id,
    name: t.name,
    city: t.name.includes(" ") ? t.name.split(" ")[0] : "Local",
    abbreviation: t.abbreviation,
    headCoach: "Head Coach",
    division: t.division || "División A",
  };
}

// Map frontend Team to backend
function mapFrontendTeamToBackend(t: Partial<Team>) {
  return {
    name: t.name || "",
    abbreviation: t.abbreviation || "",
    division: t.division || "División A",
  };
}

export async function fetchHealthStatus(): Promise<{ status: string; api_version: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch backend health status:", error);
    return { status: "offline_fallback", api_version: "v1" };
  }
}

// Players APIs
export async function getPlayers(filters?: { position?: string; teamId?: string }): Promise<Player[]> {
  const params = new URLSearchParams();
  if (filters?.position) {
    params.append("position", filters.position);
  }
  if (filters?.teamId) {
    params.append("team_id", filters.teamId);
  }
  
  const url = `${API_BASE_URL}/players/?${params.toString()}`;
  const data = await handleResponse<any[]>(await fetch(url));
  return data.map(mapBackendPlayerToFrontend);
}

export async function createPlayer(playerData: Partial<Player>): Promise<Player> {
  const backendData = mapFrontendPlayerToBackend(playerData);
  const response = await fetch(`${API_BASE_URL}/players/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(backendData),
  });
  const data = await handleResponse<any>(response);
  return mapBackendPlayerToFrontend(data);
}

export async function updatePlayer(id: string, playerData: Partial<Player>): Promise<Player> {
  const backendData = mapFrontendPlayerToBackend(playerData);
  const response = await fetch(`${API_BASE_URL}/players/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(backendData),
  });
  const data = await handleResponse<any>(response);
  return mapBackendPlayerToFrontend(data);
}

export async function deletePlayer(id: string): Promise<Player> {
  const response = await fetch(`${API_BASE_URL}/players/${id}`, {
    method: "DELETE",
  });
  const data = await handleResponse<any>(response);
  return mapBackendPlayerToFrontend(data);
}

// Teams APIs
export async function getTeams(): Promise<Team[]> {
  const data = await handleResponse<any[]>(await fetch(`${API_BASE_URL}/teams/`));
  return data.map(mapBackendTeamToFrontend);
}

export async function createTeam(teamData: Partial<Team>): Promise<Team> {
  const backendData = mapFrontendTeamToBackend(teamData);
  const response = await fetch(`${API_BASE_URL}/teams/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(backendData),
  });
  const data = await handleResponse<any>(response);
  return mapBackendTeamToFrontend(data);
}

export async function getTeamRoster(teamId: string): Promise<Player[]> {
  const data = await handleResponse<any[]>(await fetch(`${API_BASE_URL}/teams/${teamId}/roster`));
  return data.map(mapBackendPlayerToFrontend);
}

export async function saveGameEvent(
  gameId: string,
  eventData: {
    timestamp: string;
    period: number;
    team_context?: string | null;
    event_type: string;
    payload: Record<string, any>;
  }
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/games/${gameId}/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventData),
  });
  await handleResponse<any>(response);
}

export async function initializeGame(params: {
  home_team_id: string;
  away_team_id: string;
  court_name?: string;
  referees?: string;
  tournament_name?: string;
  date?: string;
}): Promise<Game> {
  const response = await fetch(`${API_BASE_URL}/games/init`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
  const g = await handleResponse<any>(response);
  return {
    id: g.id,
    homeTeamId: g.home_team_id,
    awayTeamId: g.away_team_id,
    homeTeamName: "Home Team",
    awayTeamName: "Away Team",
    date: g.date ? g.date.split("T")[0] : "",
    status: g.status as "SCHEDULED" | "LIVE" | "COMPLETED" | "FINISHED",
    venue: g.court_name || "Main Court",
    homeScore: 0,
    awayScore: 0,
  };
}

export async function getGames(): Promise<Game[]> {
  const data = await handleResponse<any[]>(await fetch(`${API_BASE_URL}/games/`));
  const games: Game[] = [];
  for (const g of data) {
    let homeScore = 0;
    let awayScore = 0;
    
    if (g.events && g.events.length > 0) {
      for (const e of g.events) {
        const evType = e.event_type;
        if (evType === "SHOT_MADE") {
          const val = e.metadata_json?.shot_value || 2;
          if (String(e.team_id) === String(g.home_team_id)) {
            homeScore += Number(val);
          } else if (String(e.team_id) === String(g.away_team_id)) {
            awayScore += Number(val);
          }
        }
      }
    }
    
    games.push({
      id: g.id,
      homeTeamId: g.home_team_id,
      awayTeamId: g.away_team_id,
      homeTeamName: g.home_team?.name || "Home Team",
      awayTeamName: g.away_team?.name || "Away Team",
      date: g.date ? g.date.split("T")[0] : "",
      status: g.status as "SCHEDULED" | "LIVE" | "COMPLETED" | "FINISHED",
      venue: g.court_name || "Main Court",
      homeScore: homeScore,
      awayScore: awayScore,
    });
  }
  return games;
}

export async function getGameBoxscore(gameId: string): Promise<GameBoxscore> {
  return await handleResponse<GameBoxscore>(await fetch(`${API_BASE_URL}/games/${gameId}/boxscore`));
}

export async function updateGameStatus(gameId: string, status: "SCHEDULED" | "LIVE" | "COMPLETED" | "FINISHED"): Promise<void> {
  await handleResponse<any>(await fetch(`${API_BASE_URL}/games/${gameId}/status/${status}`, {
    method: "PUT"
  }));
}

export async function deleteGame(gameId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/games/${gameId}`, {
    method: "DELETE"
  });
  if (!response.ok) {
    let errorMessage = "An error occurred";
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
}

export interface LeagueLeaderRow {
  player_id: string;
  name: string;
  jersey_number: number | null;
  position: string | null;
  team_name: string;
  team_abbreviation: string;
  average: number;
  games_played: number;
}

export interface LeagueLeaders {
  PPG: LeagueLeaderRow[];
  APG: LeagueLeaderRow[];
  RPG: LeagueLeaderRow[];
  SPG: LeagueLeaderRow[];
}

export interface PlayerPercentileMetric {
  subject: string;
  value: number;
}

export interface PlayerPercentiles {
  player_id: string;
  name: string;
  team_name: string;
  averages: {
    PPG: number;
    APG: number;
    RPG: number;
    SPG: number;
    PFG: number;
  };
  metrics: PlayerPercentileMetric[];
}

export async function getLeagueLeaders(): Promise<LeagueLeaders> {
  return await handleResponse<LeagueLeaders>(await fetch(`${API_BASE_URL}/analytics/leaders`));
}

export async function getPlayerPercentiles(playerId: string): Promise<PlayerPercentiles> {
  return await handleResponse<PlayerPercentiles>(await fetch(`${API_BASE_URL}/players/${playerId}/analytics`));
}

