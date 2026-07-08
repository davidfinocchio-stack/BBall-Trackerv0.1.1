import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from "@mui/material";
import {
  PlayArrow as LiveIcon,
  Add as AddIcon,
  SportsBasketball as BallIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { Game, Player, Team } from "../types";
import { getTeamRoster, getGames, getTeams, initializeGame, updateGameStatus, deleteGame } from "../services/api";
import LiveGameController from "../components/LiveGameController";

const fadeInUpVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

export default function Games() {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState<boolean>(true);
  const [trackingGame, setTrackingGame] = useState<Game | null>(null);
  const [homeRoster, setHomeRoster] = useState<Player[]>([]);
  const [awayRoster, setAwayRoster] = useState<Player[]>([]);
  const [loadingRoster, setLoadingRoster] = useState<boolean>(false);

  // New game dialog states
  const [newGameOpen, setNewGameOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [fetchingTeams, setFetchingTeams] = useState(false);
  const [newGameForm, setNewGameForm] = useState({
    homeTeamId: "",
    awayTeamId: "",
    courtName: "Main Arena",
    referees: "Official Referees",
    tournamentName: "Regular Season",
    date: new Date().toISOString().split("T")[0],
  });
  const [submittingGame, setSubmittingGame] = useState(false);
  const [gameError, setGameError] = useState<string | null>(null);

  // Delete game states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
  const [deletingGame, setDeletingGame] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const handleDeleteGame = async () => {
    if (!gameToDelete) return;
    setDeletingGame(true);
    setPageError(null);
    try {
      await deleteGame(gameToDelete.id);
      setGames(prev => prev.filter(g => g.id !== gameToDelete.id));
      setDeleteConfirmOpen(false);
      setGameToDelete(null);
    } catch (err: any) {
      console.error("Failed to delete game:", err);
      setPageError(err.message || "Failed to delete game.");
    } finally {
      setDeletingGame(false);
    }
  };

  const loadTeams = async () => {
    setFetchingTeams(true);
    try {
      const fetchedTeams = await getTeams();
      setTeams(fetchedTeams);
      if (fetchedTeams.length >= 2) {
        setNewGameForm(prev => ({
          ...prev,
          homeTeamId: fetchedTeams[0].id,
          awayTeamId: fetchedTeams[1].id,
        }));
      } else if (fetchedTeams.length === 1) {
        setNewGameForm(prev => ({
          ...prev,
          homeTeamId: fetchedTeams[0].id,
        }));
      }
    } catch (err) {
      console.error("Failed to load teams:", err);
    } finally {
      setFetchingTeams(false);
    }
  };

  const loadGamesList = async () => {
    setLoadingGames(true);
    try {
      const fetched = await getGames();
      setGames(fetched || []);
    } catch (err) {
      console.error("Failed to load games from database:", err);
      setGames([]);
    } finally {
      setLoadingGames(false);
    }
  };

  useEffect(() => {
    loadGamesList();
    loadTeams();
  }, []);

  useEffect(() => {
    if (trackingGame) {
      const loadRosters = async () => {
        setLoadingRoster(true);
        try {
          const [home, away] = await Promise.all([
            getTeamRoster(trackingGame.homeTeamId).catch(() => []),
            getTeamRoster(trackingGame.awayTeamId).catch(() => []),
          ]);
          setHomeRoster(home);
          setAwayRoster(away);
        } catch (err) {
          console.error("Failed to load rosters dynamically:", err);
        } finally {
          setLoadingRoster(false);
        }
      };
      loadRosters();
    }
  }, [trackingGame]);

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGameForm.homeTeamId || !newGameForm.awayTeamId) {
      setGameError("Please select both a Home Team and an Away Team.");
      return;
    }
    if (newGameForm.homeTeamId === newGameForm.awayTeamId) {
      setGameError("Home team and Away team must be different.");
      return;
    }

    setSubmittingGame(true);
    setGameError(null);
    try {
      const formattedDate = newGameForm.date ? `${newGameForm.date}T12:00:00` : undefined;
      const response = await initializeGame({
        home_team_id: newGameForm.homeTeamId,
        away_team_id: newGameForm.awayTeamId,
        court_name: newGameForm.courtName,
        referees: newGameForm.referees,
        tournament_name: newGameForm.tournamentName,
        date: formattedDate,
      });

      // Find team names for the newly created game item
      const homeTeam = teams.find(t => t.id === newGameForm.homeTeamId);
      const awayTeam = teams.find(t => t.id === newGameForm.awayTeamId);

      const newGameItem: Game = {
        ...response,
        homeTeamName: homeTeam?.name || "Home Team",
        awayTeamName: awayTeam?.name || "Away Team",
        status: "LIVE",
      };

      // Transition status to LIVE in backend
      await updateGameStatus(response.id, "LIVE").catch((err) => {
        console.error("Failed to activate game status on backend:", err);
      });

      setGames(prev => [newGameItem, ...prev]);
      setNewGameOpen(false);
      setTrackingGame(newGameItem);
    } catch (err: any) {
      console.error("Error creating new match:", err);
      setGameError(err.message || "Failed to initialize game. Please try again.");
    } finally {
      setSubmittingGame(false);
    }
  };

  if (trackingGame) {
    if (loadingRoster) {
      return (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 2 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Synchronizing live rosters and clock engine...
          </Typography>
        </Box>
      );
    }

    return (
      <LiveGameController
        gameId={trackingGame.id}
        homeTeam={{
          id: trackingGame.homeTeamId,
          name: trackingGame.homeTeamName,
          city: "",
          abbreviation: trackingGame.homeTeamName.slice(0, 3).toUpperCase(),
        }}
        awayTeam={{
          id: trackingGame.awayTeamId,
          name: trackingGame.awayTeamName,
          city: "",
          abbreviation: trackingGame.awayTeamName.slice(0, 3).toUpperCase(),
        }}
        homeRoster={homeRoster}
        awayRoster={awayRoster}
        onExit={() => setTrackingGame(null)}
      />
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.4 }}
      variants={fadeInUpVariants}
    >
      <Box sx={{ mb: 4 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            Match Fixtures
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Launch live tracking logs, create matches, and analyze historical play-by-play timelines.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          sx={{ fontWeight: 600 }}
          onClick={() => {
            setGameError(null);
            setNewGameOpen(true);
            loadTeams();
          }}
        >
          New Match
        </Button>
      </Box>

      {pageError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setPageError(null)}>
          {pageError}
        </Alert>
      )}

      {/* List of Games */}
      {loadingGames ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : (
        <Box className="flex flex-col gap-6">
          {games.map((game) => (
            <Card key={game.id} sx={{ borderLeft: game.status === "LIVE" ? "4px solid #6366F1" : "1px solid #E2E8F0" }}>
              <CardContent sx={{ p: 3 }}>
                <Box className="grid grid-cols-1 md:grid-cols-12 items-center gap-6">
                  {/* Status & Time */}
                  <Box className="md:col-span-3 lg:col-span-2 flex flex-col gap-1.5">
                    {game.status === "LIVE" ? (
                      <Chip
                        icon={<LiveIcon sx={{ fontSize: "1rem !important" }} />}
                        label="LIVE Q4"
                        color="primary"
                        sx={{ fontWeight: 700, width: "fit-content" }}
                      />
                    ) : game.status === "COMPLETED" ? (
                      <Chip
                        label="COMPLETED"
                        color="secondary"
                        variant="outlined"
                        sx={{ fontWeight: 700, width: "fit-content" }}
                      />
                    ) : (
                      <Chip
                        label="SCHEDULED"
                        variant="outlined"
                        sx={{ fontWeight: 700, width: "fit-content" }}
                      />
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                      {game.date} • {game.venue}
                    </Typography>
                  </Box>

                  {/* Match Matchup */}
                  <Box className="md:col-span-6 lg:col-span-7 flex items-center justify-center gap-6">
                    <Box className="text-right min-w-[120px]">
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{game.homeTeamName}</Typography>
                      <Typography variant="caption" color="text.secondary">Home</Typography>
                    </Box>

                    {/* Scores or VS */}
                    <Box className="flex items-center gap-2">
                      {game.status !== "SCHEDULED" ? (
                        <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: "var(--font-display)" }}>
                          {game.homeScore}
                        </Typography>
                      ) : null}

                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                        {game.status !== "SCHEDULED" ? ":" : "vs"}
                      </Typography>

                      {game.status !== "SCHEDULED" ? (
                        <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: "var(--font-display)" }}>
                          {game.awayScore}
                        </Typography>
                      ) : null}
                    </Box>

                    <Box className="text-left min-w-[120px]">
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{game.awayTeamName}</Typography>
                      <Typography variant="caption" color="text.secondary">Away</Typography>
                    </Box>
                  </Box>

                  {/* Actions */}
                  <Box className="md:col-span-3 lg:col-span-3 flex flex-col sm:flex-row items-center justify-end gap-2">
                    {game.status === "LIVE" ? (
                      <>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          startIcon={<BallIcon />}
                          onClick={() => setTrackingGame(game)}
                          sx={{ fontWeight: 600 }}
                        >
                          Track
                        </Button>
                        <Button
                          variant="outlined"
                          color="secondary"
                          size="small"
                          onClick={() => navigate(`/reports?gameId=${game.id}`)}
                          sx={{ fontWeight: 600 }}
                        >
                          Book
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outlined"
                        color="secondary"
                        size="small"
                        onClick={() => navigate(`/reports?gameId=${game.id}`)}
                        sx={{ fontWeight: 600 }}
                      >
                        View Book
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<DeleteIcon />}
                      onClick={() => {
                        setGameToDelete(game);
                        setDeleteConfirmOpen(true);
                      }}
                      sx={{ fontWeight: 600 }}
                    >
                      Delete
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Setup New Game Dialog */}
      <Dialog open={newGameOpen} onClose={() => setNewGameOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreateGame}>
          <DialogTitle sx={{ fontWeight: 700 }}>Initialize Game Match</DialogTitle>
          <DialogContent dividers>
            {gameError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {gameError}
              </Alert>
            )}

            {fetchingTeams ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={24} />
                <Typography sx={{ ml: 2, fontWeight: 500 }} variant="body2" color="text.secondary">
                  Loading league teams list...
                </Typography>
              </Box>
            ) : teams.length < 2 ? (
              <Box sx={{ py: 2, textAlign: "center" }}>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                  Roster Pre-requisite Missing
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  You need to have at least two registered teams to schedule and track a matchup fixture. Currently you have {teams.length} team(s).
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => {
                    setNewGameOpen(false);
                    navigate("/teams");
                  }}
                >
                  Create Teams Now
                </Button>
              </Box>
            ) : (
              <Box className="flex flex-col gap-4 pt-2">
                <Box className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormControl size="small" fullWidth required>
                    <InputLabel id="home-team-select-label">Home Team</InputLabel>
                    <Select
                      labelId="home-team-select-label"
                      value={newGameForm.homeTeamId}
                      label="Home Team"
                      onChange={(e) => setNewGameForm({ ...newGameForm, homeTeamId: e.target.value })}
                    >
                      {teams.map((t) => (
                        <MenuItem key={t.id} value={t.id} disabled={t.id === newGameForm.awayTeamId}>
                          {t.name} ({t.abbreviation}) - {t.division || "División A"}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" fullWidth required>
                    <InputLabel id="away-team-select-label">Away Team</InputLabel>
                    <Select
                      labelId="away-team-select-label"
                      value={newGameForm.awayTeamId}
                      label="Away Team"
                      onChange={(e) => setNewGameForm({ ...newGameForm, awayTeamId: e.target.value })}
                    >
                      {teams.map((t) => (
                        <MenuItem key={t.id} value={t.id} disabled={t.id === newGameForm.homeTeamId}>
                          {t.name} ({t.abbreviation}) - {t.division || "División A"}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <TextField
                  label="Venue / Court Name"
                  size="small"
                  value={newGameForm.courtName}
                  onChange={(e) => setNewGameForm({ ...newGameForm, courtName: e.target.value })}
                  fullWidth
                />

                <TextField
                  label="Referees Crew"
                  size="small"
                  value={newGameForm.referees}
                  placeholder="e.g. Scott Foster, Tony Brothers"
                  onChange={(e) => setNewGameForm({ ...newGameForm, referees: e.target.value })}
                  fullWidth
                />

                <Box className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    label="Tournament / Season"
                    size="small"
                    value={newGameForm.tournamentName}
                    onChange={(e) => setNewGameForm({ ...newGameForm, tournamentName: e.target.value })}
                    fullWidth
                  />

                  <TextField
                    label="Match Date"
                    type="date"
                    size="small"
                    value={newGameForm.date}
                    slotProps={{ inputLabel: { shrink: true } }}
                    onChange={(e) => setNewGameForm({ ...newGameForm, date: e.target.value })}
                    fullWidth
                    required
                  />
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setNewGameOpen(false)} color="inherit" disabled={submittingGame}>
              Cancel
            </Button>
            {teams.length >= 2 && (
              <Button type="submit" variant="contained" color="primary" disabled={submittingGame || fetchingTeams}>
                {submittingGame ? "Activating..." : "Launch Live Game"}
              </Button>
            )}
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "error.main" }}>Delete Match</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
            Are you sure you want to delete this match?
          </Typography>
          {gameToDelete && (
            <Typography variant="body2" color="text.secondary">
              This will permanently delete the game between <strong>{gameToDelete.homeTeamName}</strong> and <strong>{gameToDelete.awayTeamName}</strong> on {gameToDelete.date}, along with all its recorded shot locations and play-by-play events. This action cannot be undone.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} color="inherit" disabled={deletingGame}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteGame}
            variant="contained"
            color="error"
            disabled={deletingGame}
          >
            {deletingGame ? "Deleting..." : "Delete Match"}
          </Button>
        </DialogActions>
      </Dialog>

    </motion.div>
  );
}
