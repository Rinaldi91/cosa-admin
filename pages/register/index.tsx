import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import { TextField, InputAdornment, IconButton } from "@mui/material";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Head from "next/head";
import Image from "next/image";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/register`,
        formData
      );

      if (response.data.status === "success") {
        toast.success("Registration Successful! Redirecting to login...", {
          position: "top-right",
          duration: 2000,
        });

        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        const errorMessage =
          err.response.data?.message || "Registration failed.";

        toast.error(errorMessage, {
          position: "top-right",
          duration: 3000,
        });

        setError(errorMessage);
      } else {
        toast.error("An unexpected error occurred", {
          position: "top-right",
          duration: 3000,
        });

        setError("An unexpected error occurred.");
      }
    }
  };

  return (
    <>
      <Toaster />
      <Head>
        <title>COSA APP | Registration</title>
        <link rel="icon" href="/maskot_cosaapp.ico" />
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
                <p className="font-bold text-center text-2xl">Register</p>
              </div>
              <div>
                <TextField
                  label="Name"
                  type="text"
                  name="name"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={handleChange}
                  fullWidth
                  variant="outlined"
                  required
                  margin="normal"
                />

                <TextField
                  label="Email"
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  fullWidth
                  variant="outlined"
                  required
                  margin="normal"
                />

                <TextField
                  label="Password"
                  type={passwordVisible ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  fullWidth
                  variant="outlined"
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={togglePasswordVisibility}
                          edge="end"
                        >
                          {passwordVisible ? <FaEyeSlash /> : <FaEye />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  margin="normal"
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              {successMessage && (
                <p className="text-green-500 text-sm">{successMessage}</p>
              )}
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 focus:ring-blue-500 h-16 items-center text-xl"
              >
                Register
              </button>
            </form>
            <p className="text-center text-sm mt-4">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Register;
