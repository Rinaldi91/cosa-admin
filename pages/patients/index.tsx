import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Typography,
  TablePagination,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Box,
  Menu,
  MenuItem,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { useRouter } from "next/router";
import Head from "next/head";
import { toast } from "react-hot-toast";
import { FaInfoCircle, FaTrash, FaUsers } from "react-icons/fa";
import { PiPencil } from "react-icons/pi";
import Cookies from "js-cookie";
import { CgMoreVertical } from "react-icons/cg";
import { Close } from "@mui/icons-material";
interface Patient {
  id: number;
  name: string;
  patient_code: string;
  barcode: string;
  nik: string;
  address: string;
  number_phone: number;
}
const Patients = () => {
  const router = useRouter();
  const {
    page: queryPage = "1",
    limit: queryLimit = "10",
    search: querySearch = "",
  } = router.query as { page?: string; limit?: string; search?: string };

  const [patientsData, setPatientsData] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(querySearch);
  const [page, setPage] = useState(Number(queryPage) - 1); // 0-based indexing
  const [rowsPerPage, setRowsPerPage] = useState(Number(queryLimit));
  const [totalPatients, setTotalPatients] = useState(0);

  const [openModal, setOpenModal] = useState(false); // State untuk mengontrol modal
  const [newPatient, setNewPatient] = useState({
    nik: "",
    name: "",
    place_of_birth: "",
    date_of_birth: "",
    address: "",
    number_phone: "",
    email: "",
  }); // State untuk menyimpan inputan pasien baru

  const [errors, setErrors] = useState<{ [key: string]: string }>({}); // State untuk menyimpan error
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null); // Untuk menu dropdown
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null); // Untuk menyimpan pasien yang dipilih

  const [open, setOpen] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      const token = Cookies.get("authToken"); // Ambil token dari cookies

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/verify-token`,
          {
            headers: {
              Authorization: `Bearer ${token}`, // Kirim token dalam header Authorization
            },
          }
        );

        if (response.status === 200 && response.data.status === "success") {
          const { id, name, email } = response.data.data;
          console.log("User:", { id, name, email });
        } else {
          throw new Error("Token verification failed");
        }
      } catch {
        Cookies.remove("authToken"); // Hapus token jika tidak valid
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [router]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = Cookies.get("authToken");
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/patients`,
        {
          params: {
            page: page + 1,
            limit: rowsPerPage,
            search: searchTerm,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const { patients, pagination } = response.data.data;
      setPatientsData(patients || []);
      setTotalPatients(pagination.totalPatients || 0);
    } catch (error) {
      console.error("Error fetching patients data:", error);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    rowsPerPage,
    searchTerm,
    setLoading,
    setPatientsData,
    setTotalPatients,
  ]);

  useEffect(() => {
    fetchData();
  }, [page, rowsPerPage, searchTerm, fetchData]); // tambahkan fetchData ke dalam array dependensi

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = event.target.value;
    setSearchTerm(newSearchTerm);
    setPage(0); // Reset ke halaman pertama saat pencarian berubah

    // Update URL dengan search term baru
    router.push({
      pathname: "/dashboard",
      query: {
        menu: "patients",
        page: 1,
        limit: rowsPerPage,
        search: newSearchTerm,
      },
    });
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    const requiredFields = [
      "nik",
      "name",
      "place_of_birth",
      "date_of_birth",
      "address",
      "number_phone",
      "email",
    ];

    requiredFields.forEach((field) => {
      if (!newPatient[field as keyof typeof newPatient]) {
        newErrors[field] = "This field is required";
      }
    });

    // Validasi NIK (16 digit dan hanya angka)
    if (
      newPatient.nik &&
      (newPatient.nik.length !== 16 || !/^\d+$/.test(newPatient.nik))
    ) {
      newErrors.nik = "NIK must be exactly 16 digits and contain only numbers";
    }

    // **Perbaikan validasi nomor telepon**
    if (newPatient.number_phone) {
      if (!/^\d+$/.test(newPatient.number_phone)) {
        newErrors.number_phone = "Phone number must contain only numbers";
      }
      // Validasi panjang hanya jika tidak dalam rentang yang benar
      else if (
        newPatient.number_phone.length >= 11 &&
        newPatient.number_phone.length <= 13
      ) {
        if (!newPatient.number_phone.startsWith("08")) {
          newErrors.number_phone = "Invalid Phone Number, must start with '08'";
        }
      } else {
        newErrors.number_phone =
          "Phone number must be between 11 and 13 digits";
      }
    }

    // Validasi email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (newPatient.email && !emailRegex.test(newPatient.email)) {
      newErrors.email = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Return true if no errors
  };

  const handleAddPatient = async () => {
    if (!validateForm()) {
      return; // Jangan lanjutkan jika ada error
    }

    try {
      const token = Cookies.get("authToken");
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/patients`,
        newPatient,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Menambahkan log untuk memastikan berhasil
      console.log("Patient added successfully");
      toast.success("Patient added successfully!"); // Pastikan toast tampil

      setOpenModal(false); // Menutup modal setelah data berhasil ditambahkan
      setNewPatient({
        nik: "",
        name: "",
        place_of_birth: "",
        date_of_birth: "",
        address: "",
        number_phone: "",
        email: "",
      }); // Reset form
      fetchData(); // Refresh data pasien
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage =
          error.response?.data?.message || "Something went wrong";
        toast.error(errorMessage); // Tampilkan pesan error dari server
      } else {
        toast.error("An unexpected error occurred");
      }
    }
  };

  const handleMenuClick = (
    event: React.MouseEvent<HTMLElement>,
    patient: Patient
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedPatient(patient);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedPatient(null);
  };

  const handleDeletePatient = async () => {
    if (!selectedPatient) return;

    try {
      const token = Cookies.get("authToken");
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/patients/${selectedPatient.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.success("Patient deleted successfully");
      fetchData(); // Refresh data pasien
    } catch {
      toast.error("Failed to delete patient");
    }
    setOpen(false);
    handleCloseMenu();
  };

  // Perbarui filteredPatients untuk pencarian berdasarkan patient_code, barcode, atau nik
  const filteredPatients = patientsData.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.patient_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.nik.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewDetail = () => {
    handleCloseMenu(); // Close menu after selecting Detail
    if (selectedPatient) {
      router.push(`/dashboard?menu=patients&id=${selectedPatient.id}`); // Pastikan ID pasien dikirimkan dengan benar
    }
  };

  return (
    <>
      <Head>
        <title>COSA APP | Patients</title>
        <link rel="icon" href="/assets/images/icon/icon_cosaapp.ico" />
      </Head>

      <div>
        <div className="flex justify-start items-center gap-2">
          <FaUsers className="h-7 w-7" />
          <h2 className="text-xl font-semibold">Patients</h2>
        </div>
        <div className="flex justify-between items-center space-x-4">
          <TextField
            label="Search"
            variant="outlined"
            value={searchTerm}
            onChange={handleSearch}
            fullWidth
            margin="normal"
            className="flex-grow h-[55px] mb-3"
            sx={{
              "& .MuiInputBase-root": {
                height: "100%",
              },
            }}
            InputProps={{
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton onClick={() => setSearchTerm("")} edge="end">
                    <Close />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <button
            onClick={() => setOpenModal(true)}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded h-[56px] w-[250px] mt-1"
          >
            Add New Patient
          </button>
        </div>

        {loading ? (
          <Typography>Loading data...</Typography>
        ) : (
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>No.</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      Patient Code
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>NIK</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Address</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      Phone Number
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPatients.map((patient, index) => (
                    <TableRow key={patient.id}>
                      <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                      <TableCell>
                        <span
                          onClick={() => {
                            handleViewDetail();
                            router.push(
                              `/dashboard?menu=patients&id=${patient.id}`
                            );
                          }}
                          className="text-blue-500 hover:underline cursor-pointer"
                        >
                          {patient.patient_code}
                        </span>
                      </TableCell>
                      <TableCell>{patient.nik}</TableCell>
                      <TableCell>{patient.name}</TableCell>
                      <TableCell>{patient.address}</TableCell>
                      <TableCell>{patient.number_phone}</TableCell>
                      <TableCell>
                        <IconButton
                          onClick={(e) => handleMenuClick(e, patient)}
                        >
                          <CgMoreVertical />
                        </IconButton>
                        <Menu
                          anchorEl={anchorEl}
                          open={Boolean(
                            anchorEl && selectedPatient?.id === patient.id
                          )}
                          onClose={handleCloseMenu}
                        >
                          <MenuItem
                            onClick={() => handleViewDetail()}
                            className="flex items-center"
                          >
                            <FaInfoCircle className="mr-2" /> Detail
                          </MenuItem>
                          <MenuItem
                            onClick={() => alert(`Editing ${patient.name}`)}
                            className="flex items-center"
                          >
                            <PiPencil className="mr-2" /> Edit
                          </MenuItem>
                          <MenuItem
                            onClick={() => setOpen(true)}
                            className="flex items-center"
                          >
                            <FaTrash className="mr-2" /> Delete
                          </MenuItem>
                        </Menu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <TablePagination
                count={totalPatients}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={(_e, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) =>
                  setRowsPerPage(Number(e.target.value))
                }
              />
            </Box>
          </Paper>
        )}
      </div>

      {/* Dialog Konfirmasi */}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Notification</DialogTitle>
        <DialogContent>
          <div className="p-4">
            <p>Are you sure you want to delete this patient?</p>
            <div className="flex justify-end mt-4 gap-2">
              <DialogActions>
                <Button onClick={() => setOpen(false)} color="secondary">
                  Cancel
                </Button>
                <Button onClick={handleDeletePatient} color="primary">
                  Delete
                </Button>
              </DialogActions>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal untuk menambahkan pasien */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)}>
        <DialogTitle>Add New Patient</DialogTitle>
        <DialogContent>
          <TextField
            label="NIK"
            variant="outlined"
            fullWidth
            value={newPatient.nik}
            onChange={(e) => {
              const value = e.target.value;
              // Hanya izinkan angka dan batasi panjang maksimal 16 karakter
              if (/^\d*$/.test(value) && value.length <= 16) {
                setNewPatient({ ...newPatient, nik: value });
              }
            }}
            onBlur={() => {
              if (newPatient.nik.length !== 16) {
                setErrors((prev) => ({
                  ...prev,
                  nik: "NIK must be 16 digits",
                }));
              } else {
                setErrors((prev) => ({ ...prev, nik: "" }));
              }
            }}
            margin="normal"
            error={!!errors.nik}
            helperText={errors.nik}
          />

          <TextField
            label="Name"
            variant="outlined"
            fullWidth
            value={newPatient.name}
            onChange={(e) =>
              setNewPatient({ ...newPatient, name: e.target.value })
            }
            margin="normal"
            error={!!errors.name}
            helperText={errors.name}
          />
          <TextField
            label="Place of Birth"
            variant="outlined"
            fullWidth
            value={newPatient.place_of_birth}
            onChange={(e) =>
              setNewPatient({ ...newPatient, place_of_birth: e.target.value })
            }
            margin="normal"
            error={!!errors.place_of_birth}
            helperText={errors.place_of_birth}
          />
          <TextField
            label=""
            variant="outlined"
            fullWidth
            type="date"
            value={newPatient.date_of_birth}
            onChange={(e) =>
              setNewPatient({ ...newPatient, date_of_birth: e.target.value })
            }
            margin="normal"
            error={!!errors.date_of_birth}
            helperText={errors.date_of_birth}
          />
          <TextField
            label="Address"
            variant="outlined"
            fullWidth
            value={newPatient.address}
            onChange={(e) =>
              setNewPatient({ ...newPatient, address: e.target.value })
            }
            margin="normal"
            error={!!errors.address}
            helperText={errors.address}
          />
          <TextField
            label="Phone Number"
            variant="outlined"
            fullWidth
            value={newPatient.number_phone}
            onChange={(e) => {
              const value = e.target.value;
              // Hanya izinkan angka dan batasi panjang maksimal 13 karakter
              if (/^\d*$/.test(value) && value.length <= 13) {
                setNewPatient({ ...newPatient, number_phone: value });
              }
            }}
            onBlur={() => {
              const { number_phone } = newPatient;

              // Reset error dulu
              let errorMessage = "";

              // Validasi panjang nomor (harus 11-13)
              if (number_phone.length < 11 || number_phone.length > 13) {
                errorMessage = "Phone number must be between 11 and 13 digits";
              }
              // Jika panjangnya sudah benar, cek apakah diawali dengan '08'
              else if (!number_phone.startsWith("08")) {
                errorMessage = "Invalid Phone Number, must start with '08'";
              }

              // Set error jika ada
              setErrors((prev) => ({
                ...prev,
                number_phone: errorMessage,
              }));
            }}
            margin="normal"
            error={!!errors.number_phone}
            helperText={errors.number_phone}
          />

          <TextField
            label="Email"
            variant="outlined"
            fullWidth
            value={newPatient.email}
            onChange={(e) =>
              setNewPatient({ ...newPatient, email: e.target.value })
            }
            margin="normal"
            error={!!errors.email}
            helperText={errors.email}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleAddPatient} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Patients;
