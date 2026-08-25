import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
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
  IconButton,
  InputAdornment,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
function Patients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("");
  const [open, setOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [newPatient, setNewPatient] = useState({
    id: "",
    name: "",
    age: "",
    gender: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const API_URL = "http://localhost:5000";
  const getLoggedInUser = React.useCallback(() => {
    try {
      const storedUser =
        localStorage.getItem("loggedInUser");
      if (!storedUser) {
        return null;
      }
      return JSON.parse(storedUser);
    } catch (error) {
      console.error(
        "Logged-in User Error:",
        error
      );
      return null;
    }
  }, []);
  const getUserId = React.useCallback(() => {
    const user = getLoggedInUser();
    if (!user || !user.id) {
      return null;
    }
    return user.id;
  }, [getLoggedInUser]);
  const getUserHeaders = React.useCallback(() => {
    const userId = getUserId();
    return {
      "Content-Type": "application/json",
      "x-user-id": String(userId),
    };
  }, [getUserId]);
  const fetchPatients = React.useCallback(async () => {
    try {
      setLoading(true);
      const userId = getUserId();
      if (!userId) {
        alert(
          "User session not found. Please login again."
        );
        navigate("/");
        return;
      }
      const response = await fetch(
        `${API_URL}/api/patients`,
        {
          method: "GET",
          headers: getUserHeaders(),
        }
      );
      const data =
        await response.json();
      if (!response.ok) {
        alert(
          data.message ||
            "Unable to load patients"
        );
        return;
      }
      setPatients(
        data.patients || []
      );
    } catch (error) {
      console.error(
        "Fetch Patients Error:",
        error
      );
      alert(
        "Cannot connect to backend server."
      );
    } finally {
      setLoading(false);
    }
  }, [API_URL, getUserHeaders, getUserId, navigate]);
  useEffect(() => {
    const userId = getUserId();
    if (!userId) {
      alert(
        "Your login session was not found. Please login again."
      );
      navigate("/");
      return;
    }
    fetchPatients();
  }, [fetchPatients, getUserId, navigate]);
  const handleOpen = () => {
    setEditingPatient(null);
    setNewPatient({
      id: "",
      name: "",
      age: "",
      gender: "",
      phone: "",
    });
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
    setEditingPatient(null);
    setNewPatient({
      id: "",
      name: "",
      age: "",
      gender: "",
      phone: "",
    });
  };
  const handleChange = (event) => {
    setNewPatient({
      ...newPatient,
      [event.target.name]:
        event.target.value,
    });
  };
  const handleSave = async () => {
    if (
      !newPatient.name ||
      !newPatient.age ||
      !newPatient.gender ||
      !newPatient.phone
    ) {
      alert(
        "Please fill all required fields."
      );
      return;
    }
    try {
      setLoading(true);
      const userId = getUserId();
      if (!userId) {
        alert(
          "User session not found. Please login again."
        );
        navigate("/");
        return;
      }
      if (editingPatient) {
        const response =
          await fetch(
            `${API_URL}/api/patients/${editingPatient.id}`,
            {
              method: "PUT",
              headers:
                getUserHeaders(),
              body: JSON.stringify(
                newPatient
              ),
            }
          );
        const data =
          await response.json();
        if (!response.ok) {
          alert(
            data.message ||
              "Unable to update patient"
          );
          return;
        }
        alert(
          "Patient updated successfully"
        );
      } else {
        const response =
          await fetch(
            `${API_URL}/api/patients`,
            {
              method: "POST",
              headers:
                getUserHeaders(),
              body: JSON.stringify(
                newPatient
              ),
            }
          );
        const data =
          await response.json();
        if (!response.ok) {
          alert(
            data.message ||
              "Unable to add patient"
          );
          return;
        }
        alert(
          "Patient added successfully"
        );
      }
      handleClose();
      await fetchPatients();
    } catch (error) {
      console.error(
        "Save Patient Error:",
        error
      );
      alert(
        "Cannot connect to backend server."
      );
    } finally {
      setLoading(false);
    }
  };
  const handleEdit = (patient) => {
    setEditingPatient(patient);
    setNewPatient({
      id: patient.id,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      phone: patient.phone,
    });

    setOpen(true);
  };
  const handleDelete = async (id) => {
    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this patient?"
      );
    if (!confirmDelete) {
      return;
    }
    try {
      setLoading(true);
      const userId = getUserId();
      if (!userId) {
        alert(
          "User session not found. Please login again."
        );
        navigate("/");
        return;
      }
      const response =
        await fetch(
          `${API_URL}/api/patients/${id}`,
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
            "Unable to delete patient"
        );
        return;
      }
      alert(
        "Patient deleted successfully"
      );
      await fetchPatients();
    } catch (error) {
      console.error(
        "Delete Patient Error:",
        error
      );
      alert(
        "Cannot connect to backend server."
      );
    } finally {
      setLoading(false);
    }
  };
  const handleReset = () => {
    setSearch("");
    setGender("");
  };
  const filteredPatients =
    patients.filter((patient) => {
      const patientName =
        patient.name?.toLowerCase() ||
        "";
      const patientPhone =
        String(
          patient.phone || ""
        ).toLowerCase();
      const searchText =
        search.toLowerCase();
      const matchesSearch =
        patientName.includes(
          searchText
        ) ||
        patientPhone.includes(
          searchText
        ) ||
        String(
          patient.id
        ).includes(searchText);
      const matchesGender =
        gender === "" ||
        patient.gender === gender;
      return (
        matchesSearch &&
        matchesGender
      );
    });
  return (
    <Layout>
      <Box sx={{ width: "100%" }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Box>
            <Typography
              variant="h4"
              fontWeight="bold"
            >
              Patient Management
            </Typography>
            <Typography
              color="text.secondary"
              mt={1}
            >
              Manage patient records and
              information
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={handleOpen}
          >
            Add Patient
          </Button>
        </Box>
        <Paper
          elevation={4}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 3,
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <Grid
            container
            spacing={2}
            alignItems="center"
          >
            <Grid
              item
              xs={12}
              md={6}
            >
              <TextField
                fullWidth
                size="small"
                label="Search Patient"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment
                      position="start"
                    >
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid
              item
              xs={12}
              md={3}
            >
              <TextField
                select
                fullWidth
                size="small"
                label="Gender"
                value={gender}
                onChange={(event) =>
                  setGender(
                    event.target.value
                  )
                }
                sx={{
                  minWidth: {
                    xs: "100%",
                    md: 180,
                  },
                }}
              >
                <MenuItem value="">
                  All Genders
                </MenuItem>
                <MenuItem value="Male">
                  Male
                </MenuItem>
                <MenuItem value="Female">
                  Female
                </MenuItem>
                <MenuItem value="Other">
                  Other
                </MenuItem>
              </TextField>
            </Grid>
            <Grid
              item
              xs={12}
              md={3}
            >
              <Button
                fullWidth
                variant="outlined"
                sx={{
                  height: "40px",
                }}
                onClick={handleReset}
              >
                Reset
              </Button>
            </Grid>
          </Grid>
        </Paper>
        <Paper
          elevation={4}
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            width: "100%",
          }}
        >
          <TableContainer
            sx={{
              width: "100%",
              overflowX: "auto",
            }}
          >
            <Table
              sx={{
                minWidth: 800,
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>ID</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Name</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Age</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Gender</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Phone</strong>
                  </TableCell>
                  <TableCell align="center">
                    <strong>
                      Action
                    </strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      align="center"
                      sx={{ py: 4 }}
                    >
                      Loading patients...
                    </TableCell>
                  </TableRow>
                ) : filteredPatients.length ===
                  0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      align="center"
                      sx={{ py: 4 }}
                    >
                      No patients found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPatients.map(
                    (patient) => (
                      <TableRow
                        key={patient.id}
                        hover
                      >
                        <TableCell>
                          {patient.id}
                        </TableCell>
                        <TableCell>
                          {patient.name}
                        </TableCell>
                        <TableCell>
                          {patient.age}
                        </TableCell>
                        <TableCell>
                          {patient.gender}
                        </TableCell>
                        <TableCell>
                          {patient.phone}
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            display="flex"
                            justifyContent="center"
                            alignItems="center"
                            gap={1}
                          >
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={
                                <VisibilityIcon />
                              }
                              onClick={() =>
                                navigate(
                                  "/studies",
                                  {
                                    state: {
                                      patient,
                                    },
                                  }
                                )
                              }
                            >
                              Studies
                            </Button>
                            <IconButton
                              color="warning"
                              title="Edit"
                              onClick={() =>
                                handleEdit(
                                  patient
                                )
                              }
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              color="error"
                              title="Delete"
                              onClick={() =>
                                handleDelete(
                                  patient.id
                                )
                              }
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )
                  )
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
        <Dialog
          open={open}
          onClose={handleClose}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            {editingPatient
              ? "Edit Patient"
              : "Add New Patient"}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              margin="normal"
              label="Patient Name"
              name="name"
              value={newPatient.name}
              onChange={handleChange}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Age"
              name="age"
              type="number"
              value={newPatient.age}
              onChange={handleChange}
            />
            <TextField
              fullWidth
              select
              margin="normal"
              label="Gender"
              name="gender"
              value={newPatient.gender}
              onChange={handleChange}
            >
              <MenuItem value="Male">
                Male
              </MenuItem>
              <MenuItem value="Female">
                Female
              </MenuItem>
              <MenuItem value="Other">
                Other
              </MenuItem>
            </TextField>
            <TextField
              fullWidth
              margin="normal"
              label="Phone Number"
              name="phone"
              value={newPatient.phone}
              onChange={handleChange}
            />
          </DialogContent>
          <DialogActions
            sx={{ p: 2 }}
          >
            <Button
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={loading}
            >
              {editingPatient
                ? "Update Patient"
                : "Save Patient"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
export default Patients;