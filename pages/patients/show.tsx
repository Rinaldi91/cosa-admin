import axios from "axios";
import { useEffect, useState } from "react";
import {
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Box,
} from "@mui/material";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
} from "chart.js";
import { useRouter } from "next/router";
import {
  differenceInDays,
  differenceInMonths,
  differenceInYears,
} from "date-fns";
import Cookies from "js-cookie";
import BarcodeComponent from "@/components/BarcodeComponent";
import DateTimeDisplay from "@/components/DateTimeDisplay";
import Head from "next/head";
import { FaUser } from "react-icons/fa";
import { BookOnline, List } from "@mui/icons-material";

// Register Chart.js components
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement
);

interface Patient {
  patient_code: string;
  nik: string;
  name: string;
  barcode?: string;
  place_of_birth: string;
  date_of_birth: string;
  address: string;
  number_phone: string;
  email: string;
}

interface GlucoseTest {
  id: number;
  date_time: string;
  glucos_value: string;
  unit: string;
  patient_id: number;
}

interface PatientDetailProps {
  patientId: string;
}

const PatientDetail = ({ patientId }: PatientDetailProps) => {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [glucoseTests, setGlucoseTests] = useState<GlucoseTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const router = useRouter();
  const {
    page: queryPage = "1",
    limit: queryLimit = "10",
    search: querySearch = "",
  } = router.query as { page?: string; limit?: string; search?: string };
  const [rowsPerPage, setRowsPerPage] = useState(Number(queryLimit));
  const [page, setPage] = useState(Number(queryPage) - 1);

  if (querySearch !== "") {
    console.log("Query search:", querySearch);
  }

  const fetchPatientDetail = async (id: string) => {
    try {
      const token = Cookies.get("authToken");
      if (!token) throw new Error("Token is missing");

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/patients/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setPatient(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching patient detail:", error);
      setError("Failed to fetch patient details.");
      setLoading(false);
    }
  };

  const fetchGlucoseTests = async (patientId: string, page: number) => {
    try {
      const token = Cookies.get("authToken");

      if (!token) throw new Error("Token is missing");

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/test-glucosa/patient/${patientId}?limit=10&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setGlucoseTests(response.data.data);
      setTotalPages(response.data.pagination.total_pages); // Set total pages from pagination
    } catch (error) {
      console.error("Error fetching glucose tests:", error);
      setError("Failed to fetch glucose tests.");
    }
  };

  useEffect(() => {
    if (patientId) {
      fetchPatientDetail(patientId);
      fetchGlucoseTests(patientId, page);
    }
  }, [patientId, page]);

  function calculateAge(dateOfBirth: string): string {
    const birthDate = new Date(dateOfBirth);
    const currentDate = new Date();
    const years = differenceInYears(currentDate, birthDate);
    const months = differenceInMonths(currentDate, birthDate) % 12;
    const days = differenceInDays(currentDate, birthDate) % 30;
    return `${years} tahun ${months} bulan ${days} hari`;
  }

  const getGlucoseChartData = () => {
    const labels = glucoseTests.map((test) =>
      new Date(test.date_time).toLocaleDateString("id-ID")
    );
    const data = glucoseTests.map((test) => parseFloat(test.glucos_value));

    return {
      labels,
      datasets: [
        {
          label: "Glucose Level (mg/dL)",
          data,
          borderColor: "rgba(75, 192, 192, 1)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          fill: false,
          tension: 0.7,
          pointStyle: "circle", // Point style as 'circle'
        },
      ],
    };
  };

  const chartConfig = {
    type: "line",
    data: getGlucoseChartData(),
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Glucose Level Over Time",
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Date",
          },
        },
        y: {
          title: {
            display: true,
            text: "Glucose Value (mg/dL)",
          },
        },
      },
    },
  };

  // const handleChangePage = (event: any, newPage: number) => {
  //   setPage(newPage + 1);  // Page number is 1-based in the API, but Material-UI uses 0-based
  // };

  if (loading) {
    return <Typography>Loading patient details...</Typography>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  if (!patient) {
    return <Typography>Patient not found</Typography>;
  }

  const handleBackClick = () => {
    router.push("/dashboard?menu=patients&page=1&limit=10&search="); // Kembali ke halaman daftar pasien
  };

  return (
    <>
      <Head>
        <title>COSA APP | Patient Details</title>
        <link rel="icon" href="/assets/images/icon/icon_cosaapp.ico" />
      </Head>
      <div className="flex justify-between items-center mx-4">
        <div className="flex justify-start items-center gap-2">
          <FaUser className="h-5 w-5" />
          <h2 className="text-xl font-semibold">
            Patient Information Details
          </h2>
        </div>
        <Typography
          onClick={handleBackClick}
          style={{
            color: "#1976d2",
            cursor: "pointer",
            textDecoration: "underline",
            fontWeight: "bold",
          }}
        >
          Back
        </Typography>
      </div>

      {/* Informasi Pasien */}
      <div className="p-4">
        <Paper>
          <div className="grid grid-cols-2 gap-4 p-4 rounded-md px-4">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="font-medium">
                {patient.name} ({patient.patient_code})
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">NIK</p>
              <p className="font-medium">{patient.nik}</p>
            </div>
            {patient.barcode && (
              <div>
                <p className="text-sm text-gray-600">Barcode</p>
                <p className="font-medium">
                  <BarcodeComponent value={patient.barcode} />
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Place of Birth</p>
              <p className="font-medium">{patient.place_of_birth}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Date of Birth</p>
              <p className="font-medium">
                {new Date(patient.date_of_birth).toLocaleDateString("id-ID")}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Address</p>
              <p className="font-medium">{patient.address}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone Number</p>
              <p className="font-medium">{patient.number_phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{patient.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Age</p>
              <p className="font-medium">
                {calculateAge(patient.date_of_birth)}
              </p>
            </div>
          </div>
        </Paper>
      </div>

      {/* Daftar Hasil Test Glukosa */}
      <div className="p-4">
        <div className="flex justify-start items-center gap-2">
          <List className="h-5 w-5" />
          <h2 className="text-xl font-semibold">
            Glucose Test Results
          </h2>
        </div>
        <div className="mb-4"></div>
        {/* Table */}
        <Paper className="space-y-4">
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold" }}>No.</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Date & Time</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>
                    Glucose Value
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Unit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {glucoseTests.map((patient, index) => (
                  <TableRow key={patient.id}>
                    <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                    <TableCell>
                      <DateTimeDisplay dateTime={patient.date_time} />
                    </TableCell>
                    <TableCell>
                      {Math.round(parseFloat(patient.glucos_value))}
                    </TableCell>
                    <TableCell>{patient.unit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
            <TablePagination
              count={totalPages * rowsPerPage} // Estimasi jumlah total records
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={(_e, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) =>
                setRowsPerPage(Number(e.target.value))
              }
            />
          </Box>
        </Paper>
        <div className="mb-10"></div>
        {/* Line Chart */}
        <Paper>
          <Line data={chartConfig.data} options={chartConfig.options} />
        </Paper>
      </div>
    </>
  );
};

export default PatientDetail;
