import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Box,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Slider,
  Tooltip,
  Typography,
} from "@mui/material";

import * as csCore from "@cornerstonejs/core";
import * as csTools from "@cornerstonejs/tools";
import { init as initDicomImageLoader } from "@cornerstonejs/dicom-image-loader";

import ContrastIcon from "@mui/icons-material/Contrast";
import CropSquareIcon from "@mui/icons-material/CropSquare";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import FlipIcon from "@mui/icons-material/Flip";
import InvertColorsIcon from "@mui/icons-material/InvertColors";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import PanToolIcon from "@mui/icons-material/PanTool";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import RotateRightIcon from "@mui/icons-material/RotateRight";
import SquareFootIcon from "@mui/icons-material/SquareFoot";
import StraightenIcon from "@mui/icons-material/Straighten";
import TuneIcon from "@mui/icons-material/Tune";
import ZoomInIcon from "@mui/icons-material/ZoomIn";

/* =========================================================
   CORNERSTONE3D VIEWPORT (OHIF-style)
   DICOM renders from the original pixel data (real HU and
   window/level); JPG/PNG uploads load through a web loader.
========================================================= */

const API_URL = "http://localhost:5000";

const COLORS = {
  background: "#000000",
  toolbar: "#090c29",
  border: "#1c2a4a",
  icon: "#c5d4eb",
  active: "#5acce6",
  activeIcon: "#090c29",
  overlay: "#e6eefc",
  overlayDim: "#9fb4d6",
};

// Window/level presets (width, center) in Hounsfield units.
const CT_PRESETS = [
  { name: "Soft tissue", width: 400, center: 40 },
  { name: "Lung", width: 1500, center: -600 },
  { name: "Bone", width: 2500, center: 480 },
  { name: "Brain", width: 80, center: 40 },
  { name: "Liver", width: 150, center: 90 },
  { name: "Mediastinum", width: 350, center: 50 },
];

const TOOLS = [
  { id: "WindowLevel", label: "Window / Level", icon: ContrastIcon, tool: csTools.WindowLevelTool },
  { id: "Pan", label: "Pan", icon: PanToolIcon, tool: csTools.PanTool },
  { id: "Zoom", label: "Zoom", icon: ZoomInIcon, tool: csTools.ZoomTool },
  { id: "Length", label: "Length", icon: StraightenIcon, tool: csTools.LengthTool },
  { id: "Angle", label: "Angle", icon: SquareFootIcon, tool: csTools.AngleTool },
  { id: "EllipticalROI", label: "Ellipse ROI", icon: RadioButtonUncheckedIcon, tool: csTools.EllipticalROITool },
  { id: "RectangleROI", label: "Rectangle ROI", icon: CropSquareIcon, tool: csTools.RectangleROITool },
  { id: "Probe", label: "Probe (pixel value)", icon: MyLocationIcon, tool: csTools.ProbeTool },
];

const toolName = (id) =>
  TOOLS.find((item) => item.id === id).tool.toolName;

function getUserId() {
  try {
    const user = JSON.parse(localStorage.getItem("loggedInUser") || "null");
    return user?.id ? String(user.id) : "";
  } catch (error) {
    return "";
  }
}

export function isDicomImage(image) {
  const name = String(image?.fileName || "").toLowerCase();
  const type = String(image?.contentType || "").toLowerCase();

  if (name.endsWith(".dcm") || name.endsWith(".dicom") || type.includes("dicom")) {
    return true;
  }

  return (
    type === "application/octet-stream" &&
    !/\.(png|jpe?g|gif|bmp|webp)$/.test(name)
  );
}

function toImageId(image) {
  const url = `${API_URL}/api/images/${image.id}`;
  return isDicomImage(image) ? `wadouri:${url}` : `webimg:${url}`;
}

/* =========================================================
   WEB IMAGE LOADER (JPG / PNG as 8-bit grayscale)
========================================================= */

