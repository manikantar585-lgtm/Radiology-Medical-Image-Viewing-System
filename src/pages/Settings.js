import Layout from "../components/Layout";
import {
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
} from "@mui/material";

function Settings() {
  return (
    <Layout>
      <Typography
        variant="h4"
        fontWeight="bold"
        mb={3}
      >
        Settings
      </Typography>
      <Paper
        elevation={4}
        sx={{
          p: 4,
          borderRadius: 3,
        }}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Hospital Name"
              defaultValue="City Hospital"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Administrator"
              defaultValue="Admin"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Email"
              defaultValue="admin@hospital.com"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Phone"
              defaultValue="+91 9876543210"
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              size="large"
            >
              Save Changes
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Layout>
  );
}

export default Settings;