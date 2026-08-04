import { AppBar, Toolbar, Typography } from "@mui/material";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";

function Navbar() {
  return (
    <AppBar position="fixed">
      <Toolbar sx={{ justifyContent: "center" }}>

        <LocalHospitalIcon sx={{ mr: 2 }} />

        <Typography
          variant="h6"
          sx={{
            fontWeight: "bold",
          }}
        >
          Radiology Medical Image Viewing System
        </Typography>

      </Toolbar>
    </AppBar>
  );
}

export default Navbar;