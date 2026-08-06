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
  LinearProgress,
} from "@mui/material";

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import PeopleIcon from "@mui/icons-material/People";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import DescriptionIcon from "@mui/icons-material/Description";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";

function Dashboard() {

  // ===========================
  // Dashboard Cards
  // ===========================

  const cards = [
    {
      title: "Patients",
      value: "1,254",
      subtitle: "+18 This Week",
      color: "#1976D2",
      icon: (
        <PeopleIcon
          sx={{
            fontSize: 45,
            color: "white",
          }}
        />
      ),
    },

    {
      title: "Studies",
      value: "348",
      subtitle: "24 Today",
      color: "#2E7D32",
      icon: (
        <MedicalServicesIcon
          sx={{
            fontSize: 45,
            color: "white",
          }}
        />
      ),
    },

    {
      title: "Reports",
      value: "289",
      subtitle: "94% Completed",
      color: "#ED6C02",
      icon: (
        <DescriptionIcon
          sx={{
            fontSize: 45,
            color: "white",
          }}
        />
      ),
    },

    {
      title: "Radiologists",
      value: "12",
      subtitle: "8 On Duty",
      color: "#9C27B0",
      icon: (
        <LocalHospitalIcon
          sx={{
            fontSize: 45,
            color: "white",
          }}
        />
      ),
    },
  ];
  // ===========================
  // Patient Analytics
  // ===========================
  const chartData = [
    { month: "Jan", patients: 45 },
    { month: "Feb", patients: 60 },
    { month: "Mar", patients: 80 },
    { month: "Apr", patients: 72 },
    { month: "May", patients: 95 },
    { month: "Jun", patients: 110 },
  ];
  // ===========================
  // Study Distribution
  // ===========================

  const pieData = [
    {
      name: "CT",
      value: 45,
    },
    {
      name: "MRI",
      value: 30,
    },
    {
      name: "X-Ray",
      value: 15,
    },
    {
      name: "Ultrasound",
      value: 10,
    },
  ];
  const COLORS = [
    "#1976D2",
    "#2E7D32",
    "#ED6C02",
    "#9C27B0",
  ];
  // ===========================
  // Recent Studies
  // ===========================
  const recentStudies = [
    {
      patient: "Manikanta",
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
      {/* ===========================
          Welcome Banner
      =========================== */}
      <Paper
        elevation={4}
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 4,
          background:
            "linear-gradient(135deg,#1565C0,#42A5F5)",
          color: "white",
        }}
      >
        <Typography
          variant="h4"
          fontWeight="bold"
        >
          Welcome Back, Admin 👋
        </Typography>
        <Typography mt={1}>
          Manage patients, studies, reports and
          medical images from one place.
        </Typography>
      </Paper>
      {/* ===========================
          Dashboard Cards
      =========================== */}
      <Grid
        container
        spacing={3}
      >
        {cards.map((card, index) => (
          <Grid
            item
            xs={12}
            sm={6}
            md={3}
            key={index}
          >
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
                <Typography
                  color="text.secondary"
                >
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
            {/* ===========================
          Recent Studies
      =========================== */}
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
                <TableCell>
                  <strong>Patient</strong>
                </TableCell>
                <TableCell>
                  <strong>MRN</strong>
                </TableCell>
                <TableCell>
                  <strong>Study</strong>
                </TableCell>
                <TableCell>
                  <strong>Date</strong>
                </TableCell>
                <TableCell>
                  <strong>Status</strong>
                </TableCell>
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
      {/* ===========================
          Quick Actions
      =========================== */}
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
      {/* ===========================
          Quick Statistics
      =========================== */}
      <Paper
        elevation={5}
        sx={{
          mt: 4,
          p: 3,
          borderRadius: 4,
        }}
      >
        <Typography
          variant="h5"
          fontWeight="bold"
          mb={3}
        >
          Quick Statistics
        </Typography>
        <Typography gutterBottom>
          Patient Records
        </Typography>
        <LinearProgress
          variant="determinate"
          value={80}
          sx={{
            height: 10,
            borderRadius: 5,
            mb: 2,
          }}
        />
        <Typography gutterBottom>
          Completed Reports
        </Typography>
        <LinearProgress
          color="success"
          variant="determinate"
          value={65}
          sx={{
            height: 10,
            borderRadius: 5,
            mb: 2,
          }}
        />
        <Typography gutterBottom>
          Daily Studies
        </Typography>
        <LinearProgress
          color="warning"
          variant="determinate"
          value={45}
          sx={{
            height: 10,
            borderRadius: 5,
            mb: 2,
          }}
        />
        <Typography gutterBottom>
          System Performance
        </Typography>
        <LinearProgress
          color="secondary"
          variant="determinate"
          value={95}
          sx={{
            height: 10,
            borderRadius: 5,
          }}
        />
      </Paper>
            {/* ===========================
          Analytics Section
      =========================== */}

      <Grid container spacing={3} sx={{ mt: 2 }}>

        {/* Patient Analytics */}

        <Grid item xs={12} md={7}>

          <Paper
            elevation={5}
            sx={{
              p: 3,
              borderRadius: 4,
              height: "100%",
            }}
          >

            <Typography
              variant="h5"
              fontWeight="bold"
              mb={3}
            >
              Patient Analytics
            </Typography>

            <ResponsiveContainer
              width="100%"
              height={320}
            >

              <BarChart data={chartData}>

                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="month" />

                <YAxis />

                <Tooltip />

                <Bar
                  dataKey="patients"
                  fill="#1976D2"
                  radius={[8, 8, 0, 0]}
                />

              </BarChart>

            </ResponsiveContainer>

          </Paper>

        </Grid>

        {/* Study Distribution */}

        <Grid item xs={12} md={5}>

          <Paper
            elevation={5}
            sx={{
              p: 3,
              borderRadius: 4,
            }}
          >

            <Typography
              variant="h5"
              fontWeight="bold"
              mb={3}
            >
              Study Distribution
            </Typography>

            <ResponsiveContainer
              width="100%"
              height={300}
            >

              <PieChart>

                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label
                >

                  {pieData.map((entry, index) => (

                    <Cell
                      key={index}
                      fill={COLORS[index]}
                    />

                  ))}

                </Pie>

                <Tooltip />

              </PieChart>

            </ResponsiveContainer>

          </Paper>

        </Grid>

      </Grid>

      {/* ===========================
          System Summary
      =========================== */}

      <Paper
        elevation={5}
        sx={{
          mt: 4,
          p: 3,
          borderRadius: 4,
        }}
      >

        <Typography
          variant="h5"
          fontWeight="bold"
          mb={3}
        >
          System Summary
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography>
              👥 Total Patients:
              <strong> 1,254</strong>
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography>
              🩻 Studies Today:
              <strong> 34</strong>
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography>
              📄 Reports Generated:
              <strong> 289</strong>
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography>
              👨‍⚕️ Radiologists:
              <strong> 12</strong>
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography>
              🖥️ System Status:
              <strong style={{ color: "green" }}>
                {" "}Online
              </strong>
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Layout>
  );
}
export default Dashboard;