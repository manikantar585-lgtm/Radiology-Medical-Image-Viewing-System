import Layout from "../components/Layout";

import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from "@mui/material";

import PeopleIcon from "@mui/icons-material/People";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import DescriptionIcon from "@mui/icons-material/Description";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";

function Dashboard() {
  const cards = [
    {
      title: "Patients",
      value: "1,254",
      subtitle: "+18 This Week",
      color: "#1976D2",
      icon: <PeopleIcon sx={{ fontSize: 45, color: "white" }} />,
    },
    {
      title: "Studies",
      value: "348",
      subtitle: "24 Today",
      color: "#2E7D32",
      icon: <MedicalServicesIcon sx={{ fontSize: 45, color: "white" }} />,
    },
    {
      title: "Reports",
      value: "289",
      subtitle: "94% Completed",
      color: "#ED6C02",
      icon: <DescriptionIcon sx={{ fontSize: 45, color: "white" }} />,
    },
    {
      title: "Radiologists",
      value: "12",
      subtitle: "8 On Duty",
      color: "#9C27B0",
      icon: <LocalHospitalIcon sx={{ fontSize: 45, color: "white" }} />,
    },
  ];

  const recentStudies = [
    {
      patient: " manikanta",
      mrn: "MRN001",
      modality: "CT",
      date: "05-Aug-2026",
      status: "Completed",
    },
    {
      patient: "Priya Sharma",
      mrn: "MRN002",
      modality: "MRI",
      date: "05-Aug-2026",
      status: "Pending",
    },
    {
      patient: "Ramesh",
      mrn: "MRN003",
      modality: "X-Ray",
      date: "04-Aug-2026",
      status: "Completed",
    },
  ];

  return (
    <Layout>

      {/* Welcome Banner */}

      <Paper
        elevation={4}
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 4,
          background: "linear-gradient(135deg,#1565C0,#42A5F5)",
          color: "white",
        }}
      >
        <Typography variant="h4" fontWeight="bold">
          Welcome Back, Admin 👋
        </Typography>

        <Typography mt={1}>
          Manage patients, medical studies, reports and diagnostic images from one place.
        </Typography>
      </Paper>

      {/* Statistics */}

      <Grid container spacing={3}>

        {cards.map((card, index) => (

          <Grid item xs={12} sm={6} md={3} key={index}>

            <Paper
              elevation={5}
              sx={{
                borderRadius: 4,
                overflow: "hidden",
                transition: "0.3s",
                "&:hover": {
                  transform: "translateY(-6px)",
                },
              }}
            >

              <Box
                sx={{
                  height: 90,
                  backgroundColor: card.color,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {card.icon}
              </Box>

              <Box
                sx={{
                  p: 3,
                  textAlign: "center",
                }}
              >

                <Typography color="text.secondary">
                  {card.title}
                </Typography>

                <Typography
                  variant="h3"
                  fontWeight="bold"
                  mt={1}
                >
                  {card.value}
                </Typography>

                <Typography
                  color="primary"
                  mt={1}
                >
                  {card.subtitle}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}

      </Grid>
      {/* Recent Studies */}
      <Paper
        elevation={5}
        sx={{
          mt: 5,
          p: 3,
          borderRadius: 4,
        }}
      >
        <Typography
          variant="h5"
          fontWeight="bold"
          mb={3}
        >
          Recent Studies
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Patient</strong></TableCell>
                <TableCell><strong>MRN</strong></TableCell>
                <TableCell><strong>Modality</strong></TableCell>
                <TableCell><strong>Date</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="center">
                  <strong>Action</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentStudies.map((study, index) => (
                <TableRow
                  key={index}
                  hover
                >
                  <TableCell>{study.patient}</TableCell>
                  <TableCell>{study.mrn}</TableCell>
                  <TableCell>{study.modality}</TableCell>
                  <TableCell>{study.date}</TableCell>
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
      {/* Quick Actions */}
      <Paper
        elevation={5}
        sx={{
          mt: 5,
          p: 3,
          borderRadius: 4,
        }}
      >
        <Typography
          variant="h5"
          fontWeight="bold"
          mb={3}
        >
          Quick Actions
        </Typography>
        <Button
          variant="contained"
          sx={{ mr: 2, mb: 2 }}
        >
          Add Patient
        </Button>
        <Button
          variant="contained"
          sx={{ mr: 2, mb: 2 }}
        >
          Upload Study
        </Button>
        <Button
          variant="contained"
          sx={{ mr: 2, mb: 2 }}
        >
          Generate Report
        </Button>
        <Button
          variant="outlined"
          sx={{ mb: 2 }}
        >
          View Patients
        </Button>

      </Paper>

    </Layout>
  );
}

export default Dashboard;