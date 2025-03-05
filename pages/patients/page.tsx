"use client";

import { useState, useEffect } from "react";
import { TextField, Autocomplete, CircularProgress } from "@mui/material";
import { debounce } from "lodash";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  differenceInDays,
  differenceInMonths,
  differenceInYears,
  format,
} from "date-fns";
import Cookies from "js-cookie";
import { FaUser } from "react-icons/fa";
import BarcodeComponent from "@/components/BarcodeComponent";

interface Patient {
  id: string;
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

interface GlucoseTestData {
  date_time: string;
  glucos_value: number;
  unit: string;
  patient_id?: string;
}

interface GlucoseReading {
  timestamp: Date;
  glucoseValue: number;
  unit: string;
}

interface PatientFormProps {
  glucoseReadings: GlucoseReading[];
  onGlucoseTestSaved: () => void;
}

function calculateAge(dateOfBirth: string): string {
  const birthDate = new Date(dateOfBirth);
  const currentDate = new Date();
  const years = differenceInYears(currentDate, birthDate);
  const months = differenceInMonths(currentDate, birthDate) % 12;
  const days = differenceInDays(currentDate, birthDate) % 30;

  return `${years} tahun ${months} bulan ${days} hari`;
}

const PatientForm: React.FC<PatientFormProps> = ({
  glucoseReadings,
  onGlucoseTestSaved,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Search patients using axios
  const searchPatients = debounce(async (search: string) => {
    if (!search || search.length < 3) {
      setPatients([]);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const token = Cookies.get("authToken");
      if (!token) {
        toast.error("No token found. Please log in again.");
        return;
      }

      const response = await axios.get(
        `${
          process.env.NEXT_PUBLIC_API_BASE_URL
        }/api/patients?page=1&limit=10&search=${encodeURIComponent(search)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Sesuaikan dengan struktur respons
      if (response.data?.data?.patients) {
        setPatients(response.data.data.patients);
      } else {
        console.error("Unexpected data format:", response.data);
        setPatients([]);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Save error details:",
          error.response?.data || error.message
        );
        switch (error.response?.status) {
          case 400:
            toast.error("Invalid data sent to the server.");
            break;
          case 403:
            toast.error("You are not authorized to perform this action.");
            break;
          case 500:
            toast.error("Server error. Please try again later.");
            break;
          default:
            toast.error(
              "Failed to save glucose test results. Please try again."
            );
        }
      } else {
        console.error("Unknown error:", error);
        toast.error("An unexpected error occurred.");
      }
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, 500);

  // Handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.trim();
    setSearchTerm(value);

    if (value && value.length >= 3) {
      searchPatients(value);
    } else {
      setPatients([]);
    }
  };

  const saveGlucoseTests = async () => {
    if (glucoseReadings.length === 0) {
      toast.error("No glucose readings available to save");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const token = Cookies.get("authToken");
      if (!token) {
        toast.error("Authentication token is missing. Please log in again.");
        return;
      }

      const glucoseTests: GlucoseTestData[] = glucoseReadings.map((reading) => {
        // Convert timestamp to local timezone
        const localDateTime = format(
          new Date(reading.timestamp),
          "yyyy-MM-dd HH:mm:ss"
        );

        const testData = {
          date_time: localDateTime,
          glucos_value: reading.glucoseValue,
          unit: reading.unit,
        };

        // Only add patient_id if a patient is selected
        if (selectedPatient) {
          return {
            ...testData,
            patient_id: selectedPatient.id,
          };
        }

        return testData;
      });

      const savePromises = glucoseTests.map((test) =>
        axios.post(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/test-glucosa`,
          test,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )
      );

      await Promise.all(savePromises);

      toast.success("Glucose test results saved successfully for the patient");
      setSelectedPatient(null);
      setSearchTerm("");
      onGlucoseTestSaved();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Save error details:",
          error.response?.data || error.message
        );
        if (error.response?.status === 400) {
          toast.error("Invalid data sent to the server.");
        } else if (error.response?.status === 403) {
          toast.error("You are not authorized to perform this action.");
        } else {
          toast.error("Failed to save glucose test results. Please try again.");
        }
      } else {
        console.error("Unknown error:", error);
        toast.error("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Autosave when glucoseReadings or selectedPatient changes
  useEffect(() => {
    if (selectedPatient && glucoseReadings.length > 0) {
      saveGlucoseTests();
    }
  }, [glucoseReadings, selectedPatient]);

  return (
    <div className="mb-6 space-y-4 mt-7">
      <div className="flex justify-start items-center gap-2">
        <FaUser className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Patients Information</h2>
      </div>
      <Autocomplete
        value={selectedPatient}
        onChange={(_, newValue) => {
          setSelectedPatient(newValue);
          setError("");
        }}
        options={patients}
        getOptionLabel={(option) =>
          `${option.patient_code} - ${option.name} (NIK: ${option.nik})`
        }
        loading={loading}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search Patient (min. 3 characters)"
            variant="outlined"
            onChange={handleSearchChange}
            value={searchTerm}
            fullWidth
            error={!!error}
            helperText={error || (loading ? "Searching for patients..." : "")}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        noOptionsText={
          searchTerm.length < 3
            ? "Enter at least 3 characters"
            : "No patients found"
        }
      />

      {selectedPatient && (
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md">
          <div>
            <p className="text-sm text-gray-600">Name</p>
            <p className="font-medium">{selectedPatient.name} ({selectedPatient.patient_code})</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">NIK</p>
            <p className="font-medium">{selectedPatient.nik}</p>
          </div>
          {selectedPatient.barcode && (
            <div>
              <p className="text-sm text-gray-600">Barcode</p>
              <p className="font-medium"><BarcodeComponent value={selectedPatient.barcode} /></p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-600">Place of Birth</p>
            <p className="font-medium">{selectedPatient.place_of_birth}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Date of Birth</p>
            <p className="font-medium">
              {new Date(selectedPatient.date_of_birth).toLocaleDateString(
                "id-ID"
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Address</p>
            <p className="font-medium">{selectedPatient.address}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Phone Number</p>
            <p className="font-medium">{selectedPatient.number_phone}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="font-medium">{selectedPatient.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Age</p>
            <p className="font-medium">
              {calculateAge(selectedPatient.date_of_birth)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientForm;

// setSelectedPatient(null);
// setSearchTerm("");
// onGlucoseTestSaved();

// Save glucose test data
// const saveGlucoseTests = async () => {
//     if (!selectedPatient) {
//         toast.error("Please select a patient");
//         return;
//     }

//     if (glucoseReadings.length === 0) {
//         toast.error("No glucose readings available to save");
//         return;
//     }

//     try {
//         setLoading(true);
//         setError("");

//         const token = Cookies.get("authToken");
//         if (!token) {
//             toast.error("Authentication token is missing. Please log in again.");
//             return;
//         }

//         const glucoseTests: GlucoseTestData[] = glucoseReadings.map(reading => {
//             // Konversi timestamp ke zona waktu lokal
//             const localDateTime = format(new Date(reading.timestamp), 'yyyy-MM-dd HH:mm:ss');

//             return {
//                 date_time: localDateTime, // Format sesuai MySQL (tanpa zona waktu)
//                 glucos_value: reading.glucoseValue,
//                 unit: reading.unit,
//                 patient_id: selectedPatient!.id,
//             };
//         });

//         const savePromises = glucoseTests.map(test =>
//             axios.post(
//                 `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/test-glucosa`,
//                 test,
//                 {
//                     headers: {
//                         Authorization: `Bearer ${token}`,
//                     },
//                 }
//             )
//         );

//         await Promise.all(savePromises);

//         toast.success("Glucose test results saved successfully");

//     } catch (error) {
//         if (axios.isAxiosError(error)) {
//             console.error("Save error details:", error.response?.data || error.message);
//             if (error.response?.status === 400) {
//                 toast.error("Invalid data sent to the server.");
//             } else if (error.response?.status === 403) {
//                 toast.error("You are not authorized to perform this action.");
//             } else {
//                 toast.error("Failed to save glucose test results. Please try again.");
//             }
//         } else {
//             console.error("Unknown error:", error);
//             toast.error("An unexpected error occurred.");
//         }
//     } finally {
//         setLoading(false);
//     }
// };
