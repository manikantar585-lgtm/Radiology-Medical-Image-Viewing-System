import { useCallback, useEffect, useMemo, useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";

import Layout from "../components/Layout";
import { API_URL, jsonHeaders, getStoredUser, getCurrentUserId } from "../api/http";

import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  InputAdornment,
  Chip,
  CircularProgress,
  Divider,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ImageIcon from "@mui/icons-material/Image";
import DescriptionIcon from "@mui/icons-material/Description";

function Studies() {
  const location = useLocation();
  const navigate = useNavigate();

  const patientFromPatientsPage = location.state?.patient || null;

  const [studies, setStudies] = useState([]);

  const [patients, setPatients] = useState([]);

  const [reports, setReports] = useState([]);

  const [loading, setLoading] = useState(true);

  const [openStudyForm, setOpenStudyForm] = useState(false);

  const [openReportForm, setOpenReportForm] = useState(false);

  const [editingStudy, setEditingStudy] = useState(null);

  const [search, setSearch] = useState("");

  const [modalityFilter, setModalityFilter] = useState("");

  const [savingReport, setSavingReport] = useState(false);

  const [reportForm, setReportForm] = useState({
    studyId: "",
    radiologistName: "",
    findings: "",
    impression: "",
    status: "Completed",
  });

  const [formData, setFormData] = useState({
    patientId: "",
    studyId: "",
    modality: "",
    bodyPart: "",
    studyDate: "",
    status: "Completed",
  });

  const loadPatients = useCallback(async () => {
    const userId = getCurrentUserId();

    if (!userId) {
      alert("Your login session was not found. Please login again.");

      navigate("/");

      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/patients`, {
        method: "GET",
        headers: jsonHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load patients");
      }

      setPatients(data.patients || []);
    } catch (error) {
      console.error("Load Patients Error:", error);

      alert("Unable to load patients.");
    }
  }, [navigate]);

  const loadStudies = useCallback(async () => {
    const userId = getCurrentUserId();

    if (!userId) {
      alert("Your login session was not found. Please login again.");

      navigate("/");

      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/studies`, {
        method: "GET",
        headers: jsonHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load studies");
      }

      setStudies(data.studies || []);
    } catch (error) {
      console.error("Load Studies Error:", error);

      alert("Unable to load studies.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const loadReports = useCallback(async () => {
    const userId = getCurrentUserId();

    if (!userId) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/reports`, {
        method: "GET",
        headers: jsonHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load reports");
      }

      setReports(data.reports || []);
    } catch (error) {
      console.error("Load Reports Error:", error);
    }
  }, []);
  useEffect(() => {
    loadPatients();
    loadStudies();
    loadReports();
  }, [loadPatients, loadStudies, loadReports]);
  const getPatient = (patientId) => {
    return patients.find((patient) => Number(patient.id) === Number(patientId));
  };

  const getStudyReport = (studyId) => {
    return reports.find((report) => Number(report.studyId) === Number(studyId));
  };

  const handleCreateReport = (study) => {
    setReportForm({
      studyId: String(study.id),
      radiologistName: getStoredUser()?.fullName || "",
      findings: "",
      impression: "",
      status: "Completed",
    });

    setOpenReportForm(true);
  };

  const handleCloseReportForm = () => {
    if (savingReport) {
      return;
    }

    setOpenReportForm(false);

    setReportForm({
      studyId: "",
      radiologistName: "",
      findings: "",
      impression: "",
      status: "Completed",
    });
  };

  const handleReportChange = (event) => {
    const { name, value } = event.target;

    setReportForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSaveReport = async () => {
    if (!reportForm.studyId) {
      alert("Study information is missing.");

      return;
    }

    if (!reportForm.radiologistName.trim()) {
      alert("Please enter radiologist name.");

      return;
    }

    if (!reportForm.findings.trim()) {
      alert("Please enter clinical findings.");

      return;
    }

    if (!reportForm.impression.trim()) {
      alert("Please enter final impression.");

      return;
    }

    const userId = getCurrentUserId();

    if (!userId) {
      alert("Your login session was not found. Please login again.");

      navigate("/");

      return;
    }

    try {
      setSavingReport(true);

      const selectedStudy = studies.find(
        (study) => Number(study.id) === Number(reportForm.studyId)
      );

      if (!selectedStudy) {
        alert("Study information could not be found.");

        return;
      }

      const payload = {
        patientId: Number(selectedStudy.patientId),

        studyId: Number(reportForm.studyId),
        radiologistName: reportForm.radiologistName.trim(),

        findings: reportForm.findings.trim(),

        impression: reportForm.impression.trim(),

        status: "Completed",
      };

      const response = await fetch(`${API_URL}/api/reports`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Unable to create report");

        return;
      }

      alert("Report created successfully");

      setOpenReportForm(false);

      setReportForm({
        studyId: "",
        radiologistName: "",
        findings: "",
        impression: "",
        status: "Completed",
      });

      await loadReports();
    } catch (error) {
      console.error("Create Report Error:", error);

      alert("Cannot connect to backend server.");
    } finally {
      setSavingReport(false);
    }
  };

  const handleViewReport = (study) => {
    const report = getStudyReport(study.id);

    if (!report) {
      alert("No report is available for this study.");

      return;
    }

    const patient = getPatient(study.patientId);

    navigate("/reports", {
      state: {
        selectedReport: report,
        patient,
        study,
      },
    });
  };

  const filteredStudies = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return studies.filter((study) => {
      const patientName = String(
        study.patientName || getPatientName(patients, study.patientId) || ""
      ).toLowerCase();

      const studyId = String(study.studyId || "").toLowerCase();

      const modality = String(study.modality || "").toLowerCase();

      const bodyPart = String(study.bodyPart || "").toLowerCase();

      const matchesSearch =
        !searchText ||
        patientName.includes(searchText) ||
        studyId.includes(searchText) ||
        modality.includes(searchText) ||
        bodyPart.includes(searchText);

      const matchesModality = !modalityFilter || study.modality === modalityFilter;

      const matchesPatient =
        !patientFromPatientsPage || Number(study.patientId) === Number(patientFromPatientsPage.id);

      return matchesSearch && matchesModality && matchesPatient;
    });
  }, [studies, patients, search, modalityFilter, patientFromPatientsPage]);

  const handleOpenStudyForm = () => {
    setEditingStudy(null);

    setFormData({
      patientId: patientFromPatientsPage?.id ? String(patientFromPatientsPage.id) : "",
      studyId: "",
      modality: "",
      bodyPart: "",
      studyDate: new Date().toISOString().split("T")[0],
      status: "Completed",
    });

    setOpenStudyForm(true);
  };

  const handleEditStudy = (study) => {
    setEditingStudy(study);

    setFormData({
      patientId: study.patientId ? String(study.patientId) : "",

      studyId: study.studyId || "",

      modality: study.modality || "",

      bodyPart: study.bodyPart || "",

      studyDate: study.studyDate ? study.studyDate.substring(0, 10) : "",

      status: study.status || "Completed",
    });

    setOpenStudyForm(true);
  };

  const handleCloseStudyForm = () => {
    setOpenStudyForm(false);
    setEditingStudy(null);

    setFormData({
      patientId: "",
      studyId: "",
      modality: "",
      bodyPart: "",
      studyDate: "",
      status: "Completed",
    });
  };

  const handleStudyChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };
  const handleSaveStudy = async () => {
    if (
      !formData.patientId ||
      !formData.studyId ||
      !formData.modality ||
      !formData.bodyPart ||
      !formData.studyDate ||
      !formData.status
    ) {
      alert("Please fill all study fields.");

      return;
    }

    const userId = getCurrentUserId();

    if (!userId) {
      alert("Your login session was not found. Please login again.");

      navigate("/");

      return;
    }

    try {
      let response;

      if (editingStudy) {
        response = await fetch(`${API_URL}/api/studies/${editingStudy.id}`, {
          method: "PUT",
          headers: jsonHeaders(),
          body: JSON.stringify(formData),
        });
      } else {
        response = await fetch(`${API_URL}/api/studies`, {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify(formData),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Unable to save study");

        return;
      }

      alert(editingStudy ? "Study updated successfully" : "Study added successfully");

      handleCloseStudyForm();

      await loadStudies();
    } catch (error) {
      console.error("Save Study Error:", error);

      alert("Cannot connect to backend server.");
    }
  };

  const handleDeleteStudy = async (studyId) => {
    const confirmed = window.confirm("Are you sure you want to delete this study?");

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
      const response = await fetch(`${API_URL}/api/studies/${studyId}`, {
        method: "DELETE",
        headers: jsonHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Unable to delete study");

        return;
      }

      alert("Study deleted successfully");

      await loadStudies();
      await loadReports();
    } catch (error) {
      console.error("Delete Study Error:", error);

      alert("Cannot connect to backend server.");
    }
  };

  const handleViewStudy = (study) => {
    const patient = getPatient(study.patientId);

    if (!patient) {
      alert("Patient information could not be found.");

      return;
    }

    navigate("/viewer", {
      state: {
        patient,
        study,
      },
    });
  };

  const handleClearFilters = () => {
    setSearch("");
    setModalityFilter("");
  };

  const handleBack = () => {
    if (patientFromPatientsPage) {
      navigate("/patients");
    } else {
      navigate("/dashboard");
    }
  };

  const pageTitle = patientFromPatientsPage
    ? `Studies - ${patientFromPatientsPage.name}`
    : "Study List";

  return (
    <Layout>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        gap={2}
        mb={3}
        flexWrap="wrap"
      >
        <Box>
          <Typography variant="h4" fontWeight="bold">
            {pageTitle}
          </Typography>

          <Typography color="text.secondary" mt={1}>
            {patientFromPatientsPage
              ? "Manage medical studies for this patient"
              : "View and manage all medical studies"}
          </Typography>
        </Box>

        <Stack direction="row" spacing={2}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack}>
            Back
          </Button>

          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenStudyForm}>
            Add Study
          </Button>
        </Stack>
      </Box>

      <Paper
        elevation={3}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "2fr 1fr auto",
            },
            gap: 2,
            alignItems: "center",
          }}
        >
          <TextField
            fullWidth
            size="small"
            label="Search Study"
            placeholder="Patient, Study ID, modality..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            select
            fullWidth
            size="small"
            label="Modality"
            value={modalityFilter}
            onChange={(event) => setModalityFilter(event.target.value)}
          >
            <MenuItem value="">All Modalities</MenuItem>

            <MenuItem value="X-Ray">X-Ray</MenuItem>

            <MenuItem value="CT Scan">CT Scan</MenuItem>

            <MenuItem value="MRI">MRI</MenuItem>

            <MenuItem value="Ultrasound">Ultrasound</MenuItem>

            <MenuItem value="Mammography">Mammography</MenuItem>
          </TextField>

          <Button variant="outlined" onClick={handleClearFilters}>
            Clear
          </Button>
        </Box>
      </Paper>

      <Paper
        elevation={4}
        sx={{
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <TableContainer
          sx={{
            overflowX: "auto",
          }}
        >
          <Table
            sx={{
              minWidth: 1200,
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Patient</strong>
                </TableCell>

                <TableCell>
                  <strong>Study ID</strong>
                </TableCell>

                <TableCell>
                  <strong>Modality</strong>
                </TableCell>

                <TableCell>
                  <strong>Body Part</strong>
                </TableCell>

                <TableCell>
                  <strong>Study Date</strong>
                </TableCell>

                <TableCell align="center">
                  <strong>Images</strong>
                </TableCell>

                <TableCell align="center">
                  <strong>Actions</strong>
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align="center"
                    sx={{
                      py: 6,
                    }}
                  >
                    Loading studies...
                  </TableCell>
                </TableRow>
              ) : filteredStudies.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align="center"
                    sx={{
                      py: 6,
                    }}
                  >
                    <Typography color="text.secondary">No studies found.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudies.map((study) => {
                  const patient = getPatient(study.patientId);

                  const report = getStudyReport(study.id);

                  return (
                    <TableRow key={study.id} hover>
                      <TableCell>
                        <Typography fontWeight="bold">
                          {study.patientName || patient?.name || "-"}
                        </Typography>

                        <Typography variant="caption" color="text.secondary">
                          ID: {study.patientId}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography fontWeight="bold">{study.studyId || "-"}</Typography>
                      </TableCell>

                      <TableCell>{study.modality || "-"}</TableCell>

                      <TableCell>{study.bodyPart || "-"}</TableCell>

                      <TableCell>
                        {study.studyDate
                          ? new Date(study.studyDate).toLocaleDateString("en-IN")
                          : "-"}
                      </TableCell>

                      <TableCell align="center">
                        <Stack
                          direction="row"
                          justifyContent="center"
                          alignItems="center"
                          spacing={0.5}
                        >
                          <ImageIcon
                            fontSize="small"
                            color={Number(study.imageCount || 0) > 0 ? "primary" : "disabled"}
                          />

                          <Typography fontWeight="bold">{Number(study.imageCount || 0)}</Typography>
                        </Stack>
                      </TableCell>

                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                          {report ? (
                            <Button
                              variant="outlined"
                              color="success"
                              size="small"
                              startIcon={<VisibilityIcon />}
                              onClick={() => handleViewReport(study)}
                            >
                              View Report
                            </Button>
                          ) : (
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              startIcon={<DescriptionIcon />}
                              onClick={() => handleCreateReport(study)}
                            >
                              Create Report
                            </Button>
                          )}

                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<VisibilityIcon />}
                            onClick={() => handleViewStudy(study)}
                          >
                            View
                          </Button>

                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => handleEditStudy(study)}
                          >
                            Edit
                          </Button>

                          <Button
                            variant="contained"
                            color="error"
                            size="small"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleDeleteStudy(study.id)}
                          >
                            Delete
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      {/* ADD / EDIT STUDY DIALOG */}
      <Dialog open={openStudyForm} onClose={handleCloseStudyForm} fullWidth maxWidth="sm">
        <DialogTitle>{editingStudy ? "Edit Study" : "Add New Study"}</DialogTitle>

        <DialogContent>
          <TextField
            select
            fullWidth
            label="Patient"
            name="patientId"
            value={formData.patientId}
            onChange={handleStudyChange}
            margin="normal"
            disabled={Boolean(patientFromPatientsPage)}
          >
            <MenuItem value="">Select Patient</MenuItem>

            {patients.map((patient) => (
              <MenuItem key={patient.id} value={patient.id}>
                {patient.name}
                {" (ID: "}
                {patient.id}
                {")"}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            label="Study ID"
            name="studyId"
            value={formData.studyId}
            onChange={handleStudyChange}
            margin="normal"
            placeholder="Example: ST001"
          />

          <TextField
            select
            fullWidth
            label="Modality"
            name="modality"
            value={formData.modality}
            onChange={handleStudyChange}
            margin="normal"
          >
            <MenuItem value="">Select Modality</MenuItem>

            <MenuItem value="X-Ray">X-Ray</MenuItem>

            <MenuItem value="CT Scan">CT Scan</MenuItem>

            <MenuItem value="MRI">MRI</MenuItem>

            <MenuItem value="Ultrasound">Ultrasound</MenuItem>

            <MenuItem value="Mammography">Mammography</MenuItem>
          </TextField>

          <TextField
            fullWidth
            label="Body Part"
            name="bodyPart"
            value={formData.bodyPart}
            onChange={handleStudyChange}
            margin="normal"
            placeholder="Example: Brain"
          />

          <TextField
            fullWidth
            type="date"
            label="Study Date"
            name="studyDate"
            value={formData.studyDate}
            onChange={handleStudyChange}
            margin="normal"
            InputLabelProps={{
              shrink: true,
            }}
          />

          <TextField
            select
            fullWidth
            label="Study Status"
            name="status"
            value={formData.status}
            onChange={handleStudyChange}
            margin="normal"
          >
            <MenuItem value="Scheduled">Scheduled</MenuItem>

            <MenuItem value="In Progress">In Progress</MenuItem>

            <MenuItem value="Completed">Completed</MenuItem>

            <MenuItem value="Cancelled">Cancelled</MenuItem>
          </TextField>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseStudyForm}>Cancel</Button>

          <Button variant="contained" onClick={handleSaveStudy}>
            {editingStudy ? "Update Study" : "Save Study"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* CREATE REPORT DIALOG */}
      <Dialog open={openReportForm} onClose={handleCloseReportForm} fullWidth maxWidth="md">
        <DialogTitle>Create Report</DialogTitle>

        <DialogContent>
          {(() => {
            const selectedStudy = studies.find(
              (study) => Number(study.id) === Number(reportForm.studyId)
            );

            const selectedPatient = selectedStudy ? getPatient(selectedStudy.patientId) : null;

            return (
              <Box>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    mt: 1,
                    mb: 2,
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="subtitle2" color="text.secondary">
                    Patient
                  </Typography>

                  <Typography fontWeight="bold" mb={2}>
                    {selectedStudy?.patientName || selectedPatient?.name || "-"}
                  </Typography>

                  <Divider
                    sx={{
                      mb: 2,
                    }}
                  />

                  <Typography variant="subtitle2" color="text.secondary">
                    Study ID
                  </Typography>

                  <Typography fontWeight="bold">{selectedStudy?.studyId || "-"}</Typography>

                  <Typography variant="body2" color="text.secondary" mt={1}>
                    {selectedStudy?.modality || "-"}
                    {" • "}
                    {selectedStudy?.bodyPart || "-"}
                  </Typography>
                </Paper>

                <TextField
                  fullWidth
                  label="Radiologist Name"
                  name="radiologistName"
                  value={reportForm.radiologistName}
                  onChange={handleReportChange}
                  margin="normal"
                  required
                />

                <TextField
                  fullWidth
                  multiline
                  minRows={6}
                  label="Clinical Findings"
                  name="findings"
                  value={reportForm.findings}
                  onChange={handleReportChange}
                  margin="normal"
                  required
                  placeholder="Enter detailed clinical findings..."
                />

                <TextField
                  fullWidth
                  multiline
                  minRows={5}
                  label="Final Impression"
                  name="impression"
                  value={reportForm.impression}
                  onChange={handleReportChange}
                  margin="normal"
                  required
                  placeholder="Enter final impression..."
                />

                <Paper
                  variant="outlined"
                  sx={{
                    mt: 2,
                    p: 1.5,
                    borderRadius: 2,
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                      Report Status:
                    </Typography>

                    <Chip label="Completed" color="success" size="small" />
                  </Stack>
                </Paper>
              </Box>
            );
          })()}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseReportForm} disabled={savingReport}>
            Cancel
          </Button>

          <Button
            variant="contained"
            color="success"
            startIcon={
              savingReport ? <CircularProgress size={18} color="inherit" /> : <DescriptionIcon />
            }
            onClick={handleSaveReport}
            disabled={savingReport}
          >
            {savingReport ? "Creating..." : "Create Report"}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}

function getPatientName(patients, patientId) {
  const patient = patients.find((item) => Number(item.id) === Number(patientId));

  return patient?.name || "";
}

export default Studies;
