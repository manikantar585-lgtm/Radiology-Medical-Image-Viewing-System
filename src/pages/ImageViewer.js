import xray from "../assets/xray.png";
import { useLocation } from "react-router-dom";
import Layout from "../components/Layout";
import { useState, useRef } from "react";

import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Divider,
  Stack,
} from "@mui/material";

import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import RotateRightIcon from "@mui/icons-material/RotateRight";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
function ImageViewer() {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [image, setImage] = useState(xray);
  const fileInputRef = useRef(null);
  const handleImageUpload = (event) => {
  const file = event.target.files[0];

  if (file) {
    const imageURL = URL.createObjectURL(file);
    setImage(imageURL);
  }
};
  const location = useLocation();
  const patient = location.state?.patient;
  const handleZoomIn = () => {
    setZoom((prev) => prev + 0.2);
  };
  const handleZoomOut = () => {
    if (zoom > 0.4) {
      setZoom((prev) => prev - 0.2);
    }
  };
  const handleRotate = () => {
    setRotation((prev) => prev + 90);
  };
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = image;
    link.download = "Chest-Xray.png";
    link.click();
  };
  return (
    <Layout>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        Medical Image Viewer
      </Typography>
      <Grid container spacing={3}>
        {/* Left Panel */}
        <Grid item xs={12} md={3}>
          <Paper
            elevation={4}
            sx={{
              p: 3,
              borderRadius: 3,
              height: "100%",
            }}
          >
            <Typography variant="h6" fontWeight="bold">
              Patient Details
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography>
              <strong>Name:</strong> {patient?.name || "No Patient Selected"}
            </Typography>
            <Typography>
              <strong>MRN:</strong> {patient?.id || "-"}
            </Typography>
            <Typography>
              <strong>Age:</strong> {patient?.age || "-"}
            </Typography>
            <Typography>
              <strong>Gender:</strong> {patient?.gender || "-"}
            </Typography>
            <Typography>
              <strong>Phone:</strong> {patient?.phone || "-"}
            </Typography>
            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" fontWeight="bold">
              Study Information
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography>
              <strong>Study ID:</strong> ST001
            </Typography>
            <Typography>
              <strong>Modality:</strong> CT Scan
            </Typography>
            <Typography>
              <strong>Body Part:</strong> Chest
            </Typography>
            <Typography>
              <strong>Date:</strong> 06-Aug-2026
            </Typography>
            <Typography>
              <strong>Status:</strong> Completed
            </Typography>
          </Paper>
        </Grid>

        {/* Right Panel */}
        <Grid item xs={12} md={9}>
          <Paper
            elevation={4}
            sx={{
              p: 3,
              borderRadius: 3,
            }}
          >
            <Box
              sx={{
                height: 500,
                bgcolor: "#111",
                borderRadius: 2,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                overflow: "hidden",
              }}
            >
              <img
                src={image}
                alt="Medical Scan"
                style={{
                  width: "75%",
                  maxHeight: "450px",
                  objectFit: "contain",
                  transition: "0.3s",
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                }}
              />
            </Box>
            <Box mt={2}>
              <Typography>
                <strong>Zoom:</strong> {zoom.toFixed(1)}x
              </Typography>
              <Typography>
                <strong>Rotation:</strong> {rotation}°
              </Typography>
            </Box>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleImageUpload}
              />    
            <Stack
              direction="row"
              spacing={2}
              justifyContent="center"
              mt={3}
              flexWrap="wrap"
            >
              <Button
                variant="contained"
                color="secondary"
                startIcon={<UploadFileIcon />}
                onClick={() => fileInputRef.current.click()}
              >
                Upload Image
              </Button>
              <Button
                variant="contained"
                startIcon={<ZoomInIcon />}
                onClick={handleZoomIn}
              >
                Zoom In
              </Button>
              <Button
                variant="contained"
                startIcon={<ZoomOutIcon />}
                onClick={handleZoomOut}
              >
                Zoom Out
              </Button>
              <Button
                variant="outlined"
                startIcon={<RotateRightIcon />}
                onClick={handleRotate}
              >
                Rotate
              </Button>
              <Button
                variant="outlined"
                startIcon={<RestartAltIcon />}
                onClick={handleReset}
              >
                Reset
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
              >
                Download
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Layout>
  );
}
export default ImageViewer;