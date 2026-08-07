import { Box, Toolbar,Typography, } from "@mui/material";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

function Layout({ children }) {
  return (
    <Box sx={{ display: "flex" }}>
      <Navbar />
      <Sidebar />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          bgcolor: "#f4f8fb",
          minHeight: "100vh",
        }}
      >
        <Toolbar />

{children}

<Box
  sx={{
    mt: 5,
    py: 2,
    textAlign: "center",
    borderTop: "1px solid #ddd",
    color: "#666",
  }}
>
  <Typography variant="body2">
    © 2026 Radiology Medical Image Viewing System
  </Typography>
  <Typography variant="body2">
    Developed by Manikanta Reddy | Version 1.0
  </Typography>
</Box>
      </Box>
    </Box>
  );
}

export default Layout;