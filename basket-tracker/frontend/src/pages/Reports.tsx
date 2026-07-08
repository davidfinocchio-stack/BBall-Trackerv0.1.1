import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Chip,
  Avatar,
  Divider,
  Tabs,
  Tab,
  Button,
} from "@mui/material";
import {
  Assessment as AssessmentIcon,
  ScatterPlot as ShotIcon,
  EmojiEvents as TrophyIcon,
  CalendarToday as DateIcon,
  Place as CourtIcon,
  BarChart as BarChartIcon,
  SportsBasketball as BasketballIcon,
} from "@mui/icons-material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { Game, GameBoxscore } from "../types";
import { getGames, getGameBoxscore } from "../services/api";
import BasketballCourt, { CourtMarker } from "../components/BasketballCourt";

const fadeInUpVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

export default function Reports() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const gameIdParam = searchParams.get("gameId");

  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [boxscore, setBoxscore] = useState<GameBoxscore | null>(null);
  
  const [loadingGames, setLoadingGames] = useState<boolean>(true);
  const [loadingBoxscore, setLoadingBoxscore] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<number>(0);

  // Helper formatters
  const formatPercentage = (made: number, attempted: number) => {
    if (attempted === 0) return "-";
    return `${((made / attempted) * 100).toFixed(1)}%`;
  };

  const formatAdvancedPercentage = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return "-";
    return `${(val * 100).toFixed(1)}%`;
  };

  const calculatePER = (stats: any) => {
    const pts = stats.PTS || 0;
    const reb = (stats.OREB || 0) + (stats.DREB || 0);
    const ast = stats.AST || 0;
    const stl = stats.STL || 0;
    const blk = stats.BLK || 0;
    const tov = stats.TOV || 0;
    const fga = stats.FGA || 0;
    const fgm = stats.FGM || 0;
    const fta = stats.FTA || 0;
    const ftm = stats.FTM || 0;
    
    return pts + reb + ast + stl + blk - tov - (fga - fgm) - (fta - ftm);
  };

  const getZoneStats = () => {
    if (!boxscore?.shots || boxscore.shots.length === 0) {
      return [];
    }
    
    const zonesMap: Record<string, { name: string; made: number; attempted: number }> = {};
    
    boxscore.shots.forEach((shot) => {
      const zone = shot.court_zone || "Other/General";
      if (!zonesMap[zone]) {
        zonesMap[zone] = { name: zone, made: 0, attempted: 0 };
      }
      zonesMap[zone].attempted += 1;
      if (shot.made) {
        zonesMap[zone].made += 1;
      }
    });
    
    return Object.values(zonesMap).sort((a, b) => b.attempted - a.attempted);
  };

  // Fetch games on mount
  useEffect(() => {
    const fetchGamesList = async () => {
      try {
        const fetched = await getGames();
        setGames(fetched || []);

        // Determine starting game ID
        if (gameIdParam && fetched?.some(g => g.id === gameIdParam)) {
          setSelectedGameId(gameIdParam);
        } else if (fetched && fetched.length > 0) {
          setSelectedGameId(fetched[0].id);
        }
      } catch (err) {
        console.error("Failed to load games list:", err);
        setGames([]);
      } finally {
        setLoadingGames(false);
      }
    };
    fetchGamesList();
  }, [gameIdParam]);

  // Fetch boxscore when selected game changes
  useEffect(() => {
    if (!selectedGameId) return;

    const loadBoxscoreData = async () => {
      setLoadingBoxscore(true);
      try {
        const fetchedBoxscore = await getGameBoxscore(selectedGameId);
        setBoxscore(fetchedBoxscore);
      } catch (err) {
        console.error(`Failed to load boxscore for game ${selectedGameId}:`, err);
        setBoxscore(null);
      } finally {
        setLoadingBoxscore(false);
      }
    };

    loadBoxscoreData();
  }, [selectedGameId]);

  const handleGameChange = (id: string) => {
    setSelectedGameId(id);
    setSearchParams({ gameId: id });
  };

  const selectedGame = games.find((g) => g.id === selectedGameId);

  // Map boxscore shots to BasketballCourt markers
  const courtMarkers: CourtMarker[] = boxscore?.shots?.map((s) => ({
    id: s.id,
    x: s.x,
    y: s.y,
    shotType: s.shot_value === 3 ? "Triple" : s.shot_value === 1 ? "Libre" : "Doble",
    made: s.made,
    playerName: s.player_name,
  })) || [];

  if (!loadingGames && games.length === 0) {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.4 }}
        variants={fadeInUpVariants}
        style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            maxWidth: 500,
            mx: "auto",
            p: 5,
            bgcolor: "background.paper",
            borderRadius: 4,
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05)",
            border: "1px solid",
            borderColor: "divider",
            textAlign: "center"
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              bgcolor: "rgba(99, 102, 241, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 3,
              color: "primary.main"
            }}
          >
            <AssessmentIcon sx={{ fontSize: 45 }} />
          </Box>
          <Typography
            variant="h5"
            component="h1"
            gutterBottom
            sx={{ fontWeight: 800, color: "text.primary", letterSpacing: "-0.02em" }}
          >
            No matches analyzed yet
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4, fontWeight: 500, lineHeight: 1.6 }}
          >
            Record or complete a game first to view advanced team boxscores, spatial shot charts, and visual telemetry dashboards.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<BasketballIcon />}
            onClick={() => navigate("/games")}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 3,
              fontWeight: 700,
              fontSize: "0.95rem",
              textTransform: "none",
              boxShadow: "0 4px 14px 0 rgba(99, 102, 241, 0.4)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 6px 20px 0 rgba(99, 102, 241, 0.4)",
              },
              "&:active": {
                transform: "translateY(0)",
              }
            }}
          >
            Go to Games
          </Button>
        </Box>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.4 }}
      variants={fadeInUpVariants}
    >
      {/* Header and Controls */}
      <Box sx={{ mb: 4 }} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            Dynamic Match Analytics
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Aggregate sequential play streams, analyze offensive efficiency, and review spatial shot maps.
          </Typography>
        </Box>

        {/* Game Select Dropdown */}
        {!loadingGames && games.length > 0 && (
          <FormControl sx={{ minWidth: 260 }} size="small">
            <InputLabel id="game-select-label">Select Match Fixture</InputLabel>
            <Select
              labelId="game-select-label"
              id="game-select"
              value={selectedGameId}
              label="Select Match Fixture"
              onChange={(e) => handleGameChange(e.target.value)}
              sx={{ bgcolor: "background.paper", borderRadius: 2 }}
            >
              {games.map((game) => (
                <MenuItem key={game.id} value={game.id}>
                  {game.homeTeamName} vs {game.awayTeamName} ({game.date})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {loadingBoxscore || !boxscore ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 2 }}>
          <CircularProgress color="primary" />
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Running sequential event aggregations...
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={4}>
          {/* Match Scoreboard Summary Header */}
          <Grid size={{ xs: 12 }}>
            <Card sx={{ bgcolor: "secondary.main", color: "secondary.contrastText", border: "none" }}>
              <CardContent sx={{ p: 4 }}>
                <Grid container spacing={4} sx={{ alignItems: "center", justifyContent: "center" }}>
                  {/* Home Team */}
                  <Grid size={{ xs: 12, sm: 4 }} className="text-center sm:text-right">
                    <Typography variant="h5" sx={{ fontWeight: 800, tracking: "tight" }}>
                      {boxscore.home_team.team_name}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7, textTransform: "uppercase", letterSpacing: 1.5 }}>
                      Home • {boxscore.home_team.team_abbreviation}
                    </Typography>
                  </Grid>

                  {/* Score */}
                  <Grid size={{ xs: 12, sm: 4 }} className="text-center flex flex-col items-center justify-center">
                    <Box className="flex items-center gap-4 justify-center">
                      <Typography variant="h3" sx={{ fontWeight: 900, fontFamily: "var(--font-mono)" }}>
                        {boxscore.home_team.totals.PTS}
                      </Typography>
                      <Typography variant="h5" sx={{ opacity: 0.5, fontWeight: 700 }}>
                        :
                      </Typography>
                      <Typography variant="h3" sx={{ fontWeight: 900, fontFamily: "var(--font-mono)" }}>
                        {boxscore.away_team.totals.PTS}
                      </Typography>
                    </Box>
                    <Box className="flex items-center gap-1.5 mt-2 bg-slate-800/60 px-3 py-1 rounded-full border border-slate-700/50">
                      <TrophyIcon sx={{ fontSize: 16, color: "#F59E0B" }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: "#F59E0B" }}>
                        {boxscore.home_team.totals.PTS > boxscore.away_team.totals.PTS
                          ? `${boxscore.home_team.team_name} Projected Winner`
                          : boxscore.away_team.totals.PTS > boxscore.home_team.totals.PTS
                          ? `${boxscore.away_team.team_name} Projected Winner`
                          : "Tie Game"}
                      </Typography>
                    </Box>
                  </Grid>

                  {/* Away Team */}
                  <Grid size={{ xs: 12, sm: 4 }} className="text-center sm:text-left">
                    <Typography variant="h5" sx={{ fontWeight: 800, tracking: "tight" }}>
                      {boxscore.away_team.team_name}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7, textTransform: "uppercase", letterSpacing: 1.5 }}>
                      Away • {boxscore.away_team.team_abbreviation}
                    </Typography>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,0.1)" }} />

                {/* Match Metadata Info */}
                <Box className="flex flex-wrap items-center justify-center gap-6 text-slate-300">
                  <Box className="flex items-center gap-1.5">
                    <DateIcon sx={{ fontSize: 16, opacity: 0.8 }} />
                    <Typography variant="body2" sx={{ fontSize: "0.85rem", fontWeight: 500 }}>
                      {selectedGame?.date || "July 1, 2026"}
                    </Typography>
                  </Box>
                  <Box className="flex items-center gap-1.5">
                    <CourtIcon sx={{ fontSize: 16, opacity: 0.8 }} />
                    <Typography variant="body2" sx={{ fontSize: "0.85rem", fontWeight: 500 }}>
                      {selectedGame?.venue || "TD Garden"}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Tab Selector */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs
                value={activeTab}
                onChange={(_, val) => setActiveTab(val)}
                aria-label="Analytics Tabs"
                textColor="primary"
                indicatorColor="primary"
              >
                <Tab label="Traditional & Advanced Boxscore" icon={<AssessmentIcon />} iconPosition="start" sx={{ fontWeight: 700 }} />
                <Tab label="Shot Chart Spatial Analytics" icon={<ShotIcon />} iconPosition="start" sx={{ fontWeight: 700 }} />
                <Tab label="Advanced Charts & Performance" icon={<BarChartIcon />} iconPosition="start" sx={{ fontWeight: 700 }} />
              </Tabs>
            </Box>
          </Grid>

          {/* TAB 0: BOXSCORE */}
          {activeTab === 0 && (
            <>
              {/* Home Team Boxscore */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="h6" gutterBottom className="flex items-center gap-2" sx={{ fontWeight: 800, color: "secondary.main", mb: 2 }}>
                  <Avatar sx={{ bgcolor: "primary.main", width: 28, height: 28, fontSize: "0.85rem", fontWeight: 700 }}>H</Avatar>
                  {boxscore.home_team.team_name} (Home) Boxscore
                </Typography>
                <TableContainer component={Paper} className="border border-slate-200 shadow-none">
                  <Table size="small" sx={{ minWidth: 1000 }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: "slate.50" }}>
                        <TableCell sx={{ fontWeight: 800, position: "sticky", left: 0, bgcolor: "background.paper", zIndex: 10 }}>PLAYER</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>POS</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: "primary.main" }}>PTS</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>FGM-A</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>FG%</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>3PM-A</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>3P%</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>FTM-A</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>FT%</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>OREB</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>DREB</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>REB</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>AST</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>STL</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>BLK</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>TOV</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>PF</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, bgcolor: "rgba(99, 102, 241, 0.05)", color: "primary.dark" }}>eFG%</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, bgcolor: "rgba(99, 102, 241, 0.05)", color: "primary.dark" }}>TS%</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {boxscore.home_team.players.map((p) => {
                        const totalRebounds = p.stats.OREB + p.stats.DREB;
                        return (
                          <TableRow key={p.player_id} hover>
                            <TableCell sx={{ fontWeight: 700, position: "sticky", left: 0, bgcolor: "background.paper", zIndex: 10 }}>
                              <Box className="flex items-center gap-2">
                                <span className="text-slate-400 font-mono">#{p.jersey_number ?? "?"}</span>
                                <span>{p.name}</span>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={p.position || "G"} size="small" sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700 }} />
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, fontSize: "1rem", color: "primary.main" }}>{p.stats.PTS}</TableCell>
                            <TableCell align="center" sx={{ fontFamily: "monospace" }}>{p.stats.FGM}-{p.stats.FGA}</TableCell>
                            <TableCell align="center" sx={{ fontFamily: "monospace" }}>{formatPercentage(p.stats.FGM, p.stats.FGA)}</TableCell>
                            <TableCell align="center" sx={{ fontFamily: "monospace" }}>{p.stats["3PM"]}-{p.stats["3PA"]}</TableCell>
                            <TableCell align="center" sx={{ fontFamily: "monospace" }}>{formatPercentage(p.stats["3PM"], p.stats["3PA"])}</TableCell>
                            <TableCell align="center" sx={{ fontFamily: "monospace" }}>{p.stats.FTM}-{p.stats.FTA}</TableCell>
                            <TableCell align="center" sx={{ fontFamily: "monospace" }}>{formatPercentage(p.stats.FTM, p.stats.FTA)}</TableCell>
                            <TableCell align="center" sx={{ fontFamily: "monospace" }}>{p.stats.OREB}</TableCell>
                            <TableCell align="center" sx={{ fontFamily: "monospace" }}>{p.stats.DREB}</TableCell>
                            <TableCell align="center" sx={{ fontFamily: "monospace", fontWeight: 600 }}>{totalRebounds}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>{p.stats.AST}</TableCell>
                            <TableCell align="center">{p.stats.STL}</TableCell>
                            <TableCell align="center">{p.stats.BLK}</TableCell>
                            <TableCell align="center" sx={{ color: "error.main" }}>{p.stats.TOV}</TableCell>
                            <TableCell align="center">{p.stats.PF}</TableCell>
                            <TableCell align="center" sx={{ bgcolor: "rgba(99, 102, 241, 0.02)", fontWeight: 700, color: "primary.dark" }}>
                              {formatAdvancedPercentage(p.stats.eFG_pct)}
                            </TableCell>
                            <TableCell align="center" sx={{ bgcolor: "rgba(99, 102, 241, 0.02)", fontWeight: 700, color: "primary.dark" }}>
                              {formatAdvancedPercentage(p.stats.TS_pct)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      
                      {/* Home Totals Row */}
                      <TableRow sx={{ bgcolor: "slate.50", borderTop: "2px solid #E2E8F0" }}>
                        <TableCell sx={{ fontWeight: 900, position: "sticky", left: 0, bgcolor: "#F8FAFC", zIndex: 10 }}>TEAM TOTALS</TableCell>
                        <TableCell align="center">-</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900, fontSize: "1.1rem", color: "primary.main" }}>{boxscore.home_team.totals.PTS}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900, fontFamily: "monospace" }}>{boxscore.home_team.totals.FGM}-{boxscore.home_team.totals.FGA}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900, fontFamily: "monospace" }}>{formatPercentage(boxscore.home_team.totals.FGM, boxscore.home_team.totals.FGA)}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900, fontFamily: "monospace" }}>{boxscore.home_team.totals["3PM"]}-{boxscore.home_team.totals["3PA"]}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900, fontFamily: "monospace" }}>{formatPercentage(boxscore.home_team.totals["3PM"], boxscore.home_team.totals["3PA"])}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900, fontFamily: "monospace" }}>{boxscore.home_team.totals.FTM}-{boxscore.home_team.totals.FTA}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900, fontFamily: "monospace" }}>{formatPercentage(boxscore.home_team.totals.FTM, boxscore.home_team.totals.FTA)}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900 }}>{boxscore.home_team.totals.OREB}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900 }}>{boxscore.home_team.totals.DREB}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900 }}>{boxscore.home_team.totals.OREB + boxscore.home_team.totals.DREB}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900 }}>{boxscore.home_team.totals.AST}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900 }}>{boxscore.home_team.totals.STL}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900 }}>{boxscore.home_team.totals.BLK}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900, color: "error.main" }}>{boxscore.home_team.totals.TOV}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900 }}>{boxscore.home_team.totals.PF}</TableCell>
                        <TableCell align="center" sx={{ bgcolor: "rgba(99, 102, 241, 0.05)", fontWeight: 900, color: "primary.dark" }}>
                          {formatAdvancedPercentage(boxscore.home_team.totals.eFG_pct)}
                        </TableCell>
                        <TableCell align="center" sx={{ bgcolor: "rgba(99, 102, 241, 0.05)", fontWeight: 900, color: "primary.dark" }}>
                          {formatAdvancedPercentage(boxscore.home_team.totals.TS_pct)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              {/* Away Team Boxscore */}
              <Grid size={{ xs: 12 }} sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom className="flex items-center gap-2" sx={{ fontWeight: 800, color: "secondary.main", mb: 2 }}>
                  <Avatar sx={{ bgcolor: "primary.light", width: 28, height: 28, fontSize: "0.85rem", fontWeight: 700 }}>A</Avatar>
                  {boxscore.away_team.team_name} (Away) Boxscore
                </Typography>
                <TableContainer component={Paper} className="border border-slate-200 shadow-none">
                  <Table size="small" sx={{ minWidth: 1000 }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: "slate.50" }}>
                        <TableCell sx={{ fontWeight: 800, position: "sticky", left: 0, bgcolor: "background.paper", zIndex: 10 }}>PLAYER</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>POS</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: "primary.main" }}>PTS</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>FGM-A</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>FG%</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>3PM-A</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>3P%</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>FTM-A</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>FT%</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>OREB</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>DREB</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>REB</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>AST</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>STL</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>BLK</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>TOV</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>PF</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, bgcolor: "rgba(99, 102, 241, 0.05)", color: "primary.dark" }}>eFG%</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, bgcolor: "rgba(99, 102, 241, 0.05)", color: "primary.dark" }}>TS%</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {boxscore.away_team.players.map((p) => {
                        const totalRebounds = p.stats.OREB + p.stats.DREB;
                        return (
                          <TableRow key={p.player_id} hover>
                            <TableCell sx={{ fontWeight: 700, position: "sticky", left: 0, bgcolor: "background.paper", zIndex: 10 }}>
                              <Box className="flex items-center gap-2">
                                <span className="text-slate-400 font-mono">#{p.jersey_number ?? "?"}</span>
                                <span>{p.name}</span>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={p.position || "G"} size="small" sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700 }} />
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, fontSize: "1rem", color: "primary.main" }}>{p.stats.PTS}</TableCell>
                            <TableCell align="center" sx={{ fontFamily: "monospace" }}>{p.stats.FGM}-{p.stats.FGA}</TableCell>
                            <TableCell align="center" sx={{ fontFamily: "monospace" }}>{formatPercentage(p.stats.FGM, p.stats.FGA)}</TableCell>
                            <TableCell align="center" sx={{ fontFamily: "monospace" }}>{p.stats["3PM"]}-{p.stats["3PA"]}</TableCell>
                            <TableCell align="center" sx={{ fontFamily: "monospace" }}>{formatPercentage(p.stats["3PM"], p.stats["3PA"])}</TableCell>
                            <TableCell align="center" sx={{ fontFamily: "monospace" }}>{p.stats.FTM}-{p.stats.FTA}</TableCell>
                            <TableCell align="center" sx={{ fontFamily: "monospace" }}>{formatPercentage(p.stats.FTM, p.stats.FTA)}</TableCell>
                            <TableCell align="center" sx={{ fontFamily: "monospace" }}>{p.stats.OREB}</TableCell>
                            <TableCell align="center" sx={{ fontFamily: "monospace" }}>{p.stats.DREB}</TableCell>
                            <TableCell align="center" sx={{ fontFamily: "monospace", fontWeight: 600 }}>{totalRebounds}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>{p.stats.AST}</TableCell>
                            <TableCell align="center">{p.stats.STL}</TableCell>
                            <TableCell align="center">{p.stats.BLK}</TableCell>
                            <TableCell align="center" sx={{ color: "error.main" }}>{p.stats.TOV}</TableCell>
                            <TableCell align="center">{p.stats.PF}</TableCell>
                            <TableCell align="center" sx={{ bgcolor: "rgba(99, 102, 241, 0.02)", fontWeight: 700, color: "primary.dark" }}>
                              {formatAdvancedPercentage(p.stats.eFG_pct)}
                            </TableCell>
                            <TableCell align="center" sx={{ bgcolor: "rgba(99, 102, 241, 0.02)", fontWeight: 700, color: "primary.dark" }}>
                              {formatAdvancedPercentage(p.stats.TS_pct)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      
                      {/* Away Totals Row */}
                      <TableRow sx={{ bgcolor: "slate.50", borderTop: "2px solid #E2E8F0" }}>
                        <TableCell sx={{ fontWeight: 900, position: "sticky", left: 0, bgcolor: "#F8FAFC", zIndex: 10 }}>TEAM TOTALS</TableCell>
                        <TableCell align="center">-</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900, fontSize: "1.1rem", color: "primary.main" }}>{boxscore.away_team.totals.PTS}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900, fontFamily: "monospace" }}>{boxscore.away_team.totals.FGM}-{boxscore.away_team.totals.FGA}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900, fontFamily: "monospace" }}>{formatPercentage(boxscore.away_team.totals.FGM, boxscore.away_team.totals.FGA)}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900, fontFamily: "monospace" }}>{boxscore.away_team.totals["3PM"]}-{boxscore.away_team.totals["3PA"]}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900, fontFamily: "monospace" }}>{formatPercentage(boxscore.away_team.totals["3PM"], boxscore.away_team.totals["3PA"])}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900, fontFamily: "monospace" }}>{boxscore.away_team.totals.FTM}-{boxscore.away_team.totals.FTA}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900, fontFamily: "monospace" }}>{formatPercentage(boxscore.away_team.totals.FTM, boxscore.away_team.totals.FTA)}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900 }}>{boxscore.away_team.totals.OREB}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900 }}>{boxscore.away_team.totals.DREB}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900 }}>{boxscore.away_team.totals.OREB + boxscore.away_team.totals.DREB}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900 }}>{boxscore.away_team.totals.AST}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900 }}>{boxscore.away_team.totals.STL}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900 }}>{boxscore.away_team.totals.BLK}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900, color: "error.main" }}>{boxscore.away_team.totals.TOV}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900 }}>{boxscore.away_team.totals.PF}</TableCell>
                        <TableCell align="center" sx={{ bgcolor: "rgba(99, 102, 241, 0.05)", fontWeight: 900, color: "primary.dark" }}>
                          {formatAdvancedPercentage(boxscore.away_team.totals.eFG_pct)}
                        </TableCell>
                        <TableCell align="center" sx={{ bgcolor: "rgba(99, 102, 241, 0.05)", fontWeight: 900, color: "primary.dark" }}>
                          {formatAdvancedPercentage(boxscore.away_team.totals.TS_pct)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </>
          )}

          {/* TAB 1: SHOT CHART */}
          {activeTab === 1 && (
            <Grid size={{ xs: 12 }}>
              <Grid container spacing={4}>
                {/* Left Column: Basketball Court SVG */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box className="flex flex-col items-center gap-4">
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, alignSelf: "start", color: "secondary.main" }}>
                      Spatial Shot Map Visualization
                    </Typography>
                    
                    <BasketballCourt
                      markers={courtMarkers}
                      readOnly={true}
                    />

                    <Box sx={{ width: "100%", p: 2, bgcolor: "#F8FAFC", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
                      <Typography variant="caption" color="text.secondary" className="flex items-center gap-1">
                        💡 <strong>Interpretation Heuristics:</strong> Made shots are plotted as green pulses; missed attempts as red circles. All zones are evaluated in 100x100 relative scales.
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Right Column: Detailed Shot Registry */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box className="flex flex-col h-full">
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, color: "secondary.main" }}>
                      Shot Registry & Zone Distribution Log ({courtMarkers.length} Recorded Attempts)
                    </Typography>

                    {courtMarkers.length === 0 ? (
                      <Paper sx={{ p: 6, textAlign: "center", border: "1px dashed #CBD5E1", bgcolor: "transparent", flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Typography variant="body2" color="text.secondary">
                          No shot events recorded for this game yet.
                        </Typography>
                      </Paper>
                    ) : (
                      <TableContainer component={Paper} className="border border-slate-200 shadow-none" sx={{ maxHeight: 500 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 800, bgcolor: "#F8FAFC" }}>Player</TableCell>
                              <TableCell sx={{ fontWeight: 800, bgcolor: "#F8FAFC" }}>Zone Area</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 800, bgcolor: "#F8FAFC" }}>Type</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 800, bgcolor: "#F8FAFC" }}>Result</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {boxscore.shots.map((shot, idx) => (
                              <TableRow key={shot.id || idx} hover>
                                <TableCell sx={{ fontWeight: 700 }}>{shot.player_name}</TableCell>
                                <TableCell>
                                  <Chip
                                    label={shot.court_zone}
                                    size="small"
                                    sx={{
                                      fontSize: "0.7rem",
                                      fontWeight: 600,
                                      bgcolor: shot.made ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
                                      color: shot.made ? "success.dark" : "error.dark",
                                    }}
                                  />
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600 }}>
                                  {shot.shot_value}PT
                                </TableCell>
                                <TableCell align="center">
                                  <Chip
                                    label={shot.made ? "MADE" : "MISS"}
                                    color={shot.made ? "success" : "error"}
                                    size="small"
                                    sx={{ fontWeight: 800, fontSize: "0.65rem", height: 20 }}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          )}

          {/* TAB 2: ADVANCED CHARTS & PERFORMANCE */}
          {activeTab === 2 && (
            <Grid size={{ xs: 12 }}>
              <Grid container spacing={4}>
                {/* Advanced Team Metric Comparison Cards */}
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, color: "secondary.main" }}>
                    Advanced Team Efficiency Comparison
                  </Typography>
                  <Grid container spacing={3}>
                    {/* eFG% */}
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Card sx={{ border: "1px solid #E2E8F0", shadow: "none" }}>
                        <CardContent sx={{ p: 3 }}>
                          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                            Effective Field Goal % (eFG%)
                          </Typography>
                          <Box className="flex justify-between items-end mt-2">
                            <Box className="text-center w-1/2 border-r border-slate-100">
                              <Typography variant="h4" sx={{ fontWeight: 900, color: "primary.main" }}>
                                {formatAdvancedPercentage(boxscore.home_team.totals.eFG_pct)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">{boxscore.home_team.team_name}</Typography>
                            </Box>
                            <Box className="text-center w-1/2">
                              <Typography variant="h4" sx={{ fontWeight: 900, color: "indigo.600" }}>
                                {formatAdvancedPercentage(boxscore.away_team.totals.eFG_pct)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">{boxscore.away_team.team_name}</Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* TS% */}
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Card sx={{ border: "1px solid #E2E8F0", shadow: "none" }}>
                        <CardContent sx={{ p: 3 }}>
                          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                            True Shooting % (TS%)
                          </Typography>
                          <Box className="flex justify-between items-end mt-2">
                            <Box className="text-center w-1/2 border-r border-slate-100">
                              <Typography variant="h4" sx={{ fontWeight: 900, color: "primary.main" }}>
                                {formatAdvancedPercentage(boxscore.home_team.totals.TS_pct)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">{boxscore.home_team.team_name}</Typography>
                            </Box>
                            <Box className="text-center w-1/2">
                              <Typography variant="h4" sx={{ fontWeight: 900, color: "indigo.600" }}>
                                {formatAdvancedPercentage(boxscore.away_team.totals.TS_pct)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">{boxscore.away_team.team_name}</Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* AST/TO Ratio */}
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Card sx={{ border: "1px solid #E2E8F0", shadow: "none" }}>
                        <CardContent sx={{ p: 3 }}>
                          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                            Assist-to-Turnover Ratio
                          </Typography>
                          <Box className="flex justify-between items-end mt-2">
                            <Box className="text-center w-1/2 border-r border-slate-100">
                              <Typography variant="h4" sx={{ fontWeight: 900, color: "primary.main" }}>
                                {(boxscore.home_team.totals.AST / (boxscore.home_team.totals.TOV || 1)).toFixed(2)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">{boxscore.home_team.team_name}</Typography>
                            </Box>
                            <Box className="text-center w-1/2">
                              <Typography variant="h4" sx={{ fontWeight: 900, color: "indigo.600" }}>
                                {(boxscore.away_team.totals.AST / (boxscore.away_team.totals.TOV || 1)).toFixed(2)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">{boxscore.away_team.team_name}</Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Player Game Score (PER) Bar Charts */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card sx={{ border: "1px solid #E2E8F0", shadow: "none" }}>
                    <CardContent sx={{ p: 3, display: "flex", flexDirection: "column" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: "primary.main" }}>
                        {boxscore.home_team.team_name} Player Game Scores (Efficiency)
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                        Linear weights: PTS + REB + AST + STL + BLK - TOV - (FGA-FGM) - (FTA-FTM)
                      </Typography>
                      <Box sx={{ width: "100%", height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={boxscore.home_team.players.map(p => ({
                              name: p.name.split(" ").slice(-1)[0],
                              "Game Score": calculatePER(p.stats),
                              "PTS": p.stats.PTS
                            })).sort((a, b) => b["Game Score"] - a["Game Score"])}
                            margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                            <Bar dataKey="Game Score" fill="#14B8A6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="PTS" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Card sx={{ border: "1px solid #E2E8F0", shadow: "none" }}>
                    <CardContent sx={{ p: 3, display: "flex", flexDirection: "column" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: "indigo.600" }}>
                        {boxscore.away_team.team_name} Player Game Scores (Efficiency)
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                        Linear weights: PTS + REB + AST + STL + BLK - TOV - (FGA-FGM) - (FTA-FTM)
                      </Typography>
                      <Box sx={{ width: "100%", height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={boxscore.away_team.players.map(p => ({
                              name: p.name.split(" ").slice(-1)[0],
                              "Game Score": calculatePER(p.stats),
                              "PTS": p.stats.PTS
                            })).sort((a, b) => b["Game Score"] - a["Game Score"])}
                            margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                            <Bar dataKey="Game Score" fill="#6366F1" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="PTS" fill="#EC4899" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Spatial Zone Shooting Accuracy Bar Chart */}
                <Grid size={{ xs: 12 }}>
                  <Card sx={{ border: "1px solid #E2E8F0", shadow: "none" }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, color: "secondary.main" }}>
                        Spatial Zone Shooting Performance
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 3 }}>
                        Shot distribution and conversion rates by regional zones across the half-court
                      </Typography>
                      <Box sx={{ width: "100%", height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={getZoneStats().map(z => ({
                              name: z.name,
                              "Made Attempts": z.made,
                              "Missed Attempts": z.attempted - z.made,
                              "Accuracy %": z.attempted > 0 ? Math.round((z.made / z.attempted) * 100) : 0
                            }))}
                            margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                            <Bar dataKey="Made Attempts" name="Made Shots" fill="#10B981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Missed Attempts" name="Missed Shots" fill="#EF4444" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
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
