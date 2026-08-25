import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";
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
  CircularProgress,
  Stack,
} from "@mui/material";

import {
  useTheme,
  alpha,
} from "@mui/material/styles";

import PeopleIcon from "@mui/icons-material/People";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import DescriptionIcon from "@mui/icons-material/Description";
import ImageIcon from "@mui/icons-material/Image";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ArticleIcon from "@mui/icons-material/Article";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

function Dashboard() {
  const navigate =
    useNavigate();
  const theme =
    useTheme();
  const API_URL =
    "http://localhost:5000";
  const [patients, setPatients] =
    useState([]);
  const [studies, setStudies] =
    useState([]);
  const [reports, setReports] =
    useState([]);
  const [loading, setLoading] =
    useState(true);
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
      return user?.id ??
        null;
    }, [
      getLoggedInUser,
    ]);
  const getUserHeaders =
    useCallback(() => {
      const userId =
        getUserId();
      return {
        "Content-Type":
          "application/json",
        "x-user-id":
          String(userId),
      };
    }, [
      getUserId,
    ]);
  const loggedInUser =
    getLoggedInUser();
  const userName =
    loggedInUser?.fullName ||
    "Admin";
  const loadDashboard =
    useCallback(async () => {
      try {
        setLoading(true);
        const userId =
          getUserId();
        if (!userId) {
          navigate("/");
          return;
        }
        const [
          patientsResponse,
          studiesResponse,
          reportsResponse,
        ] =
          await Promise.all([
            fetch(
              `${API_URL}/api/patients`,
              {
                method: "GET",
                headers:
                  getUserHeaders(),
              }
            ),
            fetch(
              `${API_URL}/api/studies`,
              {
                method: "GET",
                headers:
                  getUserHeaders(),
              }
            ),
            fetch(
              `${API_URL}/api/reports`,
              {
                method: "GET",

                headers:
                  getUserHeaders(),
              }
            ),
          ]);
        const patientsData =
          await patientsResponse.json();
        if (
          !patientsResponse.ok
        ) {
          throw new Error(
            patientsData.message ||
              "Unable to load patients"
          );
        }
        const patientList =
          patientsData.patients ||
          [];
        setPatients(
          patientList
        );
        const studiesData =
          await studiesResponse.json();
        if (
          !studiesResponse.ok
        ) {
          throw new Error(
            studiesData.message ||
              "Unable to load studies"
          );
        }
        setStudies(
          studiesData.studies ||
            []
        );
        const reportsData =
          await reportsResponse.json();
        if (
          !reportsResponse.ok
        ) {
          throw new Error(
            reportsData.message ||
              "Unable to load reports"
          );
        }
        setReports(
          reportsData.reports ||
            []
        );
      } catch (error) {
        console.error(
          "Dashboard loading error:",
          error
        );
        alert(
          "Unable to load dashboard data."
        );
      } finally {
        setLoading(false);
      }
    }, [
      API_URL,
      getUserHeaders,
      getUserId,
      navigate,
    ]);
  useEffect(() => {
    loadDashboard();
  }, [
    loadDashboard,
  ]);
  useEffect(() => {
    const handleWindowFocus =
      () => {
        loadDashboard();
      };
    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          loadDashboard();
        }
      };
    window.addEventListener(
      "focus",
      handleWindowFocus
    );
    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );
    return () => {
      window.removeEventListener(
        "focus",
        handleWindowFocus
      );
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [
    loadDashboard,
  ]);
  const totalPatients =
    patients.length;
  const totalStudies =
    studies.length;
  const totalImages =
    studies.reduce(
      (
        total,
        study
      ) => {
        return (
          total +
          Number(
            study.imageCount ||
              0
          )
        );
      },
      0
    );
  const totalReports =
    reports.length;
  const radiologistNames =
    [
      ...new Set(
        reports
          .map(
            (report) =>
              report.radiologistName
          )
          .filter(Boolean)
      ),
    ];
  const totalRadiologists =
    radiologistNames.length;
  const completedReports =
    reports.filter(
      (report) =>
        report.status ===
          "Completed" ||
        !report.status
    ).length;
  const reportCompletion =
    totalReports > 0
      ? Math.round(
          (
            completedReports /
            totalReports
          ) * 100
        )
      : 0;
  const recentStudies =
    useMemo(() => {

      return [
        ...studies,
      ]
        .sort(
          (
            a,
            b
          ) => {
            const first =
              new Date(
                a.studyDate
              ).getTime() || 0;
            const second =
              new Date(
                b.studyDate
              ).getTime() || 0;
            return (
              second -
              first
            );
          }
        )
        .slice(
          0,
          6
        );
    }, [
      studies,
    ]);
  const formatDate =
    (
      value
    ) => {
      if (!value) {
        return "-";
      }
      const date =
        new Date(value);
      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return value;
      }
      return date.toLocaleDateString(
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
  const cards = [
    {
      title:
        "Patients",
      value:
        totalPatients,
      subtitle:
        "Registered patients",
      color:
        theme.palette.primary.main,
      icon: (
        <PeopleIcon
          sx={{
            fontSize:
              42,
            color:
              theme.palette.primary.contrastText,
          }}
        />
      ),
      action: () =>
        navigate(
          "/patients"
        ),
    },
    {
      title:
        "Studies",
      value:
        totalStudies,
      subtitle:
        "Medical studies",
      color:
        theme.palette.success.main,
      icon: (
        <MedicalServicesIcon
          sx={{
            fontSize:
              42,
            color:
              theme.palette.success.contrastText ||
              "#ffffff",
          }}
        />
      ),
      action: () =>
        navigate(
          "/patients"
        ),
    },
    {
      title:
        "Images",
      value:
        totalImages,
      subtitle:
        "Uploaded medical images",
      color:
        theme.palette.info.main,
      icon: (
        <ImageIcon
          sx={{
            fontSize:
              42,
            color:
              theme.palette.info.contrastText ||
              "#ffffff",
          }}
        />
      ),
      action: () =>
        navigate(
          "/patients"
        ),
    },
    {
      title:
        "Reports",
      value:
        totalReports,
      subtitle:
        `${reportCompletion}% completed`,
      color:
        theme.palette.warning.main,
      icon: (
        <DescriptionIcon
          sx={{
            fontSize:
              42,
            color:
              theme.palette.warning.contrastText ||
              "#ffffff",
          }}
        />
      ),
      action: () =>
        navigate(
          "/reports"
      ),
    },
  ];
  return (
    <Layout>
      <Paper
        elevation={4}
        sx={{
          p: {
            xs:
              3,
            md:
              4,
          },
          mb:
            3,
          borderRadius:
            4,
          background:
            `linear-gradient(
              135deg,
              ${theme.palette.primary.dark},
              ${theme.palette.primary.main}
            )`,
          color:
            theme.palette.primary.contrastText,
          transition:
            "background 0.3s ease",
        }}
      >
        <Typography
          variant="h4"
          fontWeight="bold"
          sx={{
            fontSize:
              {
                xs:
                  "1.8rem",
                md:
                  "2.2rem",
              },
          }}
        >
          Welcome Back,{" "}
          {userName} 
        </Typography>
        <Typography
          mt={1}
          sx={{
            maxWidth:
              "850px",
          }}
        >
          Manage patients,
          medical studies,
          reports and
          diagnostic images
          from one place.
        </Typography>
      </Paper>
      {loading ? (
        <Box
          sx={{
            minHeight:
              350,
            display:
              "flex",
            justifyContent:
              "center",
            alignItems:
              "center",
          }}
        >
          <Stack
            alignItems="center"
            spacing={2}
          >
            <CircularProgress />
            <Typography
              color="text.secondary"
            >
              Loading dashboard...
            </Typography>
          </Stack>
        </Box>
      ) : (
        <>
          <Grid
            container
            spacing={2.5}
          >
            {cards.map(
              (card) => (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  lg={3}
                  key={
                    card.title
                  }
                >
                  <Paper
                    elevation={4}
                    onClick={
                      card.action
                    }
                    sx={{
                      borderRadius:
                        3,
                      overflow:
                        "hidden",
                      cursor:
                        "pointer",
                      height:
                        "100%",
                      backgroundColor:
                        "background.paper",
                      color:
                        "text.primary",
                      transition:
                        "0.25s",
                      "&:hover":
                        {
                          transform:
                            "translateY(-4px)",

                          boxShadow:
                            8,
                        },
                    }}
                  >
                    <Box
                      sx={{
                        height:
                          72,
                        backgroundColor:
                          card.color,
                        display:
                          "flex",
                        justifyContent:
                          "center",
                        alignItems:
                          "center",

                      }}
                    >
                      {
                        card.icon
                      }
                    </Box>
                    <Box
                      sx={{
                        p:
                          2.5,

                        textAlign:
                          "center",
                      }}
                    >
                      <Typography
                        color="text.secondary"
                        fontSize={15}
                      >
                        {
                          card.title
                        }
                      </Typography>
                      <Typography
                        variant="h3"
                        fontWeight="bold"
                        mt={0.5}
                      >
                        {
                          card.value
                        }
                      </Typography>
                      <Typography
                        color="primary"
                        mt={0.5}
                        fontSize={14}
                      >
                        {
                          card.subtitle
                        }
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              )
            )}
          </Grid>
          <Paper
            elevation={4}
            sx={{
              mt:
                3,
              p:
                3,
              borderRadius:
                3,
              backgroundColor:
                "background.paper",
              color:
                "text.primary",
            }}
          >
            <Box
              sx={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                gap:
                  2,
                mb:
                  3,
                flexWrap:
                  "wrap",
              }}
            >
              <Box>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                >
                  Recent Studies
                </Typography>
                <Typography
                  color="text.secondary"
                  variant="body2"
                  mt={0.5}
                >
                  Latest medical studies
                  in the system
                </Typography>
              </Box>
              <Button
                variant="outlined"
                endIcon={
                  <ArrowForwardIcon />
                }
                onClick={() =>
                  navigate(
                    "/patients"
                  )
                }
              >
                View Patients
              </Button>
            </Box>
            {recentStudies.length ===
            0 ? (
              <Box
                sx={{
                  p:
                    4,
                  textAlign:
                    "center",
                }}
              >
                <Typography
                  color="text.secondary"
                >
                  No studies available.
                </Typography>
              </Box>
            ) : (
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
                          Study ID
                        </strong>
                      </TableCell>
                      <TableCell>
                        <strong>
                          Modality
                        </strong>
                      </TableCell>
                      <TableCell
                        align="center"
                      >
                        <strong>
                          Images
                        </strong>
                      </TableCell>
                      <TableCell>
                        <strong>
                          Date
                        </strong>
                      </TableCell>
                      <TableCell>
                        <strong>
                          Status
                        </strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentStudies.map(
                      (study) => (
                        <TableRow
                          key={
                            study.id
                          }
                          hover
                        >
                          <TableCell>
                            {
                              study.patientName
                            }
                          </TableCell>
                          <TableCell>
                            <Typography
                              fontWeight="bold"
                            >
                              {
                                study.studyId
                              }
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {
                              study.modality
                            }
                          </TableCell>
                          <TableCell
                            align="center"
                          >
                            <Chip
                              icon={
                                <ImageIcon />
                              }
                              label={
                                Number(
                                  study.imageCount ||
                                    0
                                )
                              }
                              size="small"
                              color={
                                Number(
                                  study.imageCount ||
                                    0
                                ) > 0
                                  ? "primary"
                                  : "default"
                              }
                            />
                          </TableCell>
                          <TableCell>
                            {
                              formatDate(
                                study.studyDate
                              )
                            }
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={
                                study.status ||
                                "Completed"
                              }
                              size="small"
                              color={
                                study.status ===
                                "Completed"
                                  ? "success"
                                  : study.status ===
                                    "Cancelled"
                                  ? "error"
                                  : "warning"
                              }
                            />
                          </TableCell>
                        </TableRow>
                    )
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
          <Grid
            container
            spacing={2.5}
            sx={{
              mt:
                0.5,
            }}
          >
            <Grid
              item
              xs={12}
              md={6}
            >
              <Paper
                elevation={4}
                sx={{
                  p:
                    3,
                  borderRadius:
                    3,
                  height:
                    "100%",
                  backgroundColor:
                    "background.paper",
                  color:
                    "text.primary",
                }}
              >
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  mb={3}
                >
                  System Summary
                </Typography>
                <Stack
                  spacing={2}
                >
                  <SummaryRow
                    label="Total Patients"
                    value={
                      totalPatients
                    }
                  />
                  <SummaryRow
                    label="Total Studies"
                    value={
                      totalStudies
                    }
                  />
                  <SummaryRow
                    label="Total Images"
                    value={
                      totalImages
                    }
                  />
                  <SummaryRow
                    label="Reports Generated"
                    value={
                      totalReports
                    }
                  />
                  <SummaryRow
                    label="Radiologists"
                    value={
                      totalRadiologists
                    }
                  />
                  <SummaryRow
                    label="Report Completion"
                    value={
                      `${reportCompletion}%`
                    }
                  />
                  <Box
                    sx={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                    }}
                  >
                    <Typography>
                      System Status
                    </Typography>
                    <Chip
                      label="Online"
                      color="success"
                      size="small"
                    />
                  </Box>
                </Stack>
              </Paper>
            </Grid>
            <Grid
              item
              xs={12}
              md={6}
            >
              <Paper
                elevation={4}
                sx={{
                  p:
                    3,
                  borderRadius:
                    3,
                  height:
                    "100%",
                  backgroundColor:
                    "background.paper",
                  color:
                    "text.primary",
                }}
              >
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  mb={3}
                >
                  Quick Actions
                </Typography>
                <Box
                  sx={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(2, minmax(0, 1fr))",
                    gap:
                      2,
                  }}
                >
                  <Button
                    variant="contained"
                    startIcon={
                      <PersonAddIcon />
                    }
                    onClick={() =>
                      navigate(
                        "/patients"
                      )
                    }
                    sx={{
                      py:
                        1.4,
                    }}
                  >
                    Patients
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={
                      <MedicalServicesIcon />
                    }
                    onClick={() =>
                      navigate(
                        "/patients"
                      )
                    }
                    sx={{
                      py:
                        1.4,
                    }}
                  >
                    Studies
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={
                      <UploadFileIcon />
                    }
                    onClick={() =>
                      navigate(
                        "/patients"
                      )
                    }
                    sx={{
                      py:
                        1.4,
                    }}
                  >
                    Images
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={
                      <ArticleIcon />
                    }
                    onClick={() =>
                      navigate(
                        "/reports"
                      )
                    }
                    sx={{
                      py:
                        1.4,
                    }}
                  >
                    Reports
                  </Button>
                </Box>
                <Box
                  mt={4}
                  sx={{
                    p:
                      2,
                    borderRadius:
                      2,
                    backgroundColor:
                      alpha(
                        theme.palette.primary.main,
                        0.08
                      ),
                    border:
                      "1px solid",
                    borderColor:
                      alpha(
                        theme.palette.primary.main,
                        0.2
                      ),
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Current signed-in
                    user
                  </Typography>
                  <Typography
                    fontWeight="bold"
                    mt={0.5}
                  >
                    {
                      userName
                    }
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
          <Paper
            elevation={4}
            sx={{
              mt:
                3,
              p:
                3,
              borderRadius:
                3,
              backgroundColor:
                "background.paper",
              color:
                "text.primary",
            }}
          >
            <Typography
              variant="h6"
              fontWeight="bold"
              mb={3}
            >
              Current System Status
            </Typography>
            <Grid
              container
              spacing={2}
            >
              <Grid
                item
                xs={12}
                md={4}
              >
                <Box
                  sx={{
                    p:
                      2.5,
                    borderRadius:
                      2,
                    backgroundColor:
                      alpha(
                        theme.palette.success.main,
                        0.12
                      ),
                    border:
                      "1px solid",
                    borderColor:
                      alpha(
                        theme.palette.success.main,
                        0.25
                      ),
                  }}
                >
                  <Typography
                    color="success.main"
                    fontWeight="bold"
                  >
                    Patients Database
                  </Typography>
                  <Typography
                    variant="body2"
                    mt={0.5}
                    color="text.secondary"
                  >
                    Connected and
                    available
                  </Typography>
                </Box>
              </Grid>
              <Grid
                item
                xs={12}
                md={4}
              >
                <Box
                  sx={{
                    p:
                      2.5,

                    borderRadius:
                      2,
                    backgroundColor:
                      alpha(
                        theme.palette.primary.main,
                        0.12
                      ),
                    border:
                      "1px solid",
                    borderColor:
                      alpha(
                        theme.palette.primary.main,
                        0.25
                      ),
                  }}
                >
                  <Typography
                    color="primary.main"
                    fontWeight="bold"
                  >
                    Medical Imaging
                  </Typography>
                  <Typography
                    variant="body2"
                    mt={0.5}
                    color="text.secondary"
                  >
                    {
                      totalImages
                    }{" "}
                    images stored
                  </Typography>
                </Box>
              </Grid>
              <Grid
                item
                xs={12}
                md={4}
              >
                <Box
                  sx={{
                    p:
                      2.5,
                    borderRadius:
                      2,
                    backgroundColor:
                      alpha(
                        theme.palette.warning.main,
                        0.12
                      ),
                    border:
                      "1px solid",
                    borderColor:
                      alpha(
                        theme.palette.warning.main,
                        0.25
                      ),
                  }}
                >
                  <Typography
                    color="warning.main"
                    fontWeight="bold"
                  >
                    Reporting
                  </Typography>
                  <Typography
                    variant="body2"
                    mt={0.5}
                    color="text.secondary"
                  >
                    {
                      reportCompletion
                    }%
                    reports completed
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </>
      )}
    </Layout>
  );
}
function SummaryRow({
  label,
  value,
}) {
  return (
    <Box
      sx={{
        display:
          "flex",
        justifyContent:
          "space-between",
        alignItems:
          "center",
      }}
    >
      <Typography>
        {label}
      </Typography>
      <Typography
        fontWeight="bold"
      >
        {value}
      </Typography>
    </Box>
  );
}
export default Dashboard;