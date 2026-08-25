import {
  useCallback,
  useEffect,
  useMemo,
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
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ImageIcon from "@mui/icons-material/Image";

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
      "Unable to read logged-in user:",
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

function Studies() {
  const location =
    useLocation();
  const navigate =
    useNavigate();
  const patientFromPatientsPage =
    location.state?.patient ||
    null;
  const API_URL =
    "http://localhost:5000";
  const [studies, setStudies] =
    useState([]);
  const [patients, setPatients] =
    useState([]);
  const [loading, setLoading] =
    useState(true);
  const [open, setOpen] =
    useState(false);
  const [editingStudy, setEditingStudy] =
    useState(null);
  const [search, setSearch] =
    useState("");
  const [modalityFilter, setModalityFilter] =
    useState("");
  const [statusFilter, setStatusFilter] =
    useState("");
  const [formData, setFormData] =
    useState({
      patientId: "",
      studyId: "",
      modality: "",
      bodyPart: "",
      studyDate: "",
      status: "Completed",
    });
  const loadPatients =
    useCallback(async () => {
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
            `${API_URL}/api/patients`,
            {
              method: "GET",
              headers:
                getUserHeaders(),
            }
          );
        const data =
          await response.json();
        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to load patients"
          );
        }
        setPatients(
          data.patients || []
        );
      } catch (error) {
        console.error(
          "Load Patients Error:",
          error
        );
        alert(
          "Unable to load patients."
        );
      }
    }, [navigate]);
  const loadStudies =
    useCallback(async () => {
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
        setLoading(true);
        const response =
          await fetch(
            `${API_URL}/api/studies`,
            {
              method: "GET",
              headers:
                getUserHeaders(),
            }
          );
        const data =
          await response.json();
        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to load studies"
          );
        }
        setStudies(
          data.studies || []
        );
      } catch (error) {
        console.error(
          "Load Studies Error:",
          error
        );
        alert(
          "Unable to load studies."
        );
      } finally {
        setLoading(false);
      }
    }, [navigate]);
  useEffect(() => {
    loadPatients();
    loadStudies();
  }, [
    loadPatients,
    loadStudies,
  ]);
  const filteredStudies =
    useMemo(() => {
      const searchText =
        search
          .trim()
          .toLowerCase();
      return studies.filter(
        (study) => {
          const patientName =
            String(
              study.patientName ||
                getPatientName(
                  patients,
                  study.patientId
                ) ||
                ""
            ).toLowerCase();
          const studyId =
            String(
              study.studyId ||
                ""
            ).toLowerCase();
          const modality =
            String(
              study.modality ||
                ""
            ).toLowerCase();
          const bodyPart =
            String(
              study.bodyPart ||
                ""
            ).toLowerCase();
          const matchesSearch =
            !searchText ||
            patientName.includes(
              searchText
            ) ||
            studyId.includes(
              searchText
            ) ||
            modality.includes(
              searchText
            ) ||
            bodyPart.includes(
              searchText
            );
          const matchesModality =
            !modalityFilter ||
            study.modality ===
              modalityFilter;
          const matchesStatus =
            !statusFilter ||
            study.status ===
              statusFilter;
          const matchesPatient =
            !patientFromPatientsPage ||
            Number(
              study.patientId
            ) ===
              Number(
                patientFromPatientsPage.id
              );
          return (
            matchesSearch &&
            matchesModality &&
            matchesStatus &&
            matchesPatient
          );
        }
      );
    }, [
      studies,
      patients,
      search,
      modalityFilter,
      statusFilter,
      patientFromPatientsPage,
    ]);
  const handleOpen = () => {
    setEditingStudy(
      null
    );
    setFormData({
      patientId:
        patientFromPatientsPage?.id
          ? String(
              patientFromPatientsPage.id
            )
          : "",
      studyId: "",
      modality: "",
      bodyPart: "",
      studyDate:
        new Date()
          .toISOString()
          .split("T")[0],
      status:
        "Completed",
    });
    setOpen(true);
  };
  const handleEdit = (
    study
  ) => {
    setEditingStudy(
      study
    );
    setFormData({
      patientId:
        study.patientId
          ? String(
              study.patientId
            )
          : "",
      studyId:
        study.studyId ||
        "",
      modality:
        study.modality ||
        "",
      bodyPart:
        study.bodyPart ||
        "",
      studyDate:
        study.studyDate
          ? study.studyDate.substring(
              0,
              10
            )
          : "",
      status:
        study.status ||
        "Completed",
    });
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
    setEditingStudy(
      null
    );
    setFormData({
      patientId: "",
      studyId: "",
      modality: "",
      bodyPart: "",
      studyDate: "",
      status:
        "Completed",
    });
  };
  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;
    setFormData(
      (previous) => ({
        ...previous,
        [name]:
          value,
      })
    );
  };
  const handleSave =
    async () => {
      if (
        !formData.patientId ||
        !formData.studyId ||
        !formData.modality ||
        !formData.bodyPart ||
        !formData.studyDate ||
        !formData.status
      ) {
        alert(
          "Please fill all study fields."
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
        let response;
        if (
          editingStudy
        ) {
          response =
            await fetch(
              `${API_URL}/api/studies/${editingStudy.id}`,
              {
                method: "PUT",
                headers:
                  getUserHeaders(),
                body:
                  JSON.stringify(
                    formData
                  ),
              }
            );
        } else {
          response =
            await fetch(
              `${API_URL}/api/studies`,
              {
                method: "POST",
                headers:
                  getUserHeaders(),
                body:
                  JSON.stringify(
                    formData
                  ),
              }
            );
        }
        const data =
          await response.json();
        if (!response.ok) {
          alert(
            data.message ||
              "Unable to save study"
          );
          return;
        }
        alert(
          editingStudy
            ? "Study updated successfully"
            : "Study added successfully"
        );
        handleClose();
        await loadStudies();
      } catch (error) {
        console.error(
          "Save Study Error:",
          error
        );
        alert(
          "Cannot connect to backend server."
        );
      }
    };
  const handleDelete =
    async (
      studyId
    ) => {
      const confirmed =
        window.confirm(
          "Are you sure you want to delete this study?"
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
        const response =
          await fetch(
            `${API_URL}/api/studies/${studyId}`,
            {
              method: "DELETE",
              headers:
                getUserHeaders(),
            }
          );
        const data =
          await response.json();
        if (!response.ok) {
          alert(
            data.message ||
              "Unable to delete study"
          );
          return;
        }
        alert(
          "Study deleted successfully"
        );
        await loadStudies();
      } catch (error) {
        console.error(
          "Delete Study Error:",
          error
        );
        alert(
          "Cannot connect to backend server."
        );
      }
    };
  const getPatient =
    (patientId) => {
      return patients.find(
        (patient) =>
          Number(
            patient.id
          ) ===
          Number(
            patientId
          )
      );
    };
  const handleView =
    (study) => {
      const patient =
        getPatient(
          study.patientId
        );
      if (!patient) {
        alert(
          "Patient information could not be found."
        );
        return;
      }
      navigate(
        "/viewer",
        {
          state: {
            patient,
            study,
          },
        }
      );
    };
  const handleClearFilters =
    () => {
      setSearch("");
      setModalityFilter("");
      setStatusFilter("");
    };
  const handleBack =
    () => {
      if (
        patientFromPatientsPage
      ) {
        navigate(
          "/patients"
        );
      } else {
        navigate(
          "/dashboard"
        );
      }
    };
  const pageTitle =
    patientFromPatientsPage
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
          <Typography
            variant="h4"
            fontWeight="bold"
          >
            {pageTitle}
          </Typography>
          <Typography
            color="text.secondary"
            mt={1}
          >
            {patientFromPatientsPage
              ? "Manage medical studies for this patient"
              : "View and manage all medical studies"}
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={2}
        >
          <Button
            variant="outlined"
            startIcon={
              <ArrowBackIcon />
            }
            onClick={
              handleBack
            }
          >
            Back
          </Button>
          <Button
            variant="contained"
            startIcon={
              <AddIcon />
            }
            onClick={
              handleOpen
            }
          >
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
            display:
              "grid",
            gridTemplateColumns:
              {
                xs: "1fr",
                md:
                  "2fr 1fr 1fr auto",
              },
            gap: 2,
            alignItems:
              "center",
          }}
        >
          <TextField
            fullWidth
            size="small"
            label="Search Study"
            placeholder="Patient, Study ID, modality..."
            value={search}
            onChange={(
              event
            ) =>
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
            value={
              modalityFilter
            }
            onChange={(
              event
            ) =>
              setModalityFilter(
                event.target.value
              )
            }
          >
            <MenuItem value="">
              All Modalities
            </MenuItem>
            <MenuItem value="X-Ray">
              X-Ray
            </MenuItem>
            <MenuItem value="CT Scan">
              CT Scan
            </MenuItem>
            <MenuItem value="MRI">
              MRI
            </MenuItem>
            <MenuItem value="Ultrasound">
              Ultrasound
            </MenuItem>
            <MenuItem value="Mammography">
              Mammography
            </MenuItem>
          </TextField>
          <TextField
            select
            fullWidth
            size="small"
            label="Status"
            value={
              statusFilter
            }
            onChange={(
              event
            ) =>
              setStatusFilter(
                event.target.value
              )
            }
          >
            <MenuItem value="">
              All Status
            </MenuItem>
            <MenuItem value="Scheduled">
              Scheduled
            </MenuItem>
            <MenuItem value="In Progress">
              In Progress
            </MenuItem>
            <MenuItem value="Completed">
              Completed
            </MenuItem>
            <MenuItem value="Cancelled">
              Cancelled
            </MenuItem>
          </TextField>
          <Button
            variant="outlined"
            onClick={
              handleClearFilters
            }
          >
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
            overflowX:
              "auto",
          }}
        >
          <Table
            sx={{
              minWidth:
                1000,
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>
                    Patient
                  </strong>
                </TableCell>
                <TableCell>
                  <strong>
                    Study ID
                  </strong>
                </TableCell>
                <TableCell>
                  <strong>
                    Modality
                  </strong>
                </TableCell>
                <TableCell>
                  <strong>
                    Body Part
                  </strong>
                </TableCell>
                <TableCell>
                  <strong>
                    Study Date
                  </strong>
                </TableCell>
                <TableCell align="center">
                  <strong>
                    Images
                  </strong>
                </TableCell>
                <TableCell>
                  <strong>
                    Status
                  </strong>
                </TableCell>
                <TableCell align="center">
                  <strong>
                    Actions
                  </strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
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
                    colSpan={8}
                    align="center"
                    sx={{
                      py: 6,
                    }}
                  >
                    <Typography
                      color="text.secondary"
                    >
                      No studies found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudies.map(
                  (study) => {
                    const patient =
                      getPatient(
                        study.patientId
                      );
                    return (
                      <TableRow
                        key={
                          study.id
                        }
                        hover
                      >
                        <TableCell>
                          <Typography
                            fontWeight="bold"
                          >
                            {
                              study.patientName ||
                              patient?.name ||
                              "-"
                            }
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            ID:{" "}
                            {
                              study.patientId
                            }
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            fontWeight="bold"
                          >
                            {
                              study.studyId ||
                              "-"
                            }
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {
                            study.modality ||
                            "-"
                          }
                        </TableCell>
                        <TableCell>
                          {
                            study.bodyPart ||
                            "-"
                          }
                        </TableCell>
                        <TableCell>
                          {study.studyDate
                            ? new Date(
                                study.studyDate
                              ).toLocaleDateString(
                                "en-IN"
                              )
                            : "-"}
                        </TableCell>
                        <TableCell
                          align="center"
                        >
                          <Stack
                            direction="row"
                            justifyContent="center"
                            alignItems="center"
                            spacing={0.5}
                          >
                            <ImageIcon
                              fontSize="small"
                              color={
                                Number(
                                  study.imageCount ||
                                    0
                                ) > 0
                                  ? "primary"
                                  : "disabled"
                              }
                            />
                            <Typography
                              fontWeight="bold"
                            >
                              {Number(
                                study.imageCount ||
                                  0
                              )}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          {
                            study.status ||
                            "Completed"
                          }
                        </TableCell>
                        <TableCell
                          align="center"
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            justifyContent="center"
                          >
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={
                                <VisibilityIcon />
                              }
                              onClick={() =>
                                handleView(
                                  study
                                )
                              }
                            >
                              View
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={
                                <EditIcon />
                              }
                              onClick={() =>
                                handleEdit(
                                  study
                                )
                              }
                            >
                              Edit
                            </Button>
                            <Button
                              variant="contained"
                              color="error"
                              size="small"
                              startIcon={
                                <DeleteIcon />
                              }
                              onClick={() =>
                                handleDelete(
                                  study.id
                                )
                              }
                            >
                              Delete
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  }
                )
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <Dialog
        open={open}
        onClose={
          handleClose
        }
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingStudy
            ? "Edit Study"
            : "Add New Study"}
        </DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Patient"
            name="patientId"
            value={
              formData.patientId
            }
            onChange={
              handleChange
            }
            margin="normal"
            disabled={
              Boolean(
                patientFromPatientsPage
              )
            }
          >
            <MenuItem value="">
              Select Patient
            </MenuItem>
            {patients.map(
              (patient) => (
                <MenuItem
                  key={
                    patient.id
                  }
                  value={
                    patient.id
                  }
                >
                  {
                    patient.name
                  }{" "}
                  (ID:{" "}
                  {
                    patient.id
                  })
                </MenuItem>
              )
            )}
          </TextField>
          <TextField
            fullWidth
            label="Study ID"
            name="studyId"
            value={
              formData.studyId
            }
            onChange={
              handleChange
            }
            margin="normal"
            placeholder="Example: ST001"
          />
          <TextField
            select
            fullWidth
            label="Modality"
            name="modality"
            value={
              formData.modality
            }
            onChange={
              handleChange
            }
            margin="normal"
          >
            <MenuItem value="X-Ray">
              X-Ray
            </MenuItem>
            <MenuItem value="CT Scan">
              CT Scan
            </MenuItem>
            <MenuItem value="MRI">
              MRI
            </MenuItem>
            <MenuItem value="Ultrasound">
              Ultrasound
            </MenuItem>
            <MenuItem value="Mammography">
              Mammography
            </MenuItem>
          </TextField>
          <TextField
            fullWidth
            label="Body Part"
            name="bodyPart"
            value={
              formData.bodyPart
            }
            onChange={
              handleChange
            }
            margin="normal"
            placeholder="Example: Chest"
          />
          <TextField
            fullWidth
            type="date"
            label="Study Date"
            name="studyDate"
            value={
              formData.studyDate
            }
            onChange={
              handleChange
            }
            margin="normal"
            InputLabelProps={{
              shrink: true,
            }}
          />
          <TextField
            select
            fullWidth
            label="Status"
            name="status"
            value={
              formData.status
            }
            onChange={
              handleChange
            }
            margin="normal"
          >
            <MenuItem value="Scheduled">
              Scheduled
            </MenuItem>
            <MenuItem value="In Progress">
              In Progress
            </MenuItem>
            <MenuItem value="Completed">
              Completed
            </MenuItem>
            <MenuItem value="Cancelled">
              Cancelled
            </MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={
              handleClose
            }
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={
              handleSave
            }
          >
            {editingStudy
              ? "Update Study"
              : "Save Study"}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
function getPatientName(
  patients,
  patientId
) {
  const patient =
    patients.find(
      (item) =>
        Number(
          item.id
        ) ===
        Number(
          patientId
        )
    );
  return patient?.name || "";
}
export default Studies;