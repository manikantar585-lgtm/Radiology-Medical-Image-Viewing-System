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
const getUserHeaders = () => {
  const userId =
    getUserId();
  return {
    "Content-Type":
      "application/json",
    "x-user-id":
      String(userId),
  };
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
  const [image, setImage] =
    useState(
      defaultImageDataUrl
    );
  const [images, setImages] =
    useState([]);
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
  const viewerRef =
    useRef(null);
  const fileInputRef =
    useRef(null);
  const loadImages =
    useCallback(async () => {
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
        setZoom(1);
        setRotation(0);
        setPosition({
          x: 0,
          y: 0,
      });
      setBrightness(100);
      setContrast(100);
        return;
      }
      const userId =
        getUserId();
      if (!userId) {
        alert(
          "Your login session was not found. Please login again."
        );
        navigate("/")
        return;
      }
      try {
        const response =
          await fetch(
            `${API_URL}/api/images?patientId=${patient.id}&studyId=${study.id}`,
            {
              method: "GET",
              headers:
                getUserHeaders(),
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
    }, [
      patient?.id,
      study?.id,
      navigate,
    ]);
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
    loadImages();
  }, [
    loadImages,
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
  const handleMouseDown =
    (event) => {
      if (
        event.button !== 0
      ) {
        return;
      }
      event.preventDefault();
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
  const handleMouseMove =
    (event) => {
      if (
        !isDragging
      ) {
        return;
      }
      setPosition({
        x:
          event.clientX -
          dragStart.x,
        y:
          event.clientY -
          dragStart.y,
      });
    };
  const handleMouseUp =
    () => {
      setIsDragging(
        false
      );
    };
  const handleImageUpload =
    async (event) => {
      const files =
        Array.from(
          event.target.files || []
        );
      if (
        files.length === 0
      ) {
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
          (file) =>
            !file.type.startsWith(
              "image/"
            )
        );
      if (invalidFile) {
        alert(
          "Please select only image files."
        );
        return;
      }
      try {
        setUploading(true);
        let uploadedCount = 0;
        for (
          const file of files
        ) {
          const formData =
            new FormData();
          formData.append(
            "image",
            file
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
          const response =
            await fetch(
              `${API_URL}/api/images/upload`,
              {
                method:
                  "POST",
                headers: {
                  "x-user-id":
                    String(
                      userId
                    ),
                },
                body:
                  formData,
              }
            );
          const data =
            await response.json();
          if (
            !response.ok
          ) {
            alert(
              data.message ||
                `Unable to upload ${file.name}`
            );
            continue;
          }
          uploadedCount++;
        }
        if (
          uploadedCount > 0
        ) {

          alert(
            `${uploadedCount} image${
              uploadedCount > 1
                ? "s"
                : ""
            } uploaded successfully.`
          );
        }
        await loadImages();
      } catch (error) {
        console.error(
          "Image Upload Error:",
          error
        );
        alert(
          "Cannot connect to backend server."
        );
      } finally {
        setUploading(false);
        event.target.value = "";
      }
    };
  const handleSelectImage =
    (imageId) => {
      setSelectedImageId(
        imageId
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
        setDeleting(true);
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
        await loadImages();
      } catch (error) {
        console.error(
          "Delete Image Error:",
          error
        );
        alert(
          "Cannot connect to backend server."
        );
      } finally {
        setDeleting(false);
      }
    };
  const handleZoomIn =
    () => {
      setZoom(
        (previous) => {
          if (
            previous >= 3
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
            previous <= 0.4
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
          previous + 90
      );
    };
  const handleRotateLeft =
    () => {

      setRotation(
        (previous) =>
          previous - 90
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
    useCallback(() => {
      if (
        images.length === 0
      ) {
        return;
      }
      setSelectedImageId(
        images[0].id
      );
    }, [
      images,
    ]);
  const handleLastImage =
    useCallback(() => {
      if (
        images.length === 0
      ) {
        return;
      }
      setSelectedImageId(
        images[
          images.length - 1
        ].id
      );
    }, [
      images,
    ]);
  const handleNextImage =
    useCallback(() => {
      if (
        images.length === 0
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
        currentIndex === -1
      ) {
        setSelectedImageId(
          images[0].id
        );
        return;
      }
      const nextIndex =
        currentIndex + 1;
      if (
        nextIndex <
        images.length
      ) {
        setSelectedImageId(
          images[nextIndex].id
        );
      }
    }, [
      images,
      selectedImageId,
    ]);
  const handlePreviousImage =
    useCallback(() => {
      if (
        images.length === 0
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
        currentIndex === -1
      ) {
        setSelectedImageId(
          images[0].id
        );
        return;
      }
      const previousIndex =
        currentIndex - 1;
      if (
        previousIndex >= 0
      ) {
        setSelectedImageId(
          images[
            previousIndex
          ].id
        );
      }
    }, [
      images,
      selectedImageId,
    ]);
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
      link.href = image;
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

      setPosition({
        x: 0,
        y: 0,
      });
    };
const formatStudyDate = (date) => {
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
          tagName === "input" ||
          tagName === "textarea" ||
          tagName === "select" ||
          target?.isContentEditable
        ) {
          return;
        }
        const pressedKey =
          normalizeHotkey(
            event.key
          );
        const matches =
          (configuredKey) =>
            normalizeHotkey(
              configuredKey
            ) === pressedKey;
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
          return;
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
    images,
    selectedImageId,
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
          borderRadius:
            2,
          overflow:
            "hidden",
          p:
            1.2,
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
              minWidth:
                110,
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
            borderRadius:
              2,
            mb:
              1.2,
            px:
              0.8,
            py:
              0.45,
          }}
        >
          <Stack
            direction="row"
            spacing={0.4}
            alignItems="center"
            sx={{
              flexWrap:
                "wrap",
              rowGap:
                0.5,
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
                minWidth:
                  55,
                textAlign:
                  "center",
                color:
                "#cbd5e1",
                fontSize:
                  14,
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
                mx:
                  0.3,
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
                minWidth:
                  105,
              }}
            >
              Pan: Drag
            </Button>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                ml: 0.5,
              }}
            >
              <Tooltip title="Decrease Brightness">
                <IconButton
                  size="small"
                  onClick={() =>
                    setBrightness(
                      (previous) =>
                        Math.max(
                          50,
                          previous - 10
                        )
                    )
                  }
                  sx={{
                    color: "#ffffff",
                  }}
                >
                  -
                </IconButton>
              </Tooltip>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  minWidth: 105,
                  px: 0.5,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: "#cbd5e1",
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
                  value={brightness}
                  onChange={(event) =>
                    setBrightness(
                      Number(
                        event.target.value
                      )
                    )
                  }
                  style={{
                    width: "100%",
                    height: "14px",
                    cursor: "pointer",
                  }}
                />
              </Box>
              <Tooltip title="Increase Brightness">
                <IconButton
                  size="small"
                  onClick={() =>
                    setBrightness(
                      (previous) =>
                        Math.min(
                          150,
                          previous + 10
                        )
                    )
                  }
                  sx={{
                    color: "#ffffff",
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
                  display: "flex",
                  flexDirection: "column",
                  minWidth: 105,
                  px: 0.5,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: "#cbd5e1",
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
                  value={contrast}
                  onChange={(event) =>
                    setContrast(
                      Number(
                        event.target.value
                      )
                    )
                  }
                  style={{
                    width: "100%",
                    height: "14px",
                    cursor: "pointer",
                  }}
                />
              </Box>
              <Tooltip title="Increase Contrast">
                <IconButton
                  size="small"
                  onClick={() =>
                    setContrast(
                      (previous) =>
                        Math.min(
                          150,
                          previous + 10
                        )
                    )
                  }
                  sx={{
                    color: "#ffffff",
                  }}
                >
                  +
                </IconButton>
              </Tooltip>
              <Tooltip title="Reset Window / Level">
                <IconButton
                  size="small"
                  onClick={() => {
                    setBrightness(100);
                    setContrast(100);
                  }}
                  sx={{
                    color: "#ffffff",
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
                display: "flex",
                alignItems: "center",
                gap: 0.6,
                px: 0.5,
                color: "#94a3b8",
                fontSize: 11,
                whiteSpace: "nowrap",
              }}
            >
              W {brightness}% /
              C {contrast}%
            </Box>
            <Divider
              orientation="vertical"
              flexItem
              sx={{
                borderColor:
                  "#334155",
                mx:
                  0.3,
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
            {/* RESET */}
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
            {/* FULLSCREEN */}
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
                mx:
                  0.3,
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
                ? "Uploading..."
                : "Upload"}
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
              accept="image/*"
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
                  "180px 1fr",
              },
            gap:
              1.2,
            height:
              {
                xs:
                  "auto",
                md:
                  "520px",
              },
            minHeight:
              {
                xs:
                  450,
                md:
                  520,
              },
           maxHeight:
              {
                md:
                  "520px",
              },
          }}
        >
          <Paper
            elevation={0}
            sx={{
              backgroundColor:
                "#111820",
              border:
                "1px solid #263241",
              borderRadius:
                2,
              p:
                1,
              overflowY:
                "auto",
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
                mb:
                  0.8,
              }}
            >
              <Typography
                variant="subtitle2"
                fontWeight="bold"
              >
                Study Images
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color:
                    "#94a3b8",
                }}
              >
                {images.length}
              </Typography>
            </Box>
            <Divider
              sx={{
                borderColor:
                  "#263241",
                mb:
                  1,
              }}
            />
            {images.length ===
            0 ? (
              <Box
                sx={{
                  py:
                    4,
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
                    mt:
                      0.8,
                  }}
                >
                  No images
                </Typography>
              </Box>
            ) : (
              <Stack
                spacing={0.8}
              >
                {images.map(
                  (
                    item,
                    index
                  ) => (
                    <Box
                      key={
                        item.id
                      }
                      onClick={() =>
                        handleSelectImage(
                          item.id
                        )
                      }
                      sx={{
                        border:
                          selectedImageId ===
                          item.id
                            ? "2px solid #42a5f5"
                            : "1px solid #334155",
                        backgroundColor:
                          selectedImageId ===
                          item.id
                            ? "#1b2a3a"
                            : "#18212b",
                        borderRadius:
                          1.5,
                        p:
                          0.6,
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
                          height:
                            80,
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
                        <ImageIcon
                          sx={{
                            color:
                              "#64748b",
                            fontSize:
                              34,
                          }}
                        />
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          display:
                            "block",
                          color:
                            "#e2e8f0",
                          mt:
                            0.4,
                          overflow:
                            "hidden",
                          textOverflow:
                            "ellipsis",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {index + 1}.{" "}
                        {
                          item.fileName ||
                          `Image ${
                            index + 1
                          }`
                        }
                      </Typography>
                    </Box>
                  )
                )}
              </Stack>
            )}
          </Paper>
          <Paper
            elevation={0}
            sx={{
              backgroundColor:
                "#05080c",
              border:
                "1px solid #3366a3",
              borderRadius:
                2,
              overflow:
                "hidden",
              position:
                "relative",
              display:
                "flex",
              flexDirection:
                "column",
            }}
          >
            <Box
              sx={{
                position:
                  "absolute",
                top:
                  10,
                left:
                  12,
                zIndex:
                  2,
                backgroundColor:
                  "rgba(0,0,0,0.65)",
                px:
                  1.2,
                py:
                  0.55,
                borderRadius:
                  1,
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
              sx={{
                flex:
                  1,
                display:
                  "flex",
                justifyContent:
                  "center",
                alignItems:
                  "center",
                overflow:
                  "hidden",
                p:
                  1.5,
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
              }}
              onMouseDown={
                handleMouseDown
              }
              onMouseMove={
                handleMouseMove
              }
              onMouseUp={
                handleMouseUp
              }
              onMouseLeave={
                handleMouseUp
              }
            >
<img
  src={image}
  alt="Medical Scan"
  draggable={false}
  style={{
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
    transition:
      isDragging
        ? "none"
        : "transform 0.3s ease",
    transform:
      `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
    filter:
      `brightness(${brightness}%) contrast(${contrast}%)`,
    userSelect: "none",
    pointerEvents: "none",
  }}
/>
            </Box>
            <Box
              sx={{
                borderTop:
                  "1px solid #263241",
                backgroundColor:
                  "#111820",
                px:
                  1.5,
                py:
                  0.7,
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                gap:
                  2,
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
                      (item) =>
                        item.id ===
                        selectedImageId
                    ) + 1
                  : 0}
                {" "}of{" "}
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
                )}x
                {" "}• Rotation:{" "}
                {rotation % 360}°
              </Typography>
            </Box>
          </Paper>
        </Box>
        <Paper
          elevation={0}
          sx={{
            backgroundColor:
              "#111820",
            border:
              "1px solid #263241",
            borderRadius:
              2,
            mt:
              1.2,
            p:
              1.2,
          }}
        >
          <Stack
            direction={{
              xs:
                "column",
              md:
                "row",
            }}
            spacing={{
              xs:
                0.8,
              md:
                2.5,
            }}
            alignItems={{
              xs:
                "flex-start",
              md:
                "center",
            }}
          >
            <Box
              sx={{
                display:
                  "flex",
                alignItems:
                  "center",
                gap:
                  0.8,
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
          </Stack>
        </Paper>
      </Box>
    </Layout>
  );
}
export default ImageViewer;