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
function Navbar() {
  let loggedInUser = null;
  try {
    const storedUser =
      localStorage.getItem(
        "loggedInUser"
      );
    if (storedUser) {
      loggedInUser =
        JSON.parse(storedUser);
    }
  } catch (error) {
    console.error(
      "Unable to read logged-in user:",
      error
    );
  }
  const userName =
    loggedInUser?.fullName ||
    "Admin";
  const department =
    loggedInUser?.department ||
    "Radiologist";
  const getInitials = (
    name
  ) => {
    if (!name) {
      return "A";
    }
    const words =
      name
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (
      words.length === 1
    ) {
      return words[0]
        .charAt(0)
        .toUpperCase();
    }
    return (
      words[0]
        .charAt(0)
        .toUpperCase() +
      words[
        words.length - 1
      ]
        .charAt(0)
        .toUpperCase()
    );
  };
  return (
    <AppBar
      position="fixed"
      elevation={2}
      color="primary"
      sx={{
        zIndex: (theme) =>
          theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar>
        <LocalHospitalIcon
          sx={{
            fontSize: 34,
            mr: 2,
          }}
        />
        <Box
          sx={{
            flexGrow: 1,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight:
                "bold",
              letterSpacing:
                0.5,
            }}
          >
            Radiology Medical
            Image Viewing System
          </Typography>
          <Typography
            variant="caption"
            sx={{
              opacity:
                0.9,
            }}
          >
            Radiology
            Information System
            (RIS)
          </Typography>
        </Box>
        <IconButton
          color="inherit"
        >
          <Badge
            badgeContent={3}
            color="error"
          >
            <NotificationsIcon />
          </Badge>
        </IconButton>
        <Box
          sx={{
            display:
              "flex",
            alignItems:
              "center",
            ml:
              2,
          }}
        >
          <Avatar
            sx={{
              bgcolor:
                "background.paper",
              color:
                "primary.main",
              width:
                36,
              height:
                36,
              mr:
                1,
            }}
          >
            {getInitials(
              userName
            )}
          </Avatar>
          <Box>
            <Typography
              variant="body2"
              fontWeight="bold"
            >
              {userName}
            </Typography>
            <Typography
              variant="caption"
            >
              {department}
            </Typography>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
export default Navbar;