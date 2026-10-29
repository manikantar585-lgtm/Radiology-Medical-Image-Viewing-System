import React, { useCallback, useEffect, useRef, useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";

import AIAnalysisPanel from "../components/AIAnalysisPanel";
import DicomViewport from "../components/DicomViewport";
import Layout from "../components/Layout";

import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import LayersIcon from "@mui/icons-material/Layers";
import MedicalInformationIcon from "@mui/icons-material/MedicalInformation";
import PersonIcon from "@mui/icons-material/Person";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import UploadFileIcon from "@mui/icons-material/UploadFile";

import { API_URL, authHeaders, jsonHeaders, getCurrentUserId } from "../api/http";
import { formatDate } from "../utils/format";
import { getSavedHotkeys, normalizeHotkey } from "../utils/hotkeys";

function getModality(value) {
  const modality = String(value || "").toUpperCase();

  if (modality.includes("CT")) {
    return "CT";
  }

  if (modality.includes("MRI") || modality === "MR") {
    return "MR";
  }

  if (modality.includes("X-RAY") || modality.includes("XRAY") || modality === "XR") {
    return "XR";
  }

  if (modality.includes("ULTRASOUND") || modality === "US") {
    return "US";
  }

  if (modality.includes("PET")) {
    return "PT";
  }

  return modality || "OT";
}

function ImageViewer() {
  const location = useLocation();
  const navigate = useNavigate();

  const patient = location.state?.patient || null;
  const study = location.state?.study || null;

  const [images, setImages] = useState([]);
  const [series, setSeries] = useState(null);

  const [selectedImageId, setSelectedImageId] = useState(null);

  const [thumbnailUrls, setThumbnailUrls] = useState({});

  const [uploading, setUploading] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const [analysisStatus, setAnalysisStatus] = useState("idle");

  const [aiResult, setAiResult] = useState(null);

  const [aiFindings, setAiFindings] = useState([]);

  const viewerRef = useRef(null);
  const dicomViewportRef = useRef(null);
  const fileInputRef = useRef(null);

  const thumbnailCacheRef = useRef({});

  const hotkeys = useState(getSavedHotkeys())[0];

  const currentIndex = images.findIndex((item) => Number(item.id) === Number(selectedImageId));

  const selectedImage = images.find((item) => Number(item.id) === Number(selectedImageId));

  const modality = getModality(study?.modality || series?.modality);

  const patientName = patient?.name || patient?.Name || patient?.patientName || "Unknown Patient";

  const patientId = patient?.id || patient?.Id || patient?.patientId || "-";

  const studyId = study?.studyId || study?.StudyId || study?.id || study?.Id || "-";

  const bodyPart = study?.bodyPart || study?.BodyPart || "Not specified";

  const studyDescription =
    study?.studyDescription ||
    study?.StudyDescription ||
    series?.seriesDescription ||
    "Medical Imaging Study";

  const studyDate = formatDate(study?.studyDate || study?.StudyDate);

  const resetViewer = useCallback(() => {
    dicomViewportRef.current?.reset();
  }, []);

  const zoomIn = useCallback(() => {
    dicomViewportRef.current?.zoomBy(1.2);
  }, []);

  const zoomOut = useCallback(() => {
    dicomViewportRef.current?.zoomBy(1 / 1.2);
  }, []);

  const rotateRight = useCallback(() => {
    dicomViewportRef.current?.rotateBy(90);
  }, []);

  const rotateLeft = useCallback(() => {
    dicomViewportRef.current?.rotateBy(-90);
  }, []);

  const selectImageByIndex = useCallback(
    (index) => {
      if (index < 0 || index >= images.length) {
        return;
      }

      setSelectedImageId(images[index].id);
    },
    [images]
  );

  const firstImage = useCallback(() => {
    selectImageByIndex(0);
  }, [selectImageByIndex]);

  const lastImage = useCallback(() => {
    selectImageByIndex(images.length - 1);
  }, [images.length, selectImageByIndex]);

  const nextImage = useCallback(() => {
    if (currentIndex >= 0 && currentIndex < images.length - 1) {
      selectImageByIndex(currentIndex + 1);
    }
  }, [currentIndex, images.length, selectImageByIndex]);

  const previousImage = useCallback(() => {
    if (currentIndex > 0) {
      selectImageByIndex(currentIndex - 1);
    }
  }, [currentIndex, selectImageByIndex]);

  const loadStudyImages = useCallback(async () => {
    if (!patient?.id || !study?.id) {
      setImages([]);
      setSeries(null);
      setSelectedImageId(null);
      return;
    }

    const userId = getCurrentUserId();

    if (!userId) {
      alert("Your login session was not found. Please login again.");
      navigate("/");
      return;
    }

    try {
      let loadedSeries = null;

      try {
        const seriesResponse = await fetch(
          `${API_URL}/api/series?patientId=${patient.id}&studyId=${study.id}`,
          {
            method: "GET",
            headers: jsonHeaders(),
          }
        );

        if (seriesResponse.ok) {
          const seriesData = await seriesResponse.json();

          if (Array.isArray(seriesData?.series)) {
            loadedSeries = seriesData.series[0] || null;
          } else {
            loadedSeries = seriesData?.series || null;
          }
        }
      } catch (error) {
        console.warn("Series loading warning:", error);
      }

      setSeries(loadedSeries);

      let url = `${API_URL}/api/images?patientId=${patient.id}&studyId=${study.id}`;

      if (loadedSeries?.id) {
        url += `&seriesId=${loadedSeries.id}`;
      }

      let response = await fetch(url, {
        method: "GET",
        headers: jsonHeaders(),
      });

      let data = {};

      if (response.ok) {
        data = await response.json();
      }

      let loadedImages = Array.isArray(data?.images) ? data.images : [];

      if (loadedImages.length === 0 && loadedSeries?.id) {
        const fallback = await fetch(
          `${API_URL}/api/images?patientId=${patient.id}&studyId=${study.id}`,
          {
            method: "GET",
            headers: jsonHeaders(),
          }
        );

        if (fallback.ok) {
          const fallbackData = await fallback.json();

          loadedImages = Array.isArray(fallbackData?.images) ? fallbackData.images : [];
        }
      }

      loadedImages.sort((a, b) => {
        const orderA = Number(a?.imageOrder ?? a?.ImageOrder ?? 0);

        const orderB = Number(b?.imageOrder ?? b?.ImageOrder ?? 0);

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        return Number(a?.id || 0) - Number(b?.id || 0);
      });

      setImages(loadedImages);
      setThumbnailUrls({});

      if (loadedImages.length > 0) {
        setSelectedImageId(loadedImages[0].id);
      } else {
        setSelectedImageId(null);
      }
    } catch (error) {
      console.error("Study image loading error:", error);

      setImages([]);
      setSeries(null);
      setSelectedImageId(null);

      alert(error?.message || "Unable to load study images.");
    }
  }, [patient?.id, study?.id, navigate]);

  useEffect(() => {
    loadStudyImages();
  }, [loadStudyImages]);

  useEffect(() => {
    let cancelled = false;

    async function loadThumbnails() {
      if (images.length === 0) {
        setThumbnailUrls({});
        return;
      }

      const nextUrls = {};

      await Promise.all(
        images.map(async (item) => {
          if (cancelled) {
            return;
          }

          if (thumbnailCacheRef.current[item.id]) {
            nextUrls[item.id] = thumbnailCacheRef.current[item.id];

            return;
          }

          try {
            const response = await fetch(`${API_URL}/api/images/${item.id}/preview`, {
              method: "GET",
              headers: authHeaders(),
            });

            if (!response.ok) {
              return;
            }

            const blob = await response.blob();

            const url = URL.createObjectURL(blob);

            thumbnailCacheRef.current[item.id] = url;

            nextUrls[item.id] = url;
          } catch (error) {
            console.warn("Thumbnail loading warning:", item.id, error);
          }
        })
      );

      if (!cancelled) {
        setThumbnailUrls(nextUrls);
      }
    }

    loadThumbnails();

    return () => {
      cancelled = true;
    };
  }, [images]);

  const handleBack = useCallback(() => {
    navigate("/studies", {
      state: {
        patient,
      },
    });
  }, [navigate, patient]);

  const handleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await viewerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  }, []);

  const handleUpload = useCallback(
    async (event) => {
      const selectedFiles = Array.from(event.target.files || []);

      if (selectedFiles.length === 0) {
        return;
      }

      if (!patient?.id || !study?.id) {
        alert("Patient and study information are required.");

        event.target.value = "";
        return;
      }

      const userId = getCurrentUserId();

      if (!userId) {
        alert("Your login session was not found. Please login again.");

        navigate("/");
        return;
      }

      try {
        setUploading(true);

        const formData = new FormData();

        selectedFiles.forEach((file) => {
          formData.append("images", file);
        });

        formData.append("patientId", String(patient.id));

        formData.append("studyId", String(study.id));

        formData.append("seriesNumber", String(series?.seriesNumber || 1));

        formData.append(
          "seriesDescription",
          series?.seriesDescription || `${modality} Image Series`
        );

        formData.append("modality", study?.modality || "OT");

        const response = await fetch(`${API_URL}/api/series/upload`, {
          method: "POST",
          headers: {
            ...authHeaders(),
          },
          body: formData,
        });

        let data = {};

        try {
          data = await response.json();
        } catch (error) {
          data = {};
        }

        if (!response.ok) {
          throw new Error(data?.message || "Unable to upload images.");
        }

        await loadStudyImages();

        alert(
          `${selectedFiles.length} image${
            selectedFiles.length === 1 ? "" : "s"
          } uploaded successfully.`
        );
      } catch (error) {
        console.error("Upload error:", error);

        alert(error?.message || "Unable to upload images.");
      } finally {
        setUploading(false);
        event.target.value = "";
      }
    },
    [
      patient?.id,
      study?.id,
      series?.seriesNumber,
      series?.seriesDescription,
      study?.modality,
      modality,
      navigate,
      loadStudyImages,
    ]
  );

  const handleDownload = useCallback(async () => {
    if (!selectedImageId) {
      alert("Please select an image first.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/images/${selectedImageId}`, {
        method: "GET",
        headers: authHeaders(),
      });

      if (!response.ok) {
        throw new Error("Unable to download image.");
      }

      const blob = await response.blob();

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;

      link.download = selectedImage?.fileName || `medical-image-${selectedImageId}`;

      document.body.appendChild(link);

      link.click();
      link.remove();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error("Download error:", error);

      alert(error?.message || "Unable to download image.");
    }
  }, [selectedImageId, selectedImage?.fileName]);

  const handleDelete = useCallback(async () => {
    if (!selectedImageId) {
      alert("Please select an image first.");

      return;
    }

    const confirmed = window.confirm(`Delete ${selectedImage?.fileName || "this image"}?`);

    if (!confirmed) {
      return;
    }

    const userId = getCurrentUserId();

    if (!userId) {
      alert("Your login session was not found. Please login again.");

      navigate("/");
      return;
    }

    try {
      setDeleting(true);

      const response = await fetch(`${API_URL}/api/images/${selectedImageId}`, {
        method: "DELETE",
        headers: {
          ...authHeaders(),
        },
      });

      let data = {};

      try {
        data = await response.json();
      } catch (error) {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data?.message || "Unable to delete image.");
      }

      if (thumbnailCacheRef.current[selectedImageId]) {
        URL.revokeObjectURL(thumbnailCacheRef.current[selectedImageId]);

        delete thumbnailCacheRef.current[selectedImageId];
      }

      setSelectedImageId(null);

      await loadStudyImages();
    } catch (error) {
      console.error("Delete error:", error);

      alert(error?.message || "Unable to delete image.");
    } finally {
      setDeleting(false);
    }
  }, [selectedImageId, selectedImage?.fileName, navigate, loadStudyImages]);

  const handleAIAnalysis = useCallback(async () => {
    if (!patient?.id || !study?.id) {
      alert("Patient and study information are required.");

      return;
    }

    if (images.length === 0) {
      alert("No images are available for AI analysis.");

      return;
    }

    const userId = getCurrentUserId();

    if (!userId) {
      alert("Your login session was not found. Please login again.");

      navigate("/");
      return;
    }

    try {
      setAnalysisStatus("processing");

      setAiResult(null);
      setAiFindings([]);

      const response = await fetch(`${API_URL}/api/ai/analyze-study`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          patientId: patient.id,
          studyId: study.id,
          seriesId: series?.id || null,
        }),
      });

      let data = {};

      try {
        data = await response.json();
      } catch (error) {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data?.message || "AI analysis failed.");
      }

      const result = data?.result || data;

      setAiResult(result);

      setAiFindings(Array.isArray(result?.findings) ? result.findings : []);

      setAnalysisStatus("completed");
    } catch (error) {
      console.error("AI analysis error:", error);

      setAnalysisStatus("error");

      setAiResult(null);
      setAiFindings([]);

      alert(error?.message || "AI analysis failed. Check the AI service.");
    }
  }, [patient?.id, study?.id, series?.id, images.length, navigate]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;

      const tag = target?.tagName?.toLowerCase();

      if (tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable) {
        return;
      }

      const key = normalizeHotkey(event.key);

      if (key === normalizeHotkey(hotkeys.zoomIn)) {
        event.preventDefault();
        zoomIn();
        return;
      }

      if (key === normalizeHotkey(hotkeys.zoomOut)) {
        event.preventDefault();
        zoomOut();
        return;
      }

      if (key === normalizeHotkey(hotkeys.reset)) {
        event.preventDefault();
        resetViewer();
        return;
      }

      if (key === normalizeHotkey(hotkeys.rotateRight)) {
        event.preventDefault();
        rotateRight();
        return;
      }

      if (key === normalizeHotkey(hotkeys.rotateLeft)) {
        event.preventDefault();
        rotateLeft();
        return;
      }

      if (key === normalizeHotkey(hotkeys.firstImage)) {
        event.preventDefault();
        firstImage();
        return;
      }

      if (key === normalizeHotkey(hotkeys.lastImage)) {
        event.preventDefault();
        lastImage();
        return;
      }

      if (key === normalizeHotkey(hotkeys.nextImage)) {
        event.preventDefault();
        nextImage();
        return;
      }

      if (key === normalizeHotkey(hotkeys.previousImage)) {
        event.preventDefault();
        previousImage();
        return;
      }

      if (key === normalizeHotkey(hotkeys.cancel)) {
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    hotkeys,
    zoomIn,
    zoomOut,
    resetViewer,
    rotateRight,
    rotateLeft,
    firstImage,
    lastImage,
    nextImage,
    previousImage,
  ]);
  return (
    <Layout>
      <Box
        ref={viewerRef}
        sx={{
          width: "100%",
          // Fit below the app bar (64px) and the page padding (2 × 24px).
          height: "calc(100vh - 112px)",
          minHeight: 560,
          overflow: "hidden",
          backgroundColor: "#080c11",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* =====================================================
            PATIENT / STUDY HEADER
           ===================================================== */}

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
          {/* BACK */}

          <Tooltip title="Back to Study List">
            <IconButton
              onClick={handleBack}
              size="small"
              sx={{
                color: "#ffffff",
                backgroundColor: "#1b2632",
                "&:hover": {
                  backgroundColor: "#263545",
                },
              }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* PATIENT */}

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.8,
              minWidth: 175,
            }}
          >
            <PersonIcon
              sx={{
                color: "#90caf9",
                fontSize: 20,
              }}
            />

            <Box
              sx={{
                minWidth: 0,
              }}
            >
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 180,
                }}
              >
                {patientName}
              </Typography>

              <Typography
                sx={{
                  fontSize: 10,
                  color: "#7f8ea3",
                }}
              >
                ID: {patientId}
              </Typography>
            </Box>
          </Box>

          <Divider
            orientation="vertical"
            flexItem
            sx={{
              borderColor: "#2b3745",
              my: 1.2,
            }}
          />

          {/* STUDY */}

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.8,
              minWidth: 180,
            }}
          >
            <MedicalInformationIcon
              sx={{
                color: "#90caf9",
                fontSize: 20,
              }}
            />

            <Box
              sx={{
                minWidth: 0,
              }}
            >
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 190,
                }}
              >
                {studyId}
              </Typography>

              <Typography
                sx={{
                  fontSize: 10,
                  color: "#7f8ea3",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 190,
                }}
              >
                {studyDescription}
              </Typography>
            </Box>
          </Box>

          <Divider
            orientation="vertical"
            flexItem
            sx={{
              borderColor: "#2b3745",
              my: 1.2,
            }}
          />

          {/* MODALITY */}

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

          {/* BODY PART */}

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
              "& .MuiChip-label": {
                overflow: "hidden",
                textOverflow: "ellipsis",
              },
            }}
          />

          {/* DATE */}

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.6,
            }}
          >
            <CalendarTodayIcon
              sx={{
                fontSize: 14,
                color: "#718096",
              }}
            />

            <Typography
              sx={{
                fontSize: 10,
                color: "#9aa8b8",
                whiteSpace: "nowrap",
              }}
            >
              {studyDate}
            </Typography>
          </Box>

          <Box
            sx={{
              flex: 1,
            }}
          />

          {/* IMAGE COUNT */}

          <Typography
            sx={{
              fontSize: 10,
              color: "#8492a3",
            }}
          >
            {images.length} images
          </Typography>

          {/* FILE INPUT */}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.dcm,.dicom"
            multiple
            hidden
            onChange={handleUpload}
          />

          {/* UPLOAD */}

          <Tooltip title="Import images">
            <span>
              <IconButton
                size="small"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  color: "#d7e2ee",
                  backgroundColor: "#1b2632",
                  "&:hover": {
                    backgroundColor: "#263545",
                  },
                }}
              >
                {uploading ? <CircularProgress size={17} /> : <UploadFileIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>

          {/* DOWNLOAD */}

          <Tooltip title="Download current image">
            <span>
              <IconButton
                size="small"
                disabled={!selectedImageId}
                onClick={handleDownload}
                sx={{
                  color: "#d7e2ee",
                  backgroundColor: "#1b2632",
                  "&:hover": {
                    backgroundColor: "#263545",
                  },
                }}
              >
                <DownloadIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          {/* DELETE */}

          <Tooltip title="Delete current image">
            <span>
              <IconButton
                size="small"
                disabled={deleting || !selectedImageId}
                onClick={handleDelete}
                sx={{
                  color: "#ef9a9a",
                  backgroundColor: "#1b2632",
                  "&:hover": {
                    backgroundColor: "#42252a",
                  },
                }}
              >
                {deleting ? <CircularProgress size={17} /> : <DeleteIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>

          {/* FULLSCREEN */}

          <Tooltip title="Fullscreen">
            <IconButton
              size="small"
              onClick={handleFullscreen}
              sx={{
                color: "#d7e2ee",
                backgroundColor: "#1b2632",
                "&:hover": {
                  backgroundColor: "#263545",
                },
              }}
            >
              <FullscreenIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* AI */}

          <Button
            variant="contained"
            size="small"
            startIcon={
              analysisStatus === "processing" ? (
                <CircularProgress
                  size={14}
                  sx={{
                    color: "#ffffff",
                  }}
                />
              ) : (
                <SmartToyIcon fontSize="small" />
              )
            }
            onClick={handleAIAnalysis}
            disabled={analysisStatus === "processing" || images.length === 0}
            sx={{
              height: 31,
              textTransform: "none",
              fontSize: 11,
              fontWeight: 700,
              backgroundColor: "#1976d2",
              "&:hover": {
                backgroundColor: "#1565c0",
              },
            }}
          >
            {analysisStatus === "processing" ? "Analyzing..." : "AI Analyze"}
          </Button>
        </Box>

        {/* =====================================================
            MAIN WORKSPACE
           ===================================================== */}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "155px minmax(0, 1fr) 360px",
            height: "calc(100vh - 88px)",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {/* =================================================
              LEFT — SERIES / THUMBNAILS
             ================================================= */}

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
            {/* SERIES HEADER */}

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
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.7,
                }}
              >
                <LayersIcon
                  sx={{
                    fontSize: 17,
                    color: "#90caf9",
                  }}
                />

                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#d7e2ee",
                  }}
                >
                  SERIES
                </Typography>
              </Box>

              <Typography
                sx={{
                  fontSize: 10,
                  color: "#667689",
                }}
              >
                {images.length}
              </Typography>
            </Box>

            {/* SERIES DETAILS */}

            <Box
              sx={{
                px: 1,
                py: 0.8,
                borderBottom: "1px solid #202b38",
              }}
            >
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

              <Typography
                sx={{
                  fontSize: 9,
                  color: "#5f6e80",
                  mt: 0.25,
                }}
              >
                Series {series?.seriesNumber || 1}
              </Typography>
            </Box>

            {/* THUMBNAILS */}

            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                overflowX: "hidden",
                p: 0.7,

                "&::-webkit-scrollbar": {
                  width: 5,
                },

                "&::-webkit-scrollbar-track": {
                  background: "#0d131a",
                },

                "&::-webkit-scrollbar-thumb": {
                  background: "#344252",
                  borderRadius: 4,
                },
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
                  <Typography
                    sx={{
                      fontSize: 10,
                      color: "#657487",
                    }}
                  >
                    No images available
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={0.55}>
                  {images.map((item, index) => {
                    const selected = Number(item.id) === Number(selectedImageId);

                    return (
                      <Box
                        key={item.id}
                        onClick={() => setSelectedImageId(item.id)}
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
                          "&:hover": {
                            borderColor: "#607d9a",
                          },
                        }}
                      >
                        {thumbnailUrls[item.id] ? (
                          <img
                            src={thumbnailUrls[item.id]}
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

                        {/* IMAGE NUMBER */}

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
                          <Typography
                            sx={{
                              fontSize: 9,
                              lineHeight: 1,
                              color: "#ffffff",
                              fontWeight: 700,
                            }}
                          >
                            {index + 1}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Box>
          </Box>

          {/* =================================================
              CENTER — CORNERSTONE3D VIEWPORT
             ================================================= */}

          <Box
            sx={{
              minWidth: 0,
              minHeight: 0,
              overflow: "hidden",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#000000",
            }}
          >
            <DicomViewport
              ref={dicomViewportRef}
              images={images}
              index={currentIndex}
              onIndexChange={selectImageByIndex}
              patientName={patientName}
              patientId={patientId}
              studyDate={studyDate}
              studyLabel={studyDescription}
              modality={modality}
              bodyPart={bodyPart}
            />
          </Box>
          <AIAnalysisPanel
            study={study}
            analysisStatus={analysisStatus}
            findings={aiFindings}
            aiResult={aiResult}
            onAnalyze={handleAIAnalysis}
          />
        </Box>

        {/* =====================================================
            WORKSTATION FOOTER
           ===================================================== */}

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
          <Typography
            sx={{
              fontSize: 9,
              color: "#66778a",
            }}
          >
            {modality}
            {" • "}
            {bodyPart}
            {" • "}
            {images.length} images
          </Typography>

          <Box
            sx={{
              flex: 1,
            }}
          />

          <Typography
            sx={{
              fontSize: 8.5,
              color: "#526174",
            }}
          >
            Radiology Imaging Workstation
          </Typography>
        </Box>
      </Box>
    </Layout>
  );
}
export default ImageViewer;
