import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import { Toaster, toast } from 'react-hot-toast';
import { IconButton, InputAdornment, TextField } from "@mui/material";
import Cookies from "js-cookie"; // Import library cookies
import Image from "next/image";
import { FaEye, FaEyeSlash, FaSignInAlt } from "react-icons/fa"; // Tambahkan FaSignInAlt

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false); // State for toggling password visibility
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Kirim permintaan login
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/login`,
        formData,
        {
          withCredentials: true, // Izinkan cookies untuk dikirim dan diterima
        }
      );

      if (response.data.status === "success") {
        const { token } = response.data.data; // Ambil token dari response

        // Simpan token di cookies
        Cookies.set("authToken", token, {
          expires: 1, // Token kedaluwarsa dalam 1 hari
          secure: process.env.NODE_ENV === "production", // Hanya aman untuk HTTPS di production
          sameSite: "Strict", // Untuk keamanan CSRF
        });

        // Tampilkan pesan sukses
        toast.success("Login berhasil! Mengarahkan ke dashboard...", {
          duration: 2000,
          position: "top-right",
          style: {
            background: "#4CAF50",
            color: "white",
          },
        });

        // Redirect ke dashboard
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        // Tampilkan error dari server
        toast.error(err.response.data?.message || "Login gagal", {
          duration: 3000,
          position: "top-right",
          style: {
            background: "#FF6B6B",
            color: "white",
          },
        });
      } else {
        toast.error("Terjadi kesalahan yang tidak terduga", {
          duration: 3000,
          position: "top-right",
          style: {
            background: "#FF6B6B",
            color: "white",
          },
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  return (
    <>
      {/* Add Toaster component for rendering toasts */}
      <Toaster />

      <Head>
        <title>COSA APP | Login</title>
        <link rel="icon" href="/assets/images/icon/icon_cosaapp.ico" />
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="bg-white shadow-2xl rounded-xl border border-gray-200 px-8 pt-6 pb-8">
            <div className="text-center">
              <Image
                src="https://drive.google.com/uc?id=1esWLTqPRxrsGuY62C7FRkiJ-pUkNV4lE"
                alt="COSA Logo"
                width={800}
                height={300}
                className="mx-auto"
              />
            </div>
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="flex items-center justify-center">
                <p className="font-bold text-center text-2xl">Login Here</p>
              </div>
              <div>
                <TextField
                  id="email"
                  name="email"
                  label="Email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  margin="normal"
                />
                <TextField
                  id="password"
                  name="password"
                  label="Password"
                  type={passwordVisible ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={togglePasswordVisibility} edge="end">
                          {passwordVisible ? <FaEyeSlash /> : <FaEye />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 h-16 items-center text-xl"
                >
                  {/* Tambahkan ikon di sini */}
                  <FaSignInAlt className="mr-2" /> {/* Ikon login */}
                  {isLoading ? "Signing In..." : "Sign In"}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Register here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;