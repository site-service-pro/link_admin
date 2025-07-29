'use client';
import { useAuth } from '../lib/hooks/useAuth';

export default function Dashboard() {
  const { user } = useAuth();

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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Total Clients</h3>
          <p className="text-2xl font-bold text-blue-600 mt-2">1,234</p>
          <p className="text-xs text-gray-400 mt-1">↗︎ 12% from last month</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Active Drivers</h3>
          <p className="text-2xl font-bold text-green-600 mt-2">89</p>
          <p className="text-xs text-gray-400 mt-1">↗︎ 8% from last month</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
          <p className="text-2xl font-bold text-purple-600 mt-2">$45,678</p>
          <p className="text-xs text-gray-400 mt-1">↗︎ 15% from last month</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Active Bookings</h3>
          <p className="text-2xl font-bold text-yellow-600 mt-2">23</p>
          <p className="text-xs text-gray-400 mt-1">↘︎ 2% from last hour</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">New client registered</p>
                <p className="text-xs text-gray-500">John Doe joined 2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Trip completed</p>
                <p className="text-xs text-gray-500">Driver Mike completed a trip worth $25.50</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Payment received</p>
                <p className="text-xs text-gray-500">$18.75 payment processed successfully</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
