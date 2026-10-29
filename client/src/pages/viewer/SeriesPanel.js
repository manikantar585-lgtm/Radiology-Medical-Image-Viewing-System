import React from "react";

import { Box, CircularProgress, Stack, Typography } from "@mui/material";

import LayersIcon from "@mui/icons-material/Layers";

function Thumbnail({ index, url, selected, onClick }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        position: "relative",
        width: "100%",
        height: 78,
        flexShrink: 0,
        backgroundColor: "#05080c",
        border: selected ? "2px solid #42a5f5" : "1px solid #293646",
        borderRadius: 1,
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color .15s ease",
        "&:hover": { borderColor: "#607d9a" },
      }}
    >
      {url ? (
        <img
          src={url}
          alt={`Scan ${index + 1}`}
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            objectFit: "contain",
            background: "#000000",
          }}
        />
      ) : (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress size={15} thickness={3} />
        </Box>
      )}

      <Box
        sx={{
          position: "absolute",
          left: 3,
          bottom: 3,
          minWidth: 17,
          height: 17,
          px: 0.3,
          borderRadius: 0.5,
          backgroundColor: "rgba(0,0,0,.78)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography sx={{ fontSize: 9, lineHeight: 1, color: "#ffffff", fontWeight: 700 }}>
          {index + 1}
        </Typography>
      </Box>
    </Box>
  );
}

/** Left column: series summary and a clickable thumbnail strip. */
function SeriesPanel({ images, series, modality, selectedImageId, thumbnailUrls, onSelect }) {
  return (
    <Box
      sx={{
        minHeight: 0,
        overflow: "hidden",
        borderRight: "1px solid #252a34",
        backgroundColor: "#0d131a",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          height: 48,
          flexShrink: 0,
          px: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #273241",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.7 }}>
          <LayersIcon sx={{ fontSize: 17, color: "#90caf9" }} />
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#d7e2ee" }}>SERIES</Typography>
        </Box>
        <Typography sx={{ fontSize: 10, color: "#667689" }}>{images.length}</Typography>
      </Box>

      <Box sx={{ px: 1, py: 0.8, borderBottom: "1px solid #202b38" }}>
        <Typography
          sx={{
            fontSize: 10,
            color: "#9aa8b8",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {series?.seriesDescription || `${modality} Image Series`}
        </Typography>
        <Typography sx={{ fontSize: 9, color: "#5f6e80", mt: 0.25 }}>
          Series {series?.seriesNumber || 1}
        </Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          p: 0.7,
          "&::-webkit-scrollbar": { width: 5 },
          "&::-webkit-scrollbar-track": { background: "#0d131a" },
          "&::-webkit-scrollbar-thumb": { background: "#344252", borderRadius: 4 },
        }}
      >
        {images.length === 0 ? (
          <Box
            sx={{
              height: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              px: 1,
            }}
          >
            <Typography sx={{ fontSize: 10, color: "#657487" }}>No images available</Typography>
          </Box>
        ) : (
          <Stack spacing={0.55}>
            {images.map((item, index) => (
              <Thumbnail
                key={item.id}
                index={index}
                url={thumbnailUrls[item.id]}
                selected={Number(item.id) === Number(selectedImageId)}
                onClick={() => onSelect(item.id)}
              />
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

export default SeriesPanel;
