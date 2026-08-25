import {
  Box,
  Toolbar,
  Typography,
} from "@mui/material";

import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
function Layout({
  children,
}) {
  return (
    <Box
      sx={{
        display:
          "flex",
        minHeight:
          "100vh",
        backgroundColor:
          "background.default",
        color:
          "text.primary",
        transition:
          "background-color 0.3s ease, color 0.3s ease",
      }}
    >
      <Navbar />
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow:
            1,
          p:
            3,
          backgroundColor:
            "background.default",
          color:
            "text.primary",
          minHeight:
            "100vh",
          transition:
            "background-color 0.3s ease, color 0.3s ease",
        }}
      >
        <Toolbar />
        {children}
        <Box
          sx={{
            mt:
              5,
            py:
              2,
            textAlign:
              "center",
            borderTop:
              "1px solid",
            borderColor:
              "divider",
            color:
              "text.secondary",
          }}
        >
          <Typography
            variant="body2"
          >
            © 2026 Radiology Medical
            Image Viewing System
          </Typography>
          <Typography
            variant="body2"
          >
            Developed by Manikanta Reddy
            {" | "}
            Version 1.0
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
export default Layout;