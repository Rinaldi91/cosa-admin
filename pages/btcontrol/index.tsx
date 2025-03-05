'use client';

import { Search } from '@mui/icons-material';
import { Button } from '@mui/material';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { FiRefreshCcw } from 'react-icons/fi';
import { Select, MenuItem, InputLabel, FormControl, SelectChangeEvent } from '@mui/material';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import axios from 'axios';
import PatientForm from '../patients/page';
import { FaBox } from 'react-icons/fa';

interface BluetoothDevice {
  id: string;
  name: string | null;
}

interface GlucoseReading {
  timestamp: Date;
  formattedTimestamp?: string;
  glucoseValue: number;
  unit: string;
  mealContext?: string;
  sequenceNumber?: number;
  contextSequenceNumber?: number;
  value?: string;
}

// Constants for Bluetooth services and characteristics
const GLUCOSE_SERVICE = '00001808-0000-1000-8000-00805f9b34fb';
const GLUCOSE_MEASUREMENT = '00002a18-0000-1000-8000-00805f9b34fb';
const GLUCOSE_CONTEXT = '00002a34-0000-1000-8000-00805f9b34fb';

const BTControlForm: React.FC = () => {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);
  const [showConfirmDisconnect, setShowConfirmDisconnect] = useState(false);
  const [reconnectDevice, setReconnectDevice] = useState<BluetoothDevice | null>(null);
  const [activeConnection, setActiveConnection] = useState<BluetoothRemoteGATTServer | null>(null);
  const [glucoseReadings, setGlucoseReadings] = useState<GlucoseReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isReading, setIsReading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected'); // New state for connection status
  const router = useRouter();


  useEffect(() => {
    const verifyToken = async () => {
      const token = Cookies.get("authToken"); // Ambil token dari cookies

      if (!token) {
        // Redirect jika token tidak ditemukan
        // toast.error("Silakan login terlebih dahulu.", {
        //   duration: 3000,
        //   position: "top-center",
        //   style: { background: "#FF6B6B", color: "white" },
        // });
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
          console.log("User :", { id, name, email });
        } else {
          throw new Error("Token verification failed");
        }
      } catch {
        Cookies.remove("authToken"); // Hapus token jika tidak valid
        // toast.error("Session expired, silakan login kembali.", {
        //   duration: 3000,
        //   position: "top-center",
        //   style: { background: "#FF6B6B", color: "white" },
        // });
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [router]);

  const handleDeviceDisconnection = () => {
    setIsConnected(false);
    setConnectedDevice(null);
    setActiveConnection(null);
    setIsReading(false);
    localStorage.removeItem('connectedDevice');
    setReconnectDevice(null);
    setConnectionStatus('Disconnected'); // Update status on disconnection
    // Refresh the page after disconnecting
    window.location.reload();
  };

  const parseGlucoseData = (value: DataView): GlucoseReading => {
    // Menampilkan data byte mentah
    const rawBytes = Array.from(new Uint8Array(value.buffer));
    console.log('Raw Data Bytes:', rawBytes);

    // Flags byte menentukan format data yang tersedia
    const flags = value.getUint8(0);
    console.log('Flags (binary):', flags.toString(2).padStart(8, '0'));

    let offset = 1;

    // Sequence Number (2 bytes)
    const sequenceNumber = value.getUint16(offset, true);
    offset += 2;

    // Base Time (7 bytes)
    const baseYear = value.getUint16(offset, true);
    const month = value.getUint8(offset + 2) - 1;
    const day = value.getUint8(offset + 3);
    const hours = value.getUint8(offset + 4);
    const minutes = value.getUint8(offset + 5);
    const seconds = value.getUint8(offset + 6);
    offset += 7;

    console.log('Decoded Timestamp:', { baseYear, month: month + 1, day, hours, minutes, seconds });

    // Parse glucose concentration
    let glucoseValue: number;
    if (flags & 0x01) {
        glucoseValue = value.getUint8(offset);
        offset += 2;
    } else {
        glucoseValue = 0;
    }
    console.log('Glucose Value:', glucoseValue);

    // Meal marker
    const mealMarker = value.getUint8(offset);
    console.log('Meal Marker Raw Byte:', mealMarker.toString(2).padStart(8, '0'));

    let mealContext: 'pre-meal' | 'post-meal' | 'no-meal';
    const mealBits = (mealMarker >> 6) & 0x03;

    switch (mealBits) {
        case 0x02:
            mealContext = 'pre-meal';
            break;
        case 0x03:
            mealContext = 'post-meal';
            break;
        default:
            mealContext = 'no-meal';
    }
    console.log('Meal Context:', mealContext);

    // Buat timestamp UTC dari data alat, lalu ubah ke zona waktu Jakarta
    const timestamp = new Date(Date.UTC(baseYear, month, day, hours, minutes, seconds));
    const localTimestamp = new Date(timestamp.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));

    // Format timestamp untuk Indonesia dengan format 24 jam
    const formattedTimestamp = new Intl.DateTimeFormat('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Jakarta'
    }).format(localTimestamp);

    console.log('Formatted Timestamp (Jakarta):', formattedTimestamp);

    return {
        sequenceNumber,
        timestamp: localTimestamp,
        glucoseValue,
        unit: 'mg/dL',
        formattedTimestamp,
        mealContext
    };
};


  // //Menampilkan hasil nilai gula dara dari alat contour plus elite
  // const parseGlucoseData = (value: DataView): GlucoseReading => {
  //   // Flags byte menentukan format data yang tersedia
  //   const flags = value.getUint8(0);
  //   let offset = 1;

  //   // Sequence Number (2 bytes)
  //   const sequenceNumber = value.getUint16(offset, true);
  //   offset += 2;

  //   // Base Time (7 bytes)
  //   const baseYear = value.getUint16(offset, true);
  //   const month = value.getUint8(offset + 2) - 1;
  //   const day = value.getUint8(offset + 3);
  //   const hours = value.getUint8(offset + 4);
  //   const minutes = value.getUint8(offset + 5);
  //   const seconds = value.getUint8(offset + 6);

  //   // Debug timestamp values
  //   console.log('Raw timestamp values:', {
  //     year: baseYear,
  //     month: month + 1,
  //     day,
  //     hours,
  //     minutes,
  //     seconds
  //   });

  //   offset += 7;

  //   // Parse glucose concentration
  //   let glucoseValue: number;
  //   if (flags & 0x01) {
  //     glucoseValue = value.getUint8(12);
  //     offset += 2;
  //   } else {
  //     glucoseValue = 0;
  //   }

  //   const mealMarker = value.getUint8(13);

  //   let mealContext: 'pre-meal' | 'post-meal' | 'no-meal';
  //   const mealBits = (mealMarker >> 6) & 0x03;

  //   switch (mealBits) {
  //     case 0x02:
  //       mealContext = 'pre-meal';
  //       break;
  //     case 0x03:
  //       mealContext = 'post-meal';
  //       break;
  //     default:
  //       mealContext = 'no-meal';
  //   }

  //   // Buat timestamp UTC dari data alat, lalu ubah ke zona waktu Jakarta
  //   const timestamp = new Date(Date.UTC(baseYear, month, day, hours, minutes, seconds));
  //   const localTimestamp = new Date(timestamp.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));

  //   // Format timestamp untuk Indonesia dengan format 24 jam
  //   const formattedTimestamp = new Intl.DateTimeFormat('id-ID', {
  //     year: 'numeric',
  //     month: '2-digit',
  //     day: '2-digit',
  //     hour: '2-digit',
  //     minute: '2-digit',
  //     second: '2-digit',
  //     hour12: false,
  //     timeZone: 'Asia/Jakarta'
  //   }).format(localTimestamp);

  //   return {
  //     sequenceNumber,
  //     timestamp: localTimestamp,
  //     glucoseValue,
  //     unit: 'mg/dL',
  //     formattedTimestamp,
  //     mealContext
  //   };
  // };

  useEffect(() => {
    const savedDevice = JSON.parse(localStorage.getItem('connectedDevice') || 'null');
    if (savedDevice) {
      setReconnectDevice(savedDevice);
      setConnectedDevice(savedDevice.name);
    }

    // Add event listener for disconnection when the component is mounted
    const handleDisconnection = () => {
      handleDeviceDisconnection(); // Call your disconnection handler
    };

    // If we have an active connection, listen for the disconnection event on the bluetooth device
    if (activeConnection) {
      const bluetoothDevice = activeConnection.device;
      bluetoothDevice.addEventListener('gattserverdisconnected', handleDisconnection);

      return () => {
        // Cleanup: remove event listener when component unmounts or connection changes
        bluetoothDevice.removeEventListener('gattserverdisconnected', handleDisconnection);
      };
    }
  }, [activeConnection]);

  const syncData = async () => {
    const readings = glucoseReadings; // Use the existing state to get the glucose readings
  
    try {
      const token = Cookies.get('authToken');
      if (!token) {
        setError('Authentication token is missing. Please log in again.');
        return;
      }
  
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/test-glucosa/sync-glucosa-tests`,
        { readings },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      if (response.data.status === 'success') {
        toast.success(response.data.message, {
          duration: 3000,
          position: 'top-center',
          style: { background: '#4CAF50', color: 'white' },
        });
      } else {
        setError('Failed to synchronize glucose tests');
      }
    } catch (postError) {
      console.error('Error posting glucose data:', postError);
      setError(postError instanceof Error ? postError.message : 'Failed to post glucose data');
    }
  };

  const connectToDevice = async (device: BluetoothDevice) => {
    setIsReading(true); // Set isReading ke true saat mulai membaca
    try {
      setError('');

      // Memeriksa jika perangkat sudah dipasangkan sebelumnya
      const bluetoothDevice = await (navigator).bluetooth.requestDevice({
        filters: [{ name: device.name || undefined }],
        optionalServices: [
          GLUCOSE_SERVICE,
          '0000180d-0000-1000-8000-00805f9b34fb',
          '0000180f-0000-1000-8000-00805f9b34fb'
        ]
      });

      // Cek jika perangkat sudah dipasangkan sebelumnya, seharusnya sudah bisa langsung terhubung
      if (bluetoothDevice.gatt && bluetoothDevice.gatt.connected) {
        console.log('Device already connected');
        setActiveConnection(bluetoothDevice.gatt);
        setIsConnected(true); // Status koneksi diperbarui ke "Connected"
        setConnectionStatus('Connected to ' + device.name);
        return;
      }

      // Lanjutkan koneksi jika perangkat belum terhubung
      if (!bluetoothDevice.gatt) {
        throw new Error('GATT server is not available on this device.');
      }
      const server = await bluetoothDevice.gatt.connect();
      console.log('Connected to GATT server');

      // Mulai notifikasi glukosa setelah terhubung
      await startGlucoseNotifications(server);

      // Set koneksi aktif
      setActiveConnection(server);
      setIsConnected(true); // Status koneksi diperbarui ke "Connected"
      setConnectedDevice(device.name);
      localStorage.setItem('connectedDevice', JSON.stringify({ id: device.id, name: device.name }));

      // Perbarui status koneksi
      setConnectionStatus('Connected to ' + device.name);

      // Tambahkan event listener untuk disconnection pada perangkat bluetooth
      bluetoothDevice.addEventListener('gattserverdisconnected', handleDeviceDisconnection);
    } catch (error) {
      console.error('Connection error:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect to device');
      setIsConnected(false);
      setConnectedDevice(null);
      setActiveConnection(null);
      setConnectionStatus('Disconnected'); // Pastikan status diperbarui saat gagal
    } finally {
      setIsReading(false); // Set isReading ke false setelah selesai
    }
  };

  // Helper function to parse SFLOAT if needed separately
  const startGlucoseNotifications = async (server: BluetoothRemoteGATTServer) => {
    try {
      setIsReading(true);

      // Mendapatkan layanan glukosa dari server perangkat
      const glucoseService = await server.getPrimaryService(GLUCOSE_SERVICE);
      const glucoseCharacteristic = await glucoseService.getCharacteristic(GLUCOSE_MEASUREMENT);

      // Aktifkan indications untuk mendapatkan data glukosa
      glucoseCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
        try {
          const target = event.target;
          if (!target) return;
          const value = (target as BluetoothRemoteGATTCharacteristic).value;
          if (value) {
          } else {
            console.error('Received undefined value for glucose data');
            return;
          }
          const reading = parseGlucoseData(value);
          console.log('New glucose reading:', reading);
          setGlucoseReadings(prev => [...prev, reading]);
        } catch (error) {
          console.error('Error parsing glucose data:', error);
        }
      });

      await glucoseCharacteristic.startNotifications();

      // Coba untuk mendapatkan konteks glukosa jika tersedia
      try {
        const glucoseContextChar = await glucoseService.getCharacteristic(GLUCOSE_CONTEXT);
        await glucoseContextChar.startNotifications();

        glucoseContextChar.addEventListener('characteristicvaluechanged', (event) => {
          // Tangani data konteks glukosa jika dibutuhkan (seperti informasi waktu makan, dll.)
          const target = event.target;
          if (!target) return;
          const contextValue = (target as BluetoothRemoteGATTCharacteristic).value;
          console.log('Glucose context data received:', contextValue) // Anda dapat mengolah contextValue jika ingin menampilkan data tambahan
        });
      } catch {
        console.log('Glucose context not available:', error);
      }

      console.log('Started glucose notifications successfully');
    } catch (error) {
      console.error('Error starting glucose notifications:', error);
      setError('Failed to start glucose readings: ' + (error instanceof Error ? error.message : String(error)));
      setIsReading(false);
    }
  };

  const scanDevices = async () => {
    try {
      setIsScanning(true);
      setError('');

      const device = await (navigator).bluetooth.requestDevice({
        filters: [
          { services: [GLUCOSE_SERVICE] }  // Filter for glucose service
        ],
        optionalServices: [
          GLUCOSE_SERVICE,
          '0000180d-0000-1000-8000-00805f9b34fb',
          '0000180f-0000-1000-8000-00805f9b34fb'
        ]
      });

      device.addEventListener('gattserverdisconnected', () => {
        setIsConnected(false);
        setConnectedDevice(null);
        setActiveConnection(null);
        setIsReading(false);
        localStorage.removeItem('connectedDevice');
        setReconnectDevice(null);
      });

      setDevices(prevDevices => {
        const deviceExists = prevDevices.some(d => d.id === device.id);
        if (!deviceExists) {
          return [...prevDevices, {
            id: device.id,
            name: device.name || 'Unknown Device'
          }];
        }
        return prevDevices;
      });

    } catch (error) {
      console.error('Error scanning:', error);
      setError(error instanceof Error ? error.message : 'Failed to scan devices');
    } finally {
      setIsScanning(false);
    }
  };

  const handleReconnect = async () => {
    if (!reconnectDevice) return;

    try {
      // Scan for devices and attempt to find the previously connected device
      await scanDevices();

      // Find the device in the newly scanned list
      const device = devices.find(d => d.id === reconnectDevice.id);

      if (device) {
        await connectToDevice(device);
      } else {
        setError('Reconnection failed: Device not found. Please scan again.');
      }
    } catch (error) {
      console.error('Reconnection error:', error);
      setError(error instanceof Error ? error.message : 'Failed to reconnect to device');
    }
  };

  // const handleConfirmDisconnect = async (confirm: boolean) => {
  //   setShowConfirmDisconnect(false);
  //   if (confirm) {
  //     await disconnectDevice();s
  //   }
  // };

  // const disconnectDevice = async () => {
  //   try {
  //     // Properly disconnect from the GATT server if there's an active connection
  //     if (activeConnection) {
  //       await activeConnection.disconnect();
  //     }
  //     // Reset all states
  //     setIsConnected(false);
  //     setConnectedDevice(null);
  //     setSelectedDevice(null);
  //     setDevices([]);
  //     setActiveConnection(null);
  //     localStorage.removeItem('connectedDevice');
  //     setReconnectDevice(null);

  //   } catch (error) {
  //     console.error('Disconnection error:', error);
  //     setError(error instanceof Error ? error.message : 'Failed to disconnect from device');
  //   }
  // };

  return (
    <>
      <Head>
        <title>COSA APP | BTControl</title>
        <link rel="icon" href="/maskot_cosaapp.ico" />
      </Head>
      <div className="flex justify-start items-center gap-2 mb-3">
        <FaBox className='h-5 w-5' />
        <h2 className="text-xl font-semibold">BTControl Contour Plus Elite</h2>
      </div>
      <div className="flex justify-center mb-5 space-x-3">
        <Button
          variant="contained"
          className='w-1/2 flex justify-center mr-2 hover:bg-blue-500 text-white'
          onClick={reconnectDevice && !isConnected ? handleReconnect : scanDevices}
          disabled={isScanning || isConnected}
        >
          <Search className='h-5 w-5 mr-2' />
          <h3 className='font-semibold'>Scan Device</h3>
        </Button>

        <Button
          variant="contained"
          color="error"
          className='w-1/2 flex justify-center bg-red-700 hover:bg-red-500 mx-auto text-white'
          onClick={syncData}
          disabled={!isConnected || isReading || loading}
        >
          <FiRefreshCcw className='h-5 w-5 mr-2' />
          <h3 className='font-semibold'>Sync Data</h3>
        </Button>

      </div>

      {/* Daftar Perangkat */}
      {devices.length > 0 && (
        <div className="space-y-2 mx-auto w-full">
          <h3 className="text-lg font-semibold text-gray-700">Available Devices</h3>
          <FormControl fullWidth variant="outlined">
            <InputLabel id="device-select-label">Select a device</InputLabel>
            <Select
              labelId="device-select-label"
              className='mb-5'
              id="device-select"
              value={selectedDevice || ""}
              onChange={async (event: SelectChangeEvent) => {
                const value = event.target.value;
                setSelectedDevice(value);

                // Panggil fungsi connectToDevice dan pastikan status koneksi diperbarui
                const device = devices.find(d => d.id === value);
                if (device) {
                  await connectToDevice(device);
                } else {
                  setError('Device not found');
                }
              }}
              label="Select a device"
            >
              {devices.map((device) => (
                <MenuItem key={device.id} value={device.id}>
                  {device.name || 'Unknown Device'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
      )}

      {/* Status Koneksi */}
      <div className='flex w-full mx-auto space-x-3'>
        <div
          className={`p-4 rounded-md shadow-md flex items-center justify-between mx-auto w-full ${isConnected ? 'bg-green-100' : 'bg-red-100'
            }`}
        >
          <span
            className={`font-semibold ${isConnected ? 'text-green-700' : 'text-red-700 animation-pulse'
              }`}
          >
            Status: {connectionStatus}
          </span>
        </div>
      </div>

      {error.length > 0 && (
        <div className='flex w-full mx-auto mt-5'>
          <div className={`p-4 rounded-md shadow-md flex items-center justify-between mx-auto w-full ${error ? 'bg-red-100' : 'bg-red-100'}`}>
            <span className={`font-semibold text-red-700 text-sm}`}>
              {error && <div className="error">{error}</div>}
            </span>
          </div>
        </div>
      )}

      <PatientForm
        glucoseReadings={glucoseReadings}
        onGlucoseTestSaved={() => {
          setGlucoseReadings([]);
        }}
      />


      {/* Tabel Pembacaan Glukosa */}
      {glucoseReadings.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Glucose Result</h3>
          <table className="min-w-full bg-white border border-gray-300 rounded shadow">
            <thead>
              <tr className="bg-gray-200 text-gray-700">
                <th className="px-4 py-2 border">No</th>
                <th className="px-4 py-2 border">Tanggal & Waktu</th>
                <th className="px-4 py-2 border">Nilai Glukosa</th>
                <th className="px-4 py-2 border">Satuan</th>
              </tr>
            </thead>
            <tbody>
              {glucoseReadings.map((reading, index) => (
                <tr key={index} className="text-center hover:bg-gray-100">
                  <td className="px-4 py-2 border">{index + 1}</td>
                  <td className="px-4 py-2 border">{reading.formattedTimestamp}</td>
                  <td className="px-4 py-2 border">{reading.glucoseValue}</td>
                  <td className="px-4 py-2 border">{reading.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={showConfirmDisconnect}
        onClose={() => setShowConfirmDisconnect(false)}
      >
        <DialogTitle>Disconnect Device</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to disconnect from {connectedDevice}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              handleDeviceDisconnection(); // Call the disconnection handler
              setShowConfirmDisconnect(false); // Close dialog after action
            }}
            color="error"
            variant="contained"
          >
            Yes
          </Button>
          <Button
            onClick={() => setShowConfirmDisconnect(false)}
            color="secondary"
            variant="outlined"
          >
            No
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
};

export default BTControlForm;