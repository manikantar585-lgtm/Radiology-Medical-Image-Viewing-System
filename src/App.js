import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import {
  createTheme,
  ThemeProvider,
  CssBaseline,
} from "@mui/material";

import {
  useEffect,
  useState,
} from "react";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Studies from "./pages/Studies";
import Patients from "./pages/Patients";
import ImageViewer from "./pages/ImageViewer";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

const themeConfigs = {
  "ohif-blue": {
    primary: "#1565C0",
    secondary: "#42A5F5",
    background: "#F4F8FB",
    paper: "#FFFFFF",
    text: "#172033",
  },
  orchid: {
    primary: "#7B1FA2",
    secondary: "#BA68C8",
    background: "#FAF5FB",
    paper: "#FFFFFF",
    text: "#24152B",
  },
  arctic: {
    primary: "#0288D1",
    secondary: "#4FC3F7",
    background: "#F2FAFE",
    paper: "#FFFFFF",
    text: "#102A36",
  },
  verdant: {
    primary: "#2E7D32",
    secondary: "#66BB6A",
    background: "#F3FAF3",
    paper: "#FFFFFF",
    text: "#17261A",
  },
  midnight: {
    primary: "#5C6BC0",
    secondary: "#7986CB",
    background: "#101522",
    paper: "#171D2B",
    text: "#F4F6FA",
  },
  slate: {
    primary: "#475569",
    secondary: "#64748B",
    background: "#EDEFF2",
    paper: "#FFFFFF",
    text: "#172033",
  },
  deep: {
    primary: "#90CAF9",
    secondary: "#64B5F6",
    background: "#0B0F14",
    paper: "#111820",
    text: "#F1F5F9",
  },
};
const getSavedTheme = () => {
  const savedTheme =
    localStorage.getItem(
      "radiologyTheme"
    );
  if (
    savedTheme &&
    themeConfigs[savedTheme]
  ) {
    return savedTheme;
  }
  return "OHIF-blue";
};
function ProtectedRoute({
  children,
}) {
  const loggedInUser =
    localStorage.getItem(
      "loggedInUser"
    );
  if (!loggedInUser) {
   return (
      <Navigate
        to="/"
        replace
      />
    );
  }
  return children;
}
function App() {
  const [
    currentTheme,
    setCurrentTheme,
  ] = useState(
    getSavedTheme()
  );
  useEffect(() => {
    const handleThemeChange =
      () => {
        setCurrentTheme(
          getSavedTheme()
        );
      };
    window.addEventListener(
      "radiology-theme-change",
      handleThemeChange
    );
    return () => {
      window.removeEventListener(
        "radiology-theme-change",
        handleThemeChange
      );
    };
  }, []);
  const selectedColors =
    themeConfigs[
      currentTheme
    ] ||
    themeConfigs[
      "ohif-blue"
    ];
  const muiTheme =
    createTheme({
      palette: {
        mode:
          currentTheme ===
            "midnight" ||
          currentTheme ===
            "deep"
            ? "dark"
            : "light",
        primary: {
          main:
            selectedColors.primary,
        },
        secondary: {
          main:
            selectedColors.secondary,
        },
        background: {
          default:
            selectedColors.background,
          paper:
            selectedColors.paper,
        },
        text: {
          primary:
            selectedColors.text,
        },
      },
      typography: {
        fontFamily:
          '"Roboto", "Helvetica", "Arial", sans-serif',
      },
      shape: {
        borderRadius: 10,
      },
    });
  return (
    <ThemeProvider
      theme={
        muiTheme
      }
    >
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <Login />
            }
          />
          <Route
            path="/register"
            element={
              <Register />
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/studies"
            element={
              <ProtectedRoute>
                <Studies />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patients"
            element={
              <ProtectedRoute>
                <Patients />
              </ProtectedRoute>
            }
          />
          <Route
            path="/viewer"
            element={
              <ProtectedRoute>
                <ImageViewer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
export default App;