import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Divider,
  CircularProgress,
} from "@mui/material";
import {
  Storage as StorageIcon,
  SettingsApplications as EngineIcon,
  EmojiEvents as TrophyIcon,
  SportsBasketball as BasketballIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { getLeagueLeaders, LeagueLeaders, LeagueLeaderRow, getGames, Game } from "../services/api";

const fadeInUpVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [leaders, setLeaders] = useState<LeagueLeaders | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [leadersData, gamesData] = await Promise.all([
          getLeagueLeaders(),
          getGames(),
        ]);
        setLeaders(leadersData);
        setGames(gamesData);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  if (!loading && games.length === 0) {
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
            <BasketballIcon sx={{ fontSize: 45 }} />
          </Box>
          <Typography
            variant="h5"
            component="h1"
            gutterBottom
            sx={{ fontWeight: 800, color: "text.primary", letterSpacing: "-0.02em" }}
          >
            No games recorded yet
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4, fontWeight: 500, lineHeight: 1.6 }}
          >
            Create your first game to generate player statistics, leaderboards, reports and advanced analytics.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<AddIcon />}
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
            Create Game
          </Button>
        </Box>
      </motion.div>
    );
  }

  const categories = [
    {
      key: "PPG" as const,
      title: "Points Leaders",
      unit: "PPG",
      subtitle: "Top scorers",
      color: "#6366F1", // Indigo
      bgColor: "rgba(99, 102, 241, 0.03)",
      borderColor: "#E2E8F0",
      accentBg: "rgba(99, 102, 241, 0.1)",
    },
    {
      key: "APG" as const,
      title: "Assists Leaders",
      unit: "APG",
      subtitle: "Top playmakers",
      color: "#8B5CF6", // Purple
      bgColor: "rgba(139, 92, 246, 0.03)",
      borderColor: "#E2E8F0",
      accentBg: "rgba(139, 92, 246, 0.1)",
    },
    {
      key: "RPG" as const,
      title: "Rebounds Leaders",
      unit: "RPG",
      subtitle: "Top glass cleansers",
      color: "#10B981", // Emerald
      bgColor: "rgba(16, 185, 129, 0.03)",
      borderColor: "#E2E8F0",
      accentBg: "rgba(16, 185, 129, 0.1)",
    },
    {
      key: "SPG" as const,
      title: "Steals Leaders",
      unit: "SPG",
      subtitle: "Top defenders",
      color: "#F59E0B", // Amber
      bgColor: "rgba(245, 158, 11, 0.03)",
      borderColor: "#E2E8F0",
      accentBg: "rgba(245, 158, 11, 0.1)",
    },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.4 }}
      variants={fadeInUpVariants}
    >
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 800, letterSpacing: "-0.03em" }}>
          Analytics Overview
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ fontSize: "1.05rem", fontWeight: 500 }}>
          Welcome to the <strong>BasketTracker Pro</strong> administration workspace. Showing real-time computed statistics and leaderboards.
        </Typography>
      </Box>

      {/* League Leaders Section */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2.5, display: "flex", alignItems: "center", gap: 1, color: "slate.700" }}>
          <TrophyIcon sx={{ color: "#F59E0B" }} /> League Leaders Board (Top 5)
        </Typography>

        {loading ? (
          <Box className="flex flex-col justify-center items-center py-16 gap-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <CircularProgress size={40} thickness={4} />
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              Calculating real-time leader averages from all registered game event telemetry...
            </Typography>
          </Box>
        ) : (
          <Box className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((cat) => {
              const rows = leaders ? leaders[cat.key] : [];
              return (
                <Card
                  key={cat.key}
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    border: `1px solid ${cat.borderColor}`,
                    boxShadow: "none",
                    borderRadius: 3.5,
                    overflow: "hidden",
                    background: cat.bgColor,
                    transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 12px 20px -8px rgba(0,0,0,0.08)",
                      borderColor: "rgba(0,0,0,0.08)"
                    }
                  }}
                >
                  <CardContent sx={{ p: 3, flexGrow: 1, display: "flex", flexDirection: "column" }}>
                    {/* Header */}
                    <Box className="flex justify-between items-start mb-4">
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "slate.900", lineHeight: 1.2 }}>
                          {cat.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          {cat.subtitle}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          px: 1.2,
                          py: 0.4,
                          borderRadius: "8px",
                          bgcolor: cat.accentBg,
                          color: cat.color,
                          fontWeight: 800,
                          fontSize: "0.75rem",
                          letterSpacing: "0.05em"
                        }}
                      >
                        {cat.unit}
                      </Box>
                    </Box>

                    <Divider sx={{ mb: 2, borderColor: "slate.100" }} />

                    {/* Players list */}
                    <Box className="flex flex-col gap-3 flex-grow">
                      {rows.length === 0 ? (
                        <Box className="flex justify-center items-center py-12 flex-grow">
                          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                            No logged data
                          </Typography>
                        </Box>
                      ) : (
                        rows.map((p: LeagueLeaderRow, idx: number) => {
                          const isFirst = idx === 0;
                          return (
                            <Box
                              key={p.player_id}
                              className="flex items-center justify-between"
                              sx={{
                                p: isFirst ? 1.5 : 0.8,
                                borderRadius: isFirst ? "12px" : "0",
                                bgcolor: isFirst ? "white" : "transparent",
                                boxShadow: isFirst ? "0 4px 6px -1px rgba(0,0,0,0.03)" : "none",
                                border: isFirst ? `1px solid rgba(0,0,0,0.04)` : "none"
                              }}
                            >
                              <Box className="flex items-center gap-2.5">
                                <Box
                                  sx={{
                                    width: isFirst ? 28 : 22,
                                    height: isFirst ? 28 : 22,
                                    borderRadius: "50%",
                                    bgcolor: isFirst ? cat.color : "transparent",
                                    color: isFirst ? "white" : "text.secondary",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: isFirst ? "0.85rem" : "0.8rem",
                                    fontWeight: 900,
                                  }}
                                >
                                  {isFirst ? "★" : `${idx + 1}`}
                                </Box>
                                <Box>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: isFirst ? 800 : 600,
                                      color: isFirst ? "slate.900" : "slate.700",
                                      lineHeight: 1.1,
                                      fontSize: isFirst ? "0.9rem" : "0.85rem"
                                    }}
                                  >
                                    {p.name}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ fontWeight: 600, display: "inline-block", mt: 0.2 }}
                                  >
                                    {isFirst ? p.team_name : p.team_abbreviation}
                                  </Typography>
                                </Box>
                              </Box>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 800,
                                  color: isFirst ? cat.color : "slate.800",
                                  fontSize: isFirst ? "1rem" : "0.85rem"
                                }}
                              >
                                {p.average.toFixed(1)}
                              </Typography>
                            </Box>
                          );
                        })
                      )}
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Architecture Vitals Section */}
      <Box className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Box className="lg:col-span-7">
          <Card className="h-full">
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
                <EngineIcon color="primary" /> Core System Architecture
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                This workspace is structured as a dual-layer project following software engineering best practices for maximum maintainability.
              </Typography>

              <Box className="flex flex-col gap-5">
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "primary.main" }}>
                    Backend Service layer (Python / FastAPI)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Contains clean directories for <code>api</code>, <code>core</code> configurations, <code>database</code> engine, <code>models</code>, <code>schemas</code>, and <code>services</code>. Equipped with <strong>SQLAlchemy ORM</strong> and <strong>Alembic</strong> database schema management.
                  </Typography>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "secondary.main" }}>
                    Frontend Client (React / TypeScript / Vite)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Builds with modular subfolders including <code>routes</code>, <code>pages</code>, <code>layouts</code>, and domain <code>types</code> to prevent monolithic bloat.
                  </Typography>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "success.main" }}>
                    Deployment & Scaling
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ready to deploy to Vercel and Render. The SQLite database integration is fully decoupled so it can easily swap to a PostgreSQL system in production without altering business logic.
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box className="lg:col-span-5">
          <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <CardContent sx={{ p: 4, flexGrow: 1 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
                <StorageIcon color="primary" /> Database Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                SQLite connection settings & Alembic migration structures are successfully scaffolded in the backend project.
              </Typography>

              <Box sx={{ p: 2, bgcolor: "#F1F5F9", borderRadius: 2, mb: 3, border: "1px dashed #CBD5E1" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                  Database Status:
                </Typography>
                <Box className="flex flex-col gap-2">
                  <Box className="flex justify-between">
                    <Typography variant="caption" color="text.secondary">Engine:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>SQLAlchemy 2.0</Typography>
                  </Box>
                  <Box className="flex justify-between">
                    <Typography variant="caption" color="text.secondary">Driver:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>SQLite (sqlite3)</Typography>
                  </Box>
                  <Box className="flex justify-between">
                    <Typography variant="caption" color="text.secondary">Migration System:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>Alembic Scaffolding</Typography>
                  </Box>
                </Box>
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Scaffolded Backend Folders:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.85rem", color: "#475569" }}>
                <li><code>app/core/config.py</code> (Pydantic Configuration)</li>
                <li><code>app/database/session.py</code> (Connection & engine generator)</li>
                <li><code>alembic.ini</code> & <code>alembic/env.py</code> (Migrations runner)</li>
              </ul>
            </CardContent>
            <Box sx={{ p: 3, pt: 0, mt: "auto" }}>
              <Button variant="outlined" color="primary" fullWidth sx={{ fontWeight: 600 }}>
                View Database Session Setup
              </Button>
            </Box>
          </Card>
        </Box>
      </Box>
    </motion.div>
  );
}