function loadWebImage(imageId) {
  const url = imageId.slice("webimg:".length);

  const promise = (async () => {
    const response = await fetch(url, {
      headers: { "x-user-id": getUserId() },
    });

    if (!response.ok) {
      throw new Error(`Unable to load image (${response.status})`);
    }

    const bitmap = await createImageBitmap(await response.blob());
    const { width, height } = bitmap;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    context.drawImage(bitmap, 0, 0);

    const rgba = context.getImageData(0, 0, width, height).data;
    const pixels = new Uint8Array(width * height);

    let min = 255;
    let max = 0;

    for (let i = 0; i < pixels.length; i += 1) {
      const value = Math.round(
        0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]
      );

      pixels[i] = value;
      if (value < min) min = value;
      if (value > max) max = value;
    }

    const provider = csCore.utilities.genericMetadataProvider;

    provider.add(imageId, {
      type: "imagePlaneModule",
      metadata: {
        rows: height,
        columns: width,
        imageOrientationPatient: [1, 0, 0, 0, 1, 0],
        rowCosines: [1, 0, 0],
        columnCosines: [0, 1, 0],
        imagePositionPatient: [0, 0, 0],
        pixelSpacing: [1, 1],
        rowPixelSpacing: 1,
        columnPixelSpacing: 1,
      },
    });

    provider.add(imageId, {
      type: "imagePixelModule",
      metadata: {
        samplesPerPixel: 1,
        photometricInterpretation: "MONOCHROME2",
        rows: height,
        columns: width,
        bitsAllocated: 8,
        bitsStored: 8,
        highBit: 7,
        pixelRepresentation: 0,
      },
    });

    // StackViewport reads the modality from this module for every image.
    provider.add(imageId, {
      type: "generalSeriesModule",
      metadata: { modality: "OT" },
    });

    return {
      imageId,
      minPixelValue: min,
      maxPixelValue: max,
      slope: 1,
      intercept: 0,
      windowCenter: 128,
      windowWidth: 256,
      rows: height,
      columns: width,
      height,
      width,
      color: false,
      rgba: false,
      numberOfComponents: 1,
      columnPixelSpacing: 1,
      rowPixelSpacing: 1,
      invert: false,
      sizeInBytes: pixels.byteLength,
      getPixelData: () => pixels,
      imageFrame: { pixelData: pixels },
    };
  })();

  return { promise };
}

/* =========================================================
   ONE-TIME INITIALISATION
========================================================= */

let initPromise = null;

function initCornerstone() {
  if (!initPromise) {
    initPromise = (async () => {
      await csCore.init();
      csTools.init();

      initDicomImageLoader({
        maxWebWorkers: Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1)),
        beforeSend: () => ({ "x-user-id": getUserId() }),
      });

      csCore.imageLoader.registerImageLoader("webimg", loadWebImage);

      [...TOOLS.map((item) => item.tool), csTools.StackScrollTool].forEach((tool) =>
        csTools.addTool(tool)
      );
    })();
  }

  return initPromise;
}

/* =========================================================
   ORIENTATION LETTERS (OHIF-style A / P / R / L / H / F)
========================================================= */

function orientationLetters(vector) {
  if (!vector) return "";

  const axes = [
    { value: vector[0], positive: "L", negative: "R" },
    { value: vector[1], positive: "P", negative: "A" },
    { value: vector[2], positive: "H", negative: "F" },
  ]
    .filter((axis) => Math.abs(axis.value) > 0.25)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 2);

  return axes.map((axis) => (axis.value > 0 ? axis.positive : axis.negative)).join("");
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

const negate = (vector) => vector.map((value) => -value);

let mountCounter = 0;

/* =========================================================
   COMPONENT
========================================================= */

