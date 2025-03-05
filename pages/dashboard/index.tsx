import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { FaTachometerAlt, FaUserAlt, FaCog, FaUserCircle, FaBox, FaSignOutAlt } from "react-icons/fa";
import toast from "react-hot-toast";
import axios from "axios";
import Cookies from "js-cookie"; // Import library cookies
import Image from "next/image";
import { Divider } from "@mui/material";
import PatientDetail from "../patients/show";
import BTControlForm from "../btcontrol";
import Patients from "../patients";

const Dashboard = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string>("dashboard");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const verifyToken = async () => {
      const token = Cookies.get("authToken"); // Ambil token dari cookies

      if (!token) {
        // Redirect jika token tidak ditemukan
        toast.error("Session expired, silakan login kembali.", {
          duration: 3000,
          position: "top-center",
          style: { background: "#FF6B6B", color: "white" },
        });
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
        toast.error("Session expired, silakan login kembali.", {
          duration: 3000,
          position: "top-center",
          style: { background: "#FF6B6B", color: "white" },
        });
        router.replace("/login");
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [router]);

  useEffect(() => {
    const { menu, id } = router.query;
    if (menu && typeof menu === "string") {
      setActiveMenu(menu);
    }
    if (id && typeof id === "string") {
      setSelectedPatientId(id);
    } else {
      setSelectedPatientId(null);
    }
  }, [router.query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    Cookies.remove("authToken"); // Hapus token dari cookies
    localStorage.removeItem("connectedDevice"); // Hapus connectedDevice dari localStorage
    router.push("/login");
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleMenuClick = (menu: string) => {
    const query: { menu: string; page?: string; limit?: string; search?: string; id?: string } = { menu };
    if (menu === "patients") {
      query.page = "1";
      query.limit = "10";
      query.search = "";
    }
    setActiveMenu(menu);
    router.push({
      pathname: "/dashboard",
      query,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-lg font-semibold">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>COSA APP | Dashboard</title>
        <link rel="icon" href="/maskot_cosaapp.ico" />
      </Head>
      <div className="flex h-screen bg-gray-100">
        <aside className="w-64 bg-blue-600 text-white flex flex-col">
          <div className="flex items-center justify-center">
            <Image
              src="https://drive.google.com/uc?id=1esWLTqPRxrsGuY62C7FRkiJ-pUkNV4lE"
              alt="COSA Logo"
              width={800}
              height={300}
              className="mx-auto"
            />
          </div>
          <Divider />
          {/* <div className="p-4 text-center text-2xl font-bold border-b border-blue-700">X-LAB</div> */}
          <nav className="flex-1 p-4">
            <ul>
              {[
                { name: "Dashboard", icon: <FaTachometerAlt />, menu: "dashboard" },
                { name: "BT Control", icon: <FaBox />, menu: "btcontrol" },
                { name: "Patients", icon: <FaUserAlt />, menu: "patients" },
                { name: "Settings", icon: <FaCog />, menu: "settings" },
              ].map((item, index) => (
                <li key={index} className="mb-2">
                  <button
                    onClick={() => handleMenuClick(item.menu)}
                    className={`flex items-center py-2 px-4 w-full rounded hover:bg-blue-700 ${activeMenu === item.menu ? "bg-blue-700" : ""
                      }`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <div className="flex-1 flex flex-col">
          <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
            <div className="flex items-center justify-start gap-2">
              <FaTachometerAlt className="h-5 w-5" />
              <h1 className="text-2xl font-bold">Dashboard</h1>
            </div>
            <div className="relative">
              <div
                className="border-spacing-1 bg-blue-500 rounded-2xl px-1 py-1"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleDropdown();
                }}
              >
                <FaUserCircle
                  className="text-2xl cursor-pointer text-white"
                />
                {isDropdownOpen && (
                  <div
                    ref={dropdownRef}
                    className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded shadow-lg z-10"
                  >
                    <ul>
                      <li>
                        <button
                          onClick={handleLogout}
                          className="block px-4 py-2 text-gray-800 hover:bg-gray-200 w-full text-left"
                        >
                          <div className="flex justify-start items-center">
                            <FaSignOutAlt className="mr-2" />
                            <p>Logout</p>
                          </div>
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={handleLogout}
                          className="block px-4 py-2 text-gray-800 hover:bg-gray-200 w-full text-left"
                        >
                          <div className="flex justify-start items-center">
                            <FaCog className="mr-2" />
                            <p>Setting</p>
                          </div>
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {activeMenu === "dashboard" && (
              <div className="text-xl font-bold">Welcome to Dashboard!</div>
            )}
            {activeMenu === "patients" &&
              (selectedPatientId ? (
                <PatientDetail patientId={selectedPatientId} />
              ) : (
                <Patients />
              ))}
            {activeMenu === "btcontrol" && <BTControlForm />}
            {/* {activeMenu === "settings" && <Settings />} */}
          </main>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
