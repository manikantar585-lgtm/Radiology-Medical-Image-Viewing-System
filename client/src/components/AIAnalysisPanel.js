import React, { useEffect, useMemo, useState } from "react";

import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
  Chip,
  CircularProgress,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from "@mui/material";

import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ArticleIcon from "@mui/icons-material/Article";

import { API_URL, jsonHeaders, getStoredUser, getCurrentUserId } from "../api/http";

// =========================================================
// USER HELPERS
// =========================================================

function getRadiologistName() {
  const user = getStoredUser();

  return user?.fullName || user?.name || user?.username || "";
}

// =========================================================
// SAFE VALUE HELPERS
// =========================================================

function getAIResult(aiResult) {
  if (aiResult && aiResult.result) {
    return aiResult.result;
  }

  return aiResult || {};
}

function formatConfidence(value) {
  if (typeof value !== "number") {
    return null;
  }

  return `${Math.round(value * 100)}%`;
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-IN");
}

// =========================================================
// COMPONENT
// =========================================================

function AIAnalysisPanel({ study, analysisStatus, findings = [], aiResult = null, onAnalyze }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [reportFindings, setReportFindings] = useState("");

  const [reportImpression, setReportImpression] = useState("");

  const [radiologistName, setRadiologistName] = useState("");

  const [savingReport, setSavingReport] = useState(false);

  const [reportSaved, setReportSaved] = useState(false);

  const [savedReportId, setSavedReportId] = useState(null);

  const [saveMode, setSaveMode] = useState("Draft");

  const [saveMessage, setSaveMessage] = useState("");

  const [saveError, setSaveError] = useState("");

  const isProcessing = analysisStatus === "processing";

  const isCompleted = analysisStatus === "completed";

  const isError = analysisStatus === "error";

  // =======================================================
  // NORMALIZE RESULT
  // =======================================================

  const normalizedResult = useMemo(() => getAIResult(aiResult), [aiResult]);

  const resultFindings = useMemo(() => {
    if (Array.isArray(findings) && findings.length > 0) {
      return findings;
    }

    if (Array.isArray(normalizedResult?.findings)) {
      return normalizedResult.findings;
    }

    return [];
  }, [findings, normalizedResult]);

  const report = normalizedResult?.report || {};

  const clinicalModel = normalizedResult?.clinicalModel || {};

  const studyPrediction =
    normalizedResult?.studyPrediction || normalizedResult?.clinicalModel?.studyPrediction || {};

  const metadata = normalizedResult?.metadata || {};

  // =======================================================
  // INITIALIZE REPORT DRAFT
  // =======================================================

  useEffect(() => {
    if (!isCompleted) {
      return;
    }

    const initialFindings = report?.findings || "";

    const initialImpression = report?.impression || "";

    setReportFindings(initialFindings);

    setReportImpression(initialImpression);

    setRadiologistName(getRadiologistName());

    setReportSaved(false);

    setSaveMessage("");

    setSaveError("");
  }, [isCompleted, report?.findings, report?.impression]);

  // =======================================================
  // REPORT EDITOR
  // =======================================================

  const openReportEditor = () => {
    setReportFindings(report?.findings || "");

    setReportImpression(report?.impression || "");

    setRadiologistName(getRadiologistName());

    setSaveError("");

    setSaveMessage("");

    setEditDialogOpen(true);
  };

  const closeReportEditor = () => {
    if (savingReport) {
      return;
    }

    setEditDialogOpen(false);
  };

  // =======================================================
  // SAVE / UPDATE REPORT
  // =======================================================

  const handleSaveReport = async (requestedStatus = "Draft") => {
    setSaveError("");

    setSaveMessage("");

    const userId = getCurrentUserId();

    if (!userId) {
      setSaveError("Your login session was not found. Please login again.");

      return;
    }

    const studyId = Number(study?.id);

    const patientId = Number(study?.patientId);

    if (!studyId) {
      setSaveError("Study ID is not available.");

      return;
    }

    if (!patientId) {
      setSaveError("Patient ID is not available for this study.");

      return;
    }

    if (!radiologistName.trim()) {
      setSaveError("Please enter the radiologist name.");

      return;
    }

    if (!reportFindings.trim()) {
      setSaveError("Please enter report findings.");

      return;
    }

    if (!reportImpression.trim()) {
      setSaveError("Please enter the report impression.");

      return;
    }

    try {
      setSavingReport(true);

      setSaveMode(requestedStatus);

      const payload = {
        patientId: patientId,

        studyId: studyId,

        radiologistName: radiologistName.trim(),

        findings: reportFindings.trim(),

        impression: reportImpression.trim(),

        status: requestedStatus,
      };

      const url = savedReportId
        ? `${API_URL}/api/reports/${savedReportId}`
        : `${API_URL}/api/reports`;

      const method = savedReportId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,

        headers: jsonHeaders(),

        body: JSON.stringify(payload),
      });

      let data = {};

      try {
        data = await response.json();
      } catch (jsonError) {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data.message || "Unable to save report");
      }

      const savedReport = data.report || data.result || {};

      if (savedReport?.id) {
        setSavedReportId(savedReport.id);
      }

      setReportSaved(true);

      setSaveMessage(
        savedReportId
          ? requestedStatus === "Completed"
            ? "Report finalized successfully."
            : "Report draft updated successfully."
          : requestedStatus === "Completed"
            ? "Report finalized successfully."
            : "Report draft saved successfully."
      );
    } catch (error) {
      console.error("AI Report Save Error:", error);

      setReportSaved(false);

      setSaveError(error?.message || "Unable to save report.");
    } finally {
      setSavingReport(false);
    }
  };

  // =======================================================
  // MODEL / PREDICTION DISPLAY HELPERS
  // =======================================================

  const predictionLabel = studyPrediction?.label || "";

  const predictionConfidence = formatConfidence(studyPrediction?.confidence);

  const modelName = clinicalModel?.name || normalizedResult?.model || "AI model";

  const modelAvailable = Boolean(clinicalModel?.available);

  const clinicalValidation = Boolean(clinicalModel?.clinicalValidation);

  const generatedAt = metadata?.generatedAt || null;
  // =======================================================
  // RENDER
  // =======================================================

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          height: "100%",
          minWidth: 0,
          backgroundColor: "#111820",
          border: "1px solid #263241",
          borderRadius: 2,
          color: "#ffffff",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* =================================================
            HEADER
        ================================================== */}

        <Box
          sx={{
            p: 1.5,
            backgroundColor: "#151f2b",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <AutoAwesomeIcon
                sx={{
                  color: "#64b5f6",
                }}
              />

              <Typography variant="subtitle1" fontWeight="bold">
                AI Copilot
              </Typography>
            </Box>

            <Chip
              size="small"
              label={
                isProcessing
                  ? "Analyzing"
                  : isCompleted
                    ? "Analysis complete"
                    : isError
                      ? "Analysis failed"
                      : "Ready"
              }
              color={
                isProcessing ? "warning" : isCompleted ? "success" : isError ? "error" : "default"
              }
              variant="outlined"
            />
          </Box>

          <Typography
            variant="caption"
            sx={{
              color: "#94a3b8",
              display: "block",
              mt: 0.5,
            }}
          >
            Multimodal study analysis
          </Typography>
        </Box>

        <Divider
          sx={{
            borderColor: "#263241",
          }}
        />

        {/* =================================================
            STUDY INFORMATION
        ================================================== */}

        <Box
          sx={{
            p: 1.5,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: "#64748b",
              fontWeight: 700,
              letterSpacing: 0.6,
            }}
          >
            CURRENT STUDY
          </Typography>

          <Typography
            variant="body2"
            fontWeight="bold"
            sx={{
              mt: 0.5,
              color: "#e2e8f0",
            }}
          >
            {study?.studyId || study?.id || "Unknown Study"}
          </Typography>

          <Box
            sx={{
              display: "flex",
              gap: 0.8,
              mt: 1,
              flexWrap: "wrap",
            }}
          >
            <Chip
              size="small"
              label={study?.modality || normalizedResult?.modality || "Unknown"}
              sx={{
                color: "#ffffff",
                backgroundColor: "#26384a",
              }}
            />

            <Chip
              size="small"
              label={study?.bodyPart || normalizedResult?.bodyPart || "Body Part Unknown"}
              sx={{
                color: "#cbd5e1",
                backgroundColor: "#1e293b",
              }}
            />
          </Box>
        </Box>

        <Divider
          sx={{
            borderColor: "#263241",
          }}
        />

        {/* =================================================
            SCROLLABLE CONTENT
        ================================================== */}

        <Box
          sx={{
            p: 1.5,
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
          }}
        >
          {/* =================================================
              IDLE
          ================================================== */}

          {analysisStatus === "idle" && (
            <Box>
              <Typography
                variant="body2"
                sx={{
                  color: "#cbd5e1",
                  mb: 2,
                  lineHeight: 1.6,
                }}
              >
                Run the AI Copilot on this study to begin multimodal analysis.
              </Typography>

              <Button
                fullWidth
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={onAnalyze}
                sx={{
                  textTransform: "none",
                  fontWeight: "bold",
                }}
              >
                Analyze Study
              </Button>
            </Box>
          )}

          {/* =================================================
              PROCESSING
          ================================================== */}

          {isProcessing && (
            <Box
              sx={{
                textAlign: "center",
                py: 5,
              }}
            >
              <CircularProgress size={38} />

              <Typography
                variant="body2"
                sx={{
                  mt: 2,
                  color: "#cbd5e1",
                  fontWeight: 600,
                }}
              >
                AI is analyzing the study...
              </Typography>

              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mt: 1,
                  color: "#64748b",
                  lineHeight: 1.5,
                }}
              >
                Processing the available medical images and generating structured AI results.
              </Typography>
            </Box>
          )}

          {/* =================================================
              ERROR
          ================================================== */}

          {isError && (
            <Box>
              <Alert
                severity="error"
                icon={<WarningAmberIcon sx={{ color: "#f87171" }} />}
                sx={{
                  backgroundColor: "rgba(127,29,29,0.18)",
                  color: "#fecaca",
                  border: "1px solid rgba(248,113,113,0.25)",
                }}
              >
                AI analysis failed. Check the Python AI service and backend logs.
              </Alert>

              <Button
                fullWidth
                variant="outlined"
                onClick={onAnalyze}
                sx={{
                  mt: 2,
                  textTransform: "none",
                  color: "#ffffff",
                  borderColor: "#475569",
                }}
              >
                Try Again
              </Button>
            </Box>
          )}

          {/* =================================================
              COMPLETED
          ================================================== */}

          {isCompleted && (
            <Box>
              {/* ---------------------------------------------
                  STATUS
              ---------------------------------------------- */}

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 1.5,
                }}
              >
                <CheckCircleIcon
                  sx={{
                    color: "#66bb6a",
                  }}
                />

                <Typography
                  variant="body2"
                  sx={{
                    color: "#66bb6a",
                    fontWeight: "bold",
                  }}
                >
                  Analysis completed
                </Typography>
              </Box>

              {/* ---------------------------------------------
                  MODEL STATUS
              ---------------------------------------------- */}

              <Box
                sx={{
                  p: 1.1,
                  mb: 1.4,
                  border: "1px solid #202832",
                  borderRadius: 1,
                  backgroundColor: "#0d131a",
                }}
              >
                <Typography
                  sx={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "#64748b",
                    letterSpacing: 0.6,
                    mb: 0.7,
                  }}
                >
                  AI MODEL
                </Typography>

                <Stack spacing={0.55}>
                  <Stack direction="row" justifyContent="space-between" spacing={1}>
                    <Typography
                      sx={{
                        fontSize: 9.5,
                        color: "#64748b",
                      }}
                    >
                      Model
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 9.5,
                        color: "#dbeafe",
                        fontWeight: 700,
                        textAlign: "right",
                      }}
                    >
                      {modelName}
                    </Typography>
                  </Stack>

                  <Stack direction="row" justifyContent="space-between" spacing={1}>
                    <Typography
                      sx={{
                        fontSize: 9.5,
                        color: "#64748b",
                      }}
                    >
                      Status
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 9.5,
                        color: modelAvailable ? "#86efac" : "#fbbf24",
                        fontWeight: 700,
                      }}
                    >
                      {modelAvailable ? "Inference available" : "Inference unavailable"}
                    </Typography>
                  </Stack>

                  <Stack direction="row" justifyContent="space-between" spacing={1}>
                    <Typography
                      sx={{
                        fontSize: 9.5,
                        color: "#64748b",
                      }}
                    >
                      Clinical validation
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 9.5,
                        color: "#fbbf24",
                        fontWeight: 700,
                      }}
                    >
                      {clinicalValidation ? "Validated" : "Not validated"}
                    </Typography>
                  </Stack>
                </Stack>
              </Box>

              {/* ---------------------------------------------
                  PREDICTION
              ---------------------------------------------- */}

              {studyPrediction?.label && (
                <Box
                  sx={{
                    p: 1.2,
                    mb: 1.4,
                    border: "1px solid #24364a",
                    borderRadius: 1.2,
                    backgroundColor: "#101a25",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: "#64748b",
                      letterSpacing: 0.6,
                      mb: 0.8,
                    }}
                  >
                    STUDY-LEVEL MODEL PREDICTION
                  </Typography>

                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={1}
                  >
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: "#e2e8f0",
                        fontWeight: 700,
                      }}
                    >
                      {predictionLabel}
                    </Typography>

                    {predictionConfidence && (
                      <Chip
                        size="small"
                        label={predictionConfidence}
                        sx={{
                          color: "#dbeafe",
                          backgroundColor: "#1d4ed8",
                          fontWeight: 700,
                        }}
                      />
                    )}
                  </Stack>

                  <Typography
                    sx={{
                      mt: 0.8,
                      fontSize: 9.5,
                      lineHeight: 1.5,
                      color: "#94a3b8",
                    }}
                  >
                    This value is the model's study-level classification output. It is not a
                    confirmed clinical diagnosis.
                  </Typography>
                </Box>
              )}

              {/* ---------------------------------------------
                  FINDINGS
              ---------------------------------------------- */}

              <Box>
                <Typography
                  sx={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "#64748b",
                    letterSpacing: 0.6,
                    mb: 0.8,
                  }}
                >
                  AI FINDINGS
                </Typography>

                {resultFindings.length === 0 ? (
                  <Box
                    sx={{
                      p: 1.3,
                      border: "1px dashed #334155",
                      borderRadius: 1.2,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 10,
                        color: "#94a3b8",
                      }}
                    >
                      No AI findings were returned.
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={0.8}>
                    {resultFindings.map((finding, index) => {
                      const confidence = formatConfidence(finding?.confidence);

                      return (
                        <Paper
                          key={finding?.id || `finding-${index}`}
                          elevation={0}
                          sx={{
                            p: 1.1,
                            backgroundColor: "#18212b",
                            border: "1px solid #334155",
                            borderRadius: 1.2,
                          }}
                        >
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="flex-start"
                            spacing={1}
                          >
                            <Typography
                              sx={{
                                fontSize: 10.5,
                                fontWeight: 700,
                                color: "#e2e8f0",
                              }}
                            >
                              {finding?.label || "AI Finding"}
                            </Typography>

                            {confidence && (
                              <Chip
                                size="small"
                                label={confidence}
                                sx={{
                                  height: 20,
                                  color: "#dbeafe",
                                  backgroundColor: "#1e3a5f",
                                  fontSize: 9,
                                }}
                              />
                            )}
                          </Stack>

                          {finding?.description && (
                            <Typography
                              sx={{
                                mt: 0.65,
                                fontSize: 9.5,
                                lineHeight: 1.5,
                                color: "#94a3b8",
                              }}
                            >
                              {finding.description}
                            </Typography>
                          )}
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
              </Box>

              {/* ---------------------------------------------
                  QUANTITATIVE RESULTS
              ---------------------------------------------- */}

              {Array.isArray(normalizedResult?.measurements) &&
                normalizedResult.measurements.length > 0 && (
                  <Box
                    sx={{
                      mt: 1.5,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: "#64748b",
                        letterSpacing: 0.6,
                        mb: 0.8,
                      }}
                    >
                      QUANTITATIVE RESULTS
                    </Typography>

                    <Stack spacing={0.65}>
                      {normalizedResult.measurements.map((measurement, index) => (
                        <Box
                          key={`measurement-${index}`}
                          sx={{
                            p: 0.9,
                            border: "1px solid #202832",
                            borderRadius: 1,
                            backgroundColor: "#0d131a",
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" spacing={1}>
                            <Typography
                              sx={{
                                fontSize: 9.5,
                                color: "#94a3b8",
                              }}
                            >
                              {measurement?.label || `Measurement ${index + 1}`}
                            </Typography>

                            <Typography
                              sx={{
                                fontSize: 9.5,
                                fontWeight: 700,
                                color: "#dbeafe",
                              }}
                            >
                              {measurement?.value ?? "-"} {measurement?.unit || ""}
                            </Typography>
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}
              {/* ---------------------------------------------
                  AI REPORT DRAFT
              ---------------------------------------------- */}

              {(report?.findings || report?.impression) && (
                <Box
                  sx={{
                    mt: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                      mb: 0.8,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: "#64748b",
                        letterSpacing: 0.6,
                      }}
                    >
                      AI REPORT DRAFT
                    </Typography>

                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={openReportEditor}
                      sx={{
                        minWidth: 0,
                        px: 1,
                        py: 0.35,
                        textTransform: "none",
                        fontSize: 9,
                        color: "#bfdbfe",
                        borderColor: "#355276",
                      }}
                    >
                      Edit
                    </Button>
                  </Box>

                  <Box
                    sx={{
                      p: 1.2,
                      border: "1px solid #202832",
                      borderRadius: 1.2,
                      backgroundColor: "#0d131a",
                    }}
                  >
                    {report?.findings && (
                      <Box
                        sx={{
                          mb: report?.impression ? 1 : 0,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "#94a3b8",
                            mb: 0.4,
                          }}
                        >
                          Findings
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: 9.5,
                            lineHeight: 1.55,
                            color: "#cbd5e1",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {report.findings}
                        </Typography>
                      </Box>
                    )}

                    {report?.impression && (
                      <Box>
                        <Typography
                          sx={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "#94a3b8",
                            mb: 0.4,
                          }}
                        >
                          Impression
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: 9.5,
                            lineHeight: 1.55,
                            color: "#cbd5e1",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {report.impression}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              )}

              {/* ---------------------------------------------
                  SAVE STATUS
              ---------------------------------------------- */}

              {reportSaved && (
                <Alert
                  severity="success"
                  icon={<CheckCircleIcon />}
                  sx={{
                    mt: 1.2,
                    backgroundColor: "rgba(22,101,52,0.16)",
                    color: "#bbf7d0",
                    border: "1px solid rgba(74,222,128,0.22)",
                    fontSize: 10,
                  }}
                >
                  {saveMessage}
                </Alert>
              )}

              {/* ---------------------------------------------
                  MODEL / REVIEW WARNING
              ---------------------------------------------- */}

              <Box
                sx={{
                  mt: 1.5,
                  p: 1.1,
                  border: "1px solid rgba(245,158,11,0.22)",
                  borderRadius: 1.2,
                  backgroundColor: "rgba(120,53,15,0.12)",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 0.8,
                  }}
                >
                  <WarningAmberIcon
                    sx={{
                      fontSize: 17,
                      color: "#fbbf24",
                      mt: 0.05,
                    }}
                  />

                  <Typography
                    sx={{
                      fontSize: 9.2,
                      lineHeight: 1.5,
                      color: "#fcd34d",
                    }}
                  >
                    AI output is assistive/research output. It requires qualified radiologist review
                    and must not be treated as an autonomous diagnosis.
                  </Typography>
                </Box>
              </Box>

              {/* ---------------------------------------------
                  ANALYSIS DETAILS
              ---------------------------------------------- */}

              {generatedAt && (
                <Box
                  sx={{
                    mt: 1.4,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: "#64748b",
                      letterSpacing: 0.6,
                      mb: 0.7,
                    }}
                  >
                    ANALYSIS DETAILS
                  </Typography>

                  <Box
                    sx={{
                      p: 1,
                      border: "1px solid #202832",
                      borderRadius: 1,
                      backgroundColor: "#0d131a",
                    }}
                  >
                    <Stack spacing={0.55}>
                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Typography
                          sx={{
                            fontSize: 9,
                            color: "#64748b",
                          }}
                        >
                          Pipeline
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: 9,
                            color: "#94a3b8",
                            textAlign: "right",
                          }}
                        >
                          {metadata?.pipeline || "Radiology AI Copilot"}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Typography
                          sx={{
                            fontSize: 9,
                            color: "#64748b",
                          }}
                        >
                          Generated
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: 9,
                            color: "#94a3b8",
                            textAlign: "right",
                          }}
                        >
                          {formatDateTime(generatedAt)}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Typography
                          sx={{
                            fontSize: 9,
                            color: "#64748b",
                          }}
                        >
                          Clinical review
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: 9,
                            color: "#fbbf24",
                            fontWeight: 700,
                          }}
                        >
                          Required
                        </Typography>
                      </Stack>
                    </Stack>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>

        {/* ===================================================
            FOOTER
        ==================================================== */}

        <Box
          sx={{
            p: 1,
            borderTop: "1px solid #263241",
            backgroundColor: "#0d141c",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: "#64748b",
              display: "block",
              textAlign: "center",
              lineHeight: 1.4,
            }}
          >
            AI assistance • Radiologist review required
          </Typography>
        </Box>
      </Paper>

      {/* =====================================================
          REPORT EDITOR DIALOG
      ====================================================== */}

      <Dialog
        open={editDialogOpen}
        onClose={closeReportEditor}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            backgroundColor: "#111820",
            color: "#ffffff",
            border: "1px solid #263241",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            color: "#e2e8f0",
          }}
        >
          <ArticleIcon
            sx={{
              color: "#64b5f6",
            }}
          />
          Edit AI Report Draft
        </DialogTitle>

        <DialogContent
          dividers
          sx={{
            borderColor: "#263241",
          }}
        >
          <Alert
            severity="warning"
            icon={<WarningAmberIcon />}
            sx={{
              mb: 2,
              backgroundColor: "rgba(120,53,15,0.14)",
              color: "#fde68a",
              border: "1px solid rgba(245,158,11,0.22)",
            }}
          >
            Review and edit the AI-generated content before saving. Saving a report does not make
            the AI output a confirmed diagnosis.
          </Alert>

          {saveError && (
            <Alert
              severity="error"
              sx={{
                mb: 2,
              }}
            >
              {saveError}
            </Alert>
          )}

          <Stack spacing={2}>
            <TextField
              label="Radiologist Name"
              fullWidth
              value={radiologistName}
              onChange={(event) => setRadiologistName(event.target.value)}
              InputLabelProps={{
                sx: {
                  color: "#94a3b8",
                },
              }}
              InputProps={{
                sx: {
                  color: "#ffffff",
                },
              }}
              sx={{
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#334155",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#475569",
                },
              }}
            />

            <TextField
              label="Findings"
              fullWidth
              multiline
              minRows={7}
              value={reportFindings}
              onChange={(event) => setReportFindings(event.target.value)}
              InputLabelProps={{
                sx: {
                  color: "#94a3b8",
                },
              }}
              InputProps={{
                sx: {
                  color: "#ffffff",
                  alignItems: "flex-start",
                },
              }}
              sx={{
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#334155",
                },
              }}
            />

            <TextField
              label="Impression"
              fullWidth
              multiline
              minRows={5}
              value={reportImpression}
              onChange={(event) => setReportImpression(event.target.value)}
              InputLabelProps={{
                sx: {
                  color: "#94a3b8",
                },
              }}
              InputProps={{
                sx: {
                  color: "#ffffff",
                  alignItems: "flex-start",
                },
              }}
              sx={{
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#334155",
                },
              }}
            />
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            p: 1.5,
            borderTop: "1px solid #263241",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Button
            onClick={closeReportEditor}
            disabled={savingReport}
            sx={{
              color: "#94a3b8",
              textTransform: "none",
            }}
          >
            Cancel
          </Button>

          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={() => handleSaveReport("Draft")}
            disabled={savingReport}
            sx={{
              textTransform: "none",
              color: "#bfdbfe",
              borderColor: "#355276",
            }}
          >
            {savingReport && saveMode === "Draft" ? "Saving..." : "Save Draft"}
          </Button>

          <Button
            variant="contained"
            startIcon={<DoneAllIcon />}
            onClick={() => handleSaveReport("Completed")}
            disabled={savingReport}
            sx={{
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            {savingReport && saveMode === "Completed" ? "Finalizing..." : "Finalize Report"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default AIAnalysisPanel;
