import { motion } from "motion/react";
import {
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  FormControlLabel,
  Switch,
  TextField,
  Divider,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from "@mui/material";
import { Save as SaveIcon, Build as BuildIcon } from "@mui/icons-material";

const fadeInUpVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

export default function Settings() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.4 }}
      variants={fadeInUpVariants}
    >
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          System Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure analytical bounds, database parameters, and live CORS telemetry rules.
        </Typography>
      </Box>

      {/* Main Settings Form Grid using Tailwind CSS */}
      <Box className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Core Database Adapter */}
        <Card sx={{ height: "100%" }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
              Database Storage Adapter
            </Typography>

            <Box className="flex flex-col gap-6">
              <FormControl fullWidth size="small">
                <InputLabel id="db-dialect-label">Target Dialect</InputLabel>
                <Select
                  labelId="db-dialect-label"
                  id="db-dialect"
                  value="sqlite"
                  label="Target Dialect"
                >
                  <MenuItem value="sqlite">SQLite (Development File)</MenuItem>
                  <MenuItem value="postgresql">PostgreSQL (Production Cloud SQL / Neon / Render)</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Database URL / String"
                value="sqlite:///./basket_tracker.db"
                fullWidth
                size="small"
                disabled
                helperText="Configured in backend app/core/config.py"
              />

              <Divider />

              <Box className="flex flex-col gap-1">
                <FormControlLabel
                  control={<Switch defaultChecked color="primary" />}
                  label="Enable Automatic SQLAlchemy Migrations"
                />

                <FormControlLabel
                  control={<Switch defaultChecked color="primary" />}
                  label="Log SQL Statements to Stdout (echo=True)"
                />
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Backend API Configuration */}
        <Card sx={{ height: "100%" }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
              FastAPI CORS & Rules
            </Typography>

            <Box className="flex flex-col gap-6">
              <TextField
                label="CORS Allowed Origins"
                value="http://localhost:3000, http://localhost:5173"
                fullWidth
                size="small"
                helperText="Comma separated list of permitted URLs"
              />

              <TextField
                label="API Version Prefix"
                value="/api/v1"
                fullWidth
                size="small"
              />

              <Divider />

              <Box className="flex flex-col gap-1">
                <FormControlLabel
                  control={<Switch defaultChecked color="primary" />}
                  label="Enable OpenAPI swagger documentation (/docs)"
                />

                <FormControlLabel
                  control={<Switch color="primary" />}
                  label="Debug Verbosity Mode"
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Alembic Scaffolding Actions */}
      <Box className="w-full mb-6">
        <Card>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
              Alembic Migrations Controller
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Manage SQLite or PostgreSQL schema state from Alembic commands directly. This maintains safe relational tables.
            </Typography>

            <Box className="flex flex-row flex-wrap gap-4">
              <Button variant="contained" color="primary" startIcon={<BuildIcon />} sx={{ fontWeight: 600 }}>
                Alembic Autogenerate Revision
              </Button>
              <Button variant="outlined" color="secondary" sx={{ fontWeight: 600 }}>
                Alembic Upgrade Head
              </Button>
              <Button variant="outlined" color="error" sx={{ fontWeight: 600 }}>
                Alembic Downgrade Base
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="contained" color="primary" startIcon={<SaveIcon />} size="large" sx={{ px: 4, fontWeight: 700 }}>
          Save Configuration
        </Button>
      </Box>
    </motion.div>
  );
}
