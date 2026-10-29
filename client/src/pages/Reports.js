import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Layout from "../components/Layout";
import { API_URL, authHeaders, jsonHeaders } from "../api/http";

import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Chip,
  IconButton,
  InputAdornment,
  Stack,
  Divider,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SearchIcon from "@mui/icons-material/Search";
import DescriptionIcon from "@mui/icons-material/Description";
import PrintIcon from "@mui/icons-material/Print";
import ImageIcon from "@mui/icons-material/Image";


function Reports() {


  // =========================================================
  // STATE
  // =========================================================

  const [reports, setReports] =
    useState([]);

  const [studies, setStudies] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [openForm, setOpenForm] =
    useState(false);

  const [openView, setOpenView] =
    useState(false);

  const [editingReport, setEditingReport] =
    useState(null);

  const [selectedReport, setSelectedReport] =
    useState(null);

  const [reportImage, setReportImage] =
    useState(null);

  const [loadingReportImage, setLoadingReportImage] =
    useState(false);


  const [form, setForm] =
    useState({
      studyId: "",
      radiologistName: "",
      findings: "",
      impression: "",
      status: "Completed",
    });


  // =========================================================
  // USER
  // =========================================================

  const getLoggedInUser =
    useCallback(() => {
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
          "Unable to read logged-in user:",
          error
        );

        return null;
      }
    }, []);


  const getUserId =
    useCallback(() => {
      const user =
        getLoggedInUser();

      if (
        !user ||
        !user.id
      ) {
        return null;
      }

      return user.id;
    }, [
      getLoggedInUser,
    ]);


  const getUserHeaders = jsonHeaders;


  // =========================================================
  // LOAD REPORTS
  // =========================================================

  const loadReports =
    useCallback(
      async () => {

        try {

          const userId =
            getUserId();

          if (!userId) {

            alert(
              "Your login session was not found. Please login again."
            );

            return;
          }


          const response =
            await fetch(
              `${API_URL}/api/reports`,
              {
                method:
                  "GET",

                headers:
                  getUserHeaders(),
              }
            );


          const data =
            await response.json();


          if (
            !response.ok
          ) {

            alert(
              data.message ||
                "Unable to load reports"
            );

            return;
          }


          setReports(
            Array.isArray(
              data.reports
            )
              ? data.reports
              : []
          );

        } catch (error) {

          console.error(
            "Load Reports Error:",
            error
          );

          alert(
            "Cannot connect to backend server."
          );
        }

      },
      [
        getUserId,
        getUserHeaders,
      ]
    );


  // =========================================================
  // LOAD STUDIES
  // =========================================================

  const loadStudies =
    useCallback(
      async () => {

        try {

          const userId =
            getUserId();

          if (!userId) {
            return;
          }


          // -------------------------------------------------
          // PATIENTS
          // -------------------------------------------------

          const patientResponse =
            await fetch(
              `${API_URL}/api/patients`,
              {
                method:
                  "GET",

                headers:
                  getUserHeaders(),
              }
            );


          const patientData =
            await patientResponse.json();


          if (
            !patientResponse.ok
          ) {
            return;
          }


          const patients =
            Array.isArray(
              patientData.patients
            )
              ? patientData.patients
              : [];


          // -------------------------------------------------
          // STUDIES
          // -------------------------------------------------

          const studyResponse =
            await fetch(
              `${API_URL}/api/studies`,
              {
                method:
                  "GET",

                headers:
                  getUserHeaders(),
              }
            );


          const studyData =
            await studyResponse.json();


          if (
            !studyResponse.ok
          ) {
            return;
          }


          const allStudies =
            Array.isArray(
              studyData.studies
            )
              ? studyData.studies
              : [];


          // -------------------------------------------------
          // MERGE PATIENT DATA
          // -------------------------------------------------

          const studiesWithPatients =
            allStudies.map(
              (study) => {

                const patient =
                  patients.find(
                    (item) =>
                      Number(
                        item.id
                      ) ===
                      Number(
                        study.patientId
                      )
                  );


                return {
                  ...study,

                  patientName:
                    study.patientName ||
                    patient?.name ||
                    patient?.Name ||
                    "Unknown Patient",

                  patientAge:
                    patient?.age ||
                    patient?.Age ||
                    "",

                  patientGender:
                    patient?.gender ||
                    patient?.Gender ||
                    "",

                  patientPhone:
                    patient?.phone ||
                    patient?.Phone ||
                    "",
                };
              }
            );


          setStudies(
            studiesWithPatients
          );

        } catch (error) {

          console.error(
            "Load Studies Error:",
            error
          );
        }

      },
      [
        getUserId,
        getUserHeaders,
      ]
    );


  // =========================================================
  // INITIAL PAGE LOAD
  // =========================================================

  useEffect(() => {

    let cancelled =
      false;


    const loadPage =
      async () => {

        setLoading(
          true
        );


        await Promise.all([
          loadReports(),
          loadStudies(),
        ]);


        if (!cancelled) {
          setLoading(
            false
          );
        }
      };


    loadPage();


    return () => {
      cancelled =
        true;
    };

  }, [
    loadReports,
    loadStudies,
  ]);


  // =========================================================
  // LOAD IMAGE FOR REPORT PREVIEW
  // =========================================================

  const loadReportImage =
    async (
      report
    ) => {

      if (
        !report?.patientId ||
        !report?.studyId
      ) {

        setReportImage(
          null
        );

        return;
      }


      const userId =
        getUserId();


      if (!userId) {

        setReportImage(
          null
        );

        return;
      }


      try {

        setLoadingReportImage(
          true
        );


        if (
          reportImage?.url
        ) {

          URL.revokeObjectURL(
            reportImage.url
          );
        }


        setReportImage(
          null
        );


        const response =
          await fetch(
            `${API_URL}/api/images?patientId=${report.patientId}&studyId=${report.studyId}`,
            {
              method:
                "GET",

              headers: {
                ...authHeaders(),
              },
            }
          );


        const data =
          await response.json();


        if (
          !response.ok
        ) {

          console.error(
            "Unable to load report images:",
            data.message
          );

          return;
        }


        const imageList =
          Array.isArray(
            data.images
          )
            ? data.images
            : [];


        if (
          imageList.length === 0
        ) {

          setReportImage(
            null
          );

          return;
        }


        const firstImage =
          imageList[0];


        const imageId =
          firstImage.id ??
          firstImage.Id;


        const fileName =
          firstImage.fileName ??
          firstImage.FileName ??
          "Medical Image";


        if (!imageId) {

          console.error(
            "Image ID was not found:",
            firstImage
          );

          return;
        }


        const imageResponse =
          await fetch(
            `${API_URL}/api/images/${imageId}`,
            {
              method:
                "GET",

              headers: {
                ...authHeaders(),
              },
            }
          );


        if (
          !imageResponse.ok
        ) {

          console.error(
            "Unable to download preview image."
          );

          return;
        }


        const blob =
          await imageResponse.blob();


        const imageUrl =
          URL.createObjectURL(
            blob
          );


        setReportImage({
          url:
            imageUrl,

          fileName:
            fileName,
        });

      } catch (error) {

        console.error(
          "Load Report Image Error:",
          error
        );

        setReportImage(
          null
        );

      } finally {

        setLoadingReportImage(
          false
        );
      }
    };


  // =========================================================
  // FORM RESET
  // =========================================================

  const resetForm =
    () => {

      const user =
        getLoggedInUser();


      setForm({
        studyId:
          "",

        radiologistName:
          user?.fullName ||
          user?.name ||
          user?.username ||
          "",

        findings:
          "",

        impression:
          "",

        status:
          "Completed",
      });


      setEditingReport(
        null
      );
    };


  // =========================================================
  // OPEN CREATE
  // =========================================================

  const handleOpenCreate =
    () => {

      resetForm();

      setOpenForm(
        true
      );
    };


  // =========================================================
  // CLOSE FORM
  // =========================================================

  const handleCloseForm =
    () => {

      if (saving) {
        return;
      }

      setOpenForm(
        false
      );

      resetForm();
    };


  // =========================================================
  // FORM CHANGE
  // =========================================================

  const handleChange =
    (event) => {

      const {
        name,
        value,
      } = event.target;


      setForm(
        (previous) => ({
          ...previous,

          [name]:
            value,
        })
      );
    };


  // =========================================================
  // FIND SELECTED STUDY
  // =========================================================

  const selectedStudy =
    studies.find(
      (study) =>
        String(
          study.id
        ) ===
        String(
          form.studyId
        )
    );


  // =========================================================
  // SAVE REPORT
  // =========================================================

  const handleSave =
    async () => {

      if (
        !form.studyId
      ) {

        alert(
          "Please select a study."
        );

        return;
      }


      if (
        !form.radiologistName.trim()
      ) {

        alert(
          "Please enter radiologist name."
        );

        return;
      }


      if (
        !form.findings.trim()
      ) {

        alert(
          "Please enter clinical findings."
        );

        return;
      }


      if (
        !form.impression.trim()
      ) {

        alert(
          "Please enter final impression."
        );

        return;
      }


      const selected =
        studies.find(
          (study) =>
            Number(
              study.id
            ) ===
            Number(
              form.studyId
            )
        );


      if (
        !editingReport &&
        Number(
          selected?.imageCount ||
          0
        ) === 0
      ) {

        // Only warn when imageCount is explicitly
        // available and equals zero.
        if (
          selected &&
          typeof selected.imageCount !==
            "undefined"
        ) {

          alert(
            "This study has no uploaded images. Please upload an image before creating the report."
          );

          return;
        }
      }


      const userId =
        getUserId();


      if (!userId) {

        alert(
          "Your login session was not found. Please login again."
        );

        return;
      }


      try {

        setSaving(
          true
        );


        const url =
          editingReport
            ? `${API_URL}/api/reports/${editingReport.id}`
            : `${API_URL}/api/reports`;


        const method =
          editingReport
            ? "PUT"
            : "POST";


        const reportPayload = {
          ...form,

          patientId:
            selected?.patientId ||
            editingReport?.patientId ||
            null,
        };


        const response =
          await fetch(
            url,
            {
              method,

              headers:
                getUserHeaders(),

              body:
                JSON.stringify(
                  reportPayload
                ),
            }
          );


        const data =
          await response.json();


        if (
          !response.ok
        ) {

          alert(
            data.message ||
              "Unable to save report"
          );

          return;
        }


        alert(
          editingReport
            ? "Report updated successfully"
            : "Report created successfully"
        );


        setOpenForm(
          false
        );


        resetForm();


        await loadReports();

      } catch (error) {

        console.error(
          "Save Report Error:",
          error
        );

        alert(
          "Cannot connect to backend server."
        );

      } finally {

        setSaving(
          false
        );
      }
    };
      // =========================================================
  // EDIT REPORT
  // =========================================================

  const handleEdit =
    (report) => {

      setEditingReport(
        report
      );


      setForm({
        studyId:
          report.studyId ||
          "",

        radiologistName:
          report.radiologistName ||
          "",

        findings:
          report.findings ||
          "",

        impression:
          report.impression ||
          "",

        status:
          report.status ||
          "Completed",
      });


      setOpenForm(
        true
      );
    };


  // =========================================================
  // VIEW REPORT
  // =========================================================

  const handleView =
    async (
      report
    ) => {

      if (
        reportImage?.url
      ) {

        URL.revokeObjectURL(
          reportImage.url
        );
      }


      setReportImage(
        null
      );


      setSelectedReport(
        report
      );


      setOpenView(
        true
      );


      await loadReportImage(
        report
      );
    };


  // =========================================================
  // CLOSE REPORT PREVIEW
  // =========================================================

  const handleCloseView =
    () => {

      if (
        reportImage?.url
      ) {

        URL.revokeObjectURL(
          reportImage.url
        );
      }


      setReportImage(
        null
      );


      setSelectedReport(
        null
      );


      setOpenView(
        false
      );
    };


  // =========================================================
  // DELETE REPORT
  // =========================================================

  const handleDelete =
    async (
      reportId
    ) => {

      const confirmed =
        window.confirm(
          "Are you sure you want to delete this report?"
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

        return;
      }


      try {

        setDeleting(
          true
        );


        const response =
          await fetch(
            `${API_URL}/api/reports/${reportId}`,
            {
              method:
                "DELETE",

              headers: {
                ...authHeaders(),
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
              "Unable to delete report"
          );

          return;
        }


        alert(
          "Report deleted successfully"
        );


        if (
          selectedReport?.id ===
          reportId
        ) {

          handleCloseView();
        }


        await loadReports();

      } catch (error) {

        console.error(
          "Delete Report Error:",
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


  // =========================================================
  // FILTER REPORTS
  // =========================================================

  const filteredReports =
    reports.filter(
      (report) => {

        const searchText =
          search
            .trim()
            .toLowerCase();


        if (!searchText) {
          return true;
        }


        const patientName =
          String(
            report.patientName ||
            ""
          ).toLowerCase();


        const studyNumber =
          String(
            report.studyNumber ||
            report.studyId ||
            ""
          ).toLowerCase();


        const radiologistName =
          String(
            report.radiologistName ||
            ""
          ).toLowerCase();


        const findings =
          String(
            report.findings ||
            ""
          ).toLowerCase();


        const impression =
          String(
            report.impression ||
            ""
          ).toLowerCase();


        const modality =
          String(
            report.modality ||
            ""
          ).toLowerCase();


        return (
          patientName.includes(
            searchText
          ) ||

          studyNumber.includes(
            searchText
          ) ||

          radiologistName.includes(
            searchText
          ) ||

          findings.includes(
            searchText
          ) ||

          impression.includes(
            searchText
          ) ||

          modality.includes(
            searchText
          )
        );
      }
    );


  // =========================================================
  // PRINT
  // =========================================================

  const handlePrint =
    () => {

      if (!selectedReport) {
        return;
      }

      window.print();
    };


  // =========================================================
  // STATUS COLOR
  // =========================================================

  const getStatusColor =
    (status) => {

      switch (
        String(
          status || ""
        ).toLowerCase()
      ) {

        case "completed":
          return "success";

        case "pending":
          return "warning";

        case "draft":
          return "default";

        case "cancelled":
          return "error";

        default:
          return "primary";
      }
    };


  // =========================================================
  // FIND STUDY FOR REPORT
  // =========================================================

  const getStudyForReport =
    (report) => {

      return studies.find(
        (study) =>
          Number(
            study.id
          ) ===
          Number(
            report.studyId
          )
      );
    };


  // =========================================================
  // DATE FORMAT
  // =========================================================

  const formatDate =
    (date) => {

      if (!date) {
        return "-";
      }


      const parsedDate =
        new Date(
          date
        );


      if (
        Number.isNaN(
          parsedDate.getTime()
        )
      ) {

        return String(
          date
        );
      }


      return parsedDate.toLocaleDateString(
        "en-IN",
        {
          day:
            "2-digit",

          month:
            "short",

          year:
            "numeric",
        }
      );
    };


  // =========================================================
  // REPORT PREVIEW
  // =========================================================

  const renderReportPreview =
    () => {

      if (
        !selectedReport
      ) {
        return null;
      }


      const selectedStudy =
        getStudyForReport(
          selectedReport
        );


      /*
       * Patient name can come from either:
       *
       * 1. Reports API -> patientName
       * 2. Related Study -> patientName
       *
       * This fixes the old "Patient: -" header.
       */

      const patientName =
        selectedReport.patientName ||
        selectedStudy?.patientName ||
        "Unknown Patient";


      const patientId =
        selectedReport.patientId ||
        selectedStudy?.patientId ||
        "-";


      const studyNumber =
        selectedStudy?.studyId ||
        selectedReport.studyNumber ||
        selectedReport.studyId ||
        "-";


      const modality =
        selectedStudy?.modality ||
        selectedReport.modality ||
        "-";


      const bodyPart =
        selectedStudy?.bodyPart ||
        selectedReport.bodyPart ||
        "-";


      const studyDate =
        selectedStudy?.studyDate ||
        selectedReport.studyDate ||
        null;


      return (
        <Box
          sx={{
            backgroundColor:
              "#ffffff",

            p: {
              xs:
                2,

              md:
                4,
            },

            borderRadius:
              2,

            color:
              "#111827",
          }}
        >

          {/* =================================================
              REPORT HEADER
          ================================================== */}

          <Box
            sx={{
              textAlign:
                "center",

              mb:
                3,
            }}
          >

            <Typography
              variant="h5"
              fontWeight="bold"
            >
              RADIOLOGY MEDICAL
              REPORT
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              mt={1}
            >
              Radiology Medical Image
              Viewing System
            </Typography>

          </Box>


          <Divider
            sx={{
              mb:
                3,
            }}
          />


          {/* =================================================
              PATIENT INFORMATION
          ================================================== */}

          <Typography
            variant="h6"
            fontWeight="bold"
            mb={2}
          >
            Patient Information
          </Typography>


          <Box
            sx={{
              display:
                "grid",

              gridTemplateColumns:
                {
                  xs:
                    "1fr",

                  sm:
                    "1fr 1fr",
                },

              gap:
                2,

              mb:
                3,
            }}
          >

            <Typography>
              <strong>
                Patient Name:
              </strong>{" "}
              {patientName}
            </Typography>


            <Typography>
              <strong>
                Patient ID:
              </strong>{" "}
              {patientId}
            </Typography>


            <Typography>
              <strong>
                Study ID:
              </strong>{" "}
              {studyNumber}
            </Typography>


            <Typography>
              <strong>
                Modality:
              </strong>{" "}
              {modality}
            </Typography>


            <Typography>
              <strong>
                Body Part:
              </strong>{" "}
              {bodyPart}
            </Typography>


            <Typography>
              <strong>
                Study Date:
              </strong>{" "}
              {formatDate(
                studyDate
              )}
            </Typography>

          </Box>


          <Divider
            sx={{
              mb:
                3,
            }}
          />


          {/* =================================================
              MEDICAL IMAGE
          ================================================== */}

          <Typography
            variant="h6"
            fontWeight="bold"
            mb={2}
          >
            Medical Image
          </Typography>


          <Box
            sx={{
              width:
                "100%",

              minHeight:
                250,

              backgroundColor:
                "#111111",

              borderRadius:
                2,

              display:
                "flex",

              justifyContent:
                "center",

              alignItems:
                "center",

              overflow:
                "hidden",

              mb:
                3,
            }}
          >

            {loadingReportImage ? (

              <Box
                sx={{
                  display:
                    "flex",

                  flexDirection:
                    "column",

                  alignItems:
                    "center",

                  gap:
                    2,

                  color:
                    "#ffffff",

                  p:
                    4,
                }}
              >

                <CircularProgress
                  color="inherit"
                />

                <Typography>
                  Loading image preview...
                </Typography>

              </Box>

            ) : reportImage?.url ? (

              <img
                src={
                  reportImage.url
                }
                alt={
                  reportImage.fileName ||
                  "Medical Report"
                }
                style={{
                  maxWidth:
                    "100%",

                  maxHeight:
                    "450px",

                  objectFit:
                    "contain",

                  display:
                    "block",
                }}
              />

            ) : (

              <Box
                sx={{
                  textAlign:
                    "center",

                  color:
                    "#ffffff",

                  p:
                    4,
                }}
              >

                <ImageIcon
                  sx={{
                    fontSize:
                      60,

                    opacity:
                      0.6,

                    mb:
                      1,
                  }}
                />

                <Typography>
                  No medical image
                  available for this
                  report.
                </Typography>

                <Typography
                  variant="caption"
                  sx={{
                    display:
                      "block",

                    mt:
                      1,

                    opacity:
                      0.7,
                  }}
                >
                  Upload an image to
                  the associated study
                  to display it here.
                </Typography>

              </Box>
            )}

          </Box>


          {/* =================================================
              FINDINGS
          ================================================== */}

          <Typography
            variant="h6"
            fontWeight="bold"
            mb={2}
          >
            Clinical Findings
          </Typography>


          <Paper
            variant="outlined"
            sx={{
              p:
                2,

              mb:
                3,

              backgroundColor:
                "#fafafa",
            }}
          >

            <Typography
              sx={{
                whiteSpace:
                  "pre-wrap",
              }}
            >
              {
                selectedReport.findings ||
                "No findings provided."
              }
            </Typography>

          </Paper>


          {/* =================================================
              IMPRESSION
          ================================================== */}

          <Typography
            variant="h6"
            fontWeight="bold"
            mb={2}
          >
            Final Impression
          </Typography>


          <Paper
            variant="outlined"
            sx={{
              p:
                2,

              mb:
                3,

              backgroundColor:
                "#fafafa",
            }}
          >

            <Typography
              fontWeight="bold"
              sx={{
                whiteSpace:
                  "pre-wrap",
              }}
            >
              {
                selectedReport.impression ||
                "No impression provided."
              }
            </Typography>

          </Paper>


          <Divider
            sx={{
              mb:
                2,
            }}
          />


          {/* =================================================
              REPORT DETAILS
          ================================================== */}

          <Box
            sx={{
              display:
                "grid",

              gridTemplateColumns:
                {
                  xs:
                    "1fr",

                  sm:
                    "1fr 1fr",
                },

              gap:
                2,
            }}
          >

            <Typography>
              <strong>
                Radiologist:
              </strong>{" "}
              {
                selectedReport.radiologistName ||
                "-"
              }
            </Typography>


            <Typography>
              <strong>
                Report Date:
              </strong>{" "}
              {
                formatDate(
                  selectedReport.reportDate
                )
              }
            </Typography>


            <Typography>
              <strong>
                Status:
              </strong>{" "}

              <Chip
                label={
                  selectedReport.status ||
                  "Completed"
                }
                color={
                  getStatusColor(
                    selectedReport.status
                  )
                }
                size="small"
              />

            </Typography>

          </Box>

        </Box>
      );
    };
      // =========================================================
  // RENDER
  // =========================================================

  return (
    <Layout>

      <Box>

        {/* ===================================================
            PAGE HEADER
        ==================================================== */}

        <Box
          sx={{
            display:
              "flex",

            justifyContent:
              "space-between",

            alignItems:
              "flex-start",

            gap:
              2,

            mb:
              2.5,

            flexWrap:
              "wrap",
          }}
        >

          <Box>

            <Typography
              variant="h4"
              fontWeight="bold"
            >
              Radiology Reports
            </Typography>

            <Typography
              color="text.secondary"
              variant="body2"
              sx={{
                mt:
                  0.7,
              }}
            >
              Create, review and manage
              diagnostic reports
            </Typography>

          </Box>


          <Button
            variant="contained"
            startIcon={
              <AddIcon />
            }
            onClick={
              handleOpenCreate
            }
            sx={{
              minWidth:
                150,

              borderRadius:
                2,

              textTransform:
                "none",

              fontWeight:
                600,
            }}
          >
            Create Report
          </Button>

        </Box>


        {/* ===================================================
            SEARCH
        ==================================================== */}

        <Paper
          elevation={0}
          sx={{
            p:
              2,

            mb:
              2.5,

            borderRadius:
              2.5,

            border:
              "1px solid",

            borderColor:
              "divider",

            backgroundColor:
              "background.paper",
          }}
        >

          <TextField
            fullWidth
            size="small"
            placeholder="Search by patient, study or radiologist..."
            value={
              search
            }
            onChange={
              (event) =>
                setSearch(
                  event.target.value
                )
            }
            InputProps={{
              startAdornment:
                (
                  <InputAdornment
                    position="start"
                  >
                    <SearchIcon
                      color="action"
                    />
                  </InputAdornment>
                ),
            }}
            sx={{
              "& .MuiOutlinedInput-root":
                {
                  borderRadius:
                    1.8,
                },
            }}
          />

        </Paper>


        {/* ===================================================
            REPORT TABLE
        ==================================================== */}

        <Paper
          elevation={0}
          sx={{
            borderRadius:
              2.5,

            overflow:
              "hidden",

            border:
              "1px solid",

            borderColor:
              "divider",

            backgroundColor:
              "background.paper",
          }}
        >

          <Box
            sx={{
              px:
                2.5,

              py:
                2,

              display:
                "flex",

              justifyContent:
                "space-between",

              alignItems:
                "center",

              gap:
                2,

              borderBottom:
                "1px solid",

              borderColor:
                "divider",
            }}
          >

            <Typography
              variant="h6"
              fontWeight="bold"
            >
              Reports
            </Typography>


            <Chip
              label={`${filteredReports.length} ${
                filteredReports.length ===
                1
                  ? "report"
                  : "reports"
              }`}
              size="small"
              color="primary"
              variant="outlined"
            />

          </Box>


          {loading ? (

            <Box
              sx={{
                py:
                  6,

                textAlign:
                  "center",
              }}
            >

              <CircularProgress />

              <Typography
                color="text.secondary"
                mt={2}
              >
                Loading reports...
              </Typography>

            </Box>

          ) : filteredReports.length === 0 ? (

            <Box
              sx={{
                py:
                  6,

                textAlign:
                  "center",
              }}
            >

              <DescriptionIcon
                sx={{
                  fontSize:
                    60,

                  color:
                    "text.secondary",

                  mb:
                    1,
                }}
              />

              <Typography
                variant="h6"
              >
                No reports found
              </Typography>

              <Typography
                color="text.secondary"
                mt={1}
              >
                Create a report to see
                it here.
              </Typography>

            </Box>

          ) : (

            <Box
              sx={{
                px:
                  1,

                pb:
                  1,
              }}
            >

              <TableContainer>

                <Table>

                  <TableHead>

                    <TableRow>

                      <TableCell>
                        <strong>
                          Patient
                        </strong>
                      </TableCell>

                      <TableCell>
                        <strong>
                          Study
                        </strong>
                      </TableCell>

                      <TableCell>
                        <strong>
                          Radiologist
                        </strong>
                      </TableCell>

                      <TableCell>
                        <strong>
                          Status
                        </strong>
                      </TableCell>

                      <TableCell>
                        <strong>
                          Date
                        </strong>
                      </TableCell>

                      <TableCell
                        align="right"
                      >
                        <strong>
                          Actions
                        </strong>
                      </TableCell>

                    </TableRow>

                  </TableHead>


                  <TableBody>

                    {filteredReports.map(
                      (
                        report
                      ) => (

                        <TableRow
                          key={
                            report.id
                          }
                          hover
                        >

                          {/* PATIENT */}

                          <TableCell>

                            <Typography
                              fontWeight="600"
                            >
                              {
                                report.patientName ||
                                "Unknown Patient"
                              }
                            </Typography>

                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              ID:{" "}
                              {
                                report.patientId ||
                                "-"
                              }
                            </Typography>

                          </TableCell>


                          {/* STUDY */}

                          <TableCell>

                            <Typography
                              fontWeight="500"
                            >
                              {
                                report.studyNumber ||
                                report.studyId ||
                                "-"
                              }
                            </Typography>

                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {
                                report.modality ||
                                getStudyForReport(
                                  report
                                )?.modality ||
                                "-"
                              }
                            </Typography>

                          </TableCell>


                          {/* RADIOLOGIST */}

                          <TableCell>
                            {
                              report.radiologistName ||
                              "-"
                            }
                          </TableCell>


                          {/* STATUS */}

                          <TableCell>

                            <Chip
                              label={
                                report.status ||
                                "Completed"
                              }
                              color={
                                getStatusColor(
                                  report.status
                                )
                              }
                              size="small"
                            />

                          </TableCell>


                          {/* DATE */}

                          <TableCell>
                            {
                              formatDate(
                                report.reportDate
                              )
                            }
                          </TableCell>


                          {/* ACTIONS */}

                          <TableCell
                            align="right"
                          >

                            <Box
                              sx={{
                                display:
                                  "flex",

                                justifyContent:
                                  "flex-end",

                                gap:
                                  0.5,
                              }}
                            >

                              <Button
                                size="small"
                                variant="contained"
                                startIcon={
                                  <VisibilityIcon />
                                }
                                onClick={() =>
                                  handleView(
                                    report
                                  )
                                }
                                sx={{
                                  textTransform:
                                    "none",
                                }}
                              >
                                View
                              </Button>


                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={
                                  <EditIcon />
                                }
                                onClick={() =>
                                  handleEdit(
                                    report
                                  )
                                }
                                sx={{
                                  textTransform:
                                    "none",
                                }}
                              >
                                Edit
                              </Button>


                              <IconButton
                                color="error"
                                onClick={() =>
                                  handleDelete(
                                    report.id
                                  )
                                }
                                disabled={
                                  deleting
                                }
                              >
                                <DeleteIcon />
                              </IconButton>

                            </Box>

                          </TableCell>

                        </TableRow>
                      )
                    )}

                  </TableBody>

                </Table>

              </TableContainer>

            </Box>
          )}

        </Paper>


        {/* ===================================================
            CREATE / EDIT REPORT DIALOG
        ==================================================== */}

        <Dialog
          open={
            openForm
          }
          onClose={
            handleCloseForm
          }
          fullWidth
          maxWidth="md"
        >

          <DialogTitle>
            {
              editingReport
                ? "Edit Radiology Report"
                : "Create Radiology Report"
            }
          </DialogTitle>


          <DialogContent>

            <Stack
              spacing={2}
              sx={{
                mt:
                  1,
              }}
            >

              <TextField
                select
                fullWidth
                label="Select Study"
                name="studyId"
                value={
                  form.studyId
                }
                onChange={
                  handleChange
                }
                disabled={
                  Boolean(
                    editingReport
                  )
                }
              >

                <MenuItem value="">
                  Select Study
                </MenuItem>

                {studies.map(
                  (
                    study
                  ) => (

                    <MenuItem
                      key={
                        study.id
                      }
                      value={
                        study.id
                      }
                    >
                      {
                        study.studyId ||
                        `Study ${study.id}`
                      }
                      {" - "}
                      {
                        study.patientName ||
                        "Unknown Patient"
                      }
                      {" - "}
                      {
                        study.modality ||
                        "Unknown Modality"
                      }
                    </MenuItem>

                  )
                )}

              </TextField>


              {selectedStudy && (

                <Paper
                  variant="outlined"
                  sx={{
                    p:
                      2,

                    backgroundColor:
                      "#f7f9fc",
                  }}
                >

                  <Typography
                    variant="subtitle1"
                    fontWeight="bold"
                    mb={1}
                  >
                    Selected Study
                  </Typography>


                  <Box
                    sx={{
                      display:
                        "grid",

                      gridTemplateColumns:
                        {
                          xs:
                            "1fr",

                          sm:
                            "1fr 1fr",
                        },

                      gap:
                        1,
                    }}
                  >

                    <Typography>
                      <strong>
                        Patient:
                      </strong>{" "}
                      {
                        selectedStudy.patientName ||
                        "-"
                      }
                    </Typography>


                    <Typography>
                      <strong>
                        Study ID:
                      </strong>{" "}
                      {
                        selectedStudy.studyId ||
                        "-"
                      }
                    </Typography>


                    <Typography>
                      <strong>
                        Modality:
                      </strong>{" "}
                      {
                        selectedStudy.modality ||
                        "-"
                      }
                    </Typography>


                    <Typography>
                      <strong>
                        Body Part:
                      </strong>{" "}
                      {
                        selectedStudy.bodyPart ||
                        "-"
                      }
                    </Typography>


                    <Typography>
                      <strong>
                        Images:
                      </strong>{" "}
                      {
                        selectedStudy.imageCount ??
                        "-"
                      }
                    </Typography>


                    <Typography>
                      <strong>
                        Status:
                      </strong>{" "}
                      {
                        selectedStudy.status ||
                        "-"
                      }
                    </Typography>

                  </Box>

                </Paper>
              )}


              <TextField
                fullWidth
                label="Radiologist Name"
                name="radiologistName"
                value={
                  form.radiologistName
                }
                onChange={
                  handleChange
                }
              />


              <TextField
                fullWidth
                multiline
                minRows={6}
                label="Clinical Findings"
                name="findings"
                value={
                  form.findings
                }
                onChange={
                  handleChange
                }
                placeholder="Enter detailed clinical findings..."
              />


              <TextField
                fullWidth
                multiline
                minRows={4}
                label="Final Impression"
                name="impression"
                value={
                  form.impression
                }
                onChange={
                  handleChange
                }
                placeholder="Enter the final radiological impression..."
              />


              <TextField
                select
                fullWidth
                label="Report Status"
                name="status"
                value={
                  form.status
                }
                onChange={
                  handleChange
                }
              >

                <MenuItem value="Draft">
                  Draft
                </MenuItem>

                <MenuItem value="Pending">
                  Pending
                </MenuItem>

                <MenuItem value="Completed">
                  Completed
                </MenuItem>

                <MenuItem value="Cancelled">
                  Cancelled
                </MenuItem>

              </TextField>

            </Stack>

          </DialogContent>


          <DialogActions
            sx={{
              p:
                2,
            }}
          >

            <Button
              onClick={
                handleCloseForm
              }
              disabled={
                saving
              }
            >
              Cancel
            </Button>


            <Button
              variant="contained"
              onClick={
                handleSave
              }
              disabled={
                saving
              }
            >

              {saving ? (

                <>

                  <CircularProgress
                    size={20}
                    sx={{
                      mr:
                        1,
                    }}
                  />

                  Saving...

                </>

              ) : (

                editingReport
                  ? "Update Report"
                  : "Create Report"

              )}

            </Button>

          </DialogActions>

        </Dialog>


        {/* ===================================================
            REPORT PREVIEW
        ==================================================== */}

        <Dialog
          open={
            openView
          }
          onClose={
            handleCloseView
          }
          fullWidth
          maxWidth="lg"
        >

          <DialogTitle
            sx={{
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

            <Box>

              <Typography
                variant="h6"
                fontWeight="bold"
              >
                Report Preview
              </Typography>


              {selectedReport && (

                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Patient:{" "}
                  {
                    selectedReport.patientName ||
                    getStudyForReport(
                      selectedReport
                    )?.patientName ||
                    "Unknown Patient"
                  }
                </Typography>

              )}

            </Box>


            <Button
              variant="outlined"
              startIcon={
                <PrintIcon />
              }
              onClick={
                handlePrint
              }
            >
              Print
            </Button>

          </DialogTitle>


          <DialogContent
            dividers
            sx={{
              backgroundColor:
                "#e9eef3",

              p:
                {
                  xs:
                    1,

                  sm:
                    2,

                  md:
                    3,
                },
            }}
          >

            {
              renderReportPreview()
            }

          </DialogContent>


          <DialogActions
            sx={{
              p:
                2,
            }}
          >

            <Button
              variant="outlined"
              onClick={
                handleCloseView
              }
            >
              Close
            </Button>

          </DialogActions>

        </Dialog>

      </Box>

    </Layout>
  );
}
export default Reports;