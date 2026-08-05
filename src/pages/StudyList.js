import Layout from "../components/Layout";

import {
  Typography,
  Paper,
  Grid,
  TextField,
  MenuItem,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
  Box,
} from "@mui/material";

function StudyList() {
  const studies = [
    {
      patient: "manikanta",
      mrn: "MRN001",
      modality: "CT",
      studyDate: "05-Aug-2026",
      doctor: "Dr. Ramesh",
      status: "Completed",
    },
    {
      patient: "Priya Sharma",
      mrn: "MRN002",
      modality: "MRI",
      studyDate: "05-Aug-2026",
      doctor: "Dr. Anil",
      status: "Pending",
    },
    {
      patient: "Ramesh",
      mrn: "MRN003",
      modality: "X-Ray",
      studyDate: "04-Aug-2026",
      doctor: "Dr. Kumar",
      status: "Completed",
    },
  ];

  return (
    <Layout>

      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" fontWeight="bold">
          Study List
        </Typography>

        <Button variant="contained">
          Add Study
        </Button>
      </Box>

      <Paper
        elevation={4}
        sx={{
          p: 3,
          borderRadius: 3,
          mb: 4,
        }}
      >

        <Grid container spacing={2}>

          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="Patient Name"
              size="small"
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="MRN"
              size="small"
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              size="small"
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              size="small"
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              select
              fullWidth
              label="Modality"
              size="small"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="CT">CT</MenuItem>
              <MenuItem value="MRI">MRI</MenuItem>
              <MenuItem value="X-Ray">X-Ray</MenuItem>
              <MenuItem value="Ultrasound">Ultrasound</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={1}>
            <Button
              fullWidth
              variant="contained"
              sx={{ height: 40 }}
            >
              Search
            </Button>
          </Grid>

          <Grid item xs={12} md={1}>
            <Button
              fullWidth
              variant="outlined"
              sx={{ height: 40 }}
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
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Patient</strong></TableCell>
                <TableCell><strong>MRN</strong></TableCell>
                <TableCell><strong>Modality</strong></TableCell>
                <TableCell><strong>Study Date</strong></TableCell>
                <TableCell><strong>Doctor</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="center">
                  <strong>Action</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {studies.map((study, index) => (
                <TableRow key={index} hover>
                  <TableCell>{study.patient}</TableCell>
                  <TableCell>{study.mrn}</TableCell>
                  <TableCell>{study.modality}</TableCell>
                  <TableCell>{study.studyDate}</TableCell>
                  <TableCell>{study.doctor}</TableCell>
                  <TableCell>
                    <Chip
                      label={study.status}
                      color={
                        study.status === "Completed"
                          ? "success"
                          : "warning"
                    }
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      variant="contained"
                      size="small"
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Layout>
  );
}

export default StudyList;