import { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  List,
  ListItem,
  Divider,
  Paper,
  Checkbox,
  FormControlLabel,
  Alert,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
} from "@mui/material";
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  SkipNext as NextPeriodIcon,
  SportsBasketball as BallIcon,
  SwapHoriz as SubIcon,
  Timer as ClockIcon,
  History as HistoryIcon,
  Refresh as ResetIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import BasketballCourt, { CourtMarker } from "./BasketballCourt";
import { Player, Team, GameEvent, BasketballEventType } from "../types";
import { saveGameEvent, updateGameStatus } from "../services/api";

// Fallback rosters in case the actual DB tables are unpopulated
const FALLBACK_HOME_ROSTER: Player[] = [
  { id: "h1", teamId: "home", firstName: "Stephen", lastName: "Curry", jerseyNumber: "30", position: "PG" },
  { id: "h2", teamId: "home", firstName: "Klay", lastName: "Thompson", jerseyNumber: "11", position: "SG" },
  { id: "h3", teamId: "home", firstName: "Draymond", lastName: "Green", jerseyNumber: "23", position: "PF" },
  { id: "h4", teamId: "home", firstName: "Andrew", lastName: "Wiggins", jerseyNumber: "22", position: "SF" },
  { id: "h5", teamId: "home", firstName: "Kevon", lastName: "Looney", jerseyNumber: "5", position: "C" },
  { id: "h6", teamId: "home", firstName: "Jonathan", lastName: "Kuminga", jerseyNumber: "00", position: "PF" },
  { id: "h7", teamId: "home", firstName: "Moses", lastName: "Moody", jerseyNumber: "4", position: "SG" },
  { id: "h8", teamId: "home", firstName: "Gary", lastName: "Payton II", jerseyNumber: "0", position: "PG" },
  { id: "h9", teamId: "home", firstName: "Brandin", lastName: "Podziemski", jerseyNumber: "2", position: "PG" },
  { id: "h10", teamId: "home", firstName: "Trayce", lastName: "Jackson-Davis", jerseyNumber: "32", position: "C" },
];

const FALLBACK_AWAY_ROSTER: Player[] = [
  { id: "a1", teamId: "away", firstName: "LeBron", lastName: "James", jerseyNumber: "23", position: "PF" },
  { id: "a2", teamId: "away", firstName: "Anthony", lastName: "Davis", jerseyNumber: "3", position: "C" },
  { id: "a3", teamId: "away", firstName: "D'Angelo", lastName: "Russell", jerseyNumber: "1", position: "PG" },
  { id: "a4", teamId: "away", firstName: "Austin", lastName: "Reaves", jerseyNumber: "15", position: "SG" },
  { id: "a5", teamId: "away", firstName: "Rui", lastName: "Hachimura", jerseyNumber: "28", position: "SF" },
  { id: "a6", teamId: "away", firstName: "Gabe", lastName: "Vincent", jerseyNumber: "7", position: "PG" },
  { id: "a7", teamId: "away", firstName: "Jarred", lastName: "Vanderbilt", jerseyNumber: "2", position: "SF" },
  { id: "a8", teamId: "away", firstName: "Christian", lastName: "Wood", jerseyNumber: "35", position: "PF" },
  { id: "a9", teamId: "away", firstName: "Taurean", lastName: "Prince", jerseyNumber: "12", position: "SF" },
  { id: "a10", teamId: "away", firstName: "Jaxson", lastName: "Hayes", jerseyNumber: "11", position: "C" },
];

interface LiveGameControllerProps {
  gameId?: string;
  homeTeam?: Team;
  awayTeam?: Team;
  homeRoster?: Player[];
  awayRoster?: Player[];
  onExit?: () => void;
}

