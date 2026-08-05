import React, { useState } from "react";
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
} from "@mui/material";
function Patients() {
  const [patients, setPatients] = useState([
    {
      id: 101,
      name: "manikanta",
      age: 28,
      gender: "Male",
      phone: "9876543210",
    },
    {
      id: 102,
      name: "Priya Sharma",
      age: 32,
      gender: "Female",
      phone: "9876543211",
    },
    {
      id: 103,
      name: "Ramesh",
      age: 45,
      gender: "Male",
      phone: "9876543212",
    },
  ]);
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("");
  const [open, setOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    id: "",
    name: "",
    age: "",
    gender: "",
    phone: "",
  });
  const handleOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);

    setNewPatient({
      id: "",
      name: "",
      age: "",
      gender: "",
      phone: "",
    });
  };
  const handleSave = () => {
    if (
      !newPatient.id ||
      !newPatient.name ||
      !newPatient.age
    ) {
      alert("Please fill all required fields.");
      return;
    }
    setPatients([...patients, newPatient]);
    handleClose();
  };
  const handleDelete = (id) => {
    setPatients(
      patients.filter((patient) => patient.id !== id)
    );
  };
  const filteredPatients = patients.filter((patient) => {
    return (
      patient.name
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (gender === "" || patient.gender === gender)
    );
  });

  return (
    <Layout>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography
          variant="h4"
          fontWeight="bold"
        >
          Patient Management
        </Typography>
        <Button
          variant="contained"
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
        }}
      >
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              label="Search Patient"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Gender"
              value={gender}
              onChange={(e) =>
                setGender(e.target.value)
              }
            >
              <MenuItem value="">
                All
              </MenuItem>
              <MenuItem value="Male">
                Male
              </MenuItem>
              <MenuItem value="Female">
                Female
              </MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                setSearch("");
                setGender("");
              }}
            >
              Reset
            </Button>
          </Grid>
        </Grid>
      </Paper>
      <Paper elevation={4}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>ID</strong></TableCell>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong>Age</strong></TableCell>
                <TableCell><strong>Gender</strong></TableCell>
                <TableCell><strong>Phone</strong></TableCell>
                <TableCell align="center">
                  <strong>Action</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPatients.map((patient) => (
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
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{ mr: 1 }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      size="small"
                      onClick={() =>
                        handleDelete(patient.id)
                      }
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
                          </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      {/* Add Patient Dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Add New Patient
        </DialogTitle>
        <DialogContent>
          <Grid
            container
            spacing={2}
            sx={{ mt: 1 }}
          >
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Patient ID"
                value={newPatient.id}
                onChange={(e) =>
                  setNewPatient({
                    ...newPatient,
                    id: e.target.value,
                  })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Patient Name"
                value={newPatient.name}
                onChange={(e) =>
                  setNewPatient({
                    ...newPatient,
                    name: e.target.value,
                  })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Age"
                value={newPatient.age}
                onChange={(e) =>
                  setNewPatient({
                    ...newPatient,
                    age: e.target.value,
                  })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Gender"
                value={newPatient.gender}
                onChange={(e) =>
                  setNewPatient({
                    ...newPatient,
                    gender: e.target.value,
                  })
                }
              >
                <MenuItem value="Male">
                  Male
                </MenuItem>
                <MenuItem value="Female">
                  Female
                </MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone Number"
                value={newPatient.phone}
                onChange={(e) =>
                  setNewPatient({
                    ...newPatient,
                    phone: e.target.value,
                  })
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
          >
            Save Patient
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
export default Patients;