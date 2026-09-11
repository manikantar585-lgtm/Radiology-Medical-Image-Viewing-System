import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import Layout from "../components/Layout";

import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
  Stack,
  IconButton,
  Tooltip,
  Slider,
} from "@mui/material";

import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import RotateRightIcon from "@mui/icons-material/RotateRight";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FitScreenIcon from "@mui/icons-material/FitScreen";
import ImageIcon from "@mui/icons-material/Image";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

const defaultImageDataUrl =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg"
         width="1200"
         height="800"
         viewBox="0 0 1200 800">

      <defs>
        <linearGradient
          id="bg"
          x1="0"
          x2="1"
          y1="0"
          y2="1"
        >
          <stop
            offset="0%"
            stop-color="#E3F2FD"
          />

          <stop
            offset="100%"
            stop-color="#BBDEFB"
          />
        </linearGradient>
      </defs>

      <rect
        width="1200"
        height="800"
        fill="url(#bg)"
      />

      <rect
        x="150"
        y="120"
        width="900"
        height="560"
        rx="28"
        fill="#ffffff"
        opacity="0.9"
      />

      <rect
        x="250"
        y="220"
        width="700"
        height="280"
        rx="18"
        fill="#E0E0E0"
      />

      <circle
        cx="470"
        cy="360"
        r="110"
        fill="#90CAF9"
        opacity="0.9"
      />

      <path
        d="M640 470 L764 290 L880 470 Z"
        fill="#64B5F6"
        opacity="0.9"
      />

      <text
        x="600"
        y="610"
        text-anchor="middle"
        font-size="50"
        font-family="Arial, sans-serif"
        fill="#1565C0"
      >
        No Image Available
      </text>
    </svg>
  `);

const getLoggedInUser = () => {
  try {
    const storedUser =
      localStorage.getItem(
        "loggedInUser"
      );

    if (!storedUser) {
      return null;
    }

    return JSON.parse(
      storedUser
    );
  } catch (error) {
    console.error(
      "Logged-in User Error:",
      error
    );

    return null;
  }
};

const getUserId = () => {
  const user =
    getLoggedInUser();

  if (!user?.id) {
    return null;
  }

  return user.id;
};

const defaultHotkeys = {
  zoom: "Z",
  zoomIn: "+",
  zoomOut: "-",
  zoomFit: "=",
  rotateRight: "R",
  rotateLeft: "L",
  reset: "Space",
  firstImage: "Home",
  lastImage: "End",
  nextImage: "ArrowDown",
  previousImage: "ArrowUp",
  cancel: "Escape",
};

const getSavedHotkeys = () => {
  try {
    const saved =
      localStorage.getItem(
        "radiologyHotkeys"
      );

    if (!saved) {
      return defaultHotkeys;
    }

    return {
      ...defaultHotkeys,
      ...JSON.parse(saved),
    };
  } catch (error) {
    console.error(
      "Hotkey loading error:",
      error
    );

    return defaultHotkeys;
  }
};

const normalizeHotkey = (
  value
) => {
  const key =
    String(
      value || ""
    )
      .trim()
      .toLowerCase();

  if (key === "space") {
    return " ";
  }

  if (key === "esc") {
    return "escape";
  }

  return key;
};

// Maximum single-file size allowed for upload (100MB). Keep this in sync
// with whatever limit is configured on the backend (e.g. multer's
// `limits.fileSize`) so the user gets a clear client-side message instead
// of an opaque server rejection.
const MAX_UPLOAD_FILE_SIZE_BYTES = 100 * 1024 * 1024;

// How long we wait for the upload request before giving up and telling
// the user, instead of leaving the progress bar spinning forever.
const UPLOAD_TIMEOUT_MS = 120000;

function ImageViewer() {
  const location =
    useLocation();

  const navigate =
    useNavigate();

  const patient =
    location.state?.patient;

  const study =
    location.state?.study;

  const API_URL =
    "http://localhost:5000";

  const [zoom, setZoom] =
    useState(1);

  const [rotation, setRotation] =
    useState(0);

  const [brightness, setBrightness] =
    useState(100);

  const [contrast, setContrast] =
    useState(100);

  const [measureMode, setMeasureMode] =
    useState(false);

  const [measurementPoints, setMeasurementPoints] =
    useState([]);

  const [measurementPreviewPoint, setMeasurementPreviewPoint] =
    useState(null);

  const [measurements, setMeasurements] =
    useState([]);

  const [playing, setPlaying] =
    useState(false);

  const [image, setImage] =
    useState(
      defaultImageDataUrl
    );

  const [images, setImages] =
    useState([]);

  const [series, setSeries] =
    useState([]);

  const [selectedSeriesId, setSelectedSeriesId] =
    useState(null);

  const [selectedImageId, setSelectedImageId] =
    useState(null);

  const [uploading, setUploading] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [position, setPosition] =
    useState({
      x: 0,
      y: 0,
    });

  const [isDragging, setIsDragging] =
    useState(false);

  const [dragStart, setDragStart] =
    useState({
      x: 0,
      y: 0,
    });

  const [hotkeys, setHotkeys] =
    useState(
      getSavedHotkeys()
    );

  const [thumbnailUrls, setThumbnailUrls] =
    useState({});

  const [uploadProgress, setUploadProgress] =
    useState(0);

  const viewerRef =
    useRef(null);

  const imageViewportRef =
    useRef(null);

  const imageCanvasRef =
    useRef(null);

  const overlayCanvasRef =
    useRef(null);

  const thumbnailRefs =
    useRef({});

  const fileInputRef =
    useRef(null);

  const pointerIdRef =
    useRef(null);

  const wheelTimerRef =
    useRef(null);

  const uploadXhrRef =
    useRef(null);

  const presets = {
    lung: {
      brightness: 40,
      contrast: 150,
    },
    bone: {
      brightness: 60,
      contrast: 200,
    },
    brain: {
      brightness: 50,
      contrast: 100,
    },
  };

  const loadSeries =
    useCallback(async () => {
      if (
        !patient?.id ||
        !study?.id
      ) {
        setSeries([]);
        setSelectedSeriesId(null);
        return;
      }

      const userId =
        getUserId();

      if (!userId) {
        alert(
          "Your login session was not found. Please login again."
        );

        navigate("/");

        return;
      }

      try {
        const response =
          await fetch(
            `${API_URL}/api/series?patientId=${patient.id}&studyId=${study.id}`,
            {
              method: "GET",
              headers: {
                "x-user-id":
                  String(userId),
              },
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          alert(
            data.message ||
              "Unable to load series"
          );

          return;
        }

        const loadedSeries =
          data.series || [];

        setSeries(
          loadedSeries
        );

        if (
          loadedSeries.length > 0
        ) {
          const firstSeries =
            loadedSeries[0];

          setSelectedSeriesId(
            firstSeries.id
          );
        } else {
          setSelectedSeriesId(
            null
          );
        }
      } catch (error) {
        console.error(
          "Series loading error:",
          error
        );

        alert(
          "Cannot connect to backend server."
        );
      }
    }, [
      patient?.id,
      study?.id,
      navigate,
    ]);

  const loadImages =
    useCallback(
      async (
        seriesId = selectedSeriesId
      ) => {
        if (
          !patient?.id ||
          !study?.id
        ) {
          setImages([]);
          setSelectedImageId(
            null
          );

          setImage(
            defaultImageDataUrl
          );

          return;
        }

        const userId =
          getUserId();

        if (!userId) {
          alert(
            "Your login session was not found. Please login again."
          );

          navigate("/");

          return;
        }

        try {
          const params =
            new URLSearchParams({
              patientId:
                String(
                  patient.id
                ),

              studyId:
                String(
                  study.id
                ),
            });

          if (seriesId) {
            params.set(
              "seriesId",
              String(seriesId)
            );
          }

          const response =
            await fetch(
              `${API_URL}/api/images?${params.toString()}`,
              {
                method: "GET",
                headers: {
                  "x-user-id":
                    String(userId),
                },
              }
            );

          const data =
            await response.json();

          if (!response.ok) {
            alert(
              data.message ||
                "Unable to load images"
            );

            return;
          }

          const loadedImages =
            data.images || [];

          setImages(
            loadedImages
          );

          if (
            loadedImages.length > 0
          ) {
            setSelectedImageId(
              loadedImages[0].id
            );
          } else {
            setSelectedImageId(
              null
            );

            setImage(
              defaultImageDataUrl
            );

            setZoom(1);
            setRotation(0);

            setPosition({
              x: 0,
              y: 0,
            });

            setBrightness(100);
            setContrast(100);
          }
        } catch (error) {
          console.error(
            "Images loading error:",
            error
          );

          alert(
            "Cannot connect to backend server."
          );
        }
      },
      [
        patient?.id,
        study?.id,
        selectedSeriesId,
        navigate,
      ]
    );

  const loadImage =
    useCallback(
      async (imageId) => {
        if (!imageId) {
          return;
        }

        const userId =
          getUserId();

        if (!userId) {
          return;
        }

        try {
          const response =
            await fetch(
              `${API_URL}/api/images/${imageId}`,
              {
                method: "GET",
                headers: {
                  "x-user-id":
                    String(userId),
                },
              }
            );

          if (!response.ok) {
            console.error(
              "Unable to load image"
            );

            return;
          }

          const blob =
            await response.blob();

          const imageURL =
            URL.createObjectURL(
              blob
            );

          setImage(
            (previousImage) => {
              if (
                previousImage &&
                previousImage.startsWith(
                  "blob:"
                )
              ) {
                URL.revokeObjectURL(
                  previousImage
                );
              }

              return imageURL;
            }
          );

          setZoom(1);
          setRotation(0);

          setPosition({
            x: 0,
            y: 0,
          });
        } catch (error) {
          console.error(
            "Image loading error:",
            error
          );
        }
      },
      []
    );

  useEffect(() => {
    const canvas =
      imageCanvasRef.current;

    if (!canvas || !image) {
      return;
    }

    const context =
      canvas.getContext("2d");

    if (!context) {
      return;
    }

    const frame =
      new window.Image();

    frame.onload = () => {
      const canvasWidth =
        canvas.width;
      const canvasHeight =
        canvas.height;
      const scale = Math.min(
        canvasWidth / frame.naturalWidth,
        canvasHeight / frame.naturalHeight
      );
      const width =
        frame.naturalWidth * scale;
      const height =
        frame.naturalHeight * scale;

      context.clearRect(
        0,
        0,
        canvasWidth,
        canvasHeight
      );
      context.filter =
        `brightness(${brightness}%) contrast(${contrast}%)`;
      context.drawImage(
        frame,
        (canvasWidth - width) / 2,
        (canvasHeight - height) / 2,
        width,
        height
      );
      context.filter = "none";
    };

    frame.onerror = () => {
      context.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );
    };

    frame.src = image;

    return () => {
      frame.onload = null;
      frame.onerror = null;
    };
  }, [
    image,
    brightness,
    contrast,
  ]);

  useEffect(() => {
    const canvas =
      overlayCanvasRef.current;

    if (!canvas) {
      return;
    }

    const context =
      canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );
    context.lineWidth = 2;
    context.font = "14px sans-serif";

    measurements.forEach(
      (measurement) => {
        const [start, end] =
          measurement.points;

        context.strokeStyle =
          "#42a5f5";
        context.fillStyle =
          "#ffffff";
        context.setLineDash([]);
        context.beginPath();
        context.moveTo(
          start.x,
          start.y
        );
        context.lineTo(
          end.x,
          end.y
        );
        context.stroke();
        context.fillText(
          `${measurement.pixels.toFixed(1)} px`,
          end.x + 8,
          end.y - 8
        );
      }
    );

    if (measurementPoints.length === 2) {
      context.strokeStyle =
        "#90caf9";
      context.setLineDash([]);
      context.beginPath();
      context.moveTo(
        measurementPoints[0].x,
        measurementPoints[0].y
      );
      context.lineTo(
        measurementPoints[1].x,
        measurementPoints[1].y
      );
      context.stroke();
    } else if (
      measurementPoints.length === 1 &&
      measurementPreviewPoint
    ) {
      // Live "rubber-band" preview line from the first click to the
      // current pointer position, so the user can see what they're
      // about to measure before releasing the second point.
      const start =
        measurementPoints[0];
      const livePixels = Math.hypot(
        measurementPreviewPoint.x - start.x,
        measurementPreviewPoint.y - start.y
      );

      context.strokeStyle =
        "#90caf9";
      context.setLineDash([6, 4]);
      context.beginPath();
      context.moveTo(
        start.x,
        start.y
      );
      context.lineTo(
        measurementPreviewPoint.x,
        measurementPreviewPoint.y
      );
      context.stroke();
      context.setLineDash([]);

      context.fillStyle =
        "#ffffff";
      context.fillText(
        `${livePixels.toFixed(1)} px`,
        measurementPreviewPoint.x + 8,
        measurementPreviewPoint.y - 8
      );
    }
  }, [
    measurements,
    measurementPoints,
    measurementPreviewPoint,
  ]);

  useEffect(() => {
    if (!playing || images.length < 2) {
      return undefined;
    }

    const intervalId =
      window.setInterval(() => {
        const currentIndex =
          images.findIndex(
            (item) =>
              item.id ===
              selectedImageId
          );
        const nextIndex =
          currentIndex < 0
            ? 0
            : (currentIndex + 1) %
              images.length;

        setSelectedImageId(
          images[nextIndex].id
        );
      }, 150);

    return () =>
      window.clearInterval(
        intervalId
      );
  }, [
    playing,
    images,
    selectedImageId,
  ]);

  const loadThumbnails =
    useCallback(
      async (imageList) => {
        const userId =
          getUserId();

        if (!userId) {
          return;
        }

        const nextUrls = {};

        for (
          const item of
            imageList
        ) {
          try {
            const response =
              await fetch(
                `${API_URL}/api/images/${item.id}`,
                {
                  method: "GET",
                  headers: {
                    "x-user-id":
                      String(userId),
                  },
                }
              );

            if (
              !response.ok
            ) {
              continue;
            }

            const blob =
              await response.blob();

            nextUrls[item.id] =
              URL.createObjectURL(
                blob
              );
          } catch (error) {
            console.error(
              "Thumbnail loading error:",
              error
            );
          }
        }

        setThumbnailUrls(
          (previous) => {
            Object.values(
              previous
            ).forEach(
              (url) => {
                if (
                  url &&
                  url.startsWith(
                    "blob:"
                  )
                ) {
                  URL.revokeObjectURL(
                    url
                  );
                }
              }
            );

            return nextUrls;
          }
        );
      },
      []
    );

  useEffect(() => {
    loadSeries();
  }, [
    loadSeries,
  ]);

  useEffect(() => {
    if (
      selectedSeriesId
    ) {
      loadImages(
        selectedSeriesId
      );
    } else {
      setImages([]);
      setSelectedImageId(null);
    }
  }, [
    selectedSeriesId,
    loadImages,
  ]);

  useEffect(() => {
    if (
      images.length > 0
    ) {
      loadThumbnails(
        images
      );
    } else {
      setThumbnailUrls(
        {}
      );
    }

    return () => {
      setThumbnailUrls(
        (previous) => {
          Object.values(
            previous
          ).forEach(
            (url) => {
              if (
                url &&
                url.startsWith(
                  "blob:"
                )
              ) {
                URL.revokeObjectURL(
                  url
                );
              }
            }
          );

          return {};
        }
      );
    };
  }, [
    images,
    loadThumbnails,
  ]);

  useEffect(() => {
    if (
      selectedImageId
    ) {
      loadImage(
        selectedImageId
      );
    }
  }, [
    selectedImageId,
    loadImage,
  ]);

  useEffect(() => {
    const updateHotkeys =
      () => {
        setHotkeys(
          getSavedHotkeys()
        );
      };

    window.addEventListener(
      "radiology-hotkeys-change",
      updateHotkeys
    );

    return () => {
      window.removeEventListener(
        "radiology-hotkeys-change",
        updateHotkeys
      );
    };
  }, []);

  useEffect(() => {
    return () => {
      if (
        image &&
        image.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          image
        );
      }
    };
  }, [
    image,
  ]);

  useEffect(() => {
    return () => {
      if (
        wheelTimerRef.current
      ) {
        clearTimeout(
          wheelTimerRef.current
        );
      }
    };
  }, []);

  // Abort any in-flight upload if the component unmounts mid-request.
  useEffect(() => {
    return () => {
      if (uploadXhrRef.current) {
        uploadXhrRef.current.abort();
        uploadXhrRef.current = null;
      }
    };
  }, []);

  const handlePointerDown =
    (event) => {
      if (
        event.button !== 0
      ) {
        return;
      }

      event.preventDefault();

      pointerIdRef.current =
        event.pointerId;

      try {
        event.currentTarget.setPointerCapture(
          event.pointerId
        );
      } catch (error) {
        console.error(
          "Pointer capture error:",
          error
        );
      }

      setIsDragging(
        true
      );

      setDragStart({
        x:
          event.clientX -
          position.x,

        y:
          event.clientY -
          position.y,
      });
    };

  const handlePointerMove =
    (event) => {
      if (
        !isDragging
      ) {
        return;
      }

      if (
        pointerIdRef.current !==
        event.pointerId
      ) {
        return;
      }

      event.preventDefault();

      setPosition({
        x:
          event.clientX -
          dragStart.x,

        y:
          event.clientY -
          dragStart.y,
      });
    };

  const handlePointerUp =
    (event) => {
      if (
        pointerIdRef.current ===
        event.pointerId
      ) {
        try {
          event.currentTarget.releasePointerCapture(
            event.pointerId
          );
        } catch (error) {
          console.error(
            "Pointer release error:",
            error
          );
        }
      }

      pointerIdRef.current =
        null;

      setIsDragging(
        false
      );
    };

  const handleWheel =
    useCallback(
      (event) => {
        if (
          images.length === 0
        ) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (
          wheelTimerRef.current
        ) {
          return;
        }

        wheelTimerRef.current =
          setTimeout(() => {
            wheelTimerRef.current =
              null;
          }, 70);

        if (
          event.deltaY > 0
        ) {
          const currentIndex =
            images.findIndex(
              (item) =>
                item.id ===
                selectedImageId
            );

          const nextIndex =
            currentIndex +
            1;

          if (
            currentIndex ===
              -1
          ) {
            setSelectedImageId(
              images[0].id
            );
          } else if (
            nextIndex <
            images.length
          ) {
            setSelectedImageId(
              images[nextIndex]
                .id
            );
          }
        } else if (
          event.deltaY < 0
        ) {
          const currentIndex =
            images.findIndex(
              (item) =>
                item.id ===
                selectedImageId
            );

          const previousIndex =
            currentIndex -
            1;

          if (
            currentIndex ===
              -1
          ) {
            setSelectedImageId(
              images[0].id
            );
          } else if (
            previousIndex >=
            0
          ) {
            setSelectedImageId(
              images[
                previousIndex
              ].id
            );
          }
        }
      },
      [
        images,
        selectedImageId,
      ]
    );

  useEffect(() => {
    const element =
      imageViewportRef.current;

    if (!element) {
      return;
    }

    element.addEventListener(
      "wheel",
      handleWheel,
      {
        passive: false,
      }
    );

    return () => {
      element.removeEventListener(
        "wheel",
        handleWheel
      );
    };
  }, [
    handleWheel,
  ]);

  const getOverlayPoint =
    (event) => {
      const canvas =
        overlayCanvasRef.current;
      const rect =
        canvas.getBoundingClientRect();

      return {
        x:
          (event.clientX - rect.left) *
          (canvas.width / rect.width),
        y:
          (event.clientY - rect.top) *
          (canvas.height / rect.height),
      };
    };

  const handleOverlayPointerDown =
    (event) => {
      if (!measureMode) {
        return;
      }

      if (measurementPoints.length === 0) {
        setMeasurementPoints([
          getOverlayPoint(event),
        ]);
        setMeasurementPreviewPoint(null);
      }
    };

  const handleOverlayPointerMove =
    (event) => {
      if (
        !measureMode ||
        measurementPoints.length !== 1
      ) {
        return;
      }

      setMeasurementPreviewPoint(
        getOverlayPoint(event)
      );
    };

  const handleOverlayPointerUp =
    (event) => {
      if (
        !measureMode ||
        measurementPoints.length !== 1
      ) {
        return;
      }

      const points = [
        measurementPoints[0],
        getOverlayPoint(event),
      ];
      const pixels = Math.hypot(
        points[1].x - points[0].x,
        points[1].y - points[0].y
      );

      setMeasurements(
        (previous) => [
          ...previous,
          {
            points,
            pixels,
          },
        ]
      );
      setMeasurementPoints([]);
      setMeasurementPreviewPoint(null);
    };

  const applyPreset =
    (name) => {
      const preset =
        presets[name];

      if (!preset) {
        return;
      }

      setBrightness(
        preset.brightness
      );
      setContrast(
        preset.contrast
      );
    };

  const handleImageUpload =
    async (event) => {
      const files = Array.from(
        event.target.files || []
      ).sort((a, b) =>
        a.name.localeCompare(
          b.name,
          undefined,
          {
            numeric: true,
            sensitivity: "base",
          }
        )
      );

      if (
        files.length ===
        0
      ) {
        return;
      }

      if (
        files.length >
        500
      ) {
        alert(
          "You can upload a maximum of 500 images in one series."
        );

        event.target.value =
          "";

        return;
      }

      if (!patient?.id) {
        alert(
          "No patient selected."
        );

        return;
      }

      if (!study?.id) {
        alert(
          "No study selected."
        );

        return;
      }

      const userId =
        getUserId();

      if (!userId) {
        alert(
          "Your login session was not found. Please login again."
        );

        navigate("/");

        return;
      }

      const invalidFile =
        files.find(
          (file) => {
            const extension =
              file.name
                .split(".")
                .pop()
                ?.toLowerCase();

            const isImageFile =
              file.type.startsWith(
                "image/"
              );

            const isDicomFile =
              file.type ===
                "application/dicom" ||
              extension === "dcm" ||
              extension === "dicom" ||
              !extension;

            return !isImageFile &&
              !isDicomFile;
          }
        );

      if (invalidFile) {
        alert(
          "Please select only image files."
        );

        return;
      }

      // Catch oversized files client-side with a clear message instead
      // of letting them fail against a backend size limit with a vague
      // "Cannot connect to backend server" error.
      const oversizedFile =
        files.find(
          (file) =>
            file.size >
            MAX_UPLOAD_FILE_SIZE_BYTES
        );

      if (oversizedFile) {
        alert(
          `"${oversizedFile.name}" is larger than 100MB and cannot be uploaded. Please choose a smaller file.`
        );

        return;
      }

      const formData =
        new FormData();

      files.forEach(
        (file) => {
          formData.append(
            "images",
            file
          );
        }
      );

      formData.append(
        "patientId",
        String(
          patient.id
        )
      );

      formData.append(
        "studyId",
        String(
          study.id
        )
      );

      if (
        selectedSeriesId
      ) {
        formData.append(
          "seriesId",
          String(
            selectedSeriesId
          )
        );
      }

      setUploading(
        true
      );

      setUploadProgress(
        0
      );

      try {
        // Using XMLHttpRequest instead of fetch() here on purpose:
        // fetch() cannot report upload progress, which left the
        // progress bar stuck at 0% and made real uploads look
        // "stuck"/broken even when they were still in flight. XHR also
        // lets us distinguish a network failure from a timeout from a
        // real server error, instead of collapsing all three into the
        // same generic message.
        const data = await new Promise(
          (resolve, reject) => {
            const xhr =
              new XMLHttpRequest();

            uploadXhrRef.current =
              xhr;

            xhr.open(
              "POST",
              `${API_URL}/api/series/upload`
            );

            xhr.setRequestHeader(
              "x-user-id",
              String(userId)
            );

            xhr.timeout =
              UPLOAD_TIMEOUT_MS;

            xhr.upload.onprogress =
              (
                progressEvent
              ) => {
                if (
                  progressEvent.lengthComputable
                ) {
                  const percent =
                    Math.round(
                      (progressEvent.loaded /
                        progressEvent.total) *
                        100
                    );

                  setUploadProgress(
                    percent
                  );
                }
              };

            xhr.onload =
              () => {
                let parsed = {};

                try {
                  parsed = xhr.responseText
                    ? JSON.parse(
                        xhr.responseText
                      )
                    : {};
                } catch (parseError) {
                  reject(
                    new Error(
                      "The server returned an invalid upload response."
                    )
                  );

                  return;
                }

                if (
                  xhr.status < 200 ||
                  xhr.status >= 300
                ) {
                  reject(
                    new Error(
                      parsed.message ||
                        `Upload failed (status ${xhr.status}). Check that the backend upload route and field name ("images") match what the server expects.`
                    )
                  );

                  return;
                }

                resolve(parsed);
              };

            xhr.onerror =
              () => {
                reject(
                  new Error(
                    "Cannot connect to backend server. Confirm the server is running on http://localhost:5000 and that CORS allows this origin."
                  )
                );
              };

            xhr.ontimeout =
              () => {
                reject(
                  new Error(
                    "Upload timed out. Try again with fewer or smaller files, or check the server logs."
                  )
                );
              };

            xhr.onabort =
              () => {
                reject(
                  new Error(
                    "Upload was cancelled."
                  )
                );
              };

            xhr.send(
              formData
            );
          }
        );

        alert(
          `${
            data.count ||
            files.length
          } image${
            files.length > 1
              ? "s"
              : ""
          } uploaded successfully.`
        );

        await loadSeries();

        if (
          data.seriesId
        ) {
          setSelectedSeriesId(
            data.seriesId
          );
        }

        await loadImages(
          data.seriesId ||
            selectedSeriesId
        );
      } catch (error) {
        console.error(
          "Image Upload Error:",
          error
        );

        alert(
          error.message ||
            "Cannot connect to backend server."
        );
      } finally {
        uploadXhrRef.current =
          null;

        setUploading(
          false
        );

        setUploadProgress(
          0
        );

        event.target.value =
          "";
      }
    };

  const handleSelectSeries =
    (seriesId) => {
      setSelectedSeriesId(
        seriesId
      );
    };

  const handleSelectImage =
    (imageId) => {
      setSelectedImageId(
        imageId
      );

      requestAnimationFrame(
        () => {
          const selectedThumb =
            thumbnailRefs.current[
              imageId
            ];

          selectedThumb?.scrollIntoView(
            {
              behavior:
                "smooth",
              block:
                "nearest",
            }
          );
        }
      );
    };

  const handleDeleteImage =
    async () => {
      if (
        !selectedImageId
      ) {
        alert(
          "Please select an image first."
        );

        return;
      }

      const selectedImage =
        images.find(
          (item) =>
            item.id ===
            selectedImageId
        );

      const confirmed =
        window.confirm(
          `Are you sure you want to delete "${
            selectedImage?.fileName ||
            "this image"
          }"?`
        );

      if (!confirmed) {
        return;
      }

      const userId =
        getUserId();

      if (!userId) {
        alert(
          "Your login session was not found. Please login again."
        );

        navigate("/");

        return;
      }

      try {
        setDeleting(
          true
        );

        const response =
          await fetch(
            `${API_URL}/api/images/${selectedImageId}`,
            {
              method:
                "DELETE",

              headers: {
                "x-user-id":
                  String(
                    userId
                  ),
              },
            }
          );

        const data =
          await response.json();

        if (
          !response.ok
        ) {
          alert(
            data.message ||
              "Unable to delete image"
          );

          return;
        }

        alert(
          "Image deleted successfully"
        );

        setSelectedImageId(
          null
        );

        setImage(
          defaultImageDataUrl
        );

        setZoom(1);
        setRotation(0);

        setPosition({
          x: 0,
          y: 0,
        });

        await loadImages(
          selectedSeriesId
        );
      } catch (error) {
        console.error(
          "Delete Image Error:",
          error
        );

        alert(
          "Cannot connect to backend server."
        );
      } finally {
        setDeleting(
          false
        );
      }
    };

  const handleZoomIn =
    () => {
      setZoom(
        (previous) => {
          if (
            previous >=
            3
          ) {
            return previous;
          }

          return Number(
            (
              previous +
              0.2
            ).toFixed(1)
          );
        }
      );
    };

  const handleZoomOut =
    () => {
      setZoom(
        (previous) => {
          if (
            previous <=
            0.4
          ) {
            return previous;
          }

          return Number(
            (
              previous -
              0.2
            ).toFixed(1)
          );
        }
      );
    };

  const handleRotate =
    () => {
      setRotation(
        (previous) =>
          previous +
          90
      );
    };

  const handleRotateLeft =
    () => {
      setRotation(
        (previous) =>
          previous -
          90
      );
    };

  const handleReset = () => {
    setZoom(1);

    setRotation(0);

    setPosition({
      x: 0,
      y: 0,
    });

    setBrightness(100);

    setContrast(100);
  };

  const handleFirstImage =
    useCallback(
      () => {
        if (
          images.length ===
          0
        ) {
          return;
        }

        setSelectedImageId(
          images[0].id
        );
      },
      [
        images,
      ]
    );

  const handleLastImage =
    useCallback(
      () => {
        if (
          images.length ===
          0
        ) {
          return;
        }

        setSelectedImageId(
          images[
            images.length -
              1
          ].id
        );
      },
      [
        images,
      ]
    );

  const handleNextImage =
    useCallback(
      () => {
        if (
          images.length ===
          0
        ) {
          return;
        }

        const currentIndex =
          images.findIndex(
            (item) =>
              item.id ===
              selectedImageId
          );

        if (
          currentIndex ===
          -1
        ) {
          setSelectedImageId(
            images[0].id
          );

          return;
        }

        const nextIndex =
          currentIndex +
          1;

        if (
          nextIndex <
          images.length
        ) {
          setSelectedImageId(
            images[nextIndex]
              .id
          );
        }
      },
      [
        images,
        selectedImageId,
      ]
    );

  const handlePreviousImage =
    useCallback(
      () => {
        if (
          images.length ===
          0
        ) {
          return;
        }

        const currentIndex =
          images.findIndex(
            (item) =>
              item.id ===
              selectedImageId
          );

        if (
          currentIndex ===
          -1
        ) {
          setSelectedImageId(
            images[0].id
          );

          return;
        }

        const previousIndex =
          currentIndex -
          1;

        if (
          previousIndex >=
          0
        ) {
          setSelectedImageId(
            images[
              previousIndex
            ].id
          );
        }
      },
      [
        images,
        selectedImageId,
      ]
    );

  const handleSliceChange =
    (
      event,
      value
    ) => {
      if (
        images.length ===
        0
      ) {
        return;
      }

      const index =
        Number(value);

      if (
        index >= 0 &&
        index <
          images.length
      ) {
        setSelectedImageId(
          images[index].id
        );
      }
    };

  const handleDownload =
    () => {
      if (
        !image ||
        !selectedImageId
      ) {
        return;
      }

      const link =
        document.createElement(
          "a"
        );

      link.href =
        image;

      const selectedImage =
        images.find(
          (item) =>
            item.id ===
            selectedImageId
        );

      link.download =
        selectedImage?.fileName ||
        `${
          patient?.name ||
          "Patient"
        }-Medical-Image.png`;

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );
    };

  const handleFullscreen =
    async () => {
      try {
        if (
          !document.fullscreenElement
        ) {
          await viewerRef.current?.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      } catch (error) {
        console.error(
          "Fullscreen Error:",
          error
        );
      }
    };

  const handleBack =
    () => {
      navigate(
        "/studies",
        {
          state: {
            patient,
          },
        }
      );
    };

  const handleCancel =
    () => {
      setIsDragging(
        false
      );

      pointerIdRef.current =
        null;

      setPosition({
        x: 0,
        y: 0,
      });
    };

  const formatStudyDate =
    (date) => {
      if (!date) {
        return "-";
      }

      const formattedDate =
        new Date(date);

      if (
        Number.isNaN(
          formattedDate.getTime()
        )
      ) {
        return date;
      }

      return formattedDate.toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );
    };

  useEffect(() => {
    const handleKeyDown =
      (event) => {
        const target =
          event.target;

        const tagName =
          target?.tagName?.toLowerCase();

        if (
          tagName ===
            "input" ||
          tagName ===
            "textarea" ||
          tagName ===
            "select" ||
          target?.isContentEditable
        ) {
          return;
        }

        const pressedKey =
          normalizeHotkey(
            event.key
          );

        const matches =
          (
            configuredKey
          ) =>
            normalizeHotkey(
              configuredKey
            ) ===
            pressedKey;

        if (
          matches(
            hotkeys.zoom
          )
        ) {
          event.preventDefault();
          handleZoomIn();
          return;
        }

        if (
          matches(
            hotkeys.zoomIn
          )
        ) {
          event.preventDefault();
          handleZoomIn();
          return;
        }

        if (
          matches(
            hotkeys.zoomOut
          )
        ) {
          event.preventDefault();
          handleZoomOut();
          return;
        }

        if (
          matches(
            hotkeys.zoomFit
          )
        ) {
          event.preventDefault();
          handleReset();
          return;
        }

        if (
          matches(
            hotkeys.rotateRight
          )
        ) {
          event.preventDefault();
          handleRotate();
          return;
        }

        if (
          matches(
            hotkeys.rotateLeft
          )
        ) {
          event.preventDefault();
          handleRotateLeft();
          return;
        }

        if (
          matches(
            hotkeys.reset
          )
        ) {
          event.preventDefault();
          handleReset();
          return;
        }

        if (
          matches(
            hotkeys.firstImage
          )
        ) {
          event.preventDefault();
          handleFirstImage();
          return;
        }

        if (
          matches(
            hotkeys.lastImage
          )
        ) {
          event.preventDefault();
          handleLastImage();
          return;
        }

        if (
          matches(
            hotkeys.nextImage
          )
        ) {
          event.preventDefault();
          handleNextImage();
          return;
        }

        if (
          matches(
            hotkeys.previousImage
          )
        ) {
          event.preventDefault();
          handlePreviousImage();
          return;
        }

        if (
          matches(
            hotkeys.cancel
          )
        ) {
          event.preventDefault();
          handleCancel();
        }
      };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    hotkeys,
    handleFirstImage,
    handleLastImage,
    handleNextImage,
    handlePreviousImage,
  ]);
    return (
    <Layout>
      <Box
        ref={viewerRef}
        sx={{
          backgroundColor:
            "#0b0f14",
          color:
            "#ffffff",
          minHeight:
            "calc(100vh - 64px)",
          borderRadius: 2,
          overflow:
            "hidden",
          p: 1.2,
        }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          gap={2}
          mb={1}
          px={0.5}
        >
          <Box>
            <Typography
              variant="h6"
              fontWeight="bold"
            >
              Medical Image Viewer
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color:
                  "#aeb8c4",
              }}
            >
              {patient?.name ||
                "No Patient"}{" "}
              •{" "}
              {study?.studyId ||
                "No Study"}{" "}
              •{" "}
              {study?.modality ||
                "Medical Image"}
            </Typography>
          </Box>

          <Button
            variant="outlined"
            startIcon={
              <ArrowBackIcon />
            }
            onClick={
              handleBack
            }
            sx={{
              color:
                "#ffffff",
              borderColor:
                "#475569",
              minWidth: 110,
            }}
          >
            Back
          </Button>
        </Box>

        <Paper
          elevation={0}
          sx={{
            backgroundColor:
              "#151c24",
            border:
              "1px solid #263241",
            borderRadius: 2,
            mb: 1.2,
            px: 0.8,
            py: 0.45,
          }}
        >
          <Stack
            direction="row"
            spacing={0.4}
            alignItems="center"
            sx={{
              flexWrap:
                "wrap",
              rowGap: 0.5,
            }}
          >
            <Tooltip
              title={`Zoom In (${hotkeys.zoomIn})`}
            >
              <IconButton
                onClick={
                  handleZoomIn
                }
                sx={{
                  color:
                    "#ffffff",
                }}
              >
                <ZoomInIcon />
              </IconButton>
            </Tooltip>

            <Tooltip
              title={`Zoom Out (${hotkeys.zoomOut})`}
            >
              <IconButton
                onClick={
                  handleZoomOut
                }
                sx={{
                  color:
                    "#ffffff",
                }}
              >
                <ZoomOutIcon />
              </IconButton>
            </Tooltip>

            <Box
              sx={{
                minWidth: 55,
                textAlign:
                  "center",
                color:
                  "#cbd5e1",
                fontSize: 14,
              }}
            >
              {zoom.toFixed(
                1
              )}x
            </Box>

            <Divider
              orientation="vertical"
              flexItem
              sx={{
                borderColor:
                  "#334155",
                mx: 0.3,
              }}
            />

            <Button
              size="small"
              variant="outlined"
              sx={{
                color:
                  "#ffffff",
                borderColor:
                  "#475569",
                minWidth: 105,
                cursor:
                  "default",
              }}
            >
              Pan: Drag
            </Button>

            <Box
              sx={{
                display:
                  "flex",
                alignItems:
                  "center",
                gap: 0.5,
                ml: 0.5,
              }}
            >
              <Tooltip title="Decrease Brightness">
                <IconButton
                  size="small"
                  onClick={() =>
                    setBrightness(
                      (
                        previous
                      ) =>
                        Math.max(
                          50,
                          previous -
                            10
                        )
                    )
                  }
                  sx={{
                    color:
                      "#ffffff",
                  }}
                >
                  -
                </IconButton>
              </Tooltip>

              <Box
                sx={{
                  display:
                    "flex",
                  flexDirection:
                    "column",
                  minWidth: 105,
                  px: 0.5,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color:
                      "#cbd5e1",
                    lineHeight: 1,
                    fontSize: 10,
                  }}
                >
                  Brightness
                </Typography>

                <input
                  type="range"
                  min="50"
                  max="150"
                  value={
                    brightness
                  }
                  onChange={(
                    event
                  ) =>
                    setBrightness(
                      Number(
                        event
                          .target
                          .value
                      )
                    )
                  }
                  style={{
                    width: "100%",
                    height: "14px",
                    cursor:
                      "pointer",
                  }}
                />
              </Box>

              <Tooltip title="Increase Brightness">
                <IconButton
                  size="small"
                  onClick={() =>
                    setBrightness(
                      (
                        previous
                      ) =>
                        Math.min(
                          150,
                          previous +
                            10
                        )
                    )
                  }
                  sx={{
                    color:
                      "#ffffff",
                  }}
                >
                  +
                </IconButton>
              </Tooltip>

              <Divider
                orientation="vertical"
                flexItem
                sx={{
                  borderColor:
                    "#334155",
                  mx: 0.5,
                }}
              />

              <Box
                sx={{
                  display:
                    "flex",
                  flexDirection:
                    "column",
                  minWidth: 105,
                  px: 0.5,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color:
                      "#cbd5e1",
                    lineHeight: 1,
                    fontSize: 10,
                  }}
                >
                  Contrast
                </Typography>

                <input
                  type="range"
                  min="50"
                  max="150"
                  value={
                    contrast
                  }
                  onChange={(
                    event
                  ) =>
                    setContrast(
                      Number(
                        event
                          .target
                          .value
                      )
                    )
                  }
                  style={{
                    width: "100%",
                    height: "14px",
                    cursor:
                      "pointer",
                  }}
                />
              </Box>

              <Tooltip title="Increase Contrast">
                <IconButton
                  size="small"
                  onClick={() =>
                    setContrast(
                      (
                        previous
                      ) =>
                        Math.min(
                          150,
                          previous +
                            10
                        )
                    )
                  }
                  sx={{
                    color:
                      "#ffffff",
                  }}
                >
                  +
                </IconButton>
              </Tooltip>

              <Tooltip title="Reset Window / Level">
                <IconButton
                  size="small"
                  onClick={() => {
                    setBrightness(
                      100
                    );

                    setContrast(
                      100
                    );
                  }}
                  sx={{
                    color:
                      "#ffffff",
                  }}
                >
                  <RestartAltIcon
                    fontSize="small"
                  />
                </IconButton>
              </Tooltip>
            </Box>

            <Box
              sx={{
                display:
                  "flex",
                alignItems:
                  "center",
                gap: 0.6,
                px: 0.5,
                color:
                  "#94a3b8",
                fontSize: 11,
                whiteSpace:
                  "nowrap",
              }}
            >
              W {brightness}% /
              C {contrast}%
            </Box>

            <Stack
              direction="row"
              spacing={0.4}
              alignItems="center"
            >
              {Object.keys(presets).map(
                (presetName) => (
                  <Button
                    key={presetName}
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      applyPreset(
                        presetName
                      )
                    }
                    sx={{
                      color: "#ffffff",
                      borderColor: "#475569",
                      textTransform: "capitalize",
                      minWidth: 58,
                    }}
                  >
                    {presetName}
                  </Button>
                )
              )}

              <Button
                size="small"
                variant={
                  measureMode
                    ? "contained"
                    : "outlined"
                }
                onClick={() => {
                  setMeasureMode(
                    (previous) =>
                      !previous
                  );
                  setMeasurementPoints(
                    []
                  );
                  setMeasurementPreviewPoint(
                    null
                  );
                }}
                sx={{
                  color: "#ffffff",
                  borderColor: "#475569",
                }}
              >
                Measure
              </Button>

              <Button
                size="small"
                variant="outlined"
                onClick={() =>
                  setMeasurements([])
                }
                disabled={
                  measurements.length === 0
                }
                sx={{
                  color: "#ffffff",
                  borderColor: "#475569",
                }}
              >
                Clear
              </Button>

              <Button
                size="small"
                variant="contained"
                onClick={() =>
                  setPlaying(
                    (previous) =>
                      !previous
                  )
                }
                disabled={
                  images.length < 2
                }
              >
                {playing ? "Pause" : "Cine"}
              </Button>
            </Stack>

            <Divider
              orientation="vertical"
              flexItem
              sx={{
                borderColor:
                  "#334155",
                mx: 0.3,
              }}
            />

            <Tooltip
              title={`Rotate Right (${hotkeys.rotateRight})`}
            >
              <IconButton
                onClick={
                  handleRotate
                }
                sx={{
                  color:
                    "#ffffff",
                }}
              >
                <RotateRightIcon />
              </IconButton>
            </Tooltip>

            <Tooltip
              title={`Zoom to Fit (${hotkeys.zoomFit})`}
            >
              <IconButton
                onClick={
                  handleReset
                }
                sx={{
                  color:
                    "#ffffff",
                }}
              >
                <FitScreenIcon />
              </IconButton>
            </Tooltip>

            <Tooltip
              title={`Reset (${hotkeys.reset})`}
            >
              <IconButton
                onClick={
                  handleReset
                }
                sx={{
                  color:
                    "#ffffff",
                }}
              >
                <RestartAltIcon />
              </IconButton>
            </Tooltip>

            <Tooltip
              title="Fullscreen"
            >
              <IconButton
                onClick={
                  handleFullscreen
                }
                sx={{
                  color:
                    "#ffffff",
                }}
              >
                <FullscreenIcon />
              </IconButton>
            </Tooltip>

            <Divider
              orientation="vertical"
              flexItem
              sx={{
                borderColor:
                  "#334155",
                mx: 0.3,
              }}
            />

            <Button
              size="small"
              variant="contained"
              startIcon={
                <UploadFileIcon />
              }
              onClick={() =>
                fileInputRef.current?.click()
              }
              disabled={
                uploading
              }
            >
              {uploading
                ? `Uploading... ${uploadProgress}%`
                : "Upload Series"}
            </Button>

            <Button
              size="small"
              variant="outlined"
              startIcon={
                <DownloadIcon />
              }
              onClick={
                handleDownload
              }
              disabled={
                !selectedImageId
              }
              sx={{
                color:
                  "#ffffff",
                borderColor:
                  "#475569",
              }}
            >
              Download
            </Button>

            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={
                <DeleteIcon />
              }
              onClick={
                handleDeleteImage
              }
              disabled={
                !selectedImageId ||
                deleting
              }
            >
              {deleting
                ? "Deleting..."
                : "Delete"}
            </Button>

            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,.dcm,.dicom"
              multiple
              ref={
                fileInputRef
              }
              style={{
                display:
                  "none",
              }}
              onChange={
                handleImageUpload
              }
            />
          </Stack>
        </Paper>

        <Box
          sx={{
            display:
              "grid",
            gridTemplateColumns:
              {
                xs:
                  "1fr",
                md:
                  "190px 1fr 42px",
              },
            gap: 1.2,
            height:
              {
                xs:
                  "auto",
                md:
                  "560px",
              },
            minHeight:
              {
                xs: 500,
                md: 560,
              },
            overflow:
              "hidden",
          }}
        >
          <Paper
            elevation={0}
            sx={{
              backgroundColor:
                "#111820",
              border:
                "1px solid #263241",
              borderRadius: 2,
              p: 1,
              overflow:
                "hidden",
              display:
                "flex",
              flexDirection:
                "column",
              minHeight:
                0,
            }}
          >
            <Box
              sx={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                mb: 0.8,
              }}
            >
              <Typography
                variant="subtitle2"
                fontWeight="bold"
              >
                Series
              </Typography>

              <Typography
                variant="caption"
                sx={{
                  color:
                    "#94a3b8",
                }}
              >
                {series.length}
              </Typography>
            </Box>

            <Divider
              sx={{
                borderColor:
                  "#263241",
                mb: 1,
              }}
            />

            <Box
              sx={{
                overflowY:
                  "auto",
                minHeight: 0,
                pr: 0.4,
                "&::-webkit-scrollbar":
                  {
                    width:
                      "6px",
                  },
                "&::-webkit-scrollbar-thumb":
                  {
                    backgroundColor:
                      "#475569",
                    borderRadius:
                      "10px",
                  },
              }}
            >
              {series.length ===
              0 ? (
                <Box
                  sx={{
                    py: 4,
                    textAlign:
                      "center",
                  }}
                >
                  <ImageIcon
                    sx={{
                      fontSize:
                        38,
                      color:
                        "#64748b",
                    }}
                  />

                  <Typography
                    variant="body2"
                    sx={{
                      color:
                        "#94a3b8",
                      mt: 0.8,
                    }}
                  >
                    No series
                  </Typography>

                  <Typography
                    variant="caption"
                    sx={{
                      color:
                        "#64748b",
                      display:
                        "block",
                      mt: 0.5,
                    }}
                  >
                    Upload images
                    to create a
                    series
                  </Typography>
                </Box>
              ) : (
                <Stack
                  spacing={0.8}
                >
                  {series.map(
                    (
                      item
                    ) => (
                      <Box
                        key={
                          item.id
                        }
                        onClick={() =>
                          handleSelectSeries(
                            item.id
                          )
                        }
                        sx={{
                          border:
                            selectedSeriesId ===
                            item.id
                              ? "2px solid #42a5f5"
                              : "1px solid #334155",
                          backgroundColor:
                            selectedSeriesId ===
                            item.id
                              ? "#1b2a3a"
                              : "#18212b",
                          borderRadius:
                            1.5,
                          p: 0.6,
                          cursor:
                            "pointer",
                          transition:
                            "0.2s",
                          "&:hover":
                            {
                              borderColor:
                                "#64b5f6",
                            },
                        }}
                      >
                        <Box
                          sx={{
                            height: 78,
                            backgroundColor:
                              "#05080c",
                            borderRadius:
                              1,
                            display:
                              "flex",
                            justifyContent:
                              "center",
                            alignItems:
                              "center",
                            overflow:
                              "hidden",
                          }}
                        >
                          {thumbnailUrls[
                            item.firstImageId
                          ] ? (
                            <img
                              ref={(element) => {
                                thumbnailRefs.current[
                                  item.firstImageId
                                ] = element;
                              }}
                              src={
                                thumbnailUrls[
                                  item
                                    .firstImageId
                                ]
                              }
                              onClick={(event) => {
                                event.stopPropagation();
                                handleSelectImage(
                                  item.firstImageId
                                );
                              }}
                              alt={
                                item.seriesDescription ||
                                `Series ${item.seriesNumber}`
                              }
                              style={{
                                width:
                                  "100%",
                                height:
                                  "100%",
                                objectFit:
                                  "cover",
                              }}
                            />
                          ) : (
                            <ImageIcon
                              sx={{
                                color:
                                  "#64748b",
                                fontSize:
                                  32,
                              }}
                            />
                          )}
                        </Box>

                        <Typography
                          variant="caption"
                          sx={{
                            display:
                              "block",
                            color:
                              "#e2e8f0",
                            mt: 0.5,
                            fontWeight:
                              600,
                          }}
                        >
                          Series{" "}
                          {item.seriesNumber ??
                            ""}
                        </Typography>

                        <Typography
                          variant="caption"
                          sx={{
                            display:
                              "block",
                            color:
                              "#94a3b8",
                            mt: 0.2,
                            overflow:
                              "hidden",
                            textOverflow:
                              "ellipsis",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {item.seriesDescription ||
                            "Image Series"}
                        </Typography>

                        <Typography
                          variant="caption"
                          sx={{
                            display:
                              "block",
                            color:
                              "#64748b",
                            mt: 0.2,
                          }}
                        >
                          {item.imageCount ||
                            0}{" "}
                          images
                        </Typography>
                      </Box>
                    )
                  )}
                </Stack>
              )}

              {images.length > 0 && (
                <Box
                  sx={{
                    mt: 1.2,
                    pt: 1,
                    borderTop:
                      "1px solid #263241",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      display:
                        "block",
                      color:
                        "#cbd5e1",
                      mb: 0.8,
                      fontWeight:
                        700,
                    }}
                  >
                    Images ({images.length})
                  </Typography>

                  <Stack
                    spacing={0.7}
                  >
                    {images.map(
                      (item, index) => (
                        <Box
                          key={item.id}
                          ref={(element) => {
                            thumbnailRefs.current[
                              item.id
                            ] = element;
                          }}
                          onClick={() =>
                            handleSelectImage(
                              item.id
                            )
                          }
                          sx={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: 0.7,
                            p: 0.5,
                            border:
                              selectedImageId ===
                              item.id
                                ? "2px solid #42a5f5"
                                : "1px solid #334155",
                            borderRadius:
                              1,
                            backgroundColor:
                              selectedImageId ===
                              item.id
                                ? "#1b2a3a"
                                : "#18212b",
                            cursor:
                              "pointer",
                          }}
                        >
                          <Box
                            sx={{
                              width: 48,
                              height: 38,
                              flexShrink: 0,
                              display:
                                "flex",
                              justifyContent:
                                "center",
                              alignItems:
                                "center",
                              overflow:
                                "hidden",
                              borderRadius:
                                0.8,
                              backgroundColor:
                                "#05080c",
                            }}
                          >
                            {thumbnailUrls[
                              item.id
                            ] ? (
                              <img
                                src={
                                  thumbnailUrls[
                                    item.id
                                  ]
                                }
                                alt={
                                  item.fileName ||
                                  `Image ${index + 1}`
                                }
                                style={{
                                  width:
                                    "100%",
                                  height:
                                    "100%",
                                  objectFit:
                                    "cover",
                                }}
                              />
                            ) : (
                              <ImageIcon
                                sx={{
                                  color:
                                    "#64748b",
                                  fontSize:
                                    22,
                                }}
                              />
                            )}
                          </Box>

                          <Typography
                            variant="caption"
                            sx={{
                              color:
                                "#cbd5e1",
                              overflow:
                                "hidden",
                              textOverflow:
                                "ellipsis",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {index + 1}. {item.fileName}
                          </Typography>
                        </Box>
                      )
                    )}
                  </Stack>
                </Box>
              )}
            </Box>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              backgroundColor:
                "#05080c",
              border:
                "1px solid #3366a3",
              borderRadius: 2,
              overflow:
                "hidden",
              position:
                "relative",
              display:
                "flex",
              flexDirection:
                "column",
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                position:
                  "absolute",
                top: 10,
                left: 12,
                zIndex: 5,
                backgroundColor:
                  "rgba(0,0,0,0.70)",
                px: 1.2,
                py: 0.55,
                borderRadius: 1,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color:
                    "#ffffff",
                }}
              >
                {study?.modality ||
                  "Image"}{" "}
                |{" "}
                {study?.bodyPart ||
                  "-"}{" "}
                |{" "}
                {study?.studyId ||
                  "-"}
              </Typography>
            </Box>

            <Box
              ref={
                imageViewportRef
              }
              sx={{
                flex: 1,
                minHeight: 0,
                display:
                  "flex",
                justifyContent:
                  "center",
                alignItems:
                  "center",
                overflow:
                  "hidden",
                p: 1.5,
                backgroundColor:
                  "#05080c",
                cursor:
                  isDragging
                    ? "grabbing"
                    : "grab",
                userSelect:
                  "none",
                touchAction:
                  "none",
                position:
                  "relative",
              }}
              onPointerDown={
                handlePointerDown
              }
              onPointerMove={
                handlePointerMove
              }
              onPointerUp={
                handlePointerUp
              }
              onPointerCancel={
                handlePointerUp
              }
            >
              <Box
                sx={{
                  position: "relative",
                  width: "min(800px, 100%)",
                  aspectRatio: "4 / 3",
                  transition:
                    isDragging
                      ? "none"
                      : "transform 0.15s ease",
                  transform:
                    `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                  userSelect: "none",
                  flexShrink: 0,
                }}
              >
                <canvas
                  ref={imageCanvasRef}
                  width={800}
                  height={600}
                  aria-label="Medical scan"
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                  }}
                />

                <canvas
                  ref={overlayCanvasRef}
                  width={800}
                  height={600}
                  aria-label="Annotation overlay"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    handleOverlayPointerDown(
                      event
                    );
                  }}
                  onPointerMove={(event) => {
                    event.stopPropagation();
                    handleOverlayPointerMove(
                      event
                    );
                  }}
                  onPointerUp={(event) => {
                    event.stopPropagation();
                    handleOverlayPointerUp(
                      event
                    );
                  }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    cursor: measureMode
                      ? "crosshair"
                      : "inherit",
                    pointerEvents: measureMode
                      ? "auto"
                      : "none",
                  }}
                />
              </Box>

              {uploading && (
                <Box
                  sx={{
                    position:
                      "absolute",
                    left: "50%",
                    bottom: 20,
                    transform:
                      "translateX(-50%)",
                    width:
                      "min(420px, 80%)",
                    backgroundColor:
                      "rgba(0,0,0,0.82)",
                    border:
                      "1px solid #334155",
                    borderRadius:
                      2,
                    px: 2,
                    py: 1.2,
                    zIndex: 10,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color:
                        "#e2e8f0",
                      display:
                        "block",
                      mb: 0.6,
                    }}
                  >
                    Uploading series... {uploadProgress}%
                  </Typography>

                  <Box
                    sx={{
                      width:
                        "100%",
                      height:
                        "5px",
                      backgroundColor:
                        "#263241",
                      borderRadius:
                        "20px",
                      overflow:
                        "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        width:
                          `${uploadProgress}%`,
                        height:
                          "100%",
                        backgroundColor:
                          "#42a5f5",
                        transition:
                          "width 0.2s",
                      }}
                    />
                  </Box>
                </Box>
              )}

              {images.length ===
                0 && (
                <Box
                  sx={{
                    position:
                      "absolute",
                    top: "50%",
                    left: "50%",
                    transform:
                      "translate(-50%, -50%)",
                    textAlign:
                      "center",
                    pointerEvents:
                      "none",
                  }}
                >
                  <ImageIcon
                    sx={{
                      fontSize:
                        56,
                      color:
                        "#475569",
                    }}
                  />

                  <Typography
                    variant="body2"
                    sx={{
                      color:
                        "#64748b",
                      mt: 0.5,
                    }}
                  >
                    No images in
                    this series
                  </Typography>
                </Box>
              )}
            </Box>

            <Box
              sx={{
                borderTop:
                  "1px solid #263241",
                backgroundColor:
                  "#111820",
                px: 1.5,
                py: 0.7,
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                gap: 2,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color:
                    "#94a3b8",
                }}
              >
                Image{" "}
                {selectedImageId
                  ? images.findIndex(
                      (
                        item
                      ) =>
                        item.id ===
                        selectedImageId
                    ) + 1
                  : 0}{" "}
                of{" "}
                {images.length}
              </Typography>

              <Typography
                variant="caption"
                sx={{
                  color:
                    "#94a3b8",
                }}
              >
                Zoom:{" "}
                {zoom.toFixed(
                  1
                )}x{" "}
                • Rotation:{" "}
                {rotation % 360}°
              </Typography>
            </Box>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              backgroundColor:
                "#111820",
              border:
                "1px solid #263241",
              borderRadius: 2,
              display:
                "flex",
              justifyContent:
                "center",
              alignItems:
                "center",
              minWidth: 0,
              overflow:
                "hidden",
            }}
          >
            <Slider
              orientation="vertical"
              value={
                images.length >
                0
                  ? Math.max(
                      0,
                      images.findIndex(
                        (
                          item
                        ) =>
                          item.id ===
                          selectedImageId
                      )
                    )
                  : 0
              }
              min={0}
              max={
                Math.max(
                  0,
                  images.length -
                    1
                )
              }
              step={1}
              onChange={
                handleSliceChange
              }
              disabled={
                images.length <=
                1
              }
              sx={{
                height:
                  "92%",
                color:
                  "#42a5f5",
              }}
              aria-label="Image slice"
            />
          </Paper>
        </Box>
                <Paper
          elevation={0}
          sx={{
            backgroundColor:
              "#111820",
            border:
              "1px solid #263241",
            borderRadius: 2,
            mt: 1.2,
            p: 1.2,
          }}
        >
          <Stack
            direction={{
              xs: "column",
              md: "row",
            }}
            spacing={{
              xs: 0.8,
              md: 2.5,
            }}
            alignItems={{
              xs: "flex-start",
              md: "center",
            }}
          >
            <Box
              sx={{
                display:
                  "flex",
                alignItems:
                  "center",
                gap: 0.8,
              }}
            >
              <InfoOutlinedIcon
                sx={{
                  color:
                    "#64b5f6",
                }}
              />

              <Typography
                variant="body2"
                sx={{
                  color:
                    "#e2e8f0",
                }}
              >
                <strong>
                  Patient:
                </strong>{" "}
                {patient?.name ||
                  "-"}
              </Typography>
            </Box>

            <Typography
              variant="body2"
              sx={{
                color:
                  "#cbd5e1",
              }}
            >
              <strong>
                Patient ID:
              </strong>{" "}
              {patient?.id ||
                "-"}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color:
                  "#cbd5e1",
              }}
            >
              <strong>
                Study:
              </strong>{" "}
              {study?.studyId ||
                "-"}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color:
                  "#cbd5e1",
              }}
            >
              <strong>
                Modality:
              </strong>{" "}
              {study?.modality ||
                "-"}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color:
                  "#cbd5e1",
              }}
            >
              <strong>
                Body Part:
              </strong>{" "}
              {study?.bodyPart ||
                "-"}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color:
                  "#cbd5e1",
              }}
            >
              <strong>
                Date:
              </strong>{" "}
              {formatStudyDate(
                study?.studyDate
              )}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color:
                  "#cbd5e1",
              }}
            >
              <strong>
                Images:
              </strong>{" "}
              {images.length}
            </Typography>
          </Stack>
        </Paper>
      </Box>
    </Layout>
  );
}

export default ImageViewer;