export default function LiveGameController({
  gameId = "live-match-1",
  homeTeam = { id: "home", name: "Celtics", city: "Boston", abbreviation: "BOS" },
  awayTeam = { id: "away", name: "Warriors", city: "Golden State", abbreviation: "GSW" },
  homeRoster = [],
  awayRoster = [],
  onExit,
}: LiveGameControllerProps) {
  // Use actual rosters if provided, otherwise fallback to premium lists
  const hRoster = homeRoster.length > 0 ? homeRoster : FALLBACK_HOME_ROSTER;
  const aRoster = awayRoster.length > 0 ? awayRoster : FALLBACK_AWAY_ROSTER;

  const navigate = useNavigate();
  const [homeTimeouts, setHomeTimeouts] = useState<number>(3);
  const [awayTimeouts, setAwayTimeouts] = useState<number>(3);
  const [finishGameDialogOpen, setFinishGameDialogOpen] = useState<boolean>(false);
  const [finishing, setFinishing] = useState<boolean>(false);

  // --- Clock State ---
  const [timeLeft, setTimeLeft] = useState<number>(600.0); // 10 minutes in seconds
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [period, setPeriod] = useState<number>(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Game Flow State ---
  const [isLiveReady, setIsLiveReady] = useState<boolean>(false); // Lock starters to go live
  const [homeStarters, setHomeStarters] = useState<string[]>([]);
  const [awayStarters, setAwayStarters] = useState<string[]>([]);

  // --- Active Lineup State ---
  const [homeActive, setHomeActive] = useState<string[]>([]);
  const [awayActive, setAwayActive] = useState<string[]>([]);

  // --- Selected Active Player for Substitution ---
  const [selectedHomeActiveId, setSelectedHomeActiveId] = useState<string | null>(null);
  const [selectedAwayActiveId, setSelectedAwayActiveId] = useState<string | null>(null);

  // --- Interactive Play History Logs ---
  const [eventLog, setEventLog] = useState<Partial<GameEvent>[]>([]);
  const [courtMarkers, setCourtMarkers] = useState<CourtMarker[]>([]);
  const [nextShotMade, setNextShotMade] = useState<boolean>(true);

  // --- Intelligent Event Chaining State ---
  const [activeChain, setActiveChain] = useState<{
    type: "MADE" | "MISSED" | "STEAL" | "FOUL";
    playerTriggerId: string;
    teamId: string;
    shotType?: "Triple" | "Doble" | "Libre";
    points?: number;
    x?: number;
    y?: number;
    zone?: string;
    step?: number;
    blockerId?: string;
  } | null>(null);

  const [isSecondChanceActive, setIsSecondChanceActive] = useState<boolean>(false);

  // --- Chained Option Selections State ---
  const [assistPlayerId, setAssistPlayerId] = useState<string | null>(null);
  const [isFastBreak, setIsFastBreak] = useState<boolean>(false);
  const [blockerId, setBlockerId] = useState<string | null>(null);
  const [reboundPlayerId, setReboundPlayerId] = useState<string | null>(null);
  const [turnoverPlayerId, setTurnoverPlayerId] = useState<string | null>(null);
  const [drawnPlayerId, setDrawnPlayerId] = useState<string | null>(null);

  useEffect(() => {
    if (activeChain) {
      setAssistPlayerId(null);
      setIsFastBreak(false);
      setBlockerId(null);
      setReboundPlayerId(null);
      setTurnoverPlayerId(null);
      setDrawnPlayerId(null);
    }
  }, [activeChain]);

  // --- Quick Stats Counter (for visual tracking validation) ---
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);

  // --- Auto-Initialize Starters on Component Load ---
  useEffect(() => {
    // Attempt to automatically pre-select first 5 players as starters for rapid onboarding
    if (hRoster.length >= 5 && homeStarters.length === 0) {
      setHomeStarters(hRoster.slice(0, 5).map((p) => p.id));
    }
    if (aRoster.length >= 5 && awayStarters.length === 0) {
      setAwayStarters(aRoster.slice(0, 5).map((p) => p.id));
    }
  }, [hRoster, aRoster]);

  // --- Clock Interval Logic (Runs at 100ms precision) ---
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 0.1) {
            setIsPlaying(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return Number((prev - 0.1).toFixed(1));
        });
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying]);

  // --- Game Clock Formatter (MM:SS or SS.f for final seconds) ---
  const formatClockTime = (seconds: number): string => {
    if (seconds <= 10.0) {
      // In the final seconds (under 10s), show SS.f with tenths of a second precision
      return seconds.toFixed(1);
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // --- Elapsed Seconds Calculator ---
  const getElapsedSeconds = (): number => {
    return 600 - timeLeft;
  };

  // --- Formatted Clock String for Backend Storage ---
  const getClockString = (): string => {
    return formatClockTime(timeLeft);
  };

  // --- Handlers ---
  const handlePlayClock = () => {
    if (!isLiveReady) return;
    setIsPlaying(true);
  };

  const handlePauseClock = () => {
    setIsPlaying(false);
  };

  const handleNextPeriod = () => {
    setIsPlaying(false);
    if (period >= 6) {
      logSystemEvent("Maximum extra periods reached.", "System");
      return;
    }
    const nextPer = period + 1;
    setPeriod(nextPer);
    if (nextPer === 3) {
      setHomeTimeouts(3);
      setAwayTimeouts(3);
      logSystemEvent("Second Half Started. Timeouts reset to 3.", "System");
    } else {
      logSystemEvent(`Quarter ${nextPer} Started`, "System");
    }
    setTimeLeft(600.0); // Reset to 10 minutes for next quarter
  };

  const handleResetClock = () => {
    setIsPlaying(false);
    setTimeLeft(600.0);
  };

  const handleTimeout = (team: "home" | "away") => {
    setIsPlaying(false); // Stop the clock!
    if (team === "home") {
      if (homeTimeouts <= 0) return;
      setHomeTimeouts((prev) => prev - 1);
      logEvent("TIMEOUT", undefined, homeTeam.id, `TIMEOUT called by ${homeTeam.name}`, {});
    } else {
      if (awayTimeouts <= 0) return;
      setAwayTimeouts((prev) => prev - 1);
      logEvent("TIMEOUT", undefined, awayTeam.id, `TIMEOUT called by ${awayTeam.name}`, {});
    }
  };

  const handleConfirmFinishGame = async () => {
    setIsPlaying(false);
    setFinishing(true);
    try {
      await updateGameStatus(gameId, "FINISHED");
      logSystemEvent("Game status set to FINISHED", "System");
      navigate(`/reports?gameId=${gameId}`);
    } catch (err) {
      console.error("Failed to finish game:", err);
      logSystemEvent("Failed to set game status to FINISHED in database", "System");
      // Fallback redirect anyway so the user experience is smooth
      navigate(`/reports?gameId=${gameId}`);
    } finally {
      setFinishing(false);
      setFinishGameDialogOpen(false);
    }
  };

  // Toggle Starter Selections during setup
  const handleToggleStarter = (teamId: "home" | "away", playerId: string) => {
    if (teamId === "home") {
      setHomeStarters((prev) => {
        if (prev.includes(playerId)) {
          return prev.filter((id) => id !== playerId);
        }
        if (prev.length >= 5) return prev; // Limit to 5
        return [...prev, playerId];
      });
    } else {
      setAwayStarters((prev) => {
        if (prev.includes(playerId)) {
          return prev.filter((id) => id !== playerId);
        }
        if (prev.length >= 5) return prev; // Limit to 5
        return [...prev, playerId];
      });
    }
  };

  // Locking Roster to Launch Live Tracking
  const handleLockLineups = () => {
    if (homeStarters.length !== 5 || awayStarters.length !== 5) return;
    setHomeActive([...homeStarters]);
    setAwayActive([...awayStarters]);
    setIsLiveReady(true);
    logSystemEvent("Starters locked. Game tracking live!", "System");
  };

  // --- Start and Submit Intelligent Event Chains ---
  const startMadeChain = (playerId: string, teamId: string, options?: { shotType?: "Triple" | "Doble" | "Libre"; points?: number; x?: number; y?: number; zone?: string }) => {
    setActiveChain({
      type: "MADE",
      playerTriggerId: playerId,
      teamId: teamId,
      shotType: options?.shotType || "Doble",
      points: options?.points !== undefined ? options.points : 2,
      x: options?.x,
      y: options?.y,
      zone: options?.zone || "Paint"
    });
  };

  const startMissedChain = (playerId: string, teamId: string, options?: { shotType?: "Triple" | "Doble" | "Libre"; x?: number; y?: number; zone?: string }) => {
    setActiveChain({
      type: "MISSED",
      playerTriggerId: playerId,
      teamId: teamId,
      shotType: options?.shotType || "Doble",
      x: options?.x,
      y: options?.y,
      zone: options?.zone || "Paint",
      step: 1
    });
  };

  const startStealChain = (playerId: string, teamId: string, options?: { x?: number; y?: number }) => {
    setActiveChain({
      type: "STEAL",
      playerTriggerId: playerId,
      teamId: teamId,
      x: options?.x,
      y: options?.y
    });
  };

  const startFoulChain = (playerId: string, teamId: string, options?: { x?: number; y?: number }) => {
    setActiveChain({
      type: "FOUL",
      playerTriggerId: playerId,
      teamId: teamId,
      x: options?.x,
      y: options?.y
    });
  };

  const submitMadeChain = async (assistPlayerId: string | null, isFastBreak: boolean) => {
    if (!activeChain) return;
    const { playerTriggerId, teamId, shotType, points, x, y, zone } = activeChain;

    const shooter = hRoster.find(p => p.id === playerTriggerId) || aRoster.find(p => p.id === playerTriggerId);
    if (!shooter) {
      setActiveChain(null);
      return;
    }

    const isHome = teamId === homeTeam.id;

    // Update score
    const pts = points || 2;
    if (isHome) {
      setHomeScore((prev) => prev + pts);
    } else {
      setAwayScore((prev) => prev + pts);
    }

    // Add court marker if coordinates exist
    if (x !== undefined && y !== undefined) {
      const newMarker: CourtMarker = {
        id: `mark-${Date.now()}`,
        x: x,
        y: y,
        shotType: shotType || "Doble",
        made: true,
        playerName: `${shooter.lastName} (#${shooter.jerseyNumber})`,
      };
      setCourtMarkers((prev) => [newMarker, ...prev]);
    }

    // Log Shot Made Event
    let type: BasketballEventType = "MADE_2PT";
    if (shotType === "Triple") type = "MADE_3PT";
    else if (shotType === "Libre") type = "MADE_FT";

    // Set second chance based on our state, then reset
    const secondChanceFlag = isSecondChanceActive;
    setIsSecondChanceActive(false);

    const description = `MADE ${shotType || "2PT"} by ${shooter.firstName} ${shooter.lastName}${zone ? ` in ${zone}` : ""}${isFastBreak ? " [FAST BREAK]" : ""}${secondChanceFlag ? " [SECOND CHANCE]" : ""}`;
    
    await logEvent(type, shooter.id, teamId, description, {
      xCoord: x !== undefined ? x : 0.0,
      yCoord: y !== undefined ? y : 0.0,
      contested: false,
      fast_break: isFastBreak,
      second_chance: secondChanceFlag
    });

    // If Assist is selected
    if (assistPlayerId) {
      const assistPlayer = hRoster.find(p => p.id === assistPlayerId) || aRoster.find(p => p.id === assistPlayerId);
      if (assistPlayer) {
        const assistDesc = `ASSIST by ${assistPlayer.firstName} ${assistPlayer.lastName} on shot by ${shooter.firstName} ${shooter.lastName}`;
        await logEvent("ASSIST", assistPlayer.id, teamId, assistDesc, {
          player_id: assistPlayer.id,
          secondary_player_id: shooter.id
        });
      }
    }

    setActiveChain(null);
  };

  const submitMissedChain = async (blockerId: string | null, reboundPlayerId: string | null) => {
    if (!activeChain) return;
    const { playerTriggerId, teamId, shotType, x, y, zone } = activeChain;

    const shooter = hRoster.find(p => p.id === playerTriggerId) || aRoster.find(p => p.id === playerTriggerId);
    if (!shooter) {
      setActiveChain(null);
      return;
    }

    const isHome = teamId === homeTeam.id;

    // Add court marker if coordinates exist
    if (x !== undefined && y !== undefined) {
      const newMarker: CourtMarker = {
        id: `mark-${Date.now()}`,
        x: x,
        y: y,
        shotType: shotType || "Doble",
        made: false,
        playerName: `${shooter.lastName} (#${shooter.jerseyNumber})`,
      };
      setCourtMarkers((prev) => [newMarker, ...prev]);
    }

    // Log Shot Missed Event
    let type: BasketballEventType = "MISSED_2PT";
    if (shotType === "Triple") type = "MISSED_3PT";
    else if (shotType === "Libre") type = "MISSED_FT";

    const secondChanceFlag = isSecondChanceActive;
    const description = `MISSED ${shotType || "2PT"} by ${shooter.firstName} ${shooter.lastName}${zone ? ` in ${zone}` : ""}`;
    
    await logEvent(type, shooter.id, teamId, description, {
      xCoord: x !== undefined ? x : 0.0,
      yCoord: y !== undefined ? y : 0.0,
      contested: false,
      second_chance: secondChanceFlag
    });

    // If Blocker is selected
    if (blockerId) {
      const blocker = hRoster.find(p => p.id === blockerId) || aRoster.find(p => p.id === blockerId);
      if (blocker) {
        const blockerTeamId = isHome ? awayTeam.id : homeTeam.id;
        const blockDesc = `SHOT BLOCKED by ${blocker.firstName} ${blocker.lastName} (Shooter: ${shooter.lastName})`;
        await logEvent("BLOCK", blocker.id, blockerTeamId, blockDesc, {
          player_id: blocker.id,
          secondary_player_id: shooter.id
        });
      }
    }

    // Handle Rebound
    if (reboundPlayerId) {
      const rebounder = hRoster.find(p => p.id === reboundPlayerId) || aRoster.find(p => p.id === reboundPlayerId);
      if (rebounder) {
        const rebounderIsTeammate = rebounder.teamId === shooter.teamId;
        if (rebounderIsTeammate) {
          // Offensive Rebound!
          const rebDesc = `OFFENSIVE REBOUND by ${rebounder.firstName} ${rebounder.lastName}`;
          await logEvent("REBOUND_OFFENSIVE", rebounder.id, teamId, rebDesc, {
            player_id: rebounder.id,
            secondary_player_id: shooter.id
          });
          setIsSecondChanceActive(true); // Flag second chance for next possession!
        } else {
          // Defensive Rebound!
          const rebounderTeamId = isHome ? awayTeam.id : homeTeam.id;
          const rebDesc = `DEFENSIVE REBOUND by ${rebounder.firstName} ${rebounder.lastName}`;
          await logEvent("REBOUND_DEFENSIVE", rebounder.id, rebounderTeamId, rebDesc, {
            player_id: rebounder.id,
            secondary_player_id: shooter.id
          });
          setIsSecondChanceActive(false); // Reset second chance
        }
      }
    } else {
      // Dead ball or skipped rebound
      setIsSecondChanceActive(false); // Reset second chance since ball is dead
    }

    setActiveChain(null);
  };

  const submitStealChain = async (turnoverPlayerId: string | null) => {
    if (!activeChain) return;
    const { playerTriggerId, teamId, x, y } = activeChain;

    const stealer = hRoster.find(p => p.id === playerTriggerId) || aRoster.find(p => p.id === playerTriggerId);
    if (!stealer) {
      setActiveChain(null);
      return;
    }

    const isHome = teamId === homeTeam.id;

    // Log the Steal event
    const stealDesc = `STEAL by ${stealer.firstName} ${stealer.lastName}`;
    await logEvent("STEAL", stealer.id, teamId, stealDesc, {
      player_id: stealer.id,
      secondary_player_id: turnoverPlayerId || undefined,
      xCoord: x,
      yCoord: y
    });

    // If an opponent turned the ball over, log linked TURNOVER
    if (turnoverPlayerId) {
      const turnoverPlayer = hRoster.find(p => p.id === turnoverPlayerId) || aRoster.find(p => p.id === turnoverPlayerId);
      if (turnoverPlayer) {
        const opponentTeamId = isHome ? awayTeam.id : homeTeam.id;
        const toDesc = `TURNOVER by ${turnoverPlayer.firstName} ${turnoverPlayer.lastName} (linked to Steal by ${stealer.firstName} ${stealer.lastName})`;
        await logEvent("TURNOVER", turnoverPlayer.id, opponentTeamId, toDesc, {
          player_id: turnoverPlayer.id,
          secondary_player_id: stealer.id,
          xCoord: x,
          yCoord: y
        });
      }
    }

    setIsSecondChanceActive(false); // Reset second chance since possession changed
    setActiveChain(null);
  };

  const submitFoulChain = async (drawnPlayerId: string | null) => {
    if (!activeChain) return;
    const { playerTriggerId, teamId, x, y } = activeChain;

    const committer = hRoster.find(p => p.id === playerTriggerId) || aRoster.find(p => p.id === playerTriggerId);
    if (!committer) {
      setActiveChain(null);
      return;
    }

    // Log the Foul committed event
    let foulDesc = `FOUL by ${committer.firstName} ${committer.lastName}`;
    if (drawnPlayerId) {
      const drawnPlayer = hRoster.find(p => p.id === drawnPlayerId) || aRoster.find(p => p.id === drawnPlayerId);
      if (drawnPlayer) {
        foulDesc += ` (Drawn by ${drawnPlayer.firstName} ${drawnPlayer.lastName})`;
      }
    }

    await logEvent("FOUL", committer.id, teamId, foulDesc, {
      player_id: committer.id,
      secondary_player_id: drawnPlayerId || undefined,
      xCoord: x,
      yCoord: y
    });

    setActiveChain(null);
  };

  // Stage Event Logging Helper
  const logEvent = async (
    type: BasketballEventType,
    playerId: string | undefined,
    teamId: string,
    description: string,
    extra: Record<string, any> = {}
  ) => {
    const timestamp = getClockString();
    const localId = `ev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    // Map BasketballEventType to the backend EventType
    let backendEventType = "FOUL"; // fallback
    const isShot = type.startsWith("MADE_") || type.startsWith("MISSED_");
    if (type === "SUBSTITUTION") {
      backendEventType = "SUBSTITUTION";
    } else if (isShot) {
      backendEventType = type.startsWith("MADE_") ? "SHOT_MADE" : "SHOT_MISSED";
    } else if (type === "FOUL") {
      backendEventType = "FOUL";
    } else if (type === "TURNOVER") {
      backendEventType = "TURNOVER";
    } else if (type === "STEAL") {
      backendEventType = "STEAL";
    } else if (type === "BLOCK") {
      backendEventType = "BLOCK";
    } else if (type === "ASSIST") {
      backendEventType = "ASSIST";
    } else if (type === "REBOUND_OFFENSIVE") {
      backendEventType = "OFFENSIVE_REBOUND";
    } else if (type === "REBOUND_DEFENSIVE") {
      backendEventType = "DEFENSIVE_REBOUND";
    } else if (type === "TIMEOUT") {
      backendEventType = "TIMEOUT";
    }

    // construct metadata payload for backend validation
    const payload: Record<string, any> = {};
    if (backendEventType === "SHOT_MADE" || backendEventType === "SHOT_MISSED") {
      payload["shooter_id"] = playerId || "";
      let shotTypeStr = "Doble";
      if (type.includes("3PT")) {
        shotTypeStr = "Triple";
      } else if (type.includes("FT")) {
        shotTypeStr = "Libre";
      }
      payload["shot_type"] = shotTypeStr;
      payload["contested"] = extra.contested !== undefined ? extra.contested : false;
      // Support coordinates named x and y or xCoord and yCoord
      payload["x"] = extra.xCoord !== undefined ? extra.xCoord : 0.0;
      payload["y"] = extra.yCoord !== undefined ? extra.yCoord : 0.0;
    } else if (backendEventType === "SUBSTITUTION") {
      payload["player_out_id"] = extra.playerOutId || "";
      payload["player_in_id"] = extra.playerInId || "";
    } else {
      payload["player_id"] = playerId || "";
    }

    const newEvent: any = {
      id: localId,
      gameId,
      timestamp,
      quarter: period,
      type,
      playerId,
      teamId,
      description,
      syncStatus: "pending",
      ...extra,
    };

    setEventLog((prev) => [newEvent, ...prev]);

    try {
      await saveGameEvent(gameId, {
        timestamp,
        period,
        team_context: teamId,
        event_type: backendEventType,
        payload,
      });

      setEventLog((prev) =>
        prev.map((ev) => (ev.id === localId ? { ...ev, syncStatus: "synced" } : ev))
      );
    } catch (err) {
      console.error("Failed to sync event to backend database:", err);
      setEventLog((prev) =>
        prev.map((ev) => (ev.id === localId ? { ...ev, syncStatus: "failed" } : ev))
      );
    }
  };

  const logSystemEvent = (description: string, category: string) => {
    const timestamp = getClockString();
    setEventLog((prev) => [
      {
        id: `sys-${Date.now()}`,
        timestamp,
        quarter: period,
        type: "FOUL", // standard fallback
        description: `[${category}] ${description}`,
        teamId: "system",
      },
      ...prev,
    ]);
  };

  // Perform Substitution swap and log event
  const handleSwapSubstitution = (teamId: "home" | "away", playerInId: string) => {
    const activePlayerId = teamId === "home" ? selectedHomeActiveId : selectedAwayActiveId;
    if (!activePlayerId) return;

    const rosterList = teamId === "home" ? hRoster : aRoster;
    const playerOut = rosterList.find((p) => p.id === activePlayerId);
    const playerIn = rosterList.find((p) => p.id === playerInId);

    if (!playerOut || !playerIn) return;

    if (teamId === "home") {
      // Ensure no duplicates
      const updatedLineup = homeActive.map((id) => (id === activePlayerId ? playerInId : id));
      setHomeActive(updatedLineup);
      setSelectedHomeActiveId(null);
    } else {
      const updatedLineup = awayActive.map((id) => (id === activePlayerId ? playerInId : id));
      setAwayActive(updatedLineup);
      setSelectedAwayActiveId(null);
    }

    // Stage substitution event log entry exactly to specification: {"playerOutId": uuid, "playerInId": uuid}
    const description = `SUB: ${playerIn.lastName} (#${playerIn.jerseyNumber}) IN for ${playerOut.lastName} (#${playerOut.jerseyNumber})`;
    logEvent("SUBSTITUTION", playerInId, teamId === "home" ? homeTeam.id : awayTeam.id, description, {
      playerOutId: activePlayerId,
      playerInId: playerInId,
    });
  };

  // Handle Shot placement from interactive SVG court
  const handleCourtCoordCaptured = (data: {
    x: number;
    y: number;
    shotType: "Triple" | "Doble" | "Libre";
    zone: string;
    eventType?: string;
  }) => {
    // Determine player list to select active shooter
    const activeHomePlayers = hRoster.filter((p) => homeActive.includes(p.id));
    const activeAwayPlayers = aRoster.filter((p) => awayActive.includes(p.id));

    // Determine shooter based on active selection or defaults
    let shooter = activeHomePlayers[0] || hRoster[0];
    let isHome = true;

    if (selectedHomeActiveId) {
      const selectedHome = activeHomePlayers.find((p) => p.id === selectedHomeActiveId);
      if (selectedHome) {
        shooter = selectedHome;
        isHome = true;
      }
    } else if (selectedAwayActiveId) {
      const selectedAway = activeAwayPlayers.find((p) => p.id === selectedAwayActiveId);
      if (selectedAway) {
        shooter = selectedAway;
        isHome = false;
      }
    } else {
      // Default to home team shooter
      isHome = true;
    }

    const eventChoice = data.eventType;
    if (eventChoice && eventChoice !== "SHOT_MADE" && eventChoice !== "SHOT_MISSED") {
      let type: BasketballEventType = "FOUL";
      let desc = "";
      if (eventChoice === "REBOUND_DEFENSIVE") {
        type = "REBOUND_DEFENSIVE";
        desc = `DEFENSIVE REBOUND by ${shooter.firstName} ${shooter.lastName} near (${data.x}, ${data.y})`;
        logEvent(type, shooter.id, isHome ? homeTeam.id : awayTeam.id, desc, {
          xCoord: data.x,
          yCoord: data.y,
        });
        setIsSecondChanceActive(false); // Reset second chance since defensive rebound occurred
      } else if (eventChoice === "REBOUND_OFFENSIVE") {
        type = "REBOUND_OFFENSIVE";
        desc = `OFFENSIVE REBOUND by ${shooter.firstName} ${shooter.lastName} near (${data.x}, ${data.y})`;
        logEvent(type, shooter.id, isHome ? homeTeam.id : awayTeam.id, desc, {
          xCoord: data.x,
          yCoord: data.y,
        });
        setIsSecondChanceActive(true); // Flag second chance active!
      } else if (eventChoice === "STEAL") {
        startStealChain(shooter.id, isHome ? homeTeam.id : awayTeam.id, { x: data.x, y: data.y });
      } else if (eventChoice === "TURNOVER") {
        type = "TURNOVER";
        desc = `TURNOVER by ${shooter.firstName} ${shooter.lastName} near (${data.x}, ${data.y})`;
        logEvent(type, shooter.id, isHome ? homeTeam.id : awayTeam.id, desc, {
          xCoord: data.x,
          yCoord: data.y,
        });
        setIsSecondChanceActive(false);
      } else if (eventChoice === "FOUL") {
        startFoulChain(shooter.id, isHome ? homeTeam.id : awayTeam.id, { x: data.x, y: data.y });
      }
      return;
    }

    // Shot handled from court:
    const isMade = eventChoice ? (eventChoice === "SHOT_MADE") : nextShotMade;
    const isThree = data.shotType === "Triple";
    const isFreeThrow = data.shotType === "Libre";
    let points = 2;
    if (isThree) points = 3;
    else if (isFreeThrow) points = 1;

    if (isMade) {
      startMadeChain(shooter.id, isHome ? homeTeam.id : awayTeam.id, {
        shotType: data.shotType,
        points,
        x: data.x,
        y: data.y,
        zone: data.zone
      });
    } else {
      startMissedChain(shooter.id, isHome ? homeTeam.id : awayTeam.id, {
        shotType: data.shotType,
        x: data.x,
        y: data.y,
        zone: data.zone
      });
    }
  };

  const getPlayerDetails = (id: string, rosterList: Player[]) => {
    return rosterList.find((p) => p.id === id);
  };

  return (
    <Box sx={{ width: "100%", maxWidth: "1280px", mx: "auto", py: 2 }}>
      {/* Top Controls Dashboard Header */}
      <Card
        sx={{
          mb: 4,
          borderRadius: "16px",
          border: "1px solid #E2E8F0",
          boxShadow: "0px 8px 30px rgba(15, 23, 42, 0.04)",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 2.5,
            bgcolor: "#0F172A",
            color: "#FFFFFF",
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box className="flex items-center gap-3">
            <Box
              sx={{
                bgcolor: "#6366F1",
                p: 1,
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <BallIcon sx={{ color: "#FFFFFF" }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                Live Controller Panel
              </Typography>
              <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                Sprint 8: High Fidelity Clock & Roster Event Synchronization
              </Typography>
            </Box>
          </Box>

          <Box className="flex items-center gap-3">
            {isLiveReady && (
              <Chip
                label={`PERIOD ${period}`}
                color="primary"
                sx={{ fontWeight: 700, bgcolor: "#6366F1", color: "#FFFFFF" }}
              />
            )}
            {onExit && (
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                onClick={onExit}
                sx={{
                  color: "#94A3B8",
                  borderColor: "rgba(255, 255, 255, 0.15)",
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.05)" },
                }}
              >
                Close Tracking
              </Button>
            )}
          </Box>
        </Box>

        <CardContent sx={{ p: 3 }}>
          {/* SPRINT 8 REQUIREMENT: SETUP MODE VS ACTIVE LIVE GAME */}
          {!isLiveReady ? (
            <Box sx={{ py: 3 }}>
              <Alert severity="warning" sx={{ mb: 4, borderRadius: "12px" }}>
                <strong>CRITICAL REQUIREMENT:</strong> The game clock is locked. You must select <strong>exactly 5 active starters</strong> for both the Home and Away teams to synchronize the tactical board.
              </Alert>

              <Grid container spacing={4}>
                {/* Home Starters Configuration */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper
                    sx={{
                      p: 3,
                      borderRadius: "16px",
                      border: "1px solid #E2E8F0",
                      boxShadow: "none",
                      bgcolor: "#F8FAFC",
                    }}
                  >
                    <Box className="flex justify-between items-center mb-3">
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "primary.main" }}>
                        🏠 {homeTeam.name} Starters Setup
                      </Typography>
                      <Chip
                        label={`${homeStarters.length} / 5 Selected`}
                        color={homeStarters.length === 5 ? "success" : "warning"}
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <List sx={{ maxHeight: 280, overflowY: "auto", p: 0 }}>
                      {hRoster.map((player) => (
                        <ListItem
                          key={player.id}
                          dense
                          sx={{
                            borderBottom: "1px solid #F1F5F9",
                            py: 0.5,
                            "&:last-child": { border: 0 },
                          }}
                        >
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={homeStarters.includes(player.id)}
                                onChange={() => handleToggleStarter("home", player.id)}
                                disabled={!homeStarters.includes(player.id) && homeStarters.length >= 5}
                              />
                            }
                            label={
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                #{player.jerseyNumber} — {player.firstName} {player.lastName} ({player.position})
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Grid>

                {/* Away Starters Configuration */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper
                    sx={{
                      p: 3,
                      borderRadius: "16px",
                      border: "1px solid #E2E8F0",
                      boxShadow: "none",
                      bgcolor: "#F8FAFC",
                    }}
                  >
                    <Box className="flex justify-between items-center mb-3">
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "secondary.main" }}>
                        ✈️ {awayTeam.name} Starters Setup
                      </Typography>
                      <Chip
                        label={`${awayStarters.length} / 5 Selected`}
                        color={awayStarters.length === 5 ? "success" : "warning"}
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <List sx={{ maxHeight: 280, overflowY: "auto", p: 0 }}>
                      {aRoster.map((player) => (
                        <ListItem
                          key={player.id}
                          dense
                          sx={{
                            borderBottom: "1px solid #F1F5F9",
                            py: 0.5,
                            "&:last-child": { border: 0 },
                          }}
                        >
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={awayStarters.includes(player.id)}
                                onChange={() => handleToggleStarter("away", player.id)}
                                disabled={!awayStarters.includes(player.id) && awayStarters.length >= 5}
                              />
                            }
                            label={
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                #{player.jerseyNumber} — {player.firstName} {player.lastName} ({player.position})
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Grid>
              </Grid>

              <Box className="flex justify-center mt-6">
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  disabled={homeStarters.length !== 5 || awayStarters.length !== 5}
                  onClick={handleLockLineups}
                  startIcon={<SubIcon />}
                  sx={{
                    fontWeight: 700,
                    px: 6,
                    py: 1.5,
                    borderRadius: "12px",
                    boxShadow: "0px 4px 14px rgba(99, 102, 241, 0.4)",
                  }}
                >
                  Lock Lineups & Activate Clock
                </Button>
              </Box>
            </Box>
          ) : (
            /* --- LIVE MODE GAME ACTIVE --- */
            <Box>
              {/* FIBA Countdown Clock Panel */}
              <Paper
                sx={{
                  p: 3,
                  mb: 4,
                  bgcolor: "#1E293B",
                  color: "#FFFFFF",
                  borderRadius: "16px",
                  border: "1px solid #334155",
                  boxShadow: "0px 4px 12px rgba(15, 23, 42, 0.08)",
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 3,
                }}
              >
                {/* Active Matchup Score */}
                <Box className="flex flex-col items-center gap-2">
                  <Box className="flex items-center gap-4">
                    <Box className="text-center">
                      <Typography variant="subtitle2" sx={{ color: "#94A3B8", fontWeight: 700 }}>
                        {homeTeam.abbreviation}
                      </Typography>
                      <Typography variant="h3" sx={{ fontWeight: 800, fontFamily: "var(--font-mono)", color: "#10B981" }}>
                        {homeScore}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#94A3B8", display: "block" }}>
                        TOs: {homeTimeouts}
                      </Typography>
                    </Box>
                    <Typography variant="h5" sx={{ color: "#475569", fontWeight: 800 }}>
                      :
                    </Typography>
                    <Box className="text-center">
                      <Typography variant="subtitle2" sx={{ color: "#94A3B8", fontWeight: 700 }}>
                        {awayTeam.abbreviation}
                      </Typography>
                      <Typography variant="h3" sx={{ fontWeight: 800, fontFamily: "var(--font-mono)", color: "#6366F1" }}>
                        {awayScore}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#94A3B8", display: "block" }}>
                        TOs: {awayTimeouts}
                      </Typography>
                    </Box>
                  </Box>
                  <Box className="flex gap-2 mt-1">
                    <Button
                      variant="outlined"
                      color="success"
                      size="small"
                      onClick={() => handleTimeout("home")}
                      disabled={homeTimeouts <= 0}
                      sx={{ fontSize: "0.7rem", py: 0.5, fontWeight: 700, borderColor: "rgba(16, 185, 129, 0.4)", color: "#10B981" }}
                    >
                      BOS TIMEOUT
                    </Button>
                    <Button
                      variant="outlined"
                      color="secondary"
                      size="small"
                      onClick={() => handleTimeout("away")}
                      disabled={awayTimeouts <= 0}
                      sx={{ fontSize: "0.7rem", py: 0.5, fontWeight: 700, borderColor: "rgba(99, 102, 241, 0.4)", color: "#818CF8" }}
                    >
                      GSW TIMEOUT
                    </Button>
                  </Box>
                </Box>

                {/* Clock Digital Face */}
                <Box className="text-center">
                  <Box className="flex items-center justify-center gap-1">
                    <ClockIcon sx={{ color: "#F59E0B", fontSize: "1.5rem" }} />
                    <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, letterSpacing: "0.1em" }}>
                      FIBA GAME CLOCK
                    </Typography>
                  </Box>
                  <Typography
                    variant="h2"
                    sx={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      color: timeLeft <= 10.0 ? "#EF4444" : "#F59E0B",
                      letterSpacing: "0.02em",
                      my: 0.5,
                      textShadow: "0px 0px 10px rgba(245, 158, 11, 0.2)",
                    }}
                  >
                    {getClockString()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                    Elapsed: {getElapsedSeconds()}s | Period: {period >= 5 ? "OT" : `Q${period}`}
                  </Typography>
                </Box>

                {/* Clock Controllers */}
                <Box className="flex flex-wrap items-center gap-2">
                  {!isPlaying ? (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<PlayIcon />}
                      onClick={handlePlayClock}
                      disabled={timeLeft <= 0}
                      sx={{ fontWeight: 700, borderRadius: "10px" }}
                    >
                      PLAY
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      color="warning"
                      startIcon={<PauseIcon />}
                      onClick={handlePauseClock}
                      sx={{ fontWeight: 700, borderRadius: "10px" }}
                    >
                      PAUSE
                    </Button>
                  )}
                  <Button
                    variant="outlined"
                    color="inherit"
                    startIcon={<NextPeriodIcon />}
                    onClick={handleNextPeriod}
                    sx={{
                      color: "#94A3B8",
                      borderColor: "rgba(255, 255, 255, 0.15)",
                      fontWeight: 700,
                      borderRadius: "10px",
                    }}
                  >
                    NEXT PERIOD
                  </Button>
                  <IconButton onClick={handleResetClock} size="small" title="Reset Period" sx={{ color: "#94A3B8" }}>
                    <ResetIcon fontSize="small" />
                  </IconButton>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => setFinishGameDialogOpen(true)}
                    sx={{ fontWeight: 700, borderRadius: "10px", ml: 1 }}
                  >
                    FINISH GAME
                  </Button>
                </Box>
              </Paper>

              {/* Main Game Interface (Flanked 5v5 Active Panels & Court) */}
              <Grid container spacing={3} sx={{ alignItems: "stretch" }}>
                {/* Left Column: HOME ACTIVE 5 */}
                <Grid size={{ xs: 12, md: 3 }}>
                  <Paper
                    sx={{
                      p: 2.5,
                      height: "100%",
                      borderRadius: "16px",
                      border: "1px solid #E2E8F0",
                      boxShadow: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700 }}>
                        HOME ACTIVE LINEUP (5)
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Click on player to prompt substitutions
                      </Typography>
                    </Box>

                    <Divider />

                    <Box className="flex flex-col gap-2">
                      {homeActive.map((id) => {
                        const player = getPlayerDetails(id, hRoster);
                        if (!player) return null;
                        const isSelected = selectedHomeActiveId === id;

                        return (
                          <Box key={id} className="flex flex-col w-full gap-1">
                            <Button
                              variant={isSelected ? "contained" : "outlined"}
                              color="success"
                              onClick={() => {
                                setSelectedHomeActiveId(isSelected ? null : id);
                                setSelectedAwayActiveId(null); // Mutually exclusive
                              }}
                              sx={{
                                py: 1.5,
                                justifyContent: "flex-start",
                                borderWidth: "2px",
                                borderColor: isSelected ? "success.main" : "rgba(16, 185, 129, 0.2)",
                                bgcolor: isSelected ? "success.main" : "transparent",
                                color: isSelected ? "#FFFFFF" : "success.dark",
                                "&:hover": {
                                  borderWidth: "2px",
                                  bgcolor: isSelected ? "success.main" : "rgba(16, 185, 129, 0.05)",
                                },
                                borderRadius: "12px",
                              }}
                            >
                              <Box className="flex items-center justify-between w-full">
                                <Typography variant="subtitle1" sx={{ fontWeight: 800, mr: 2 }}>
                                  #{player.jerseyNumber}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700, flexGrow: 1, textTransform: "uppercase" }}>
                                  {player.lastName}
                                </Typography>
                                <Chip
                                  label={player.position}
                                  size="small"
                                  sx={{
                                    fontSize: "0.65rem",
                                    height: 18,
                                    bgcolor: isSelected ? "rgba(255,255,255,0.2)" : "rgba(16, 185, 129, 0.1)",
                                    color: isSelected ? "#FFFFFF" : "success.dark",
                                    fontWeight: 700,
                                  }}
                                />
                              </Box>
                            </Button>

                            {isSelected && (
                              <Box sx={{ mt: 0.5, mb: 1, p: 1, bgcolor: "#F1F5F9", borderRadius: "8px", display: "flex", flexDirection: "column", gap: 1, width: "100%" }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", mb: 0.5 }}>
                                  LOG GAME EVENT:
                                </Typography>
                                <Grid container spacing={1}>
                                  <Grid size={{ xs: 6 }}>
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color="success"
                                      fullWidth
                                      sx={{ fontSize: "0.7rem", py: 0.5 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startMadeChain(player.id, homeTeam.id, { shotType: "Doble", points: 2 });
                                      }}
                                    >
                                      SHOT MADE
                                    </Button>
                                  </Grid>
                                  <Grid size={{ xs: 6 }}>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="error"
                                      fullWidth
                                      sx={{ fontSize: "0.7rem", py: 0.5, bgcolor: "#FFFFFF" }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startMissedChain(player.id, homeTeam.id, { shotType: "Doble" });
                                      }}
                                    >
                                      SHOT MISSED
                                    </Button>
                                  </Grid>
                                  <Grid size={{ xs: 6 }}>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="primary"
                                      fullWidth
                                      sx={{ fontSize: "0.7rem", py: 0.5, bgcolor: "#FFFFFF" }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        logEvent("REBOUND_DEFENSIVE", player.id, homeTeam.id, `DEFENSIVE REBOUND by ${player.firstName} ${player.lastName}`);
                                        setIsSecondChanceActive(false);
                                      }}
                                    >
                                      D-REBOUND
                                    </Button>
                                  </Grid>
                                  <Grid size={{ xs: 6 }}>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="primary"
                                      fullWidth
                                      sx={{ fontSize: "0.7rem", py: 0.5, bgcolor: "#FFFFFF" }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        logEvent("REBOUND_OFFENSIVE", player.id, homeTeam.id, `OFFENSIVE REBOUND by ${player.firstName} ${player.lastName}`);
                                        setIsSecondChanceActive(true);
                                      }}
                                    >
                                      O-REBOUND
                                    </Button>
                                  </Grid>
                                  <Grid size={{ xs: 4 }}>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="info"
                                      fullWidth
                                      sx={{ fontSize: "0.7rem", py: 0.5, bgcolor: "#FFFFFF" }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startStealChain(player.id, homeTeam.id);
                                      }}
                                    >
                                      STEAL
                                    </Button>
                                  </Grid>
                                  <Grid size={{ xs: 4 }}>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="warning"
                                      fullWidth
                                      sx={{ fontSize: "0.7rem", py: 0.5, bgcolor: "#FFFFFF" }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        logEvent("TURNOVER", player.id, homeTeam.id, `TURNOVER by ${player.firstName} ${player.lastName}`);
                                        setIsSecondChanceActive(false);
                                      }}
                                    >
                                      TOV
                                    </Button>
                                  </Grid>
                                  <Grid size={{ xs: 4 }}>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="error"
                                      fullWidth
                                      sx={{ fontSize: "0.7rem", py: 0.5, bgcolor: "#FFFFFF" }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startFoulChain(player.id, homeTeam.id);
                                      }}
                                    >
                                      FOUL
                                    </Button>
                                  </Grid>
                                </Grid>
                              </Box>
                            )}
                          </Box>
                        );
                      })}
                    </Box>

                    {/* Bench sub triggers */}
                    {selectedHomeActiveId && (
                      <Box sx={{ mt: "auto", pt: 2, borderTop: "1px dashed #CBD5E1" }}>
                        <Typography variant="caption" color="primary.main" sx={{ fontWeight: 700, display: "block", mb: 1 }}>
                          Select sub-in player from {homeTeam.name} Bench:
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: 180, overflowY: "auto" }}>
                          {hRoster
                            .filter((p) => !homeActive.includes(p.id))
                            .map((p) => (
                              <Button
                                key={p.id}
                                size="small"
                                variant="text"
                                onClick={() => handleSwapSubstitution("home", p.id)}
                                sx={{
                                  justifyContent: "flex-start",
                                  textTransform: "none",
                                  bgcolor: "#F0FDF4",
                                  color: "success.dark",
                                  "&:hover": { bgcolor: "#DCFCE7" },
                                  p: 1,
                                  borderRadius: "8px",
                                }}
                              >
                                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                  #{p.jerseyNumber} {p.lastName} ({p.position})
                                </Typography>
                              </Button>
                            ))}
                        </Box>
                      </Box>
                    )}
                  </Paper>
                </Grid>

                {/* Center Column: Interactive SVG Court */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper
                    sx={{
                      p: 3,
                      borderRadius: "16px",
                      border: "1px solid #E2E8F0",
                      boxShadow: "none",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <Box className="w-full flex justify-between items-center">
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        TACTICAL SVG COURT
                      </Typography>
                      <Box className="flex items-center gap-2">
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          Next shot is:
                        </Typography>
                        <Button
                          size="small"
                          variant="contained"
                          color={nextShotMade ? "success" : "error"}
                          onClick={() => setNextShotMade(!nextShotMade)}
                          sx={{ height: 24, fontSize: "0.7rem", fontWeight: 700 }}
                        >
                          {nextShotMade ? "MADE" : "MISSED"}
                        </Button>
                      </Box>
                    </Box>

                    <BasketballCourt
                      markers={courtMarkers}
                      onCoordCaptured={handleCourtCoordCaptured}
                    />

                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", mt: 1 }}>
                      Click on the court to log shot events. Active players on court are dynamically tied.
                    </Typography>
                  </Paper>
                </Grid>

                {/* Right Column: AWAY ACTIVE 5 */}
                <Grid size={{ xs: 12, md: 3 }}>
                  <Paper
                    sx={{
                      p: 2.5,
                      height: "100%",
                      borderRadius: "16px",
                      border: "1px solid #E2E8F0",
                      boxShadow: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700 }}>
                        AWAY ACTIVE LINEUP (5)
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Click on player to prompt substitutions
                      </Typography>
                    </Box>

                    <Divider />

                    <Box className="flex flex-col gap-2">
                      {awayActive.map((id) => {
                        const player = getPlayerDetails(id, aRoster);
                        if (!player) return null;
                        const isSelected = selectedAwayActiveId === id;

                        return (
                          <Box key={id} className="flex flex-col w-full gap-1">
                            <Button
                              variant={isSelected ? "contained" : "outlined"}
                              color="secondary"
                              onClick={() => {
                                setSelectedAwayActiveId(isSelected ? null : id);
                                setSelectedHomeActiveId(null); // Mutually exclusive
                              }}
                              sx={{
                                py: 1.5,
                                justifyContent: "flex-start",
                                borderWidth: "2px",
                                borderColor: isSelected ? "secondary.main" : "rgba(99, 102, 241, 0.2)",
                                bgcolor: isSelected ? "secondary.main" : "transparent",
                                color: isSelected ? "#FFFFFF" : "secondary.dark",
                                "&:hover": {
                                  borderWidth: "2px",
                                  bgcolor: isSelected ? "secondary.main" : "rgba(99, 102, 241, 0.05)",
                                },
                                borderRadius: "12px",
                              }}
                            >
                              <Box className="flex items-center justify-between w-full">
                                <Typography variant="subtitle1" sx={{ fontWeight: 800, mr: 2 }}>
                                  #{player.jerseyNumber}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700, flexGrow: 1, textTransform: "uppercase" }}>
                                  {player.lastName}
                                </Typography>
                                <Chip
                                  label={player.position}
                                  size="small"
                                  sx={{
                                    fontSize: "0.65rem",
                                    height: 18,
                                    bgcolor: isSelected ? "rgba(255,255,255,0.2)" : "rgba(99, 102, 241, 0.1)",
                                    color: isSelected ? "#FFFFFF" : "secondary.dark",
                                    fontWeight: 700,
                                  }}
                                />
                              </Box>
                            </Button>

                            {isSelected && (
                              <Box sx={{ mt: 0.5, mb: 1, p: 1, bgcolor: "#F1F5F9", borderRadius: "8px", display: "flex", flexDirection: "column", gap: 1, width: "100%" }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", mb: 0.5 }}>
                                  LOG GAME EVENT:
                                </Typography>
                                <Grid container spacing={1}>
                                  <Grid size={{ xs: 6 }}>
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color="secondary"
                                      fullWidth
                                      sx={{ fontSize: "0.7rem", py: 0.5 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startMadeChain(player.id, awayTeam.id, { shotType: "Doble", points: 2 });
                                      }}
                                    >
                                      SHOT MADE
                                    </Button>
                                  </Grid>
                                  <Grid size={{ xs: 6 }}>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="error"
                                      fullWidth
                                      sx={{ fontSize: "0.7rem", py: 0.5, bgcolor: "#FFFFFF" }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startMissedChain(player.id, awayTeam.id, { shotType: "Doble" });
                                      }}
                                    >
                                      SHOT MISSED
                                    </Button>
                                  </Grid>
                                  <Grid size={{ xs: 6 }}>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="primary"
                                      fullWidth
                                      sx={{ fontSize: "0.7rem", py: 0.5, bgcolor: "#FFFFFF" }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        logEvent("REBOUND_DEFENSIVE", player.id, awayTeam.id, `DEFENSIVE REBOUND by ${player.firstName} ${player.lastName}`);
                                        setIsSecondChanceActive(false);
                                      }}
                                    >
                                      D-REBOUND
                                    </Button>
                                  </Grid>
                                  <Grid size={{ xs: 6 }}>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="primary"
                                      fullWidth
                                      sx={{ fontSize: "0.7rem", py: 0.5, bgcolor: "#FFFFFF" }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        logEvent("REBOUND_OFFENSIVE", player.id, awayTeam.id, `OFFENSIVE REBOUND by ${player.firstName} ${player.lastName}`);
                                        setIsSecondChanceActive(true);
                                      }}
                                    >
                                      O-REBOUND
                                    </Button>
                                  </Grid>
                                  <Grid size={{ xs: 4 }}>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="info"
                                      fullWidth
                                      sx={{ fontSize: "0.7rem", py: 0.5, bgcolor: "#FFFFFF" }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startStealChain(player.id, awayTeam.id);
                                      }}
                                    >
                                      STEAL
                                    </Button>
                                  </Grid>
                                  <Grid size={{ xs: 4 }}>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="warning"
                                      fullWidth
                                      sx={{ fontSize: "0.7rem", py: 0.5, bgcolor: "#FFFFFF" }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        logEvent("TURNOVER", player.id, awayTeam.id, `TURNOVER by ${player.firstName} ${player.lastName}`);
                                        setIsSecondChanceActive(false);
                                      }}
                                    >
                                      TOV
                                    </Button>
                                  </Grid>
                                  <Grid size={{ xs: 4 }}>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="error"
                                      fullWidth
                                      sx={{ fontSize: "0.7rem", py: 0.5, bgcolor: "#FFFFFF" }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startFoulChain(player.id, awayTeam.id);
                                      }}
                                    >
                                      FOUL
                                    </Button>
                                  </Grid>
                                </Grid>
                              </Box>
                            )}
                          </Box>
                        );
                      })}
                    </Box>

                    {/* Bench sub triggers */}
                    {selectedAwayActiveId && (
                      <Box sx={{ mt: "auto", pt: 2, borderTop: "1px dashed #CBD5E1" }}>
                        <Typography variant="caption" color="secondary.main" sx={{ fontWeight: 700, display: "block", mb: 1 }}>
                          Select sub-in player from {awayTeam.name} Bench:
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: 180, overflowY: "auto" }}>
                          {aRoster
                            .filter((p) => !awayActive.includes(p.id))
                            .map((p) => (
                              <Button
                                key={p.id}
                                size="small"
                                variant="text"
                                onClick={() => handleSwapSubstitution("away", p.id)}
                                sx={{
                                  justifyContent: "flex-start",
                                  textTransform: "none",
                                  bgcolor: "#EEF2FF",
                                  color: "secondary.dark",
                                  "&:hover": { bgcolor: "#E0E7FF" },
                                  p: 1,
                                  borderRadius: "8px",
                                }}
                              >
                                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                  #{p.jerseyNumber} {p.lastName} ({p.position})
                                </Typography>
                              </Button>
                            ))}
                        </Box>
                      </Box>
                    )}
                  </Paper>
                </Grid>
              </Grid>

              {/* SPRINT 8 STAGED EVENT LOG PANEL */}
              <Card sx={{ mt: 4, borderRadius: "16px", border: "1px solid #E2E8F0", boxShadow: "none" }}>
                <Box sx={{ p: 2, bgcolor: "#F8FAFC", borderBottom: "1px solid #E2E8F0", display: "flex", justify: "space-between", align: "center" }}>
                  <Box className="flex items-center gap-1.5">
                    <HistoryIcon color="action" fontSize="small" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Real-time Domain Substitution & Event Log Registry
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Total Events Recorded: {eventLog.length}
                  </Typography>
                </Box>
                <CardContent sx={{ p: 0 }}>
                  <Box sx={{ maxHeight: 200, overflowY: "auto", p: 2, bgcolor: "#111827", color: "#10B981", fontFamily: "monospace", fontSize: "0.85rem" }}>
                    {eventLog.length === 0 ? (
                      <Typography variant="body2" sx={{ color: "#64748B", fontStyle: "italic" }}>
                        Waiting for play events or substitutions. Sub-in a player above or record a shot to stage logs.
                      </Typography>
                    ) : (
                      eventLog.map((log: any) => (
                        <Box
                          key={log.id}
                          sx={{
                            borderBottom: "1px solid rgba(255,255,255,0.05)",
                            py: 1,
                            "&:last-child": { border: 0 },
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 1,
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <span className="text-[#F59E0B] font-bold">
                              [{log.timestamp}] Q{log.quarter}
                            </span>
                            <span className="text-gray-100">{log.description}</span>
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            {log.playerOutId && (
                              <Tooltip title={`Event: SUB_OUT: ${log.playerOutId} | SUB_IN: ${log.playerInId}`}>
                                <Chip
                                  label="SUB EVENT payload"
                                  size="small"
                                  sx={{
                                    height: 18,
                                    fontSize: "0.65rem",
                                    bgcolor: "#EF4444",
                                    color: "#FFFFFF",
                                    fontWeight: 700,
                                    fontFamily: "monospace",
                                  }}
                                />
                              </Tooltip>
                            )}
                            {log.syncStatus === "pending" && (
                              <Chip
                                label="Syncing..."
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: "0.65rem",
                                  bgcolor: "#F59E0B",
                                  color: "#000000",
                                  fontWeight: 700,
                                  fontFamily: "monospace",
                                }}
                              />
                            )}
                            {log.syncStatus === "failed" && (
                              <Chip
                                label="Pending Sync / Offline"
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: "0.65rem",
                                  bgcolor: "#EF4444",
                                  color: "#FFFFFF",
                                  fontWeight: 700,
                                  fontFamily: "monospace",
                                }}
                              />
                            )}
                            {log.syncStatus === "synced" && (
                              <Chip
                                label="Synced"
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: "0.65rem",
                                  bgcolor: "#10B981",
                                  color: "#FFFFFF",
                                  fontWeight: 700,
                                  fontFamily: "monospace",
                                }}
                              />
                            )}
                            <Chip
                              label={log.type}
                              size="small"
                              variant="outlined"
                              sx={{
                                height: 18,
                                fontSize: "0.65rem",
                                borderColor: "#10B981",
                                color: "#10B981",
                                fontWeight: 700,
                                fontFamily: "monospace",
                              }}
                            />
                          </Box>
                        </Box>
                      ))
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* SHOT MADE SEQUENCE DIALOG */}
      <Dialog
        open={activeChain?.type === "MADE"}
        onClose={() => setActiveChain(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: "16px", p: 1 } }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          🏀 Intelligent Shot Made Sequence
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Shot successfully logged. Prompting immediate chained event sequence:
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              🤝 Choose ASSIST provider (Teammate):
            </Typography>
            <Box className="flex flex-col gap-1">
              <Button
                variant={assistPlayerId === null ? "contained" : "outlined"}
                color="inherit"
                size="small"
                onClick={() => setAssistPlayerId(null)}
                sx={{ justifyContent: "flex-start", textTransform: "none", py: 1 }}
              >
                No Assist
              </Button>
              {activeChain && (activeChain.teamId === homeTeam.id ? homeActive : awayActive)
                .filter(id => id !== activeChain.playerTriggerId)
                .map(id => {
                  const p = getPlayerDetails(id, activeChain.teamId === homeTeam.id ? hRoster : aRoster);
                  if (!p) return null;
                  const isSel = assistPlayerId === p.id;
                  return (
                    <Button
                      key={p.id}
                      variant={isSel ? "contained" : "outlined"}
                      color="success"
                      size="small"
                      onClick={() => setAssistPlayerId(p.id)}
                      sx={{ justifyContent: "flex-start", textTransform: "none", py: 1 }}
                    >
                      #{p.jerseyNumber} — {p.firstName} {p.lastName}
                    </Button>
                  );
                })}
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box className="flex items-center justify-between">
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              ⚡ Fast Break Points Toggle
            </Typography>
            <Switch
              checked={isFastBreak}
              onChange={(e) => setIsFastBreak(e.target.checked)}
              color="success"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setActiveChain(null)} color="inherit" sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={() => submitMadeChain(assistPlayerId, isFastBreak)}
            variant="contained"
            color="success"
            sx={{ fontWeight: 700, borderRadius: "8px" }}
          >
            Log Play Sequence
          </Button>
        </DialogActions>
      </Dialog>

      {/* SHOT MISSED SEQUENCE DIALOG */}
      <Dialog
        open={activeChain?.type === "MISSED"}
        onClose={() => setActiveChain(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: "16px", p: 1 } }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          ❌ Intelligent Shot Missed Sequence
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Missed shot registered. Choose rebounder to complete possession tracking:
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              🛡️ Tied Shot BLOCK (Opponent Defensor, Optional):
            </Typography>
            <Box className="flex flex-col gap-1 max-h-[120px] overflow-y-auto">
              <Button
                variant={blockerId === null ? "contained" : "outlined"}
                color="inherit"
                size="small"
                onClick={() => setBlockerId(null)}
                sx={{ justifyContent: "flex-start", textTransform: "none", py: 0.8 }}
              >
                No Block
              </Button>
              {activeChain && (activeChain.teamId === homeTeam.id ? awayActive : homeActive)
                .map(id => {
                  const p = getPlayerDetails(id, activeChain.teamId === homeTeam.id ? aRoster : hRoster);
                  if (!p) return null;
                  const isSel = blockerId === p.id;
                  return (
                    <Button
                      key={p.id}
                      variant={isSel ? "contained" : "outlined"}
                      color="error"
                      size="small"
                      onClick={() => setBlockerId(p.id)}
                      sx={{ justifyContent: "flex-start", textTransform: "none", py: 0.8 }}
                    >
                      #{p.jerseyNumber} — {p.firstName} {p.lastName}
                    </Button>
                  );
                })}
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "primary.main" }}>
              🏀 Force REBOUND Selector (Required for possession cycle):
            </Typography>
            
            <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", display: "block", mb: 1 }}>
              OFFENSIVE REBOUNDS (Shooter's Teammates):
            </Typography>
            <Box className="flex flex-col gap-1 mb-2">
              {activeChain && (activeChain.teamId === homeTeam.id ? homeActive : awayActive)
                .map(id => {
                  const p = getPlayerDetails(id, activeChain.teamId === homeTeam.id ? hRoster : aRoster);
                  if (!p) return null;
                  const isSel = reboundPlayerId === p.id;
                  return (
                    <Button
                      key={p.id}
                      variant={isSel ? "contained" : "outlined"}
                      color="primary"
                      size="small"
                      onClick={() => setReboundPlayerId(p.id)}
                      sx={{ justifyContent: "flex-start", textTransform: "none", py: 0.8 }}
                    >
                      #{p.jerseyNumber} — {p.firstName} {p.lastName} (OREB)
                    </Button>
                  );
                })}
            </Box>

            <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", display: "block", mb: 1 }}>
              DEFENSIVE REBOUNDS (Opponents):
            </Typography>
            <Box className="flex flex-col gap-1 mb-2">
              {activeChain && (activeChain.teamId === homeTeam.id ? awayActive : homeActive)
                .map(id => {
                  const p = getPlayerDetails(id, activeChain.teamId === homeTeam.id ? aRoster : hRoster);
                  if (!p) return null;
                  const isSel = reboundPlayerId === p.id;
                  return (
                    <Button
                      key={p.id}
                      variant={isSel ? "contained" : "outlined"}
                      color="secondary"
                      size="small"
                      onClick={() => setReboundPlayerId(p.id)}
                      sx={{ justifyContent: "flex-start", textTransform: "none", py: 0.8 }}
                    >
                      #{p.jerseyNumber} — {p.firstName} {p.lastName} (DREB)
                    </Button>
                  );
                })}
            </Box>

            <Button
              variant={reboundPlayerId === null ? "contained" : "outlined"}
              color="inherit"
              size="small"
              fullWidth
              onClick={() => setReboundPlayerId(null)}
              sx={{ justifyContent: "center", textTransform: "none", py: 1, mt: 1 }}
            >
              Dead Ball / Out of Bounds / Skip Rebound
            </Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setActiveChain(null)} color="inherit" sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={() => submitMissedChain(blockerId, reboundPlayerId)}
            variant="contained"
            color="primary"
            sx={{ fontWeight: 700, borderRadius: "8px" }}
          >
            Log Missed Play
          </Button>
        </DialogActions>
      </Dialog>

      {/* STEAL SEQUENCE DIALOG */}
      <Dialog
        open={activeChain?.type === "STEAL"}
        onClose={() => setActiveChain(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: "16px", p: 1 } }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          🛡️ Intelligent Steal Sequence
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Steal logged. Select which opponent player turned over the ball to automatically log a linked Turnover event:
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              ⚠️ Automatically Inject Opponent TURNOVER:
            </Typography>
            <Box className="flex flex-col gap-1">
              <Button
                variant={turnoverPlayerId === null ? "contained" : "outlined"}
                color="inherit"
                size="small"
                onClick={() => setTurnoverPlayerId(null)}
                sx={{ justifyContent: "flex-start", textTransform: "none", py: 1 }}
              >
                No Turnover (Unforced / Loose Ball)
              </Button>
              {activeChain && (activeChain.teamId === homeTeam.id ? awayActive : homeActive)
                .map(id => {
                  const p = getPlayerDetails(id, activeChain.teamId === homeTeam.id ? aRoster : hRoster);
                  if (!p) return null;
                  const isSel = turnoverPlayerId === p.id;
                  return (
                    <Button
                      key={p.id}
                      variant={isSel ? "contained" : "outlined"}
                      color="warning"
                      size="small"
                      onClick={() => setTurnoverPlayerId(p.id)}
                      sx={{ justifyContent: "flex-start", textTransform: "none", py: 1 }}
                    >
                      #{p.jerseyNumber} — {p.firstName} {p.lastName}
                    </Button>
                  );
                })}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setActiveChain(null)} color="inherit" sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={() => submitStealChain(turnoverPlayerId)}
            variant="contained"
            color="warning"
            sx={{ fontWeight: 700, borderRadius: "8px" }}
          >
            Log Steal & Turnover
          </Button>
        </DialogActions>
      </Dialog>

      {/* FOUL SEQUENCE DIALOG */}
      <Dialog
        open={activeChain?.type === "FOUL"}
        onClose={() => setActiveChain(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: "16px", p: 1 } }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          ⚠️ Intelligent Foul Sequence
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Foul logged. Who is the opposing player that received the foul (logs both committed and drawn fouls)?
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              🏀 Received/Drawn By Opponent:
            </Typography>
            <Box className="flex flex-col gap-1">
              <Button
                variant={drawnPlayerId === null ? "contained" : "outlined"}
                color="inherit"
                size="small"
                onClick={() => setDrawnPlayerId(null)}
                sx={{ justifyContent: "flex-start", textTransform: "none", py: 1 }}
              >
                General Team Foul / Unspecified
              </Button>
              {activeChain && (activeChain.teamId === homeTeam.id ? awayActive : homeActive)
                .map(id => {
                  const p = getPlayerDetails(id, activeChain.teamId === homeTeam.id ? aRoster : hRoster);
                  if (!p) return null;
                  const isSel = drawnPlayerId === p.id;
                  return (
                    <Button
                      key={p.id}
                      variant={isSel ? "contained" : "outlined"}
                      color="error"
                      size="small"
                      onClick={() => setDrawnPlayerId(p.id)}
                      sx={{ justifyContent: "flex-start", textTransform: "none", py: 1 }}
                    >
                      #{p.jerseyNumber} — {p.firstName} {p.lastName}
                    </Button>
                  );
                })}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setActiveChain(null)} color="inherit" sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={() => submitFoulChain(drawnPlayerId)}
            variant="contained"
            color="error"
            sx={{ fontWeight: 700, borderRadius: "8px" }}
          >
            Log Coupled Foul
          </Button>
        </DialogActions>
      </Dialog>

      {/* FINISH GAME CONFIRMATION DIALOG */}
      <Dialog
        open={finishGameDialogOpen}
        onClose={() => setFinishGameDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: "16px", p: 1 } }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          🏁 Finish Game Confirmation
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to finish this game? This will freeze the game clock and finalize all game statistics. You will be automatically redirected to the Reports page to analyze advanced boxscore metrics and team efficiency.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFinishGameDialogOpen(false)} color="inherit" sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmFinishGame}
            variant="contained"
            color="error"
            disabled={finishing}
            sx={{ fontWeight: 700, borderRadius: "8px" }}
          >
            {finishing ? "FINISHING..." : "FINISH GAME"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
