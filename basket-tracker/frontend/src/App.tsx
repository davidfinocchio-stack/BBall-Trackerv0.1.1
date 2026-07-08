import { HashRouter } from "react-router-dom";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import AppRoutes from "./routes";

// Create a highly polished, professional basketball analytics theme
const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#6366F1", // Sleek Indigo
      light: "#818CF8",
      dark: "#4F46E5",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#1C2536", // Sleek Slate Navy Drawer Background
      light: "#2B384E",
      dark: "#111927",
      contrastText: "#FFFFFF",
    },
    background: {
      default: "#F4F6F8", // Sleek gray canvas background
      paper: "#FFFFFF", // Pristine white card background
    },
    text: {
      primary: "#1C2536", // Sleek slate primary text
      secondary: "#64748B", // Sleek slate-500 secondary text
    },
    success: {
      main: "#10B981", // Emerald-500
      light: "#D1FAE5", // Emerald-100
      dark: "#065F46", // Emerald-800
    },
    info: {
      main: "#3B82F6", // Blue-500
      light: "#DBEAFE", // Blue-100
      dark: "#1E40AF", // Blue-800
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 700,
    },
    h2: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 700,
    },
    h3: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 600,
    },
    h4: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 700,
      color: "#1C2536",
    },
    h5: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 600,
    },
    h6: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 700,
      fontSize: "1.1rem",
      color: "#1C2536",
    },
    subtitle1: {
      fontWeight: 500,
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
      letterSpacing: "0.025em",
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: "none",
          padding: "8px 16px",
          "&:hover": {
            boxShadow: "none",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
          borderRadius: 16, // 16px is exact rounded-2xl
          border: "1px solid #E2E8F0", // border-slate-200
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          borderBottom: "1px solid #E2E8F0",
        },
      },
    },
  },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </ThemeProvider>
  );
}
