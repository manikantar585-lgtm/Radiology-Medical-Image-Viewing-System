import React, { useCallback, useMemo, useRef, useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";

import { Box } from "@mui/material";

import AIAnalysisPanel from "../components/AIAnalysisPanel";
import DicomViewport from "../components/DicomViewport";
import Layout from "../components/Layout";

import { API_URL, authHeaders, jsonHeaders } from "../api/http";
import { formatDate } from "../utils/format";

import { getModality } from "./viewer/modality";
import SeriesPanel from "./viewer/SeriesPanel";
import { useStudyImages } from "./viewer/useStudyImages";
import { useThumbnails } from "./viewer/useThumbnails";
import { useViewerHotkeys } from "./viewer/useViewerHotkeys";
import ViewerFooter from "./viewer/ViewerFooter";
import ViewerHeader from "./viewer/ViewerHeader";

/** Parses a JSON response body, tolerating empty or non-JSON bodies. */
async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function ImageViewer() {
  const location = useLocation();
  const navigate = useNavigate();

  const patient = location.state?.patient || null;
  const study = location.state?.study || null;

  const { images, series, selectedImageId, setSelectedImageId, reload } = useStudyImages(
    patient?.id,
    study?.id
  );
  const { thumbnailUrls, evict } = useThumbnails(images);

  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState("idle");
  const [aiResult, setAiResult] = useState(null);

  const viewerRef = useRef(null);
  const dicomViewportRef = useRef(null);

  const currentIndex = images.findIndex((item) => Number(item.id) === Number(selectedImageId));
  const selectedImage = images[currentIndex];

  // Records may come from different endpoints with differently-cased keys.
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

  /* ---------- navigation between images ---------- */

  const selectImageByIndex = useCallback(
    (index) => {
      if (index >= 0 && index < images.length) {
        setSelectedImageId(images[index].id);
      }
    },
    [images, setSelectedImageId]
  );

  const hotkeyActions = useMemo(
    () => ({
      zoomIn: () => dicomViewportRef.current?.zoomBy(1.2),
      zoomOut: () => dicomViewportRef.current?.zoomBy(1 / 1.2),
      zoomFit: () => dicomViewportRef.current?.fit(),
      reset: () => dicomViewportRef.current?.reset(),
      rotateRight: () => dicomViewportRef.current?.rotateBy(90),
      rotateLeft: () => dicomViewportRef.current?.rotateBy(-90),
      firstImage: () => selectImageByIndex(0),
      lastImage: () => selectImageByIndex(images.length - 1),
      nextImage: () => selectImageByIndex(currentIndex + 1),
      previousImage: () => selectImageByIndex(currentIndex - 1),
    }),
    [selectImageByIndex, images.length, currentIndex]
  );

  useViewerHotkeys(hotkeyActions);

  /* ---------- toolbar actions ---------- */

  const handleBack = useCallback(() => {
    navigate("/studies", { state: { patient } });
  }, [navigate, patient]);

  const handleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await viewerRef.current?.requestFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  }, []);

  const handleUpload = useCallback(
    async (event) => {
      const input = event.target;
      const files = Array.from(input.files || []);
      if (files.length === 0) {
        return;
      }
      if (!patient?.id || !study?.id) {
        alert("Patient and study information are required.");
        input.value = "";
        return;
      }

      try {
        setUploading(true);

        const formData = new FormData();
        files.forEach((file) => formData.append("images", file));
        formData.append("patientId", String(patient.id));
        formData.append("studyId", String(study.id));
        // Append to the series on screen; without it the API starts a new series.
        if (series?.id) {
          formData.append("seriesId", String(series.id));
        }

        const response = await fetch(`${API_URL}/api/series/upload`, {
          method: "POST",
          headers: authHeaders(),
          body: formData,
        });
        const data = await readJson(response);
        if (!response.ok) {
          throw new Error(data?.message || "Unable to upload images.");
        }

        await reload();
        alert(`${files.length} image${files.length === 1 ? "" : "s"} uploaded successfully.`);
      } catch (error) {
        console.error("Upload error:", error);
        alert(error?.message || "Unable to upload images.");
      } finally {
        setUploading(false);
        input.value = "";
      }
    },
    [patient?.id, study?.id, series?.id, reload]
  );

  const handleDownload = useCallback(async () => {
    if (!selectedImageId) {
      alert("Please select an image first.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/images/${selectedImageId}`, {
        headers: authHeaders(),
      });
      if (!response.ok) {
        throw new Error("Unable to download image.");
      }

      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = selectedImage?.fileName || `medical-image-${selectedImageId}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    if (!window.confirm(`Delete ${selectedImage?.fileName || "this image"}?`)) {
      return;
    }

    try {
      setDeleting(true);

      const response = await fetch(`${API_URL}/api/images/${selectedImageId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await readJson(response);
      if (!response.ok) {
        throw new Error(data?.message || "Unable to delete image.");
      }

      evict(selectedImageId);
      await reload();
    } catch (error) {
      console.error("Delete error:", error);
      alert(error?.message || "Unable to delete image.");
    } finally {
      setDeleting(false);
    }
  }, [selectedImageId, selectedImage?.fileName, evict, reload]);

  const handleAIAnalysis = useCallback(async () => {
    if (!study?.id) {
      alert("Patient and study information are required.");
      return;
    }
    if (images.length === 0) {
      alert("No images are available for AI analysis.");
      return;
    }

    try {
      setAnalysisStatus("processing");
      setAiResult(null);

      const response = await fetch(`${API_URL}/api/ai/analyze-study`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ studyId: study.id }),
      });
      const data = await readJson(response);
      if (!response.ok) {
        throw new Error(data?.message || "AI analysis failed.");
      }

      setAiResult(data?.result || data);
      setAnalysisStatus("completed");
    } catch (error) {
      console.error("AI analysis error:", error);
      setAnalysisStatus("error");
      setAiResult(null);
      alert(error?.message || "AI analysis failed. Check the AI service.");
    }
  }, [study?.id, images.length]);

  const aiFindings = useMemo(
    () => (Array.isArray(aiResult?.findings) ? aiResult.findings : []),
    [aiResult]
  );

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
        <ViewerHeader
          patientName={patientName}
          patientId={patientId}
          studyId={studyId}
          studyDescription={studyDescription}
          modality={modality}
          bodyPart={bodyPart}
          studyDate={studyDate}
          imageCount={images.length}
          hasSelection={Boolean(selectedImageId)}
          uploading={uploading}
          deleting={deleting}
          analyzing={analysisStatus === "processing"}
          onBack={handleBack}
          onUpload={handleUpload}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onFullscreen={handleFullscreen}
          onAnalyze={handleAIAnalysis}
        />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "155px minmax(0, 1fr) 360px",
            height: "calc(100vh - 88px)",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <SeriesPanel
            images={images}
            series={series}
            modality={modality}
            selectedImageId={selectedImageId}
            thumbnailUrls={thumbnailUrls}
            onSelect={setSelectedImageId}
          />

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

        <ViewerFooter modality={modality} bodyPart={bodyPart} imageCount={images.length} />
      </Box>
    </Layout>
  );
}

export default ImageViewer;
