import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  MenuItem,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
} from "@mui/material";

import {
  Person,
  Email,
  Phone,
  Badge,
  Business,
  Lock,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";

function Register() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (
      !fullName ||
      !email ||
      !mobile ||
      !employeeId ||
      !department ||
      !password ||
      !confirmPassword
    ) {
      alert("Please fill all fields");
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    if (!agreeTerms) {
      alert("Please agree to the Terms & Conditions");
      return;
    }
    try {
      setLoading(true);
      const response = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
          mobile,
          employeeId,
          department,
          password,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.message || "Registration failed");
        return;
      }
      alert("Registration Successful");
      setFullName("");
      setEmail("");
      setMobile("");
      setEmployeeId("");
      setDepartment("");
      setPassword("");
      setConfirmPassword("");
      setAgreeTerms(false);

      navigate("/");
    } catch (error) {
      console.error("Registration Error:", error);
      alert(
        "Cannot connect to backend server. Please make sure the server is running."
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <Container
      maxWidth="sm"
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        py: 3,
      }}
    >
      <Paper
        elevation={8}
        sx={{
          p: 5,
          width: "100%",
          borderRadius: 4,
        }}
      >
        <Typography
          variant="h4"
          align="center"
          fontWeight="bold"
          mb={1}
        >
          Create Account
        </Typography>
        <Typography
          align="center"
          color="text.secondary"
          mb={3}
        >
          Radiology Medical Image Viewing System
        </Typography>
        <TextField
          fullWidth
          margin="normal"
          label="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Person />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          fullWidth
          margin="normal"
          label="Email Address"
          type="email"
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
          margin="normal"
          label="Mobile Number"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Phone />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          fullWidth
          margin="normal"
          label="Employee ID"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Badge />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          fullWidth
          select
          margin="normal"
          label="Department"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Business />
              </InputAdornment>
            ),
          }}
        >
          <MenuItem value="Radiology">Radiology</MenuItem>
          <MenuItem value="Cardiology">Cardiology</MenuItem>
          <MenuItem value="Neurology">Neurology</MenuItem>
          <MenuItem value="Orthopedics">Orthopedics</MenuItem>
        </TextField>
        <TextField
          fullWidth
          margin="normal"
          label="Password"
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
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <TextField
          fullWidth
          margin="normal"
          label="Confirm Password"
          type={showConfirmPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                >
                  {showConfirmPassword ? (
                    <VisibilityOff />
                  ) : (
                    <Visibility />
                  )}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
            />
          }
          label="I agree to the Terms & Conditions"
          sx={{ mt: 1 }}
        />
        <Button
          fullWidth
          variant="contained"
          size="large"
          sx={{ mt: 2 }}
          onClick={handleRegister}
          disabled={loading}
        >
          {loading ? "Creating Account..." : "Create Account"}
        </Button>
        <Box textAlign="center" mt={3}>
          Already have an account?{" "}
          <Link to="/">Login</Link>
        </Box>
      </Paper>
    </Container>
  );
}
export default Register;