import React, { useRef } from "react";

import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import MedicalInformationIcon from "@mui/icons-material/MedicalInformation";
import PersonIcon from "@mui/icons-material/Person";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import UploadFileIcon from "@mui/icons-material/UploadFile";

const ellipsis = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

const dividerSx = { borderColor: "#2b3745", my: 1.2 };

const iconButtonSx = (color = "#d7e2ee", hover = "#263545") => ({
  color,
  backgroundColor: "#1b2632",
  "&:hover": { backgroundColor: hover },
});

/** Icon button with a tooltip that still shows while the button is disabled. */
function ToolbarButton({ title, onClick, disabled = false, busy = false, icon, sx }) {
  return (
    <Tooltip title={title}>
      <span>
        <IconButton size="small" disabled={disabled} onClick={onClick} sx={sx}>
          {busy ? <CircularProgress size={17} /> : icon}
        </IconButton>
      </span>
    </Tooltip>
  );
}

/** Labelled block with an icon, a bold title and a dim subtitle. */
function InfoBlock({ icon: Icon, title, subtitle, minWidth, maxWidth, titleSize }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, minWidth }}>
      <Icon sx={{ color: "#90caf9", fontSize: 20 }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{ fontSize: titleSize, fontWeight: 700, lineHeight: 1.2, maxWidth, ...ellipsis }}
        >
          {title}
        </Typography>
        <Typography sx={{ fontSize: 10, color: "#7f8ea3", maxWidth, ...ellipsis }}>
          {subtitle}
        </Typography>
      </Box>
    </Box>
  );
}

/** Patient/study summary bar with the viewer's file and AI actions. */
function ViewerHeader({
  patientName,
  patientId,
  studyId,
  studyDescription,
  modality,
  bodyPart,
  studyDate,
  imageCount,
  hasSelection,
  uploading,
  deleting,
  analyzing,
  onBack,
  onUpload,
  onDownload,
  onDelete,
  onFullscreen,
  onAnalyze,
}) {
  const fileInputRef = useRef(null);

  return (
    <Box
      sx={{
        height: 58,
        flexShrink: 0,
        backgroundColor: "#111821",
        borderBottom: "1px solid #273241",
        display: "flex",
        alignItems: "center",
        px: 1.5,
        gap: 1.5,
      }}
    >
      <Tooltip title="Back to Study List">
        <IconButton onClick={onBack} size="small" sx={iconButtonSx("#ffffff")}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <InfoBlock
        icon={PersonIcon}
        title={patientName}
        subtitle={`ID: ${patientId}`}
        minWidth={175}
        maxWidth={180}
        titleSize={13}
      />

      <Divider orientation="vertical" flexItem sx={dividerSx} />

      <InfoBlock
        icon={MedicalInformationIcon}
        title={studyId}
        subtitle={studyDescription}
        minWidth={180}
        maxWidth={190}
        titleSize={12}
      />

      <Divider orientation="vertical" flexItem sx={dividerSx} />

      <Chip
        label={modality}
        size="small"
        sx={{
          height: 25,
          borderRadius: 1,
          backgroundColor: "#1d3145",
          color: "#90caf9",
          fontSize: 11,
          fontWeight: 700,
        }}
      />

      <Chip
        label={bodyPart}
        size="small"
        sx={{
          maxWidth: 150,
          height: 25,
          borderRadius: 1,
          backgroundColor: "#18232e",
          color: "#aab8c7",
          fontSize: 10,
          "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" },
        }}
      />

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
        <CalendarTodayIcon sx={{ fontSize: 14, color: "#718096" }} />
        <Typography sx={{ fontSize: 10, color: "#9aa8b8", whiteSpace: "nowrap" }}>
          {studyDate}
        </Typography>
      </Box>

      <Box sx={{ flex: 1 }} />

      <Typography sx={{ fontSize: 10, color: "#8492a3" }}>{imageCount} images</Typography>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.dcm,.dicom"
        multiple
        hidden
        onChange={onUpload}
      />

      <ToolbarButton
        title="Import images"
        disabled={uploading}
        busy={uploading}
        onClick={() => fileInputRef.current?.click()}
        icon={<UploadFileIcon fontSize="small" />}
        sx={iconButtonSx()}
      />

      <ToolbarButton
        title="Download current image"
        disabled={!hasSelection}
        onClick={onDownload}
        icon={<DownloadIcon fontSize="small" />}
        sx={iconButtonSx()}
      />

      <ToolbarButton
        title="Delete current image"
        disabled={deleting || !hasSelection}
        busy={deleting}
        onClick={onDelete}
        icon={<DeleteIcon fontSize="small" />}
        sx={iconButtonSx("#ef9a9a", "#42252a")}
      />

      <ToolbarButton
        title="Fullscreen"
        onClick={onFullscreen}
        icon={<FullscreenIcon fontSize="small" />}
        sx={iconButtonSx()}
      />

      <Button
        variant="contained"
        size="small"
        startIcon={
          analyzing ? (
            <CircularProgress size={14} sx={{ color: "#ffffff" }} />
          ) : (
            <SmartToyIcon fontSize="small" />
          )
        }
        onClick={onAnalyze}
        disabled={analyzing || imageCount === 0}
        sx={{
          height: 31,
          textTransform: "none",
          fontSize: 11,
          fontWeight: 700,
          backgroundColor: "#1976d2",
          "&:hover": { backgroundColor: "#1565c0" },
        }}
      >
        {analyzing ? "Analyzing..." : "AI Analyze"}
      </Button>
    </Box>
  );
}

export default ViewerHeader;
