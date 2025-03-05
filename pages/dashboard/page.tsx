import React, { useEffect, useState } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import axios from "axios";
import dayjs from "dayjs";
import Cookies from "js-cookie";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);

// Dynamically import ReactApexChart with SSR disabled
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

const DashboardPage = () => {
  const [totalPatients, setTotalPatients] = useState(0);
  const [previousPatients, setPreviousPatients] = useState(0);
  const [percentageChange, setPercentageChange] = useState("0%");
  // Explicitly typed chart options
  const [chartOptions] = useState<ApexOptions>({
    chart: {
      type: "bar",
      height: 350,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "55%",
        borderRadius: 10,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    xaxis: {
      categories: ["Jan", "Feb", "Mar", "Apr", "May"],
    },
    yaxis: {
      title: {
        text: "Patient Admissions",
      },
    },
    fill: {
      opacity: 1,
      colors: ["#3B82F6"],
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return val + " patients";
        },
      },
    },
  });

  const [chartSeries] = useState([
    {
      name: "Patients",
      data: [120, 150, 180, 200, 220],
    },
  ]);

  useEffect(() => {
    const fetchPatientsData = async () => {
      try {
        const token = Cookies.get("authToken");
  
        if (!token) {
          console.error("No auth token found!");
          return;
        }
  
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/patients/counts`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
  
        if (response.data.status === "success" && typeof response.data.data === "number") {
          const totalPatients = response.data.data;
  
          // Karena tidak ada data pasien individual, kita hanya bisa menyimpan total ini
          setTotalPatients(totalPatients);
          setPreviousPatients(0); // Tidak ada data sebelumnya, jadi set ke 0
          setPercentageChange("N/A"); // Tidak bisa hitung perubahan persentase tanpa data sebelumnya
        } else {
          console.error("Invalid response format:", response.data);
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error(
            "Error fetching patient data:",
            error.response?.data || error.message
          );
        } else {
          console.error("Unexpected error:", error);
        }
      }
    };
  
    fetchPatientsData();
  }, []);
  

  const cardStats = [
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-blue-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      title: "Total Patients",
      value: totalPatients.toLocaleString(),
      change: percentageChange,
    },
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
          />
        </svg>
      ),
      title: "Active Treatments",
      value: "456",
      change: "+8.2%",
    },
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-purple-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
          />
        </svg>
      ),
      title: "Occupied Beds",
      value: "72/100",
      change: "-3.1%",
    },
  ];

  const recentActivities = [
    { time: "09:30", description: "New patient admitted", status: "success" },
    { time: "10:45", description: "Treatment plan updated", status: "info" },
    { time: "11:15", description: "Lab results received", status: "warning" },
    { time: "12:00", description: "Consultation scheduled", status: "pending" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Quick Stats Cards */}
      <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
        {cardStats.map((stat, index) => (
          <div
            key={index}
            className="bg-white shadow-md rounded-lg p-4 flex items-center"
          >
            <div className="mr-4">{stat.icon}</div>
            <div>
              <p className="text-gray-500 text-sm">{stat.title}</p>
              <div className="flex items-center">
                <h3 className="text-xl font-bold mr-2">{stat.value}</h3>
                <span
                  className={`text-xs ${
                    stat.change.startsWith("+")
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {stat.change}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Patient Admission Chart */}
      <div className="bg-white shadow-md rounded-lg p-4 md:col-span-2">
        <h3 className="text-lg font-semibold mb-4">Patient Admissions</h3>
        <ReactApexChart
          options={chartOptions}
          series={chartSeries}
          type="bar"
          height={350}
        />
      </div>

      {/* Recent Activities */}
      <div className="bg-white shadow-md rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Recent Activities</h3>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="space-y-3">
          {recentActivities.map((activity, index) => (
            <div key={index} className="flex items-center">
              <span className="text-sm text-gray-500 mr-3">
                {activity.time}
              </span>
              <div className="flex-1">
                <p className="text-sm">{activity.description}</p>
              </div>
              <span
                className={`h-2 w-2 rounded-full 
                  ${
                    activity.status === "success"
                      ? "bg-green-500"
                      : activity.status === "info"
                      ? "bg-blue-500"
                      : activity.status === "warning"
                      ? "bg-yellow-500"
                      : "bg-gray-500"
                  }`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
