import Layout from "../components/Layout";
import {
  Grid,
  Paper,
  Typography,
  Button,
  Box,
} from "@mui/material";

function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <Layout>

      <Typography variant="h4" fontWeight="bold" mb={1}>
        Welcome, {user?.fullName}
      </Typography>

      <Typography color="text.secondary" mb={4}>
        Radiology Medical Image Viewing System Dashboard
      </Typography>

      <Grid container spacing={3}>

        {/* Card 1 */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={4}
            sx={{
              p: 3,
              borderLeft: "6px solid #1976d2",
              borderRadius: 3,
            }}
          >
            <Typography color="text.secondary">
              Total Patients
            </Typography>

            <Typography variant="h3" fontWeight="bold">
              125
            </Typography>
          </Paper>
        </Grid>

        {/* Card 2 */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={4}
            sx={{
              p: 3,
              borderLeft: "6px solid green",
              borderRadius: 3,
            }}
          >
            <Typography color="text.secondary">
              Medical Images
            </Typography>

            <Typography variant="h3" fontWeight="bold">
              452
            </Typography>
          </Paper>
        </Grid>

        {/* Card 3 */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={4}
            sx={{
              p: 3,
              borderLeft: "6px solid orange",
              borderRadius: 3,
            }}
          >
            <Typography color="text.secondary">
              Reports
            </Typography>

            <Typography variant="h3" fontWeight="bold">
              89
            </Typography>
          </Paper>
        </Grid>

        {/* Card 4 */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={4}
            sx={{
              p: 3,
              borderLeft: "6px solid red",
              borderRadius: 3,
            }}
          >
            <Typography color="text.secondary">
              Radiologists
            </Typography>

            <Typography variant="h3" fontWeight="bold">
              12
            </Typography>
          </Paper>
        </Grid>

      </Grid>

      {/* Recent Activity */}

      <Grid container spacing={3} sx={{ mt: 2 }}>

        <Grid item xs={12} md={8}>
          <Paper
            elevation={4}
            sx={{
              p: 3,
              borderRadius: 3,
            }}
          >
            <Typography variant="h6" mb={2}>
              Recent Activity
            </Typography>

            <Typography>✅ New patient registered</Typography>
            <Typography>🩻 MRI image uploaded</Typography>
            <Typography>📄 Report generated</Typography>
            <Typography>👨‍⚕️ Radiologist logged in</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper
            elevation={4}
            sx={{
              p: 3,
              borderRadius: 3,
            }}
          >
            <Typography variant="h6" mb={2}>
              Quick Actions
            </Typography>

            <Box display="flex" flexDirection="column" gap={2}>

              <Button variant="contained">
                Add Patient
              </Button>

              <Button variant="contained" color="success">
                Upload Image
              </Button>

              <Button variant="contained" color="secondary">
                Generate Report
              </Button>

            </Box>

          </Paper>
        </Grid>

      </Grid>

    </Layout>
  );
}

export default Dashboard;