import * as React from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Avatar,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Groups as TeamsIcon,
  SportsBasketball as GamesIcon,
  Assessment as ReportsIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";

const DRAWER_WIDTH = 260;

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon /> },
  { label: "Games", path: "/games", icon: <GamesIcon /> },
  { label: "Teams", path: "/teams", icon: <TeamsIcon /> },
  { label: "Players", path: "/players", icon: <PeopleIcon /> },
  { label: "Reports", path: "/reports", icon: <ReportsIcon /> },
  { label: "Settings", path: "/settings", icon: <SettingsIcon /> },
];

export default function DashboardLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const activeItem = navItems.find((item) => item.path === location.pathname) || navItems[0];

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "#1C2536", color: "#FFFFFF" }}>
      {/* Brand Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: 3,
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 1.5,
            bgcolor: "#6366F1", // Indigo Accent
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: "1.1rem",
          }}
        >
          B
        </Box>
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: "1.1rem",
              letterSpacing: "-0.02em",
              color: "#FFFFFF",
              lineHeight: 1,
            }}
          >
            BasketTracker
          </Typography>
        </Box>
      </Box>

      {/* Main Navigation List */}
      <Box sx={{ flexGrow: 1, px: 2, py: 3 }}>
        <List sx={{ p: 0, display: "flex", flexDirection: "column", gap: 0.5 }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  onClick={() => {
                    navigate(item.path);
                    if (isMobile) setMobileOpen(false);
                  }}
                  sx={{
                    borderRadius: 2,
                    py: 1.25,
                    px: 2,
                    bgcolor: isActive ? "rgba(255, 255, 255, 0.08)" : "transparent",
                    color: isActive ? "#818CF8" : "#94A3B8",
                    "&:hover": {
                      bgcolor: "rgba(255, 255, 255, 0.04)",
                      color: isActive ? "#818CF8" : "#FFFFFF",
                      "& .MuiListItemIcon-root": {
                        color: isActive ? "#818CF8" : "#FFFFFF",
                      },
                    },
                    transition: "all 0.15s ease-in-out",
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 36,
                      color: isActive ? "#818CF8" : "#94A3B8",
                      transition: "color 0.15s ease-in-out",
                      "& svg": { fontSize: 20 },
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <span className={`font-semibold text-sm ${isActive ? "text-[#818CF8]" : "text-[#94A3B8]"}`}>
                        {item.label}
                      </span>
                    }
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* System Status / User Footer */}
      <Box
        sx={{
          p: 2.5,
          bgcolor: "#111927",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <Avatar
          sx={{
            bgcolor: "#475569",
            color: "#FFFFFF",
            fontSize: "0.75rem",
            fontWeight: 700,
            width: 36,
            height: 36,
            border: "2px solid #6366F1",
          }}
        >
          JD
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600, color: "#FFFFFF", fontSize: "0.85rem" }}>
            Arch. Lead
          </Typography>
          <Typography variant="caption" noWrap className="block" sx={{ color: "#94A3B8", fontSize: "0.75rem" }}>
            basket-tracker-main
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      {/* Top AppBar */}
      <AppBar
        position="fixed"
        color="inherit"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          bgcolor: "background.paper",
          height: 64,
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between", px: { xs: 2, sm: 4 }, height: "100%" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 1, display: { md: "none" } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                fontFamily: '"Outfit", sans-serif',
                color: "#1C2536",
                fontSize: "1.25rem",
              }}
            >
              {activeItem.label}
            </Typography>
            <Box className="hidden sm:flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                Vite 5.x
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                FastAPI 0.x
              </span>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: "#10B981",
                }}
              />
              <Typography variant="body2" sx={{ color: "#64748B", fontWeight: 500, fontSize: "0.875rem" }}>
                Backend Health: <strong className="text-slate-900 font-bold">OK</strong>
              </Typography>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Responsive Drawer Container */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
        aria-label="mailbox folders"
      >
        {/* Mobile Temporary Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: DRAWER_WIDTH,
              bgcolor: "#1C2536",
              color: "#FFFFFF",
              borderRight: "1px solid rgba(255, 255, 255, 0.08)",
            },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Desktop Permanent Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: DRAWER_WIDTH,
              bgcolor: "#1C2536",
              color: "#FFFFFF",
              borderRight: "1px solid rgba(255, 255, 255, 0.08)",
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 3, sm: 4 },
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: "64px",
          bgcolor: "background.default",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
