import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Divider,
  Stack,
} from "@mui/material";

import {
  LocalHospital,
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  Security,
  ImageSearch,
} from "@mui/icons-material";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
function Login() {
  const navigate =
    useNavigate();
  const [email, setEmail] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [showPassword, setShowPassword] =
    useState(false);
  const [loading, setLoading] =
    useState(false);
  async function handleLogin() {
    if (
      !email.trim() ||
      !password
    ) {
      alert(
        "Please enter email and password"
      );
      return;
    }
    setLoading(true);
    try {
      const response =
        await fetch(
          "http://localhost:5000/api/login",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              email:
                email.trim(),
              password:
                password,
            }),
          }
        );
      const data =
        await response.json();
      if (!response.ok) {
        alert(
          data.message ||
            "Invalid Email or Password"
        );
        return;
      }
      if (!data.user) {
        alert(
          "Login succeeded, but user information was not received."
        );
        return;
      }
      localStorage.removeItem(
        "user"
      );
      localStorage.removeItem(
        "fullName"
      );
      localStorage.removeItem(
        "userName"
      );
      localStorage.setItem(
        "loggedInUser",
        JSON.stringify(
          data.user
        )
      );
      alert(
        "Login Successful"
      );
      navigate(
        "/dashboard"
      );
    } catch (error) {
      console.error(
        "Login Error:",
        error
      );
      alert(
        "Cannot connect to backend server. Please make sure the server is running."
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <Box
      sx={{
        minHeight:
          "100vh",
        display:
          "flex",
        backgroundColor:
          "background.default",
        position:
          "relative",
        overflow:
          "hidden",
      }}
    >
      <Box
        sx={{
          width: {
            xs: "100%",
            md: "44%",
          },
          minHeight:
            "100vh",
          display: {
            xs: "none",
            md: "flex",
          },
          flexDirection:
            "column",
          justifyContent:
            "center",
          px: {
            md: 6,
            lg: 9,
          },
          py: 6,
          position:
            "relative",
          overflow:
            "hidden",
          background:
            (theme) =>
              `linear-gradient(
                145deg,
                ${theme.palette.primary.dark} 0%,
                ${theme.palette.primary.main} 55%,
                ${theme.palette.primary.light} 100%
              )`,
          color:
            "primary.contrastText",
        }}
      >
        <Box
          sx={{
            position:
              "absolute",
            width:
              320,
            height:
              320,
            borderRadius:
              "50%",
            top:
              -120,
            right:
              -120,
            backgroundColor:
              "rgba(255,255,255,0.08)",
          }}
        />
        <Box
          sx={{
            position:
              "absolute",
            width:
              220,
            height:
              220,
            borderRadius:
              "50%",
            bottom:
              -90,
            left:
              -90,
            backgroundColor:
              "rgba(255,255,255,0.07)",
          }}
        />
        <Box
          sx={{
            position:
              "relative",
            zIndex:
              1,
            maxWidth:
              520,
          }}
        >
          <Box
            sx={{
              width:
                64,
              height:
                64,
              borderRadius:
                2.5,
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              backgroundColor:
                "rgba(255,255,255,0.14)",
              border:
                "1px solid rgba(255,255,255,0.22)",
              mb:
                3,
            }}
          >
            <LocalHospital
              sx={{
                fontSize:
                  38,
              }}
            />
          </Box>
          <Typography
            variant="h3"
            sx={{
              fontWeight:
                700,
              lineHeight:
                1.12,
              letterSpacing:
                -0.5,
              mb:
                1.5,
              fontSize:
                {
                  md:
                    "2.5rem",
                  lg:
                    "3rem",
                },
            }}
          >
            Radiology Medical
            <br />
            Image Viewing System
          </Typography>
          <Typography
            sx={{
              fontSize:
                "1.05rem",
              lineHeight:
                1.7,
              opacity:
                0.92,
              maxWidth:
                470,
            }}
          >
            A secure medical imaging
            workspace for managing
            patients, studies,
            diagnostic images and
            radiology reports from
            one platform.
          </Typography>
          <Divider
            sx={{
              my:
                4,
              borderColor:
                "rgba(255,255,255,0.22)",
              maxWidth:
                460,
            }}
          />
          <Stack
            spacing={
              2
            }
          >
            <Box
              sx={{
                display:
                  "flex",
                alignItems:
                  "center",
                gap:
                  1.5,
              }}
            >
              <Box
                sx={{
                  width:
                    36,
                  height:
                    36,
                  borderRadius:
                    1.5,
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  backgroundColor:
                    "rgba(255,255,255,0.12)",
                }}
              >
                <Security
                  fontSize="small"
                />
              </Box>
              <Box>
                <Typography
                  fontWeight="bold"
                >
                  Secure Access
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    opacity:
                      0.82,
                  }}
                >
                  Protected user
                  authentication
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                display:
                  "flex",
                alignItems:
                  "center",
                gap:
                  1.5,
              }}
            >
              <Box
                sx={{
                  width:
                    36,
                  height:
                    36,
                  borderRadius:
                    1.5,
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  backgroundColor:
                    "rgba(255,255,255,0.12)",
                }}
              >
                <ImageSearch
                  fontSize="small"
                />
              </Box>
              <Box>
                <Typography
                  fontWeight="bold"
                >
                  Medical Image Viewer
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    opacity:
                      0.82,
                  }}
                >
                  View and manage
                  diagnostic studies
                </Typography>
              </Box>
            </Box>
          </Stack>
        </Box>
        <Typography
          variant="caption"
          sx={{
            position:
              "absolute",
            bottom:
              24,
            left:
              {
                md:
                  48,
                lg:
                  72,
              },
            opacity:
              0.7,
          }}
        >
          Radiology Information
          System (RIS)
        </Typography>
      </Box>
      <Box
        sx={{
          width: {
            xs: "100%",
            md: "56%",
          },
          minHeight:
            "100vh",
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          px: {
            xs: 2,
            sm: 4,
            md: 6,
            lg: 10,
          },
          py:
            5,
          backgroundColor:
            "background.default",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width:
              "100%",
            maxWidth:
              470,
            p: {
              xs: 3,
              sm: 4.5,
            },
            borderRadius:
              3,
            backgroundColor:
              "background.paper",
            border:
              "1px solid",
            borderColor:
              "divider",
            boxShadow:
              "0 18px 50px rgba(15, 23, 42, 0.12)",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              mb:
                3.5,
            }}
          >
            <Typography
              variant="h4"
              fontWeight="bold"
              sx={{
                letterSpacing:
                  -0.5,
              }}
            >
              Welcome Back
            </Typography>
            <Typography
              color="text.secondary"
              sx={{
                mt:
                  0.8,
              }}
            >
              Sign in to access your
              radiology workspace.
            </Typography>
          </Box>
          <TextField
            fullWidth
            label="Email Address"
            placeholder="Enter your email"
            margin="normal"
            value={
              email
            }
            onChange={(
              event
            ) =>
              setEmail(
                event.target.value
              )
            }
            autoComplete="email"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment
                    position="start"
                  >
                    <Email
                      color="action"
                    />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            fullWidth
            label="Password"
            placeholder="Enter your password"
            margin="normal"
            type={
              showPassword
                ? "text"
                : "password"
            }
            value={
              password
            }
            onChange={(
              event
            ) =>
              setPassword(
                event.target.value
              )
            }
            autoComplete="current-password"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment
                    position="start"
                  >
                   <Lock
                      color="action"
                    />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment
                    position="end"
                  >
                    <IconButton
                      type="button"
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      onClick={() =>
                        setShowPassword(
                          (
                            previous
                          ) =>
                            !previous
                        )
                      }
                      edge="end"
                    >
                      {showPassword ? (
                        <VisibilityOff />
                      ) : (
                        <Visibility />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <Box
            sx={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              mt:
                1.5,
              flexWrap:
                "wrap",
             gap:
                1,
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                />
              }
              label={
                <Typography
                  variant="body2"
                >
                  Remember Me
                </Typography>
              }
            />
            <Typography
              variant="body2"
              color="primary"
              sx={{
                cursor:
                  "pointer",
                fontWeight:
                  500,
                "&:hover":
                  {
                    textDecoration:
                      "underline",
                  },
              }}
            >
              Forgot Password?
            </Typography>
          </Box>
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={
              handleLogin
            }
            disabled={
              loading
            }
            sx={{
              mt:
                3,
              py:
                1.5,
              borderRadius:
                1.8,
              fontWeight:
                700,
              textTransform:
                "none",
              fontSize:
                "1rem",
              boxShadow:
                "none",
              "&:hover":
                {
                  boxShadow:
                    "none",
                },
            }}
          >
            {loading
              ? "Signing In..."
              : "Sign In"}
          </Button>
          <Box
            sx={{
              display:
                "flex",
              alignItems:
                "center",
              gap:
                1.5,
              my:
                3,
            }}
          >
            <Divider
              sx={{
                flex:
                  1,
              }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
            >
              OR
            </Typography>
            <Divider
              sx={{
                flex:
                  1,
              }}
            />
          </Box>
          <Typography
            align="center"
            variant="body2"
            color="text.secondary"
          >
            Don't have an account?{" "}
            <Box
              component={Link}
              to="/register"
              sx={{
                color:
                  "primary.main",
                fontWeight:
                  600,
                textDecoration:
                  "none",
                "&:hover":
                  {
                    textDecoration:
                      "underline",
                  },
              }}
            >
              Create an account
            </Box>
          </Typography>
          {/* Security note */}
          <Box
            sx={{
              mt:
                3.5,
              p:
                1.5,
              borderRadius:
                1.5,
              backgroundColor:
                "action.hover",
              display:
                "flex",
              alignItems:
                "flex-start",
              gap:
                1,
            }}
          >
            <Security
              fontSize="small"
              color="action"
            />
            <Typography
              variant="caption"
              color="text.secondary"
              lineHeight={1.5}
            >
              Authorized users only.
              This system is intended
              for radiology information
              and medical image
              management.
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
export default Login;