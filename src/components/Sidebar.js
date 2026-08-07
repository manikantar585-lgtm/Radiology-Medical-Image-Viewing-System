
import {
  Drawer,
  Toolbar,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";

import DashboardIcon from "@mui/icons-material/Dashboard";
import FolderIcon from "@mui/icons-material/Folder";
import PeopleIcon from "@mui/icons-material/People";
import ImageIcon from "@mui/icons-material/Image";
import DescriptionIcon from "@mui/icons-material/Description";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";

import {
  Link,useLocation,useNavigate,
} from "react-router-dom";

const drawerWidth = 250;

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const handleLogout = () => {
  const confirmLogout = window.confirm(
    "Are you sure you want to logout?"
  );

  if (confirmLogout) {
    navigate("/");
  }
};

  const menuItems = [
    {
      text: "Dashboard",
      icon: <DashboardIcon />,
      path: "/dashboard",
    },
    {
      text: "Study List",
      icon: <FolderIcon />,
      path: "/studies",
    },
    {
      text: "Patients",
      icon: <PeopleIcon />,
      path: "/patients",
    },
    {
      text: "Image Viewer",
      icon: <ImageIcon />,
      path: "/viewer",
    },
    {
      text: "Reports",
      icon: <DescriptionIcon />,
      path: "/reports",
    },
    {
      text: "Settings",
      icon: <SettingsIcon />,
      path: "/settings",
    },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,

        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          backgroundColor: "#ffffff",
          borderRight: "1px solid #e0e0e0",
        },
      }}
    >
      <Toolbar />
      <List>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.text}
            component={Link}
            to={item.path}
            selected={location.pathname === item.path}
            sx={{
              mx: 1,
              my: 0.5,
              borderRadius: 2,
              "&.Mui-selected": {
                backgroundColor: "#1565C0",
                color: "white",
                "& .MuiListItemIcon-root": {
                  color: "white",
                },
              },
            }}
          >
            <ListItemIcon>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItemButton>
        ))}
      </List>
      <Divider sx={{ mt: 2 }} />
      <List>
        <ListItemButton
  onClick={handleLogout}
  sx={{
    mx: 1,
    borderRadius: 2,
    color: "#d32f2f",
  }}
>
          <ListItemIcon sx={{ color: "#d32f2f" }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </List>
    </Drawer>
  );
}

export default Sidebar;