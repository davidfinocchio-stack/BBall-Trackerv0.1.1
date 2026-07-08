import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  EmojiEvents as TrophyIcon,
  TrendingUp as TrendingUpIcon,
  SportsBasketball as BallIcon,
  AutoGraph as AnalyticsIcon,
  LocationOn as LocationIcon,
} from "@mui/icons-material";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { Player, Team, GameBoxscore, ShotChartPoint } from "../types";
import { getGames, getGameBoxscore, getTeams, getPlayerPercentiles, PlayerPercentiles } from "../services/api";
import BasketballCourt, { CourtMarker } from "./BasketballCourt";

interface PlayerProfileProps {
  player: Player;
  onBack: () => void;
}

const containerVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, staggerChildren: 0.05 } },
};

export default function PlayerProfile({ player, onBack }: PlayerProfileProps) {
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [gamesCount, setGamesCount] = useState(0);
  const [stats, setStats] = useState({
    GP: 0,
    PTS: 0,
    FGM: 0,
    FGA: 0,
    "3PM": 0,
    "3PA": 0,
    FTM: 0,
    FTA: 0,
    OREB: 0,
    DREB: 0,
    AST: 0,
    TOV: 0,
    STL: 0,
    BLK: 0,
    PF: 0,
  });
  const [advancedMetrics, setAdvancedMetrics] = useState({
    TS_pct: 0,
    USG_pct: 0,
    EFF: 0,
  });
  const [shots, setShots] = useState<ShotChartPoint[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [percentileData, setPercentileData] = useState<PlayerPercentiles | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [allGames, allTeams, percentiles] = await Promise.all([
          getGames(),
          getTeams(),
          getPlayerPercentiles(player.id),
        ]);
        setTeams(allTeams);
        setPercentileData(percentiles);

        const playerFullName = `${player.firstName} ${player.lastName}`.trim().toLowerCase();

        // Accumulate statistics
        let totalPTS = 0;
        let totalFGM = 0;
        let totalFGA = 0;
        let total3PM = 0;
        let total3PA = 0;
        let totalFTM = 0;
        let totalFTA = 0;
        let totalOREB = 0;
        let totalDREB = 0;
        let totalAST = 0;
        let totalTOV = 0;
        let totalSTL = 0;
        let totalBLK = 0;
        let totalPF = 0;
        let gamesPlayed = 0;

        let totalTeamFGA = 0;
        let totalTeamFTA = 0;
        let totalTeamTOV = 0;

        const playerShots: ShotChartPoint[] = [];

        // Fetch boxscore for all games that aren't SCHEDULED
        const activeGames = allGames.filter((g) => g.status !== "SCHEDULED");
        
        const boxscorePromises = activeGames.map(async (g) => {
          try {
            return await getGameBoxscore(g.id);
          } catch (e) {
            console.warn(`Error loading boxscore for game ${g.id}`, e);
            return null;
          }
        });

        const boxscores = (await Promise.all(boxscorePromises)).filter(
          (b): b is GameBoxscore => b !== null
        );

        boxscores.forEach((boxscore) => {
          let foundInGame = false;
          let pStats: any = null;
          let teamTotals: any = null;

          // Check if player in home team
          const homePlayer = boxscore.home_team.players.find(
            (p) => p.player_id === player.id || p.name.toLowerCase() === playerFullName
          );
          if (homePlayer) {
            pStats = homePlayer.stats;
            teamTotals = boxscore.home_team.totals;
            foundInGame = true;
          } else {
            // Check away team
            const awayPlayer = boxscore.away_team.players.find(
              (p) => p.player_id === player.id || p.name.toLowerCase() === playerFullName
            );
            if (awayPlayer) {
              pStats = awayPlayer.stats;
              teamTotals = boxscore.away_team.totals;
              foundInGame = true;
            }
          }

          if (foundInGame && pStats) {
            gamesPlayed++;
            totalPTS += pStats.PTS || 0;
            totalFGM += pStats.FGM || 0;
            totalFGA += pStats.FGA || 0;
            total3PM += pStats["3PM"] || 0;
            total3PA += pStats["3PA"] || 0;
            totalFTM += pStats.FTM || 0;
            totalFTA += pStats.FTA || 0;
            totalOREB += pStats.OREB || 0;
            totalDREB += pStats.DREB || 0;
            totalAST += pStats.AST || 0;
            totalTOV += pStats.TOV || 0;
            totalSTL += pStats.STL || 0;
            totalBLK += pStats.BLK || 0;
            totalPF += pStats.PF || 0;

            if (teamTotals) {
              totalTeamFGA += teamTotals.FGA || 0;
              totalTeamFTA += teamTotals.FTA || 0;
              totalTeamTOV += teamTotals.TOV || 0;
            }
          }

          // Gather matching shots
          if (boxscore.shots) {
            boxscore.shots.forEach((shot) => {
              const isMatch =
                shot.player_id === player.id ||
                (shot.player_name && shot.player_name.toLowerCase() === playerFullName);
              if (isMatch) {
                playerShots.push(shot);
              }
            });
          }
        });

        // Set accumulated stats state
        const calculatedStats = {
          GP: gamesPlayed,
          PTS: totalPTS,
          FGM: totalFGM,
          FGA: totalFGA,
          "3PM": total3PM,
          "3PA": total3PA,
          FTM: totalFTM,
          FTA: totalFTA,
          OREB: totalOREB,
          DREB: totalDREB,
          AST: totalAST,
          TOV: totalTOV,
          STL: totalSTL,
          BLK: totalBLK,
          PF: totalPF,
        };
        setStats(calculatedStats);
        setShots(playerShots);
        setGamesCount(gamesPlayed);

        // Calculate Advanced Analytics metrics
        // True Shooting % (TS%): PTS / (2 * (FGA + 0.44 * FTA))
        const tsDenominator = 2 * (totalFGA + 0.44 * totalFTA);
        const TS_pct = tsDenominator > 0 ? (totalPTS / tsDenominator) * 100 : 0;

        // Usage Rate % (USG%): Approximate percentage of team plays used by player while on court
        // Standard simplified team weight formula: 100 * (FGA + 0.44 * FTA + TOV) / (Team_FGA + 0.44 * Team_FTA + Team_TOV)
        const teamDenominator = totalTeamFGA + 0.44 * totalTeamFTA + totalTeamTOV;
        const playerWeight = totalFGA + 0.44 * totalFTA + totalTOV;
        const USG_pct = teamDenominator > 0 ? (playerWeight / teamDenominator) * 100 : 0;

        // Player Efficiency Rating (EFF): (PTS + REB + AST + STL + BLK - MissedFG - MissedFT - TOV) / GP
        const totalREB = totalOREB + totalDREB;
        const missedFG = totalFGA - totalFGM;
        const missedFT = totalFTA - totalFTM;
        const totalEff = totalPTS + totalREB + totalAST + totalSTL + totalBLK - missedFG - missedFT - totalTOV;
        const EFF = gamesPlayed > 0 ? totalEff / gamesPlayed : 0;

        setAdvancedMetrics({
          TS_pct,
          USG_pct,
          EFF,
        });
      } catch (err) {
        console.error("Failed to load player statistics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [player]);

  const getTeamName = (teamId: string) => {
    if (!teamId) return "Free Agent / Unassigned";
    const team = teams.find((t) => t.id === teamId);
    return team ? team.name : "Unknown Team";
  };

  // Generate automated insights summary based on stats and zone distribution
  const generateAutomatedSummary = () => {
    if (gamesCount === 0) {
      return "Baseline profile. No live match data recorded yet. Register this player in active matches and log real-time shot telemetry to generate advanced AI analytics reports.";
    }

    const ppg = stats.PTS / gamesCount;
    const apg = stats.AST / gamesCount;
    const rpg = (stats.OREB + stats.DREB) / gamesCount;
    const top = stats.TOV / gamesCount;
    const ts = advancedMetrics.TS_pct;

    let scoringProfile = "";
    if (ppg >= 20) {
      scoringProfile = "Elite offensive centerpiece.";
    } else if (ppg >= 12) {
      scoringProfile = "Highly effective scoring option.";
    } else {
      scoringProfile = "Contributes within standard team offensive schemes.";
    }

    let efficiencyProfile = "";
    if (ts >= 60) {
      efficiencyProfile = "Outstanding scoring efficiency with remarkable shot selection.";
    } else if (ts >= 50) {
      efficiencyProfile = "Reliable shooter with standard efficiency percentages.";
    } else {
      efficiencyProfile = "Needs adjustment on shot-making mechanics and decision-making under defensive pressure.";
    }

    let playmakingProfile = "";
    if (apg >= 5) {
      playmakingProfile = "Exhibits superb floor generalship and playmaking vision.";
    } else if (apg >= 2.5) {
      playmakingProfile = "Decent ball-handling and secondary facilitation capability.";
    } else if (top > 3 && apg < 2) {
      playmakingProfile = "Prone to active defensive trap turnovers; ball control needs discipline.";
    } else {
      playmakingProfile = "Primarily focused on off-ball movement and catching-to-shoot.";
    }

    let defenseProfile = "";
    const defensiveStocks = (stats.STL + stats.BLK) / gamesCount;
    if (defensiveStocks >= 2.5) {
      defenseProfile = "High defensive impact (elite steals & blocks contribution).";
    } else if (rpg >= 8) {
      defenseProfile = "Dominates the glass, securing high defensive rebound possession.";
    } else {
      defenseProfile = "Standard defensive coverage with stable lane awareness.";
    }

    // Shot chart insights
    let shotInsight = "Excellent efficiency in transition.";
    if (shots.length > 0) {
      const corner3s = shots.filter((s) => s.court_zone?.toLowerCase().includes("corner"));
      const cornersAttempted = corner3s.length;
      const cornersMade = corner3s.filter((s) => s.made).length;
      const cornerPct = cornersAttempted > 0 ? (cornersMade / cornersAttempted) * 100 : 0;

      if (cornersAttempted >= 2 && cornerPct < 30) {
        shotInsight = "Needs adjustment on corner 3s to spacing out defenses.";
      } else if (cornersAttempted >= 2 && cornerPct >= 40) {
        shotInsight = "Lethal threat from corner 3-point spots, perfectly spacing the floor.";
      } else {
        const restrictedShots = shots.filter((s) => s.court_zone?.toLowerCase().includes("restricted"));
        const reMade = restrictedShots.filter((s) => s.made).length;
        if (restrictedShots.length >= 3 && reMade / restrictedShots.length >= 0.6) {
          shotInsight = "Dominant paint finisher, highly efficient inside the restricted zone.";
        }
      }
    }

    return `${scoringProfile} ${efficiencyProfile} ${playmakingProfile} ${defenseProfile} ${shotInsight}`;
  };

  // Convert ShotChartPoints to BasketballCourt markers
  const courtMarkers: CourtMarker[] = shots.map((s) => ({
    id: s.id,
    x: s.x,
    y: s.y,
    shotType: s.shot_value === 3 ? "Triple" : s.shot_value === 1 ? "Libre" : "Doble",
    made: s.made,
    playerName: `${player.firstName} ${player.lastName}`,
  }));

  const playerFullName = `${player.firstName} ${player.lastName}`;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Back Header & Profile Header Card */}
      <Box className="flex justify-between items-center mb-2">
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          variant="outlined"
          sx={{
            color: "text.primary",
            borderColor: "#E2E8F0",
            textTransform: "none",
            fontWeight: 600,
            "&:hover": { borderColor: "text.primary", bgcolor: "rgba(0,0,0,0.02)" },
          }}
        >
          Back to Roster
        </Button>
        <Chip
          label={`ID: ${player.id.slice(0, 8)}...`}
          size="small"
          variant="outlined"
          sx={{ fontStyle: "italic", color: "text.secondary", fontSize: 11 }}
        />
      </Box>

      {/* Main Profile Header Banner */}
      <Card
        id="player-banner-card"
        sx={{
          background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
          color: "white",
          borderRadius: 3,
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
          overflow: "hidden",
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Grid container spacing={3} sx={{ alignItems: "center" }}>
            <Grid>
              <Box
                sx={{
                  width: { xs: 80, md: 100 },
                  height: { xs: 80, md: 100 },
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #14B8A6 0%, #3B82F6 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
                  border: "3px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                <Typography variant="h3" sx={{ fontWeight: 900, color: "white" }}>
                  {player.jerseyNumber || "#"}
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: "grow" }}>
              <Box className="flex flex-wrap items-center gap-2 mb-1">
                <Chip
                  label={player.position}
                  size="small"
                  sx={{
                    bgcolor: "rgba(20, 184, 166, 0.2)",
                    color: "#2DD4BF",
                    fontWeight: 700,
                    border: "1px solid rgba(20, 184, 166, 0.3)",
                  }}
                />
                <Chip
                  label={getTeamName(player.teamId)}
                  size="small"
                  sx={{
                    bgcolor: "rgba(255,255,255,0.1)",
                    color: "slate.200",
                    fontWeight: 600,
                  }}
                />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, tracking: "-0.025em" }}>
                {playerFullName}
              </Typography>
              <Typography variant="body2" sx={{ color: "slate.300", mt: 0.5, display: "flex", gap: 1.5, alignItems: "center" }}>
                <span>Height: {player.height || "N/A"}</span>
                <span className="opacity-40">|</span>
                <span>Weight: {player.weight ? `${player.weight} lbs` : "N/A"}</span>
                <span className="opacity-40">|</span>
                <span>Games Tracked: <b className="text-[#2DD4BF]">{gamesCount}</b></span>
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Automated Report Alert Panel */}
      <Card
        id="automated-report-card"
        sx={{
          border: "1px solid #CCFBF1",
          bgcolor: "#F0FDFA",
          borderRadius: 2.5,
          boxShadow: "none",
        }}
      >
        <CardContent sx={{ p: 2.5, display: "flex", gap: 2, alignItems: "flex-start" }}>
          <TrophyIcon sx={{ color: "#0D9488", mt: 0.5, fontSize: 28 }} />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#115E59", mb: 0.5 }}>
              Performance Analytics & Summary Report
            </Typography>
            <Typography variant="body2" sx={{ color: "#134E4A", lineHeight: 1.6, fontWeight: 500 }}>
              "{generateAutomatedSummary()}"
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {loading ? (
        <Box className="flex flex-col justify-center items-center py-20 gap-4">
          <CircularProgress size={45} thickness={4.5} />
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Analyzing player logs & accumulating statistics...
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={4}>
          {/* TAB SELECTION */}
          <Grid size={{ xs: 12 }}>
            <Tabs
              value={activeTab}
              onChange={(_, val) => setActiveTab(val)}
              sx={{
                borderBottom: "1px solid #E2E8F0",
                "& .MuiTab-root": { textTransform: "none", fontWeight: 700, fontSize: 14 },
              }}
            >
              <Tab icon={<BallIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Historical Averages & Stats" />
              <Tab icon={<AnalyticsIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Advanced Analytics" />
              <Tab icon={<LocationIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Shot Chart & Spatial" />
            </Tabs>
          </Grid>

          {/* TAB 0: HISTORICAL AVERAGES */}
          {activeTab === 0 && (
            <Grid size={{ xs: 12 }}>
              <Grid container spacing={3}>
                {/* Traditional Stats Grid */}
                <Grid size={{ xs: 12, md: 8 }}>
                  <Box className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {/* PPG */}
                    <Card sx={{ border: "1px solid #E2E8F0", boxShadow: "none", borderRadius: 2 }}>
                      <CardContent sx={{ p: 2.5, textAlign: "center" }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase" }}>
                          Points Per Game (PPG)
                        </Typography>
                        <Typography variant="h3" sx={{ fontWeight: 900, mt: 1, color: "primary.main" }}>
                          {gamesCount > 0 ? (stats.PTS / gamesCount).toFixed(1) : "0.0"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                          Total: {stats.PTS} pts
                        </Typography>
                      </CardContent>
                    </Card>

                    {/* APG */}
                    <Card sx={{ border: "1px solid #E2E8F0", boxShadow: "none", borderRadius: 2 }}>
                      <CardContent sx={{ p: 2.5, textAlign: "center" }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase" }}>
                          Assists Per Game (APG)
                        </Typography>
                        <Typography variant="h3" sx={{ fontWeight: 900, mt: 1, color: "indigo.600" }}>
                          {gamesCount > 0 ? (stats.AST / gamesCount).toFixed(1) : "0.0"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                          Total: {stats.AST} ast
                        </Typography>
                      </CardContent>
                    </Card>

                    {/* RPG */}
                    <Card sx={{ border: "1px solid #E2E8F0", boxShadow: "none", borderRadius: 2 }}>
                      <CardContent sx={{ p: 2.5, textAlign: "center" }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase" }}>
                          Rebounds Per Game (RPG)
                        </Typography>
                        <Typography variant="h3" sx={{ fontWeight: 900, mt: 1, color: "teal.600" }}>
                          {gamesCount > 0 ? ((stats.OREB + stats.DREB) / gamesCount).toFixed(1) : "0.0"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                          Off: {stats.OREB} | Def: {stats.DREB}
                        </Typography>
                      </CardContent>
                    </Card>

                    {/* SPG */}
                    <Card sx={{ border: "1px solid #E2E8F0", boxShadow: "none", borderRadius: 2 }}>
                      <CardContent sx={{ p: 2.5, textAlign: "center" }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase" }}>
                          Steals Per Game (SPG)
                        </Typography>
                        <Typography variant="h3" sx={{ fontWeight: 900, mt: 1, color: "emerald.600" }}>
                          {gamesCount > 0 ? (stats.STL / gamesCount).toFixed(1) : "0.0"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                          Total: {stats.STL} stl
                        </Typography>
                      </CardContent>
                    </Card>

                    {/* BPG */}
                    <Card sx={{ border: "1px solid #E2E8F0", boxShadow: "none", borderRadius: 2 }}>
                      <CardContent sx={{ p: 2.5, textAlign: "center" }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase" }}>
                          Blocks Per Game (BPG)
                        </Typography>
                        <Typography variant="h3" sx={{ fontWeight: 900, mt: 1, color: "orange.600" }}>
                          {gamesCount > 0 ? (stats.BLK / gamesCount).toFixed(1) : "0.0"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                          Total: {stats.BLK} blk
                        </Typography>
                      </CardContent>
                    </Card>

                    {/* Turnover Average */}
                    <Card sx={{ border: "1px solid #E2E8F0", boxShadow: "none", borderRadius: 2 }}>
                      <CardContent sx={{ p: 2.5, textAlign: "center" }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase" }}>
                          Top Turnovers (Avg)
                        </Typography>
                        <Typography variant="h3" sx={{ fontWeight: 900, mt: 1, color: "red.600" }}>
                          {gamesCount > 0 ? (stats.TOV / gamesCount).toFixed(1) : "0.0"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                          Total turnovers: {stats.TOV}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                </Grid>

                {/* Shooting Splits Overview */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card sx={{ border: "1px solid #E2E8F0", boxShadow: "none", height: "100%", borderRadius: 2.5 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: "slate.700" }}>
                        Cumulative Shooting Splits
                      </Typography>
                      <Box className="space-y-4">
                        {/* FG Splits */}
                        <Box>
                          <Box className="flex justify-between text-sm mb-1">
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>Field Goals (FG)</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
                              {stats.FGM}/{stats.FGA} ({stats.FGA > 0 ? ((stats.FGM / stats.FGA) * 100).toFixed(1) : "0.0"}%)
                            </Typography>
                          </Box>
                          <Box className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <Box
                              className="bg-teal-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${stats.FGA > 0 ? (stats.FGM / stats.FGA) * 100 : 0}%` }}
                            />
                          </Box>
                        </Box>

                        {/* 3PT Splits */}
                        <Box>
                          <Box className="flex justify-between text-sm mb-1">
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>3-Point FG (3PT)</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: "indigo.600" }}>
                              {stats["3PM"]}/{stats["3PA"]} ({stats["3PA"] > 0 ? ((stats["3PM"] / stats["3PA"]) * 100).toFixed(1) : "0.0"}%)
                            </Typography>
                          </Box>
                          <Box className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <Box
                              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${stats["3PA"] > 0 ? (stats["3PM"] / stats["3PA"]) * 100 : 0}%` }}
                            />
                          </Box>
                        </Box>

                        {/* FT Splits */}
                        <Box>
                          <Box className="flex justify-between text-sm mb-1">
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>Free Throws (FT)</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: "orange.600" }}>
                              {stats.FTM}/{stats.FTA} ({stats.FTA > 0 ? ((stats.FTM / stats.FTA) * 100).toFixed(1) : "0.0"}%)
                            </Typography>
                          </Box>
                          <Box className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <Box
                              className="bg-orange-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${stats.FTA > 0 ? (stats.FTM / stats.FTA) * 100 : 0}%` }}
                            />
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Box Table */}
                <Grid size={{ xs: 12 }}>
                  <TableContainer component={Paper} sx={{ boxShadow: "none", border: "1px solid #E2E8F0", borderRadius: 2 }}>
                    <Table>
                      <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>MATCH SESSIONS</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>GP</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>PTS</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>FGM-A</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>3PM-A</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>FTM-A</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>REB</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>AST</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>STL</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>BLK</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>TOV</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>PF</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, color: "text.primary" }}>Cumulative Totals</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>{stats.GP}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800, color: "primary.main" }}>{stats.PTS}</TableCell>
                          <TableCell align="center">{stats.FGM}-{stats.FGA}</TableCell>
                          <TableCell align="center">{stats["3PM"]}-{stats["3PA"]}</TableCell>
                          <TableCell align="center">{stats.FTM}-{stats.FTA}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600 }}>{stats.OREB + stats.DREB}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600 }}>{stats.AST}</TableCell>
                          <TableCell align="center">{stats.STL}</TableCell>
                          <TableCell align="center">{stats.BLK}</TableCell>
                          <TableCell align="center" sx={{ color: "error.main" }}>{stats.TOV}</TableCell>
                          <TableCell align="center">{stats.PF}</TableCell>
                        </TableRow>
                        <TableRow sx={{ bgcolor: "#FAF5FF" }}>
                          <TableCell sx={{ fontWeight: 700, color: "indigo.900" }}>Calculated Game Averages</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>-</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800, color: "indigo.700" }}>{gamesCount > 0 ? (stats.PTS / gamesCount).toFixed(1) : "0.0"}</TableCell>
                          <TableCell align="center">{gamesCount > 0 ? (stats.FGM / gamesCount).toFixed(1) : "0.0"}-{gamesCount > 0 ? (stats.FGA / gamesCount).toFixed(1) : "0.0"}</TableCell>
                          <TableCell align="center">{gamesCount > 0 ? (stats["3PM"] / gamesCount).toFixed(1) : "0.0"}-{gamesCount > 0 ? (stats["3PA"] / gamesCount).toFixed(1) : "0.0"}</TableCell>
                          <TableCell align="center">{gamesCount > 0 ? (stats.FTM / gamesCount).toFixed(1) : "0.0"}-{gamesCount > 0 ? (stats.FTA / gamesCount).toFixed(1) : "0.0"}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>{gamesCount > 0 ? ((stats.OREB + stats.DREB) / gamesCount).toFixed(1) : "0.0"}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>{gamesCount > 0 ? (stats.AST / gamesCount).toFixed(1) : "0.0"}</TableCell>
                          <TableCell align="center">{gamesCount > 0 ? (stats.STL / gamesCount).toFixed(1) : "0.0"}</TableCell>
                          <TableCell align="center">{gamesCount > 0 ? (stats.BLK / gamesCount).toFixed(1) : "0.0"}</TableCell>
                          <TableCell align="center" sx={{ color: "red.600" }}>{gamesCount > 0 ? (stats.TOV / gamesCount).toFixed(1) : "0.0"}</TableCell>
                          <TableCell align="center">{gamesCount > 0 ? (stats.PF / gamesCount).toFixed(1) : "0.0"}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            </Grid>
          )}

          {/* TAB 1: ADVANCED ANALYTICS */}
          {activeTab === 1 && (
            <Grid size={{ xs: 12 }}>
              <Grid container spacing={4}>
                {/* Left Side: Percentile Radar Chart */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card sx={{ border: "1px solid #E2E8F0", boxShadow: "none", borderRadius: 3, height: "100%" }}>
                    <CardContent sx={{ p: 3, display: "flex", flexDirection: "column", height: "100%" }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "slate.800", mb: 0.5 }}>
                        League Percentile Rank Analytics
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Visualizing how <strong>{playerFullName}</strong> compares to all other players in the league (0 to 100th percentile) across 5 core categories. Higher values represent better league ranking.
                      </Typography>
                      
                      <Box sx={{ width: "100%", height: 320, display: "flex", justifyContent: "center", alignItems: "center" }}>
                        {percentileData ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={percentileData.metrics}>
                              <PolarGrid stroke="#E2E8F0" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: "#475569", fontSize: 11, fontWeight: 700 }} />
                              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                              <Radar
                                name={playerFullName}
                                dataKey="value"
                                stroke="#6366F1"
                                fill="#6366F1"
                                fillOpacity={0.2}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        ) : (
                          <CircularProgress />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Right Side: Traditional Advanced Metrics */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Grid container spacing={3}>
                    {/* TS% Card */}
                    <Grid size={{ xs: 12 }}>
                      <Card sx={{ border: "1px solid #E2E8F0", boxShadow: "none", borderRadius: 2.5, p: 1 }}>
                        <CardContent sx={{ p: 2, display: "flex", gap: 3, alignItems: "center", width: "100%" }}>
                          <TrendingUpIcon sx={{ fontSize: 36, color: "primary.main" }} />
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              True Shooting Percentage
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 900, color: "primary.main", mt: 0.5 }}>
                              {advancedMetrics.TS_pct.toFixed(1)}%
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 180, textAlign: "right", fontWeight: 500 }}>
                            Measures shooting efficiency taking into account 2s, 3s, and FTs.
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* USG% Card */}
                    <Grid size={{ xs: 12 }}>
                      <Card sx={{ border: "1px solid #E2E8F0", boxShadow: "none", borderRadius: 2.5, p: 1 }}>
                        <CardContent sx={{ p: 2, display: "flex", gap: 3, alignItems: "center", width: "100%" }}>
                          <AnalyticsIcon sx={{ fontSize: 36, color: "indigo.600" }} />
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              Usage Rate % (USG%)
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 900, color: "indigo.600", mt: 0.5 }}>
                              {advancedMetrics.USG_pct.toFixed(1)}%
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 180, textAlign: "right", fontWeight: 500 }}>
                            Estimates the % of team plays ended by this player on court.
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* EFF Card */}
                    <Grid size={{ xs: 12 }}>
                      <Card sx={{ border: "1px solid #E2E8F0", boxShadow: "none", borderRadius: 2.5, p: 1 }}>
                        <CardContent sx={{ p: 2, display: "flex", gap: 3, alignItems: "center", width: "100%" }}>
                          <TrophyIcon sx={{ fontSize: 36, color: "teal.600" }} />
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              Efficiency Rating (EFF)
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 900, color: "teal.600", mt: 0.5 }}>
                              {advancedMetrics.EFF.toFixed(1)}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 180, textAlign: "right", fontWeight: 500 }}>
                            Sum of positive plays minus missed plays, averaged per game.
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          )}

          {/* TAB 2: SHOT CHART */}
          {activeTab === 2 && (
            <Grid size={{ xs: 12 }}>
              <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 7 }}>
                  <Card sx={{ border: "1px solid #E2E8F0", boxShadow: "none", borderRadius: 3, overflow: "hidden" }}>
                    <Box sx={{ borderBottom: "1px solid #F1F5F9", p: 2, bgcolor: "#F8FAFC", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "slate.700" }}>
                        Personalized Match Shot Chart ({shots.length} Shots Logged)
                      </Typography>
                    </Box>
                    <CardContent sx={{ p: 2, display: "flex", justifyContent: "center" }}>
                      <Box sx={{ width: "100%", maxWidth: 450, border: "1px solid #E2E8F0", borderRadius: 2, overflow: "hidden", p: 1 }}>
                        <BasketballCourt
                          readOnly={true}
                          markers={courtMarkers}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 5 }}>
                  <Card sx={{ border: "1px solid #E2E8F0", boxShadow: "none", height: "100%", borderRadius: 3 }}>
                    <CardContent sx={{ p: 3, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: "slate.700" }}>
                          Shot Chart Zone Legend & Summary
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          Each dot represents a shot captured live during standard match quarters. Click on reports map zones to analyze detailed telemetry.
                        </Typography>
                        
                        <Box className="space-y-2.5">
                          <Box className="flex items-center gap-2 text-sm">
                            <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: "#10B981" }} />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>Made Shot (Green Circle)</Typography>
                          </Box>
                          <Box className="flex items-center gap-2 text-sm">
                            <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: "#EF4444" }} />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>Missed Shot (Red Circle)</Typography>
                          </Box>
                        </Box>
                      </Box>

                      <Divider sx={{ my: 3 }} />

                      <Box className="bg-slate-50 p-4 rounded-xl space-y-1">
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "slate.700" }}>
                          Zone Accuracy Metrics
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                          Calculated from all games with live coordinates:
                        </Typography>
                        <Box className="space-y-1.5 text-xs">
                          {["Restricted Area", "Corner 3-Pointer", "Above the Break 3-Pointer", "Mid-range 2-Pointer"].map((z) => {
                            const matchingShots = shots.filter((s) => s.court_zone?.toLowerCase().includes(z.toLowerCase().split(" ")[0]));
                            const madeCount = matchingShots.filter((s) => s.made).length;
                            const attCount = matchingShots.length;
                            const pct = attCount > 0 ? ((madeCount / attCount) * 100).toFixed(0) : "0";
                            return (
                              <Box key={z} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                                <span className="font-medium text-slate-600">{z}</span>
                                <span className="font-bold text-slate-800">
                                  {attCount > 0 ? `${madeCount}/${attCount} (${pct}%)` : "0/0 (--)"}
                                </span>
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>
          )}
        </Grid>
      )}
    </motion.div>
  );
}
