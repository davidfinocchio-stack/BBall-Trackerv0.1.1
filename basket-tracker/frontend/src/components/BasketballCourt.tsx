import { useState, useRef } from "react";
import {
  Popover,
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
} from "@mui/material";
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Shield as ShieldIcon,
  LocalActivity as LocalActivityIcon,
  PanTool as PanToolIcon,
  ReportProblem as ReportProblemIcon,
  SwapHoriz as SwapHorizIcon,
} from "@mui/icons-material";

// Define TypeScript interfaces for the component props and markers
export interface CourtMarker {
  id: string;
  x: number; // Backend scale [0, 100]
  y: number; // Backend scale [0, 100]
  shotType: "Triple" | "Doble" | "Libre";
  made: boolean;
  playerName?: string;
}

interface BasketballCourtProps {
  onCoordCaptured?: (coords: { x: number; y: number; shotType: "Triple" | "Doble" | "Libre"; zone: string; eventType?: string }) => void;
  markers?: CourtMarker[];
  readOnly?: boolean;
}

export default function BasketballCourt({
  onCoordCaptured,
  markers = [],
  readOnly = false,
}: BasketballCourtProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Popover and Active clicked position states
  const [popoverAnchor, setPopoverAnchor] = useState<{ clientX: number; clientY: number } | null>(null);
  const [tempMarker, setTempMarker] = useState<{
    x: number;
    y: number;
    x_svg: number;
    y_svg: number;
    predictedType: "Triple" | "Doble" | "Libre";
    zone: string;
  } | null>(null);

  // Handle click on the court SVG
  const handleCourtClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (readOnly) return;
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert click coordinates to the strict 100x100 viewBox coordinate space
    const x_svg = (clickX / rect.width) * 100;
    const y_svg = (clickY / rect.height) * 100;

    // Clamp values between 0 and 100 to ensure safety
    const x = Math.max(0, Math.min(100, x_svg));
    const y_svg_clamped = Math.max(0, Math.min(100, y_svg));

    // CRITICAL ARCHITECTURAL REQUIREMENT: Invert the Y coordinate for backend persistence
    // Baseline is y_backend = 0 (bottom), half-court is y_backend = 100 (top).
    const y = 100 - y_svg_clamped;

    // Predictive Shot Type & Zone Detection Logic
    const distSq = (x - 50.0) ** 2 + (y - 5.25) ** 2;
    const isThree = (y <= 28.0 && (x <= 6.0 || x >= 94.0)) || distSq >= 47.5 * 47.5;
    const predictedType: "Triple" | "Doble" | "Libre" = isThree ? "Triple" : "Doble";

    // Detect zone descriptions
    let zone = "Mid-range 2-Pointer";
    if (y <= 28.0 && (x <= 6.0 || x >= 94.0)) {
      zone = "Corner 3-Pointer";
    } else if (distSq >= 47.5 * 47.5) {
      zone = "Above the Break 3-Pointer";
    } else if (x >= 34.0 && x <= 66.0 && y <= 38.0) {
      if (Math.sqrt(distSq) <= 8.0 && y >= 5.25) {
        zone = "Restricted Area (Low Paint)";
      } else {
        zone = "Inside the Paint (Key)";
      }
    } else if (Math.abs(x - 50.0) < 10.0 && Math.abs(y - 38.0) < 4.0) {
      zone = "Free Throw Line Area";
    }

    setTempMarker({
      x,
      y,
      x_svg: x,
      y_svg: y_svg_clamped,
      predictedType,
      zone,
    });

    setPopoverAnchor({
      clientX: e.clientX,
      clientY: e.clientY,
    });
  };

  const handleSelectEvent = (eventType: string) => {
    if (onCoordCaptured && tempMarker) {
      onCoordCaptured({
        x: Number(tempMarker.x.toFixed(2)),
        y: Number(tempMarker.y.toFixed(2)),
        shotType: tempMarker.predictedType,
        zone: tempMarker.zone,
        eventType,
      });
    }
    handleClosePopover();
  };

  const handleClosePopover = () => {
    setPopoverAnchor(null);
    setTempMarker(null);
  };

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        maxWidth: "600px",
        mx: "auto",
        aspectRatio: "1/1",
        borderRadius: "16px",
        overflow: "hidden",
        border: "1px solid #E2E8F0",
        boxShadow: "0px 4px 20px rgba(15, 23, 42, 0.03)",
        bgcolor: "#FAF9F6", // Professional premium retro court wood style background
      }}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        onClick={handleCourtClick}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          cursor: readOnly ? "default" : "crosshair",
        }}
      >
        {/* Court Outer Border */}
        <rect
          x="0"
          y="0"
          width="100"
          height="100"
          fill="none"
          stroke="#475569"
          strokeWidth="1"
        />

        {/* Shaded Key/Paint Area */}
        <rect
          x="34"
          y="62"
          width="32"
          height="38"
          fill="#F1F5F9"
          stroke="#475569"
          strokeWidth="0.8"
        />

        {/* Restricted Area Semicircle (Radius 8, centered at 50, 94.75, which is the hoop) */}
        <path
          d="M 42 94.75 A 8 8 0 0 1 58 94.75"
          fill="none"
          stroke="#475569"
          strokeWidth="0.8"
          strokeDasharray="1.5 1"
        />

        {/* Free Throw Semicircle (Radius 12, centered at 50, 62) */}
        <path
          d="M 38 62 A 12 12 0 0 1 62 62"
          fill="none"
          stroke="#475569"
          strokeWidth="0.8"
        />
        {/* Dash/Bottom-half of Free-throw Circle inside Key */}
        <path
          d="M 38 62 A 12 12 0 0 0 62 62"
          fill="none"
          stroke="#94A3B8"
          strokeWidth="0.6"
          strokeDasharray="2 2"
        />

        {/* Backboard (Y = 96.0, length = 8 units) */}
        <line
          x1="46"
          y1="96.0"
          x2="54"
          y2="96.0"
          stroke="#0F172A"
          strokeWidth="1"
        />
        {/* Backboard Support connector */}
        <line
          x1="50"
          y1="96.0"
          x2="50"
          y2="100"
          stroke="#475569"
          strokeWidth="0.8"
        />

        {/* Hoop/Rim (Center 50, 94.75, Radius 1.5) */}
        <circle
          cx="50"
          cy="94.75"
          r="1.5"
          fill="none"
          stroke="#EA580C"
          strokeWidth="1"
        />

        {/* Three Point Arc: Corner lines at 6% & 94% from baseline up to 28m (Y_svg = 72) */}
        <path
          d="M 6 100 L 6 72 A 47.5 47.5 0 0 1 94 72 L 94 100"
          fill="none"
          stroke="#334155"
          strokeWidth="0.8"
        />

        {/* Center Court Semicircle (Radius 12, centered at 50, 0) */}
        <path
          d="M 38 0 A 12 12 0 0 0 62 0"
          fill="none"
          stroke="#475569"
          strokeWidth="0.8"
        />

        {/* --- Render Markers --- */}
        {markers.map((marker) => {
          // Convert backend Y [0, 100] back to SVG Y [100, 0]
          const markerYSvg = 100 - marker.y;
          const isMade = marker.made;

          return (
            <g key={marker.id}>
              {/* Pulse effect around marker */}
              <circle
                cx={marker.x}
                cy={markerYSvg}
                r="3"
                fill={isMade ? "#10B981" : "#EF4444"}
                opacity="0.2"
              >
                <animate
                  attributeName="r"
                  values="1.5;4;1.5"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </circle>
              {/* Main marker dot */}
              <circle
                cx={marker.x}
                cy={markerYSvg}
                r="1.5"
                fill={isMade ? "#10B981" : "#EF4444"}
                stroke="#FFFFFF"
                strokeWidth="0.3"
              />
            </g>
          );
        })}

        {/* --- Temporary Click Indicator --- */}
        {tempMarker && (
          <g>
            <circle
              cx={tempMarker.x_svg}
              cy={tempMarker.y_svg}
              r="4.5"
              fill="none"
              stroke="#EA580C"
              strokeWidth="0.5"
            >
              <animate
                attributeName="r"
                values="2;6;2"
                dur="1.2s"
                repeatCount="indefinite"
              />
            </circle>
            <circle
              cx={tempMarker.x_svg}
              cy={tempMarker.y_svg}
              r="2"
              fill="#EA580C"
              stroke="#FFFFFF"
              strokeWidth="0.4"
            />
          </g>
        )}
      </svg>

      {/* Predictive Dialog / Popover Menu */}
      <Popover
        open={popoverAnchor !== null}
        anchorReference="anchorPosition"
        anchorPosition={
          popoverAnchor
            ? { top: popoverAnchor.clientY, left: popoverAnchor.clientX }
            : undefined
        }
        onClose={handleClosePopover}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "12px",
              boxShadow: "0px 8px 30px rgba(15, 23, 42, 0.12)",
              border: "1px solid #E2E8F0",
              overflow: "hidden",
              width: "280px",
              maxHeight: "450px",
            },
          },
        }}
      >
        {tempMarker && (
          <Box>
            {/* Header */}
            <Box
              sx={{
                p: 2,
                pb: 1.5,
                bgcolor: "#F8FAFC",
                borderBottom: "1px solid #E2E8F0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
                  Register Court Play
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.2 }}>
                  Coord: ({tempMarker.x.toFixed(1)}, {tempMarker.y.toFixed(1)})
                </Typography>
              </Box>
              <IconButton size="small" onClick={handleClosePopover}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Zone Highlight Badge */}
            <Box sx={{ px: 2, py: 1, bgcolor: "#EFF6FF", borderBottom: "1px solid #DBEAFE" }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "primary.main" }}>
                🎯 Zone: {tempMarker.zone}
              </Typography>
            </Box>

            {/* Predictive Menu Options */}
            <List sx={{ p: 0, maxHeight: "300px", overflowY: "auto" }}>
              {/* SHOT_MADE */}
              <ListItemButton onClick={() => handleSelectEvent("SHOT_MADE")}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckCircleIcon sx={{ color: "success.main", fontSize: "1.2rem" }} />
                </ListItemIcon>
                <ListItemText>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Shot Made ({tempMarker.predictedType})
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Register successful field goal
                  </Typography>
                </ListItemText>
              </ListItemButton>

              {/* SHOT_MISSED */}
              <ListItemButton onClick={() => handleSelectEvent("SHOT_MISSED")}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CancelIcon sx={{ color: "error.main", fontSize: "1.2rem" }} />
                </ListItemIcon>
                <ListItemText>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Shot Missed ({tempMarker.predictedType})
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Register missed attempt
                  </Typography>
                </ListItemText>
              </ListItemButton>

              {/* REBOUND_DEFENSIVE */}
              <ListItemButton onClick={() => handleSelectEvent("REBOUND_DEFENSIVE")}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <ShieldIcon sx={{ color: "primary.main", fontSize: "1.2rem" }} />
                </ListItemIcon>
                <ListItemText>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Defensive Rebound
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Secure ball possession on defense
                  </Typography>
                </ListItemText>
              </ListItemButton>

              {/* REBOUND_OFFENSIVE */}
              <ListItemButton onClick={() => handleSelectEvent("REBOUND_OFFENSIVE")}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <LocalActivityIcon sx={{ color: "primary.main", fontSize: "1.2rem" }} />
                </ListItemIcon>
                <ListItemText>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Offensive Rebound
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Retain ball possession on offense
                  </Typography>
                </ListItemText>
              </ListItemButton>

              {/* STEAL */}
              <ListItemButton onClick={() => handleSelectEvent("STEAL")}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <PanToolIcon sx={{ color: "info.main", fontSize: "1.2rem" }} />
                </ListItemIcon>
                <ListItemText>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Steal
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Takeaway ball possession
                  </Typography>
                </ListItemText>
              </ListItemButton>

              {/* TURNOVER */}
              <ListItemButton onClick={() => handleSelectEvent("TURNOVER")}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <SwapHorizIcon sx={{ color: "warning.main", fontSize: "1.2rem" }} />
                </ListItemIcon>
                <ListItemText>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Turnover
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Lost ball possession
                  </Typography>
                </ListItemText>
              </ListItemButton>

              {/* FOUL */}
              <ListItemButton onClick={() => handleSelectEvent("FOUL")}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <ReportProblemIcon sx={{ color: "error.main", fontSize: "1.2rem" }} />
                </ListItemIcon>
                <ListItemText>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Personal Foul
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Log personal rules infraction
                  </Typography>
                </ListItemText>
              </ListItemButton>
            </List>
          </Box>
        )}
      </Popover>
    </Box>
  );
}
