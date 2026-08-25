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
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
const drawerWidth = 250;
function Sidebar() {
  const location =
    useLocation();
  const navigate =
    useNavigate();
  const handleLogout = () => {
    const confirmLogout =
      window.confirm(
        "Are you sure you want to logout?"
      );
    if (confirmLogout) {
      localStorage.removeItem(
        "loggedInUser"
      );
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
        width:
          drawerWidth,
        flexShrink:
          0,
        "& .MuiDrawer-paper": {
          width:
            drawerWidth,
          boxSizing:
            "border-box",
          backgroundColor:
            "background.paper",
          color:
            "text.primary",
          borderRight:
            "1px solid",
          borderColor:
            "divider",
          transition:
            "background-color 0.3s ease, color 0.3s ease",
        },
      }}
    >
      <Toolbar />
      <List>
        {menuItems.map(
          (item) => (
            <ListItemButton
              key={
                item.text
              }
              component={
                Link
              }
              to={
                item.path
              }
              selected={
                location.pathname ===
                item.path
              }
              sx={{
                mx:
                  1,
                my:
                  0.5,
                borderRadius:
                  2,
                color:
                  "text.primary",
                "& .MuiListItemIcon-root":
                  {
                    color:
                      "text.secondary",
                  },
                "&.Mui-selected":
                  {
                    backgroundColor:
                      "primary.main",
                    color:
                      "primary.contrastText",

                    "& .MuiListItemIcon-root":
                      {
                        color:
                          "primary.contrastText",
                      },
                  },
                "&.Mui-selected:hover":
                  {
                    backgroundColor:
                      "primary.dark",
                  },
                "&:hover":
                  {
                    backgroundColor:
                      "action.hover",
                  },
              }}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={
                  item.text
                }
              />
            </ListItemButton>
          )
        )}
      </List>
      <Divider
        sx={{
          mt:
            2,
        }}
      />
      <List>
        <ListItemButton
          onClick={
            handleLogout
          }
          sx={{
            mx:
              1,
            borderRadius:
              2,
            color:
              "error.main",
            "& .MuiListItemIcon-root":
              {
                color:
                  "error.main",
              },
            "&:hover":
              {
                backgroundColor:
                  "action.hover",
              },
          }}
        >
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText
            primary="Logout"
          />
        </ListItemButton>
      </List>
    </Drawer>
  );
}
export default Sidebar;