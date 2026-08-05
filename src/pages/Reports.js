import Layout from "../components/Layout";
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  MenuItem,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";

function Reports() {
  const reports = [
    {
      id: "REP001",
      patient: "Manikanta",
      study: "CT Chest",
      doctor: "Dr. Ramesh",
      date: "05-Aug-2026",
      status: "Completed",
    },
    {
      id: "REP002",
      patient: "Priya Sharma",
      study: "MRI Brain",
      doctor: "Dr. Anil",
      date: "05-Aug-2026",
      status: "Pending",
    },
    {
      id: "REP003",
      patient: "Ramesh",
      study: "X-Ray Hand",
      doctor: "Dr. Kumar",
      date: "04-Aug-2026",
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
          Reports
        </Typography>
        <Button variant="contained">
          Generate Report
        </Button>
      </Box>
      <Paper
        elevation={4}
        sx={{
          p:3,
          mb:4,
          borderRadius:4,
        }}
      >
        <Grid container spacing={2}>
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              label="Search Patient"
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="Status"
              size="small"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Completed">Completed</MenuItem>
              <MenuItem value="Pending">Pending</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              sx={{height:40}}
            >
              Search
            </Button>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              sx={{height:40}}
            >
              Reset
            </Button>
          </Grid>
        </Grid>
      </Paper>
            <Paper
        elevation={4}
        sx={{
          borderRadius: 4,
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Report ID</strong>
                </TableCell>
                <TableCell>
                  <strong>Patient</strong>
                </TableCell>
                <TableCell>
                  <strong>Study</strong>
                </TableCell>
                <TableCell>
                  <strong>Doctor</strong>
                </TableCell>
                <TableCell>
                  <strong>Date</strong>
                </TableCell>
                <TableCell>
                  <strong>Status</strong>
                </TableCell>
                <TableCell align="center">
                  <strong>Actions</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map((report) => (
                <TableRow
                  key={report.id}
                  hover
                >
                  <TableCell>{report.id}</TableCell>
                  <TableCell>{report.patient}</TableCell>
                  <TableCell>{report.study}</TableCell>
                  <TableCell>{report.doctor}</TableCell>
                  <TableCell>{report.date}</TableCell>
                  <TableCell>
                    <Chip
                      label={report.status}
                      color={
                        report.status === "Completed"
                          ? "success"
                          : "warning"
                      }
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      variant="contained"
                      size="small"
                      sx={{ mr: 1 }}
                    >
                      View
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{ mr: 1 }}
                    >
                      Print
                    </Button>
                    <Button
                      color="success"
                      variant="contained"
                      size="small"
                    >
                      PDF
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
export default Reports;