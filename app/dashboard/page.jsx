'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../lib/hooks/useAuth';
import { collection, getDocs, query, where } from 'firebase/firestore';
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
  AlertTriangle
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalClients: 0,
    activeDrivers: 0,
    totalRevenue: 0,
    activeBookings: 0,
    kycPending: 0,
    kycVerified: 0,
    kycRejected: 0,
    vehiclePending: 0,
    vehicleVerified: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch drivers
      const driversSnapshot = await getDocs(collection(db, 'drivers'));
      const driversData = driversSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch users/clients
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate stats
      const activeDrivers = driversData.filter(d => d.is_active).length;
      const kycPending = driversData.filter(d => d.kycStatus === 'pending').length;
      const kycVerified = driversData.filter(d => d.kycStatus === 'verified').length;
      const kycRejected = driversData.filter(d => d.kycStatus === 'rejected').length;
      const vehiclePending = driversData.filter(d => d.vehicleStatus === 'pending').length;
      const vehicleVerified = driversData.filter(d => d.vehicleStatus === 'verified').length;

      setStats({
        totalClients: usersData.length,
        activeDrivers,
        totalRevenue: 45678, // You can calculate this from bookings/payments collection
        activeBookings: 23, // You can calculate this from bookings collection
        kycPending,
        kycVerified,
        kycRejected,
        vehiclePending,
        vehicleVerified,
      });

      // Chart data for driver registrations over months
      setChartData([
        { month: 'Jan', drivers: 12, clients: 45 },
        { month: 'Feb', drivers: 19, clients: 52 },
        { month: 'Mar', drivers: 25, clients: 68 },
        { month: 'Apr', drivers: 31, clients: 74 },
        { month: 'May', drivers: 28, clients: 81 },
        { month: 'Jun', drivers: 35, clients: 95 },
      ]);

      // Pie chart data for KYC status
      setPieData([
        { name: 'Verified', value: kycVerified, color: '#10b981' },
        { name: 'Pending', value: kycPending, color: '#f59e0b' },
        { name: 'Rejected', value: kycRejected, color: '#ef4444' },
        { name: 'Not Submitted', value: driversData.length - kycVerified - kycPending - kycRejected, color: '#6b7280' },
      ]);

      // Revenue data for area chart
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

  if (loading) {
    return <div className="p-6 text-center">Loading dashboard...</div>;
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
              12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeDrivers}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              8% from last month
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
              2% from last hour
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Driver Management Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <CardTitle className="text-sm font-medium">Vehicle Pending</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.vehiclePending}</div>
            <p className="text-xs text-muted-foreground">Vehicle verification</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registration Trends */}
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

        {/* KYC Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>KYC Status Distribution</CardTitle>
            <CardDescription>Current driver verification status</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                verified: { label: "Verified", color: "#10b981" },
                pending: { label: "Pending", color: "#f59e0b" },
                rejected: { label: "Rejected", color: "#ef4444" },
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

      {/* Recent Activity */}
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
                <p className="text-xs text-gray-500">John Doe submitted documents 2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Driver verified successfully</p>
                <p className="text-xs text-gray-500">Mike Wilson's KYC approved 5 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Vehicle verification pending</p>
                <p className="text-xs text-gray-500">Sarah Davis uploaded vehicle documents</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Trip completed</p>
                <p className="text-xs text-gray-500">Driver completed a trip worth $25.50</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
