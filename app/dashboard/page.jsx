'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../lib/hooks/useAuth';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import {
  Users,
  Car,
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalClients: 0,
    totalDrivers: 0,
    activeDrivers: 0,
    totalRevenue: 0,
    activeBookings: 0,
    kycPending: 0,
    kycVerified: 0,
    kycRejected: 0,
    kycSubmitted: 0,
    kycNotSubmitted: 0,
    vehicleActive: 0,
    vehicleInactive: 0,
    vehiclesWithoutInfo: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Helper function to determine KYC display status
  const getKYCDisplayStatus = (kycApproved, kycStatus, documentCount) => {
    if (typeof kycApproved === 'boolean') {
      return kycApproved ? 'verified' : 'pending';
    }
    if (documentCount > 0 && (!kycStatus || kycStatus === 'not-submitted')) {
      return 'submitted';
    }
    return kycStatus || 'not-submitted';
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch all users from the 'users' collection
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const usersSnapshot = await getDocs(usersQuery);
      const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Separate drivers and clients based on role
      const driversData = usersData.filter(user => user.role === 'driver');
      const clientsData = usersData.filter(user => user.role === 'client' || user.role === 'customer' || !user.role);

      // Fetch KYC documents and vehicles for each driver
      const driversWithDetails = await Promise.all(
        driversData.map(async (driver) => {
          try {
            // 1. Fetch KYC documents from 'kyc' subcollection
            const kycQuery = collection(db, 'users', driver.id, 'kyc');
            const kycSnapshot = await getDocs(kycQuery);
            let kycDocuments = {};
            kycSnapshot.forEach(doc => {
              const docData = doc.data();
              kycDocuments[doc.id] = {
                url: docData.url || docData.photoUrl || docData.fileUrl || docData.documentUrl,
                uploadedAt: docData.uploadedAt || docData.createdAt,
                type: docData.type || doc.id,
                ...docData
              };
            });

            // 2. Fetch vehicle from 'vehicles' subcollection
            const vehiclesQuery = collection(db, 'users', driver.id, 'vehicles');
            const vehiclesSnapshot = await getDocs(vehiclesQuery);
            let vehicle = null;
            if (!vehiclesSnapshot.empty) {
              const vehicleDoc = vehiclesSnapshot.docs[0];
              vehicle = { id: vehicleDoc.id, ...vehicleDoc.data() };
            }

            return {
              ...driver,
              kycDocuments,
              vehicle,
              kycDocumentCount: Object.keys(kycDocuments).length
            };
          } catch (error) {
            console.error(`Error fetching details for driver ${driver.id}:`, error);
            return {
              ...driver,
              kycDocuments: {},
              vehicle: null,
              kycDocumentCount: 0
            };
          }
        })
      );

      // Calculate statistics based on your actual data structure
      const totalDrivers = driversWithDetails.length;
      const activeDrivers = driversWithDetails.filter(d => d.is_active !== false).length;
      
      // KYC Statistics using the same logic as your drivers table
      let kycVerified = 0;
      let kycPending = 0;
      let kycRejected = 0;
      let kycSubmitted = 0;
      let kycNotSubmitted = 0;

      driversWithDetails.forEach(driver => {
        const kycStatus = getKYCDisplayStatus(driver.kyc_approved, driver.kycStatus, driver.kycDocumentCount);
        
        switch (kycStatus) {
          case 'verified':
            kycVerified++;
            break;
          case 'pending':
            kycPending++;
            break;
          case 'rejected':
            kycRejected++;
            break;
          case 'submitted':
            kycSubmitted++;
            break;
          default:
            kycNotSubmitted++;
        }
      });

      // Vehicle Statistics
      const vehicleActive = driversWithDetails.filter(d => d.vehicleActive !== false && d.vehicle).length;
      const vehicleInactive = driversWithDetails.filter(d => d.vehicleActive === false && d.vehicle).length;
      const vehiclesWithoutInfo = driversWithDetails.filter(d => !d.vehicle).length;

      // Update stats
      setStats({
        totalClients: clientsData.length,
        totalDrivers,
        activeDrivers,
        totalRevenue: 45678, // You can calculate from bookings collection
        activeBookings: 23, // You can calculate from bookings collection
        kycPending,
        kycVerified,
        kycRejected,
        kycSubmitted,
        kycNotSubmitted,
        vehicleActive,
        vehicleInactive,
        vehiclesWithoutInfo,
      });

      // Generate monthly registration data (you can make this dynamic based on actual creation dates)
      const monthlyData = generateMonthlyRegistrationData(driversWithDetails, clientsData);
      setChartData(monthlyData);

      // Updated pie chart data for KYC status distribution
      setPieData([
        { name: 'Verified', value: kycVerified, color: '#10b981' },
        { name: 'Pending', value: kycPending, color: '#f59e0b' },
        { name: 'Rejected', value: kycRejected, color: '#ef4444' },
        { name: 'Submitted', value: kycSubmitted, color: '#3b82f6' },
        { name: 'Not Submitted', value: kycNotSubmitted, color: '#6b7280' },
      ]);

      // Sample revenue data (you can replace with real data from bookings)
      setRevenueData([
        { day: 'Mon', revenue: 2400, bookings: 12 },
        { day: 'Tue', revenue: 1398, bookings: 8 },
        { day: 'Wed', revenue: 9800, bookings: 22 },
        { day: 'Thu', revenue: 3908, bookings: 18 },
        { day: 'Fri', revenue: 4800, bookings: 25 },
        { day: 'Sat', revenue: 3800, bookings: 20 },
        { day: 'Sun', revenue: 4300, bookings: 19 },
      ]);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
    setLoading(false);
  };

  // Generate monthly registration data based on creation dates
  const generateMonthlyRegistrationData = (drivers, clients) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    
    const monthlyStats = months.map(month => ({ month, drivers: 0, clients: 0 }));

    // Count drivers by month
    drivers.forEach(driver => {
      if (driver.createdAt) {
        const date = driver.createdAt.toDate ? driver.createdAt.toDate() : new Date(driver.createdAt);
        if (date.getFullYear() === currentYear) {
          const monthIndex = date.getMonth();
          monthlyStats[monthIndex].drivers++;
        }
      }
    });

    // Count clients by month
    clients.forEach(client => {
      if (client.createdAt) {
        const date = client.createdAt.toDate ? client.createdAt.toDate() : new Date(client.createdAt);
        if (date.getFullYear() === currentYear) {
          const monthIndex = date.getMonth();
          monthlyStats[monthIndex].clients++;
        }
      }
    });

    return monthlyStats.slice(0, 6); // Show last 6 months
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.email}!
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your car booking platform today.
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalClients}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              Registered users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalDrivers}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <span className="text-green-600">{stats.activeDrivers} active</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">${stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              15% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.activeBookings}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingDown className="w-3 h-3 mr-1" />
              Current active trips
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Driver Management Stats - Updated with Real Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KYC Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.kycVerified}</div>
            <p className="text-xs text-muted-foreground">Approved drivers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KYC Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.kycPending}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KYC Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.kycRejected}</div>
            <p className="text-xs text-muted-foreground">Need resubmission</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KYC Submitted</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.kycSubmitted}</div>
            <p className="text-xs text-muted-foreground">Documents uploaded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Vehicles</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.vehicleActive}</div>
            <p className="text-xs text-muted-foreground">Vehicles in service</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Vehicles</CardTitle>
            <XCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.vehicleInactive}</div>
            <p className="text-xs text-muted-foreground">Vehicles offline</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registration Trends - Updated with Real Data */}
        <Card>
          <CardHeader>
            <CardTitle>Registration Trends</CardTitle>
            <CardDescription>Driver and client registrations over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                drivers: {
                  label: "Drivers",
                  color: "#3b82f6",
                },
                clients: {
                  label: "Clients",
                  color: "#10b981",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="drivers" fill="#3b82f6" radius={4} />
                  <Bar dataKey="clients" fill="#10b981" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* KYC Status Distribution - Updated with Real Data */}
        <Card>
          <CardHeader>
            <CardTitle>KYC Status Distribution</CardTitle>
            <CardDescription>Current driver verification status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                verified: { label: "Verified", color: "#10b981" },
                pending: { label: "Pending", color: "#f59e0b" },
                rejected: { label: "Rejected", color: "#ef4444" },
                submitted: { label: "Submitted", color: "#3b82f6" },
                notSubmitted: { label: "Not Submitted", color: "#6b7280" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Revenue & Bookings</CardTitle>
          <CardDescription>Revenue and booking trends for the past week</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              revenue: {
                label: "Revenue",
                color: "#8b5cf6",
              },
              bookings: {
                label: "Bookings",
                color: "#06b6d4",
              },
            }}
            className="h-[400px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <XAxis dataKey="day" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.3}
                />
                <Line
                  type="monotone"
                  dataKey="bookings"
                  stroke="#06b6d4"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Recent Activity - Enhanced with Real Context */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">New driver KYC submitted</p>
                <p className="text-xs text-gray-500">Driver uploaded {stats.kycSubmitted > 0 ? 'documents' : 'no documents'} for verification</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">KYC verification completed</p>
                <p className="text-xs text-gray-500">{stats.kycVerified} drivers currently verified</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Vehicle status updated</p>
                <p className="text-xs text-gray-500">{stats.vehicleActive} vehicles are currently active</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Platform status</p>
                <p className="text-xs text-gray-500">{stats.activeDrivers} active drivers ready for bookings</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
