import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Avatar,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Add as AddIcon,
  Groups as GroupsIcon,
  Close as CloseIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import { Team, Player } from "../types";
import { getTeams, createTeam, getTeamRoster } from "../services/api";

const fadeInUpVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

interface FormErrors {
  name?: string;
  abbreviation?: string;
}

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Team Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    abbreviation: "",
    division: "División A",
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  // Roster Panel State
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [roster, setRoster] = useState<Player[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);

  const loadTeams = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedTeams = await getTeams();
      setTeams(fetchedTeams);
    } catch (err: any) {
      console.error("Error fetching teams:", err);
      setError(err.message || "Failed to load teams from the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  // Fetch Team Roster Asynchronously
  const handleViewRoster = async (team: Team) => {
    setSelectedTeam(team);
    setLoadingRoster(true);
    setRosterError(null);
    try {
      const teamRoster = await getTeamRoster(team.id);
      setRoster(teamRoster);
    } catch (err: any) {
      console.error("Error loading roster:", err);
      setRosterError("Could not retrieve roster. Please try again.");
    } finally {
      setLoadingRoster(false);
    }
  };

  const handleOpenModal = () => {
    setFormData({ name: "", abbreviation: "", division: "División A" });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    if (!formData.name.trim()) {
      errors.name = "Team Name is required";
    }
    if (!formData.abbreviation.trim()) {
      errors.abbreviation = "Acronym is required";
    } else {
      const abbr = formData.abbreviation.trim();
      if (abbr.length < 2 || abbr.length > 5) {
        errors.abbreviation = "Acronym must be between 2 and 5 characters";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await createTeam({
        name: formData.name.trim(),
        abbreviation: formData.abbreviation.trim().toUpperCase(),
        division: formData.division,
      });
      setSnackbar({ open: true, message: "Team created successfully!", severity: "success" });
      await loadTeams();
      handleCloseModal();
    } catch (err: any) {
      console.error("Error registering team:", err);
      setSnackbar({ open: true, message: err.message || "Failed to save team profile.", severity: "error" });
    } finally {
      setSubmitting(false);
    }
  };

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
            Leagues & Teams
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage participating club rosters, team details, and squad size audits.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          sx={{ fontWeight: 600 }}
          onClick={handleOpenModal}
        >
          Create Team
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} action={
          <Button color="inherit" size="small" onClick={loadTeams}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      )}

      {/* Grid of Teams */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : teams.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: "center", borderRadius: "16px", border: "1px solid #E2E8F0", boxShadow: "none" }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Teams Registered
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Register a team first using the "Create Team" button to begin building your rosters.
          </Typography>
        </Paper>
      ) : (
        <Box className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {teams.map((team) => (
            <Card
              key={team.id}
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                border: "1px solid #E2E8F0",
                boxShadow: "none",
                borderRadius: "16px",
                "&:hover": {
                  borderColor: "primary.main",
                  boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)",
                },
                transition: "all 0.2s",
              }}
            >
              <CardContent sx={{ p: 3, flexGrow: 1 }}>
                <Box className="flex flex-col items-center gap-4 mb-6">
                  <Avatar
                    sx={{
                      bgcolor: "primary.main",
                      width: 64,
                      height: 64,
                      fontSize: "1.5rem",
                      fontWeight: 700,
                    }}
                  >
                    {team.abbreviation}
                  </Avatar>
                  <Box className="text-center">
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {team.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {team.city || "Professional Club"}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ mb: 2 }} />

                <Box className="flex flex-col gap-2">
                  <Box className="flex justify-between">
                    <Typography variant="caption" color="text.secondary">Acronym:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{team.abbreviation}</Typography>
                  </Box>
                  <Box className="flex justify-between">
                    <Typography variant="caption" color="text.secondary">Division:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{team.division || "División A"}</Typography>
                  </Box>
                </Box>
              </CardContent>
              <Box sx={{ p: 2, pt: 0 }}>
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  fullWidth
                  startIcon={<GroupsIcon />}
                  onClick={() => handleViewRoster(team)}
                >
                  View Roster
                </Button>
              </Box>
            </Card>
          ))}
        </Box>
      )}

      {/* Roster Side Panel Drawer */}
      <Drawer
        anchor="right"
        open={!!selectedTeam}
        onClose={() => setSelectedTeam(null)}
      >
        {selectedTeam && (
          <Box sx={{ width: { xs: "100vw", sm: 400 }, p: 3, height: "100%", display: "flex", flexDirection: "column" }}>
            <Box className="flex justify-between items-center mb-4">
              <Box className="flex items-center gap-2">
                <Avatar sx={{ bgcolor: "primary.main", width: 40, height: 40, fontSize: "1rem", fontWeight: 700 }}>
                  {selectedTeam.abbreviation}
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {selectedTeam.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Roster Sheet
                  </Typography>
                </Box>
              </Box>
              <IconButton onClick={() => setSelectedTeam(null)}>
                <CloseIcon />
              </IconButton>
            </Box>

            <Divider className="my-2" />

            <Box className="flex-grow overflow-y-auto pt-4">
              {loadingRoster ? (
                <Box className="flex justify-center items-center py-12">
                  <CircularProgress size={32} />
                </Box>
              ) : rosterError ? (
                <Alert severity="error">{rosterError}</Alert>
              ) : roster.length === 0 ? (
                <Box className="text-center py-12">
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    No Players Registered
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Add player profiles and assign them to this team on the Players page.
                  </Typography>
                </Box>
              ) : (
                <List sx={{ p: 0 }}>
                  <AnimatePresence>
                    {roster.map((player, index) => (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <ListItem
                          sx={{
                            border: "1px solid #E2E8F0",
                            borderRadius: "12px",
                            mb: 1.5,
                            "&:hover": {
                              borderColor: "primary.main",
                              bgcolor: "#F8FAFC",
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "primary.main" }}>
                              #{player.jerseyNumber}
                            </Typography>
                          </ListItemIcon>
                          <ListItemText>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {player.firstName} {player.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Position: {player.position} | Ht: {player.height || "N/A"}
                            </Typography>
                          </ListItemText>
                          <PersonIcon color="action" fontSize="small" />
                        </ListItem>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </List>
              )}
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Create Team Dialog */}
      <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="xs" fullWidth>
        <form onSubmit={handleFormSubmit}>
          <DialogTitle sx={{ fontWeight: 700 }}>
            Create New Team
          </DialogTitle>
          <DialogContent dividers>
            <Box className="flex flex-col gap-4 pt-2">
              <TextField
                label="Team Name *"
                placeholder="e.g. Los Angeles Lakers"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={!!formErrors.name}
                helperText={formErrors.name}
                fullWidth
                size="small"
              />
              <TextField
                label="Acronym (Abbreviation) *"
                placeholder="e.g. LAL"
                value={formData.abbreviation}
                onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                error={!!formErrors.abbreviation}
                helperText={formErrors.abbreviation}
                fullWidth
                size="small"
                slotProps={{
                  htmlInput: { style: { textTransform: "uppercase" } }
                }}
              />
              <FormControl size="small" fullWidth>
                <InputLabel id="team-division-select-label">Division *</InputLabel>
                <Select
                  labelId="team-division-select-label"
                  value={formData.division}
                  label="Division *"
                  onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                >
                  <MenuItem value="División A">División A</MenuItem>
                  <MenuItem value="División B">División B</MenuItem>
                  <MenuItem value="U19">U19</MenuItem>
                  <MenuItem value="U17">U17</MenuItem>
                  <MenuItem value="Femenino">Femenino</MenuItem>
                </Select>
              </FormControl>
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
              {submitting ? "Creating..." : "Create Team"}
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
