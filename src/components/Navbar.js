import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Avatar,
  Badge,
} from "@mui/material";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
function Navbar() {
  return (
    <AppBar
      position="fixed"
      elevation={2}
      sx={{
        backgroundColor: "#1565C0",
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar>
        {/* Logo */}
        <LocalHospitalIcon
          sx={{
            fontSize: 34,
            mr: 2,
          }}
        />
        {/* Project Name */}
        <Box sx={{ flexGrow: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: "bold",
              letterSpacing: 0.5,
            }}
          >
            Radiology Medical Image Viewing System
          </Typography>
          <Typography
            variant="caption"
            sx={{
              opacity: 0.9,
            }}
          >
            Radiology Information System (RIS)
          </Typography>
        </Box>
        {/* Notification */}
        <IconButton color="inherit">
          <Badge
            badgeContent={3}
            color="error"
          >
            <NotificationsIcon />
          </Badge>
        </IconButton>
        {/* User */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            ml: 2,
         }}
        >
          <Avatar
            sx={{
              bgcolor: "white",
              color: "#1565C0",
              width: 36,
              height: 36,
              mr: 1,
            }}
          >
            <AccountCircleIcon />
          </Avatar>
          <Box>
            <Typography
              variant="body2"
              fontWeight="bold"
            >
              Admin
            </Typography>
            <Typography
              variant="caption"
            >
              Radiologist
            </Typography>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;