import {
  useEffect,
  useState,
} from "react";

import Layout from "../components/Layout";

import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Divider,
  Stack,
} from "@mui/material";

import SettingsIcon from "@mui/icons-material/Settings";
import PaletteIcon from "@mui/icons-material/Palette";
import LanguageIcon from "@mui/icons-material/Language";
import KeyboardIcon from "@mui/icons-material/Keyboard";
const themeOptions = [
  {
    value: "ohif-blue",
    label: "Tonal: OHIF Blue",
    description:
      "Blue medical imaging workstation theme.",
    color: "#1565C0",
  },
  {
    value: "orchid",
    label: "Tonal: Orchid",
    description:
      "Purple-toned interface.",
    color: "#7B1FA2",
  },
  {
    value: "arctic",
    label: "Tonal: Arctic",
    description:
      "Cool light blue interface.",
    color: "#0288D1",
  },
  {
    value: "verdant",
    label: "Tonal: Verdant",
    description:
      "Green medical interface.",
    color: "#2E7D32",
  },
  {
    value: "midnight",
    label: "Neutral: Midnight",
    description:
      "Dark neutral workstation theme.",
    color: "#101522",
  },
  {
    value: "slate",
    label: "Neutral: Slate",
    description:
      "Dark slate interface.",
    color: "#334155",
  },
  {
    value: "deep",
    label: "Neutral: Deep",
    description:
      "Very dark interface.",
    color: "#111827",
  },
];
const defaultHotkeys = {
  zoom: "Z",
  zoomIn: "+",
  zoomOut: "-",
  zoomFit: "=",
  rotateRight: "R",
  rotateLeft: "L",
  reset: "Space",
  firstImage: "Home",
  lastImage: "End",
  nextImage: "ArrowDown",
  previousImage: "ArrowUp",
  cancel: "Escape",
};
const getSavedHotkeys = () => {
  try {
    const saved =
      localStorage.getItem(
        "radiologyHotkeys"
      );
    if (!saved) {
      return defaultHotkeys;
    }
    return {
      ...defaultHotkeys,
      ...JSON.parse(saved),
    };
  } catch (error) {
    console.error(
      "Unable to load hotkeys:",
      error
    );
    return defaultHotkeys;
  }
};
function Settings() {
  const [
    selectedTheme,
    setSelectedTheme,
  ] = useState(
    "ohif-blue"
  );
  const [
    appearanceOpen,
    setAppearanceOpen,
  ] = useState(false);
  const [
    hotkeysOpen,
    setHotkeysOpen,
  ] = useState(false);
  const [
    language,
    setLanguage,
  ] = useState(
    "English (US)"
  );
  const [
    hotkeys,
    setHotkeys,
  ] = useState(
    defaultHotkeys
  );
  useEffect(() => {
    const savedTheme =
      localStorage.getItem(
        "radiologyTheme"
      );
    const savedLanguage =
      localStorage.getItem(
        "radiologyLanguage"
      );
    if (savedTheme) {
      setSelectedTheme(
        savedTheme
      );
    }
    if (savedLanguage) {
      setLanguage(
        savedLanguage
      );
    }
    setHotkeys(
      getSavedHotkeys()
    );
  }, []);
  const handleSaveTheme =
    () => {
      localStorage.setItem(
        "radiologyTheme",
        selectedTheme
      );
      window.dispatchEvent(
        new Event(
          "radiology-theme-change"
        )
      );
      setAppearanceOpen(
        false
      );
    };
  const handleLanguageChange =
    (event) => {
      const value =
        event.target.value;
      setLanguage(
        value
      );
      localStorage.setItem(
        "radiologyLanguage",
        value
      );
    };
  const handleResetTheme =
    () => {
      setSelectedTheme(
        "ohif-blue"
      );
      localStorage.setItem(
        "radiologyTheme",
        "ohif-blue"
      );
      window.dispatchEvent(
        new Event(
          "radiology-theme-change"
        )
      );
    };
  const handleHotkeyChange =
    (
      keyName,
      value
    ) => {
      setHotkeys(
        (previous) => ({
          ...previous,
          [keyName]:
            value,
        })
      );
    };
  const handleSaveHotkeys =
    () => {
      localStorage.setItem(
        "radiologyHotkeys",
        JSON.stringify(
          hotkeys
        )
      );
      window.dispatchEvent(
        new Event(
          "radiology-hotkeys-change"
        )
      );
      setHotkeysOpen(
        false
      );
    };
  const handleResetHotkeys =
    () => {
      setHotkeys(
        defaultHotkeys
      );
      localStorage.setItem(
        "radiologyHotkeys",
        JSON.stringify(
          defaultHotkeys
        )
      );
      window.dispatchEvent(
        new Event(
          "radiology-hotkeys-change"
        )
      );
    };
  const currentTheme =
    themeOptions.find(
      (theme) =>
        theme.value ===
        selectedTheme
    ) ||
    themeOptions[0];
  return (
    <Layout>
      <Box>
        <Box
          sx={{
            mb: 3,
          }}
        >
          <Typography
            variant="h4"
            fontWeight="bold"
          >
            Settings
          </Typography>
          <Typography
            color="text.secondary"
            mt={1}
          >
            Manage your application
            preferences and viewer
            settings.
          </Typography>
        </Box>
        <Box
          sx={{
            display:
              "grid",
            gridTemplateColumns:
              {
                xs:
                  "1fr",
                md:
                  "1fr 1fr",
              },
            gap: 3,
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 3,
              borderRadius: 3,
            }}
          >
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              mb={2}
            >
              <LanguageIcon
                sx={{
                  fontSize:
                    34,
                  color:
                    "primary.main",
                }}
              />
              <Box>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                >
                  Language
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Select the application
                  language.
                </Typography>
              </Box>
            </Stack>
            <Divider
              sx={{
                mb: 2,
              }}
            />
            <TextField
              select
              fullWidth
              label="Language"
              value={
                language
              }
              onChange={
                handleLanguageChange
              }
            >
              <MenuItem
                value="English (US)"
              >
                English (US)
              </MenuItem>
            </TextField>
          </Paper>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              borderRadius: 3,
            }}
          >
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              mb={2}
            >
              <PaletteIcon
                sx={{
                  fontSize:
                    34,
                  color:
                    "primary.main",
                }}
              />
              <Box>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                >
                  Appearance
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Choose the interface
                  theme.
                </Typography>
              </Box>
            </Stack>
            <Divider
              sx={{
                mb: 2,
              }}
            />
            <Box
              sx={{
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",

                gap: 2,
              }}
            >
              <Box>
                <Typography
                  variant="body2"
                  fontWeight="bold"
                >
                  Theme
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  mt={0.5}
                >
                  {
                    currentTheme.label
                  }
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={
                  <PaletteIcon />
                }
                onClick={() =>
                  setAppearanceOpen(
                    true
                  )
                }
              >
                Change
              </Button>
            </Box>
            <Box
              sx={{
                mt: 3,
                p: 2,
                borderRadius: 2,
                border:
                  "1px solid",
                borderColor:
                  "divider",
                display:
                  "flex",
                alignItems:
                  "center",
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius:
                    "50%",
                  backgroundColor:
                    currentTheme.color,
                  flexShrink: 0,
                }}
              />
              <Box>
                <Typography
                  fontWeight="bold"
                >
                  {
                    currentTheme.label
                  }
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  {
                    currentTheme.description
                  }
                </Typography>
              </Box>
            </Box>
            <Button
              variant="text"
              sx={{
                mt: 2,
              }}
              onClick={
                handleResetTheme
              }
            >
              Reset to Default
            </Button>
          </Paper>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              borderRadius: 3,
            }}
          >
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              mb={2}
            >
              <KeyboardIcon
                sx={{
                  fontSize:
                    34,
                  color:
                    "primary.main",
                }}
              />
              <Box>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                >
                  Viewer Hotkeys
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Configure medical image
                  viewer shortcuts.
                </Typography>
              </Box>
            </Stack>
            <Divider
              sx={{
                mb: 2,
              }}
            />
            <Box
              sx={{
                display:
                  "grid",
                gridTemplateColumns:
                  {
                    xs:
                      "1fr",
                    sm:
                      "1fr 1fr",
                  },
                gap:
                  1.2,
              }}
            >
              <HotkeyPreview
                label="Zoom"
                value={
                  hotkeys.zoom
                }
              />
              <HotkeyPreview
                label="Zoom In"
                value={
                  hotkeys.zoomIn
                }
              />
              <HotkeyPreview
                label="Zoom Out"
                value={
                  hotkeys.zoomOut
                }
              />
              <HotkeyPreview
                label="Zoom to Fit"
                value={
                  hotkeys.zoomFit
                }
              />
              <HotkeyPreview
                label="Rotate Right"
                value={
                  hotkeys.rotateRight
                }
              />
              <HotkeyPreview
                label="Rotate Left"
                value={
                  hotkeys.rotateLeft
                }
              />
              <HotkeyPreview
                label="Reset"
                value={
                  hotkeys.reset
                }
              />
              <HotkeyPreview
                label="First Image"
                value={
                  hotkeys.firstImage
                }
              />
              <HotkeyPreview
                label="Last Image"
                value={
                  hotkeys.lastImage
                }
              />
              <HotkeyPreview
                label="Next Image"
                value={
                  hotkeys.nextImage
                }
              />
              <HotkeyPreview
                label="Previous Image"
                value={
                  hotkeys.previousImage
                }
              />
              <HotkeyPreview
                label="Cancel"
                value={
                  hotkeys.cancel
                }
              />
            </Box>
            <Stack
              direction="row"
              spacing={1.5}
              mt={3}
            >
              <Button
                variant="contained"
                startIcon={
                  <KeyboardIcon />
                }
                onClick={() =>
                  setHotkeysOpen(
                    true
                  )
                }
              >
                Configure Hotkeys
              </Button>
              <Button
                variant="outlined"
                onClick={
                  handleResetHotkeys
                }
              >
                Reset
              </Button>
            </Stack>
          </Paper>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              borderRadius: 3,
            }}
          >
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              mb={2}
            >
              <SettingsIcon
                sx={{
                  fontSize:
                    34,
                  color:
                    "primary.main",
                }}
              />
              <Box>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                >
                  System Information
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Application information.
                </Typography>
              </Box>
            </Stack>
            <Divider
              sx={{
                mb: 2,
              }}
            />
            <Stack
              spacing={1.2}
            >
              <Typography>
                <strong>
                  System:
                </strong>{" "}
                Radiology Medical
                Image Viewing System
              </Typography>
              <Typography>
                <strong>
                  Version:
                </strong>{" "}
                1.0
              </Typography>
              <Typography>
                <strong>
                  RIS:
                </strong>{" "}
                Radiology Information
                System
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
              >
                For project demonstration
                and educational use.
              </Typography>
            </Stack>
          </Paper>
        </Box>
        <Dialog
          open={
            appearanceOpen
          }
          onClose={() =>
            setAppearanceOpen(
              false
            )
          }
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            Appearance
          </DialogTitle>
          <DialogContent>
            <TextField
              select
              fullWidth
              label="Theme"
              value={
                selectedTheme
              }
              onChange={(
                event
              ) =>
                setSelectedTheme(
                  event.target.value
                )
              }
              sx={{
                mt: 1,
              }}
            >
              {themeOptions.map(
                (theme) => (
                  <MenuItem
                    key={
                      theme.value
                    }
                    value={
                      theme.value
                    }
                  >
                    {
                      theme.label
                    }
                  </MenuItem>
                )
              )}
            </TextField>
            <Box
              sx={{
                mt: 3,
                display:
                  "grid",
                gridTemplateColumns:
                  {
                    xs:
                      "1fr",

                    sm:
                      "1fr 1fr",
                  },
                gap: 1.5,
              }}
            >
              {themeOptions.map(
                (theme) => (
                  <Box
                    key={
                      theme.value
                    }
                    onClick={() =>
                      setSelectedTheme(
                        theme.value
                      )
                    }
                    sx={{
                      border:
                        selectedTheme ===
                        theme.value
                          ? `2px solid ${theme.color}`
                          : "1px solid",
                      borderColor:
                        selectedTheme ===
                        theme.value
                          ? theme.color
                          : "divider",
                      borderRadius:
                        2,
                      p: 1.5,
                      cursor:
                        "pointer",
                      transition:
                        "0.2s",
                      "&:hover": {
                        transform:
                          "translateY(-1px)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <Box
                        sx={{
                          width:
                            18,
                          height:
                            18,
                          borderRadius:
                            "50%",
                          backgroundColor:
                            theme.color,
                        }}
                      />
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                      >
                        {
                          theme.label
                        }
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      {
                        theme.description
                      }
                    </Typography>
                  </Box>
                )
              )}
            </Box>
          </DialogContent>
          <DialogActions
            sx={{
              p: 2,
            }}
          >
            <Button
              onClick={() =>
                setAppearanceOpen(
                  false
                )
              }
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={
                handleSaveTheme
              }
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={
            hotkeysOpen
          }
          onClose={() =>
            setHotkeysOpen(
              false
            )
          }
          fullWidth
          maxWidth="md"
        >
          <DialogTitle>
            User Preferences — Hotkeys
          </DialogTitle>
          <DialogContent>
            <Box
              sx={{
                display:
                  "grid",
                gridTemplateColumns:
                  {
                    xs:
                      "1fr",
                    sm:
                      "1fr 1fr",
                  },
                gap: 2,
                mt: 1,
              }}
            >
              <HotkeyField
                label="Zoom"
                value={
                  hotkeys.zoom
                }
                onChange={(value) =>
                  handleHotkeyChange(
                    "zoom",
                    value
                  )
                }
              />
              <HotkeyField
                label="Zoom In"
                value={
                  hotkeys.zoomIn
                }
                onChange={(value) =>
                  handleHotkeyChange(
                    "zoomIn",
                    value
                  )
                }
              />
              <HotkeyField
                label="Zoom Out"
                value={
                  hotkeys.zoomOut
                }
                onChange={(value) =>
                  handleHotkeyChange(
                    "zoomOut",
                    value
                  )
                }
              />
              <HotkeyField
                label="Zoom to Fit"
                value={
                  hotkeys.zoomFit
                }
                onChange={(value) =>
                  handleHotkeyChange(
                    "zoomFit",
                    value
                  )
                }
              />
              <HotkeyField
                label="Rotate Right"
                value={
                  hotkeys.rotateRight
                }
                onChange={(value) =>
                  handleHotkeyChange(
                    "rotateRight",
                    value
                  )
                }
              />
              <HotkeyField
                label="Rotate Left"
                value={
                  hotkeys.rotateLeft
                }
                onChange={(value) =>
                  handleHotkeyChange(
                    "rotateLeft",
                    value
                  )
                }
              />
              <HotkeyField
                label="Reset"
                value={
                  hotkeys.reset
                }
                onChange={(value) =>
                  handleHotkeyChange(
                    "reset",
                    value
                  )
                }
              />
              <HotkeyField
                label="First Image"
                value={
                  hotkeys.firstImage
                }
                onChange={(value) =>
                  handleHotkeyChange(
                    "firstImage",
                    value
                  )
                }
              />
              <HotkeyField
                label="Last Image"
                value={
                  hotkeys.lastImage
                }
                onChange={(value) =>
                  handleHotkeyChange(
                    "lastImage",
                    value
                  )
                }
              />
              <HotkeyField
                label="Next Image"
                value={
                  hotkeys.nextImage
                }
                onChange={(value) =>
                  handleHotkeyChange(
                    "nextImage",
                    value
                  )
                }
              />
              <HotkeyField
                label="Previous Image"
                value={
                  hotkeys.previousImage
                }
                onChange={(value) =>
                  handleHotkeyChange(
                    "previousImage",
                    value
                  )
                }
              />
              <HotkeyField
                label="Cancel"
                value={
                  hotkeys.cancel
                }
                onChange={(value) =>
                  handleHotkeyChange(
                    "cancel",
                    value
                  )
                }
              />
            </Box>
          </DialogContent>
          <DialogActions
            sx={{
              p: 2,
            }}
          >

            <Button
              onClick={() =>
                setHotkeysOpen(
                  false
                )
              }
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={
                handleSaveHotkeys
              }
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
function HotkeyPreview({
  label,
  value,
}) {
  return (
    <Box
      sx={{
        display:
          "flex",
        justifyContent:
          "space-between",
        alignItems:
          "center",
        border:
          "1px solid",
        borderColor:
          "divider",
        borderRadius:
          1.5,
        px:
          1.5,
        py:
          1,
      }}
    >
      <Typography
        variant="body2"
      >
        {
          label
        }
      </Typography>
      <Box
        component="kbd"
        sx={{
          border:
            "1px solid",
          borderColor:
            "divider",
          backgroundColor:
            "action.hover",
          borderRadius:
            1,
          px:
            1,
          py:
            0.4,
          minWidth:
            48,
          textAlign:
            "center",
          fontFamily:
            "monospace",
          fontWeight:
            "bold",
        }}
      >
        {
          value
        }
      </Box>
    </Box>
  );
}
function HotkeyField({
  label,
  value,
  onChange,
}) {
  return (
    <TextField
      fullWidth
      label={label}
      value={value}
      onChange={(
        event
      ) =>
        onChange(
          event.target.value
        )
      }
    />
  );
}
export default Settings;