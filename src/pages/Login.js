import {
  Container,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
} from "@mui/material";

import {
  LocalHospital,
  Email,
  Lock,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleLogin() {
    const savedUser = JSON.parse(localStorage.getItem("user"));

    if (!savedUser) {
      alert("No registered user found.");
      return;
    }

    if (
      email === savedUser.email &&
      password === savedUser.password
    ) {
      alert("Login Successful");
      navigate("/dashboard");
    } else {
      alert("Invalid Email or Password");
    }
  }
return (
  <Container maxWidth={false} disableGutters>
    <Grid container sx={{ minHeight: "100vh" }}>

      {/* Left Side */}
      <Grid
        item
        xs={12}
        md={5}
        sx={{
          background: "linear-gradient(135deg,#1976d2,#42a5f5)",
          color: "white",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          p: 5,
        }}
      >
        <LocalHospital sx={{ fontSize: 90, mb: 2 }} />

        <Typography variant="h3" fontWeight="bold" align="center">
          Radiology Medical
        </Typography>

        <Typography variant="h4" align="center" mb={3}>
          Image Viewing System
        </Typography>

        <Typography
          align="center"
          sx={{ maxWidth: 350, opacity: 0.9 }}
        >
          Securely manage patients, medical images,
          reports and diagnostics from one platform.
        </Typography>
      </Grid>

      {/* Right Side */}
      <Grid
        item
        xs={12}
        md={7}
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#f4f8fb",
        }}
      >
        <Paper
          elevation={8}
          sx={{
            width: 420,
            p: 5,
            borderRadius: 4,
          }}
        >
          <Typography
            variant="h4"
            fontWeight="bold"
            align="center"
            mb={1}
          >
            Welcome Back
          </Typography>

          <Typography
            align="center"
            color="text.secondary"
            mb={4}
          >
            Sign in to continue
          </Typography>

          <TextField
            fullWidth
            label="Email Address"
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="Password"
            margin="normal"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                  >
                    {showPassword ? (
                      <VisibilityOff />
                    ) : (
                      <Visibility />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mt={2}
          >
            <FormControlLabel
              control={<Checkbox />}
              label="Remember Me"
            />

            <Typography
              color="primary"
              sx={{ cursor: "pointer" }}
            >
              Forgot Password?
            </Typography>
          </Box>

          <Button
            fullWidth
            variant="contained"
            size="large"
            sx={{ mt: 3 }}
            onClick={handleLogin}
          >
            Sign In
          </Button>

          <Typography align="center" mt={3}>
            Don't have an account?{" "}
            <Link to="/register">
              Register
            </Link>
          </Typography>
        </Paper>
      </Grid>

    </Grid>
  </Container>
);
}
export default Login;