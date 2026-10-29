import React from "react";

import { Box, Typography } from "@mui/material";

function ViewerFooter({ modality, bodyPart, imageCount }) {
  return (
    <Box
      sx={{
        height: 30,
        flexShrink: 0,
        backgroundColor: "#0b1118",
        borderTop: "1px solid #273241",
        display: "flex",
        alignItems: "center",
        px: 1.5,
      }}
    >
      <Typography sx={{ fontSize: 9, color: "#66778a" }}>
        {modality} • {bodyPart} • {imageCount} images
      </Typography>
      <Box sx={{ flex: 1 }} />
      <Typography sx={{ fontSize: 8.5, color: "#526174" }}>
        Radiology Imaging Workstation
      </Typography>
    </Box>
  );
}

export default ViewerFooter;
