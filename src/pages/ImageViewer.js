import Layout from "../components/Layout";

import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Divider,
} from "@mui/material";

import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import RotateRightIcon from "@mui/icons-material/RotateRight";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import FullscreenIcon from "@mui/icons-material/Fullscreen";

function ImageViewer() {
  return (
    <Layout>
      <Typography
        variant="h4"
        fontWeight="bold"
        mb={3}
      >
        Medical Image Viewer
      </Typography>
      <Grid container spacing={3}>
        {/* Left Panel */}
        <Grid item xs={12} md={3}>
          <Paper
            elevation={4}
            sx={{
              p: 3,
              height: "80vh",
            }}
          >
            <Typography
              variant="h6"
              mb={2}
            >
              Patient Details
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography>
              <strong>Patient</strong>
            </Typography>
            <Typography mb={2}>
              Manikanta
            </Typography>
            <Typography>
              <strong>MRN</strong>
            </Typography>
            <Typography mb={2}>
              MRN001
            </Typography>
            <Typography>
              <strong>Age</strong>
            </Typography>
            <Typography mb={2}>
              28 Years
            </Typography>
            <Typography>
              <strong>Gender</strong>
            </Typography>
            <Typography mb={2}>
              Male
            </Typography>
            <Typography>
              <strong>Study</strong>
            </Typography>
            <Typography mb={2}>
              CT Chest
            </Typography>
            <Typography>
              <strong>Doctor</strong>
            </Typography>
            <Typography mb={2}>
              Dr. Ramesh
            </Typography>
            <Divider sx={{ my: 3 }} />
            <Typography
              variant="h6"
              mb={2}
            >
              Available Studies
            </Typography>
            <Button
              fullWidth
              variant="contained"
              sx={{ mb: 1 }}
            >
              CT Chest
            </Button>
            <Button
              fullWidth
              variant="outlined"
              sx={{ mb: 1 }}
            >
              MRI Brain
            </Button>
            <Button
              fullWidth
              variant="outlined"
              sx={{ mb: 1 }}
            >
              X-Ray Hand
            </Button>
            <Button
              fullWidth
              variant="outlined"
            >
              Ultrasound
            </Button>
          </Paper>
        </Grid>
        {/* Viewer */}
        <Grid item xs={12} md={9}>
          <Paper
            elevation={4}
            sx={{
              p: 2,
              borderRadius: 3,
            }}
          >
            <Typography
              variant="h6"
              mb={2}
            >
              DICOM Viewer
            </Typography>
            <Box
              sx={{
                height: "60vh",
                bgcolor: "#101820",
                borderRadius: 2,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                color: "white",
                flexDirection: "column",
              }}
            >
              <Typography
                variant="h4"
              >
                Medical Image Viewer
              </Typography>
              <Typography
                mt={2}
                color="#bbbbbb"
              >
                CT / MRI / X-Ray Images will appear here.
              </Typography>
            </Box>
            <Box
              display="flex"
              gap={2}
              mt={3}
              flexWrap="wrap"
            >
             <Button
                variant="contained"
                startIcon={<ZoomInIcon />}
              >
                Zoom In
              </Button>
              <Button
                variant="contained"
                startIcon={<ZoomOutIcon />}
              >
                Zoom Out
              </Button>
                            <Button
                variant="contained"
                startIcon={<RotateRightIcon />}
              >
                Rotate
              </Button>
              <Button
                variant="outlined"
                startIcon={<RestartAltIcon />}
              >
                Reset
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<FullscreenIcon />}
              >
                Full Screen
              </Button>
            </Box>
            <Paper
              elevation={2}
              sx={{
                mt: 4,
                p: 3,
                borderRadius: 2,
              }}
            >
              <Typography
                variant="h6"
                mb={2}
              >
                Image Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography>
                    <strong>Modality:</strong> CT
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    <strong>Status:</strong> Completed
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    <strong>Resolution:</strong> 512 × 512
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    <strong>Slices:</strong> 125
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    <strong>Study Date:</strong> 05-Aug-2026
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    <strong>Radiologist:</strong> Dr. Ramesh
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Paper>
        </Grid>
      </Grid>
    </Layout>
  );
}
export default ImageViewer;