const DicomViewport = forwardRef(function DicomViewport(
  { images, index, onIndexChange, patientName, patientId, studyDate, studyLabel, modality, bodyPart },
  ref
) {
  const elementRef = useRef(null);
  const idsRef = useRef(null);
  const onIndexChangeRef = useRef(onIndexChange);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [activeTool, setActiveTool] = useState("WindowLevel");
  const [presetAnchor, setPresetAnchor] = useState(null);
  const [overlay, setOverlay] = useState({});

  onIndexChangeRef.current = onIndexChange;

  const imageIds = useMemo(() => images.map(toImageId), [images]);
  const imageIdsKey = imageIds.join("|");
  const isDicomStack = images.length > 0 && images.every(isDicomImage);

  const getViewport = useCallback(() => {
    const ids = idsRef.current;
    if (!ids) return null;

    const engine = csCore.getRenderingEngine(ids.engineId);
    return engine?.getViewport(ids.viewportId) || null;
  }, []);

  /* ---------- overlay text ---------- */

  const refreshOverlay = useCallback(() => {
    const viewport = getViewport();
    const imageId = viewport?.getCurrentImageId?.();

    if (!viewport || !imageId) return;

    const { voiRange, invert } = viewport.getProperties() || {};
    const camera = viewport.getCamera();
    const series = csCore.metaData.get("generalSeriesModule", imageId) || {};
    const plane = csCore.metaData.get("imagePlaneModule", imageId) || {};
    const image = viewport.getImageData?.();

    let letters = null;

    if (isDicomImage(images[viewport.getCurrentImageIdIndex()]) && camera.viewUp && camera.viewPlaneNormal) {
      const right = cross(camera.viewUp, camera.viewPlaneNormal);

      letters = {
        top: orientationLetters(camera.viewUp),
        bottom: orientationLetters(negate(camera.viewUp)),
        left: orientationLetters(negate(right)),
        right: orientationLetters(right),
      };
    }

    setOverlay({
      windowWidth: voiRange ? Math.round(voiRange.upper - voiRange.lower) : null,
      windowCenter: voiRange ? Math.round((voiRange.upper + voiRange.lower) / 2) : null,
      zoom: viewport.getZoom?.() || 1,
      invert,
      seriesDescription: series.seriesDescription,
      seriesNumber: series.seriesNumber,
      sliceThickness: plane.sliceThickness,
      sliceLocation: plane.sliceLocation,
      dimensions: image?.dimensions
        ? `${image.dimensions[0]} × ${image.dimensions[1]}`
        : null,
      letters,
    });
  }, [getViewport, images]);

  /* ---------- engine + tool group ---------- */

  useEffect(() => {
    let cancelled = false;
    mountCounter += 1;

    const ids = {
      engineId: `rmisEngine${mountCounter}`,
      viewportId: `rmisStack${mountCounter}`,
      toolGroupId: `rmisTools${mountCounter}`,
    };

    const element = elementRef.current;
    const preventMenu = (event) => event.preventDefault();
    element.addEventListener("contextmenu", preventMenu);

    let resizeObserver = null;

    initCornerstone()
      .then(() => {
        if (cancelled) return;

        const engine = new csCore.RenderingEngine(ids.engineId);

        engine.enableElement({
          viewportId: ids.viewportId,
          type: csCore.Enums.ViewportType.STACK,
          element,
          defaultOptions: { background: [0, 0, 0] },
        });

        const toolGroup = csTools.ToolGroupManager.createToolGroup(ids.toolGroupId);

        [...TOOLS.map((item) => item.tool), csTools.StackScrollTool].forEach((tool) =>
          toolGroup.addTool(tool.toolName)
        );

        toolGroup.addViewport(ids.viewportId, ids.engineId);

        const { MouseBindings } = csTools.Enums;

        toolGroup.setToolActive(csTools.WindowLevelTool.toolName, {
          bindings: [{ mouseButton: MouseBindings.Primary }],
        });
        toolGroup.setToolActive(csTools.PanTool.toolName, {
          bindings: [{ mouseButton: MouseBindings.Auxiliary }],
        });
        toolGroup.setToolActive(csTools.ZoomTool.toolName, {
          bindings: [{ mouseButton: MouseBindings.Secondary }],
        });
        toolGroup.setToolActive(csTools.StackScrollTool.toolName, {
          bindings: [{ mouseButton: MouseBindings.Wheel }],
        });

        TOOLS.filter((item) => !["WindowLevel", "Pan", "Zoom"].includes(item.id)).forEach(
          (item) => toolGroup.setToolPassive(item.tool.toolName)
        );

        idsRef.current = ids;

        resizeObserver = new ResizeObserver(() => {
          engine.resize(true, false);
        });
        resizeObserver.observe(element);

        setReady(true);
      })
      .catch((initError) => {
        console.error("Cornerstone init error:", initError);
        setError(String(initError?.message || initError));
      });

    return () => {
      cancelled = true;
      element.removeEventListener("contextmenu", preventMenu);
      resizeObserver?.disconnect();

      if (idsRef.current === ids) {
        csTools.ToolGroupManager.destroyToolGroup(ids.toolGroupId);
        csCore.getRenderingEngine(ids.engineId)?.destroy();
        idsRef.current = null;
      }
    };
  }, []);

  /* ---------- viewport events ---------- */

  useEffect(() => {
    if (!ready) return undefined;

    const element = elementRef.current;
    const { Events } = csCore.Enums;

    const onNewImage = () => {
      const viewport = getViewport();
      if (!viewport) return;

      onIndexChangeRef.current?.(viewport.getCurrentImageIdIndex());
      refreshOverlay();
    };

    element.addEventListener(Events.STACK_NEW_IMAGE, onNewImage);
    element.addEventListener(Events.IMAGE_RENDERED, refreshOverlay);
    element.addEventListener(Events.VOI_MODIFIED, refreshOverlay);
    element.addEventListener(Events.CAMERA_MODIFIED, refreshOverlay);

    return () => {
      element.removeEventListener(Events.STACK_NEW_IMAGE, onNewImage);
      element.removeEventListener(Events.IMAGE_RENDERED, refreshOverlay);
      element.removeEventListener(Events.VOI_MODIFIED, refreshOverlay);
      element.removeEventListener(Events.CAMERA_MODIFIED, refreshOverlay);
    };
  }, [ready, getViewport, refreshOverlay]);

  /* ---------- load stack ---------- */

  useEffect(() => {
    if (!ready) return;

    const viewport = getViewport();
    if (!viewport) return;

    if (imageIds.length === 0) {
      return;
    }

    setError("");

    viewport
      .setStack(imageIds, Math.max(0, Math.min(index, imageIds.length - 1)))
      .then(() => {
        viewport.render();
        refreshOverlay();
      })
      .catch((stackError) => {
        console.error("Stack loading error:", stackError);
        setError("Unable to display this image.");
      });
    // index is synced by the effect below; reloading the stack on
    // every index change would reset window/level and zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, imageIdsKey]);

  /* ---------- index sync from parent ---------- */

  useEffect(() => {
    const viewport = getViewport();

    if (
      !ready ||
      !viewport ||
      index < 0 ||
      index >= imageIds.length ||
      viewport.getCurrentImageIdIndex?.() === index
    ) {
      return;
    }

    viewport.setImageIdIndex(index).catch(() => {});
  }, [ready, index, imageIds.length, getViewport]);

  /* ---------- actions ---------- */

  const selectTool = useCallback((toolId) => {
    const ids = idsRef.current;
    const toolGroup = ids && csTools.ToolGroupManager.getToolGroup(ids.toolGroupId);
    if (!toolGroup) return;

    const { MouseBindings } = csTools.Enums;
    const previous = toolGroup.getActivePrimaryMouseButtonTool();

    if (previous) {
      // Pan/Zoom keep their middle/right-button bindings.
      if (previous === csTools.PanTool.toolName) {
        toolGroup.setToolActive(previous, { bindings: [{ mouseButton: MouseBindings.Auxiliary }] });
      } else if (previous === csTools.ZoomTool.toolName) {
        toolGroup.setToolActive(previous, { bindings: [{ mouseButton: MouseBindings.Secondary }] });
      } else {
        toolGroup.setToolPassive(previous);
      }
    }

    toolGroup.setToolActive(toolName(toolId), {
      bindings: [{ mouseButton: MouseBindings.Primary }],
    });

    setActiveTool(toolId);
  }, []);

  const applyPreset = useCallback(
    (preset) => {
      const viewport = getViewport();
      if (!viewport) return;

      viewport.setProperties({
        voiRange: csCore.utilities.windowLevel.toLowHighRange(preset.width, preset.center),
      });
      viewport.render();
      setPresetAnchor(null);
    },
    [getViewport]
  );

  const zoomBy = useCallback(
    (factor) => {
      const viewport = getViewport();
      if (!viewport) return;

      viewport.setZoom(viewport.getZoom() * factor);
      viewport.render();
    },
    [getViewport]
  );

  const rotateBy = useCallback(
    (degrees) => {
      const viewport = getViewport();
      if (!viewport) return;

      const current = viewport.getViewPresentation()?.rotation || 0;
      viewport.setViewPresentation({ rotation: (current + degrees + 360) % 360 });
      viewport.render();
    },
    [getViewport]
  );

  const flipHorizontal = useCallback(() => {
    const viewport = getViewport();
    if (!viewport) return;

    viewport.setCamera({ flipHorizontal: !viewport.getCamera().flipHorizontal });
    viewport.render();
  }, [getViewport]);

  const toggleInvert = useCallback(() => {
    const viewport = getViewport();
    if (!viewport) return;

    viewport.setProperties({ invert: !viewport.getProperties().invert });
    viewport.render();
  }, [getViewport]);

  const reset = useCallback(() => {
    const viewport = getViewport();
    if (!viewport) return;

    viewport.resetProperties();
    viewport.resetCamera();
    viewport.render();
  }, [getViewport]);

  const fit = useCallback(() => {
    const viewport = getViewport();
    if (!viewport) return;

    viewport.resetCamera();
    viewport.render();
  }, [getViewport]);

  const clearMeasurements = useCallback(() => {
    csTools.annotation.state.removeAllAnnotations();
    getViewport()?.render();
  }, [getViewport]);

  useImperativeHandle(
    ref,
    () => ({ zoomBy, rotateBy, reset, fit, flipHorizontal, toggleInvert }),
    [zoomBy, rotateBy, reset, fit, flipHorizontal, toggleInvert]
  );

  /* ---------- render ---------- */

  const toolbarButton = (key, label, Icon, onClick, active = false, disabled = false) => (
    <Tooltip title={label} key={key}>
      <span>
        <IconButton
          size="small"
          onClick={onClick}
          disabled={disabled}
          sx={{
            mx: 0.15,
            borderRadius: 1,
            color: active ? COLORS.activeIcon : COLORS.icon,
            backgroundColor: active ? COLORS.active : "transparent",
            "&:hover": {
              backgroundColor: active ? COLORS.active : "rgba(90,204,230,.15)",
            },
          }}
        >
          <Icon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  );

  const separator = (
    <Divider orientation="vertical" flexItem sx={{ mx: 0.6, my: 0.9, borderColor: COLORS.border }} />
  );

  const overlayText = { fontSize: 12, lineHeight: 1.45, color: COLORS.overlay, textShadow: "0 0 3px #000" };
  const dimText = { ...overlayText, color: COLORS.overlayDim };
  const position = index >= 0 ? index + 1 : 0;

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", backgroundColor: COLORS.background }}>
      {/* TOOLBAR */}

      <Box
        sx={{
          height: 46,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          px: 0.8,
          backgroundColor: COLORS.toolbar,
          borderBottom: `1px solid ${COLORS.border}`,
          overflowX: "auto",
        }}
      >
        {toolbarButton("prev", "Previous image", NavigateBeforeIcon, () => onIndexChange?.(index - 1), false, index <= 0)}

        <Typography sx={{ minWidth: 54, textAlign: "center", fontSize: 12, fontWeight: 700, color: COLORS.overlay }}>
          {position} / {images.length}
        </Typography>

        {toolbarButton("next", "Next image", NavigateNextIcon, () => onIndexChange?.(index + 1), false, index >= images.length - 1)}

        {separator}

        {TOOLS.map((item) =>
          toolbarButton(item.id, item.label, item.icon, () => selectTool(item.id), activeTool === item.id, !ready)
        )}

        {separator}

        {toolbarButton(
          "presets",
          isDicomStack ? "Window presets" : "Window presets (DICOM only)",
          TuneIcon,
          (event) => setPresetAnchor(event.currentTarget),
          Boolean(presetAnchor),
          !ready || !isDicomStack
        )}
        {toolbarButton("invert", "Invert", InvertColorsIcon, toggleInvert, Boolean(overlay.invert), !ready)}
        {toolbarButton("rotate", "Rotate 90°", RotateRightIcon, () => rotateBy(90), false, !ready)}
        {toolbarButton("flip", "Flip horizontal", FlipIcon, flipHorizontal, false, !ready)}
        {toolbarButton("reset", "Reset view", RestartAltIcon, reset, false, !ready)}
        {toolbarButton("clear", "Clear measurements", DeleteSweepIcon, clearMeasurements, false, !ready)}

        <Menu
          anchorEl={presetAnchor}
          open={Boolean(presetAnchor)}
          onClose={() => setPresetAnchor(null)}
          slotProps={{
            paper: { sx: { backgroundColor: COLORS.toolbar, color: COLORS.overlay, border: `1px solid ${COLORS.border}` } },
          }}
        >
          {CT_PRESETS.map((preset) => (
            <MenuItem key={preset.name} onClick={() => applyPreset(preset)} sx={{ fontSize: 13, gap: 2 }}>
              <span style={{ flex: 1 }}>{preset.name}</span>
              <span style={{ color: COLORS.overlayDim, fontSize: 11 }}>
                W {preset.width} · L {preset.center}
              </span>
            </MenuItem>
          ))}
        </Menu>
      </Box>

      {/* VIEWPORT */}

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          border: `1px solid ${COLORS.active}`,
          m: 0.5,
          borderRadius: 0.5,
          overflow: "hidden",
        }}
      >
        <div ref={elementRef} style={{ position: "absolute", inset: 0 }} />

        {/* TOP LEFT: patient / study */}
        <Box sx={{ position: "absolute", top: 8, left: 10, pointerEvents: "none", zIndex: 2 }}>
          <Typography sx={overlayText}>{patientName}</Typography>
          {patientId && <Typography sx={dimText}>ID: {patientId}</Typography>}
          {studyDate && <Typography sx={dimText}>{studyDate}</Typography>}
          {(overlay.seriesDescription || studyLabel) && (
            <Typography sx={dimText}>{overlay.seriesDescription || studyLabel}</Typography>
          )}
        </Box>

        {/* TOP RIGHT: modality / image */}
        <Box sx={{ position: "absolute", top: 8, right: 26, textAlign: "right", pointerEvents: "none", zIndex: 2 }}>
          <Typography sx={overlayText}>
            {modality}
            {bodyPart ? ` · ${bodyPart}` : ""}
          </Typography>
          <Typography sx={dimText}>
            {overlay.seriesNumber ? `S: ${overlay.seriesNumber}  ` : ""}I: {position} / {images.length}
          </Typography>
          {overlay.sliceThickness != null && (
            <Typography sx={dimText}>Thick: {Number(overlay.sliceThickness).toFixed(1)} mm</Typography>
          )}
          {overlay.sliceLocation != null && (
            <Typography sx={dimText}>Loc: {Number(overlay.sliceLocation).toFixed(1)} mm</Typography>
          )}
        </Box>

        {/* BOTTOM LEFT: window / zoom */}
        <Box sx={{ position: "absolute", bottom: 8, left: 10, pointerEvents: "none", zIndex: 2 }}>
          {overlay.windowWidth != null && (
            <Typography sx={overlayText}>
              W: {overlay.windowWidth} L: {overlay.windowCenter}
            </Typography>
          )}
          <Typography sx={dimText}>Zoom: {(overlay.zoom || 1).toFixed(2)}x</Typography>
        </Box>

        {/* BOTTOM RIGHT: dimensions */}
        <Box sx={{ position: "absolute", bottom: 8, right: 26, textAlign: "right", pointerEvents: "none", zIndex: 2 }}>
          {overlay.dimensions && <Typography sx={dimText}>{overlay.dimensions}</Typography>}
          <Typography sx={dimText}>{isDicomStack ? "DICOM" : "Image (8-bit)"}</Typography>
        </Box>

        {/* ORIENTATION MARKERS */}
        {overlay.letters && (
          <>
            <Typography sx={{ ...overlayText, position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", pointerEvents: "none", zIndex: 2 }}>
              {overlay.letters.top}
            </Typography>
            <Typography sx={{ ...overlayText, position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", pointerEvents: "none", zIndex: 2 }}>
              {overlay.letters.bottom}
            </Typography>
            <Typography sx={{ ...overlayText, position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", zIndex: 2 }}>
              {overlay.letters.left}
            </Typography>
            <Typography sx={{ ...overlayText, position: "absolute", right: 26, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", zIndex: 2 }}>
              {overlay.letters.right}
            </Typography>
          </>
        )}

        {/* SLICE SCROLLBAR */}
        {images.length > 1 && (
          <Box sx={{ position: "absolute", top: 12, bottom: 12, right: 4, zIndex: 3 }}>
            <Slider
              orientation="vertical"
              size="small"
              min={0}
              max={images.length - 1}
              value={images.length - 1 - Math.max(0, index)}
              onChange={(event, value) => onIndexChange?.(images.length - 1 - value)}
              sx={{
                height: "100%",
                color: COLORS.active,
                p: "0 6px !important",
                "& .MuiSlider-thumb": { width: 10, height: 10 },
                "& .MuiSlider-rail": { opacity: 0.25 },
                "& .MuiSlider-track": { border: "none", backgroundColor: "transparent" },
              }}
            />
          </Box>
        )}

        {(error || images.length === 0) && (
          <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <Typography sx={{ color: "#6b7fa3", fontSize: 13 }}>
              {error || "No medical images found"}
            </Typography>
          </Box>
        )}
      </Box>

      {/* FOOTER HINT */}

      <Box
        sx={{
          height: 26,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          px: 1.2,
          backgroundColor: COLORS.toolbar,
          borderTop: `1px solid ${COLORS.border}`,
        }}
      >
        <Typography sx={{ fontSize: 10, color: COLORS.overlayDim }}>
          Left: {TOOLS.find((item) => item.id === activeTool)?.label} • Middle: Pan • Right: Zoom • Wheel: Scroll slices
        </Typography>
      </Box>
    </Box>
  );
});

export default DicomViewport;
