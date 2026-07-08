import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Typography,
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  IconButton,
  Snackbar,
} from "@mui/material";
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { Player, Team } from "../types";
import {
  getPlayers,
  createPlayer,
  updatePlayer,
  deletePlayer,
  getTeams,
} from "../services/api";
import PlayerProfile from "../components/PlayerProfile";

const fadeInUpVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

interface FormErrors {
  firstName?: string;
  lastName?: string;
  jerseyNumber?: string;
  position?: string;
  weight?: string;
}

export default function Players() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayerForProfile, setSelectedPlayerForProfile] = useState<Player | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPositionFilter, setSelectedPositionFilter] = useState("ALL");
  const [selectedTeamFilter, setSelectedTeamFilter] = useState("ALL");

  // Modal Dialog State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    jerseyNumber: "",
    position: "",
    height: "",
    weight: "",
    teamId: "",
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedPlayers, fetchedTeams] = await Promise.all([
        getPlayers(),
        getTeams(),
      ]);
      setPlayers(fetchedPlayers);
      setTeams(fetchedTeams);
    } catch (err: any) {
      console.error("Error loading roster data:", err);
      setError(err.message || "Failed to load players and teams data from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (player?: Player) => {
    if (player) {
      setEditingPlayer(player);
      setFormData({
        firstName: player.firstName,
        lastName: player.lastName,
        jerseyNumber: player.jerseyNumber,
        position: player.position,
        height: player.height || "",
        weight: player.weight ? String(player.weight) : "",
        teamId: player.teamId,
      });
    } else {
      setEditingPlayer(null);
      setFormData({
        firstName: "",
        lastName: "",
        jerseyNumber: "",
        position: "PG",
        height: "",
        weight: "",
        teamId: teams[0]?.id || "",
      });
    }
    setFormErrors({});
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingPlayer(null);
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    if (!formData.firstName.trim()) {
      errors.firstName = "First name is required";
    }
    if (!formData.lastName.trim()) {
      errors.lastName = "Last name is required";
    }
    if (!formData.jerseyNumber.trim()) {
      errors.jerseyNumber = "Jersey number is required";
    } else if (isNaN(Number(formData.jerseyNumber))) {
      errors.jerseyNumber = "Jersey number must be a valid number";
    }
    if (!formData.position) {
      errors.position = "Position is required";
    }
    if (formData.weight && isNaN(Number(formData.weight))) {
      errors.weight = "Weight must be a valid number";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload: Partial<Player> = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        jerseyNumber: formData.jerseyNumber.trim(),
        position: formData.position,
        height: formData.height.trim() || undefined,
        weight: formData.weight ? Number(formData.weight) : undefined,
        teamId: formData.teamId || undefined,
      };

      if (editingPlayer) {
        await updatePlayer(editingPlayer.id, payload);
        setSnackbar({ open: true, message: "Player profile updated successfully!", severity: "success" });
      } else {
        await createPlayer(payload);
        setSnackbar({ open: true, message: "Player profile created successfully!", severity: "success" });
      }
      
      await loadData();
      handleCloseModal();
    } catch (err: any) {
      console.error("Error submitting player form:", err);
      setSnackbar({ open: true, message: err.message || "Failed to save player profile.", severity: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlayer = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this player profile?")) return;
    try {
      await deletePlayer(id);
      setSnackbar({ open: true, message: "Player profile deleted successfully!", severity: "success" });
      await loadData();
    } catch (err: any) {
      console.error("Error deleting player:", err);
      setSnackbar({ open: true, message: err.message || "Failed to delete player.", severity: "error" });
    }
  };

  // Filter & Search Logic
  const filteredPlayers = players.filter((player) => {
    const fullName = `${player.firstName} ${player.lastName}`.toLowerCase();
    const searchMatch =
      fullName.includes(searchQuery.toLowerCase()) ||
      player.jerseyNumber.includes(searchQuery) ||
      player.position.toLowerCase().includes(searchQuery.toLowerCase());

    const positionMatch =
      selectedPositionFilter === "ALL" || player.position === selectedPositionFilter;

    const teamMatch =
      selectedTeamFilter === "ALL" || player.teamId === selectedTeamFilter;

    return searchMatch && positionMatch && teamMatch;
  });

  const getTeamName = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    return team ? team.name : "Unassigned";
  };

  if (selectedPlayerForProfile) {
    return (
      <PlayerProfile
        player={selectedPlayerForProfile}
        onBack={() => setSelectedPlayerForProfile(null)}
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
            Players Roster
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage player profiles, assign roster sheets, and update athlete metadata.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          sx={{ fontWeight: 600 }}
          onClick={() => handleOpenModal()}
        >
          New Player
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} action={
          <Button color="inherit" size="small" onClick={loadData}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      )}

      {/* Roster Controls */}
      <Card sx={{ mb: 4, boxShadow: "none", border: "1px solid #E2E8F0", borderRadius: "16px" }}>
        <CardContent sx={{ p: 3 }}>
          <Box className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextField
              variant="outlined"
              placeholder="Search by name, jersey, position..."
              size="small"
              fullWidth
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            
            <FormControl size="small" fullWidth>
              <InputLabel id="position-filter-label">Position</InputLabel>
              <Select
                labelId="position-filter-label"
                value={selectedPositionFilter}
                label="Position"
                onChange={(e) => setSelectedPositionFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Positions</MenuItem>
                <MenuItem value="PG">Point Guard (PG)</MenuItem>
                <MenuItem value="SG">Shooting Guard (SG)</MenuItem>
                <MenuItem value="SF">Small Forward (SF)</MenuItem>
                <MenuItem value="PF">Power Forward (PF)</MenuItem>
                <MenuItem value="C">Center (C)</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel id="team-filter-label">Assigned Team</InputLabel>
              <Select
                labelId="team-filter-label"
                value={selectedTeamFilter}
                label="Assigned Team"
                onChange={(e) => setSelectedTeamFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Teams</MenuItem>
                {teams.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* Roster Table */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredPlayers.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: "center", borderRadius: "16px", border: "1px solid #E2E8F0", boxShadow: "none" }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Players Found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search criteria or register a new player profile above.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: "16px", border: "1px solid #E2E8F0", boxShadow: "none", overflow: "hidden" }}>
          <Table sx={{ minWidth: 650 }} aria-label="players roster table">
            <TableHead sx={{ bgcolor: "#F8FAFC" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: "10%" }}>Jersey</TableCell>
                <TableCell sx={{ fontWeight: 700, width: "30%" }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700, width: "25%" }}>Assigned Team</TableCell>
                <TableCell sx={{ fontWeight: 700, width: "15%" }}>Position</TableCell>
                <TableCell sx={{ fontWeight: 700, width: "10%" }}>Height/Weight</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, width: "10%" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPlayers.map((player) => (
                <TableRow key={player.id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                  <TableCell
                    onClick={() => setSelectedPlayerForProfile(player)}
                    sx={{ fontWeight: 700, color: "primary.main", cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                  >
                    #{player.jerseyNumber}
                  </TableCell>
                  <TableCell
                    onClick={() => setSelectedPlayerForProfile(player)}
                    sx={{ cursor: "pointer" }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600, "&:hover": { color: "primary.main" } }}>
                      {player.firstName} {player.lastName}
                    </Typography>
                  </TableCell>
                  <TableCell
                    onClick={() => setSelectedPlayerForProfile(player)}
                    sx={{ cursor: "pointer" }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {getTeamName(player.teamId)}
                    </Typography>
                  </TableCell>
                  <TableCell
                    onClick={() => setSelectedPlayerForProfile(player)}
                    sx={{ cursor: "pointer" }}
                  >
                    <Chip
                      label={player.position}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 600, cursor: "pointer" }}
                    />
                  </TableCell>
                  <TableCell
                    onClick={() => setSelectedPlayerForProfile(player)}
                    sx={{ color: "text.secondary", cursor: "pointer" }}
                  >
                    {player.height || "--"} {player.weight ? `/ ${player.weight} lbs` : ""}
                  </TableCell>
                  <TableCell align="right">
                    <Box className="flex justify-end gap-1">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenModal(player)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeletePlayer(player.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* New/Edit Player Dialog */}
      <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <form onSubmit={handleFormSubmit}>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {editingPlayer ? "Edit Player Profile" : "Register Professional Player"}
          </DialogTitle>
          <DialogContent dividers>
            <Box className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <TextField
                label="First Name *"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                error={!!formErrors.firstName}
                helperText={formErrors.firstName}
                fullWidth
                size="small"
              />
              <TextField
                label="Last Name *"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                error={!!formErrors.lastName}
                helperText={formErrors.lastName}
                fullWidth
                size="small"
              />
              <FormControl size="small" fullWidth error={!!formErrors.position}>
                <InputLabel id="player-position-label">Position *</InputLabel>
                <Select
                  labelId="player-position-label"
                  value={formData.position}
                  label="Position *"
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                >
                  <MenuItem value="PG">Point Guard (PG)</MenuItem>
                  <MenuItem value="SG">Shooting Guard (SG)</MenuItem>
                  <MenuItem value="SF">Small Forward (SF)</MenuItem>
                  <MenuItem value="PF">Power Forward (PF)</MenuItem>
                  <MenuItem value="C">Center (C)</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Jersey Number *"
                value={formData.jerseyNumber}
                onChange={(e) => setFormData({ ...formData, jerseyNumber: e.target.value })}
                error={!!formErrors.jerseyNumber}
                helperText={formErrors.jerseyNumber}
                fullWidth
                size="small"
              />
              <FormControl size="small" fullWidth>
                <InputLabel id="player-team-label">Assigned Team</InputLabel>
                <Select
                  labelId="player-team-label"
                  value={formData.teamId}
                  label="Assigned Team"
                  onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                >
                  <MenuItem value="">Unassigned</MenuItem>
                  {teams.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Height (e.g. 6ft 6in)"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                fullWidth
                size="small"
              />
              <TextField
                label="Weight (lbs)"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                error={!!formErrors.weight}
                helperText={formErrors.weight}
                fullWidth
                size="small"
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={handleCloseModal} color="inherit">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={submitting}
            >
              {submitting ? "Saving..." : "Save Profile"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%", fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </motion.div>
  );
}
