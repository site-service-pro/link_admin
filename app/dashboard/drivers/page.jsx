'use client';
import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase/config';
import {
  Eye, Download, FileText, Car, CheckCircle, XCircle, Clock, User, MoreVertical, 
  Filter, Search, ArrowUpDown
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import DriversTableFilter from '../../components/DriversTableFilter';

export default function DriversAdminPage() {
  const [drivers, setDrivers] = useState([]);
  const [filteredDrivers, setFilteredDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showDocuments, setShowDocuments] = useState(false);
  
  // Table filtering states
  const [tableFilters, setTableFilters] = useState({
    name: '',
    vehicle: '',
    kycStatus: '',
    vehicleStatus: '',
    status: ''
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  useEffect(() => {
    fetchDriversWithKycAndVehicles();
  }, []);

  useEffect(() => {
    applyTableFilters();
  }, [drivers, tableFilters, sortConfig]);

  // Apply table-specific filters
  const applyTableFilters = () => {
    let filtered = [...drivers];

    // Apply table filters
    if (tableFilters.name) {
      filtered = filtered.filter(driver =>
        driver.name?.toLowerCase().includes(tableFilters.name.toLowerCase()) ||
        driver.email?.toLowerCase().includes(tableFilters.name.toLowerCase())
      );
    }

    if (tableFilters.vehicle) {
      filtered = filtered.filter(driver =>
        driver.vehicle?.brand?.toLowerCase().includes(tableFilters.vehicle.toLowerCase()) ||
        driver.vehicle?.model?.toLowerCase().includes(tableFilters.vehicle.toLowerCase()) ||
        driver.vehicle?.number?.toLowerCase().includes(tableFilters.vehicle.toLowerCase())
      );
    }

    if (tableFilters.kycStatus) {
      filtered = filtered.filter(driver => {
        const status = driver.kycStatus || 'not-submitted';
        return status === tableFilters.kycStatus;
      });
    }

    if (tableFilters.vehicleStatus) {
      filtered = filtered.filter(driver => {
        const status = driver.vehicleStatus || 'not-submitted';
        return status === tableFilters.vehicleStatus;
      });
    }

    if (tableFilters.status) {
      filtered = filtered.filter(driver => {
        if (tableFilters.status === 'active') return driver.is_active;
        if (tableFilters.status === 'inactive') return !driver.is_active;
        return true;
      });
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'name') {
          aValue = a.name || '';
          bValue = b.name || '';
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredDrivers(filtered);
  };

  // Handle external filter changes from DriversFilter component
  const handleFilterChange = (filters) => {
    let filtered = [...drivers];

    // Search filter
    if (filters.searchTerm) {
      filtered = filtered.filter(driver =>
        driver.name?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        driver.email?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        driver.phone?.includes(filters.searchTerm)
      );
    }

    // Status filter
    if (filters.statusFilter !== 'all') {
      filtered = filtered.filter(driver => {
        if (filters.statusFilter === 'active') return driver.is_active;
        if (filters.statusFilter === 'inactive') return !driver.is_active;
        return true;
      });
    }

    // KYC filter
    if (filters.kycFilter !== 'all') {
      filtered = filtered.filter(driver => {
        const kycStatus = driver.kycStatus || 'not-submitted';
        return kycStatus === filters.kycFilter;
      });
    }

    // Vehicle filter
    if (filters.vehicleFilter !== 'all') {
      filtered = filtered.filter(driver => {
        const vehicleStatus = driver.vehicleStatus || 'not-submitted';
        return vehicleStatus === filters.vehicleFilter;
      });
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(driver => {
        if (!driver.createdAt) return false;
        
        const driverDate = driver.createdAt.toDate ? driver.createdAt.toDate() : new Date(driver.createdAt);
        
        switch (filters.dateRange) {
          case 'today':
            return driverDate >= today;
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return driverDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
            return driverDate >= monthAgo;
          case 'quarter':
            const quarterAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
            return driverDate >= quarterAgo;
          default:
            return true;
        }
      });
    }

    setFilteredDrivers(filtered);
  };

  // Handle table filter changes
  const handleTableFilterChange = (column, value) => {
    setTableFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  // Handle sorting
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Fetch drivers with their KYC documents and vehicles
  const fetchDriversWithKycAndVehicles = async () => {
    setLoading(true);
    try {
      const driversQuery = query(collection(db, 'drivers'), orderBy('createdAt', 'desc'));
      const driversSnapshot = await getDocs(driversQuery);

      const driversData = await Promise.all(
        driversSnapshot.docs.map(async (driverDoc) => {
          const driverData = driverDoc.data();
          const driverId = driverDoc.id;

          // 1. Fetch KYC documents from 'kyc' subcollection
          const kycQuery = collection(db, 'drivers', driverId, 'kyc');
          const kycSnapshot = await getDocs(kycQuery);
          let kycDocuments = {};
          kycSnapshot.forEach(doc => {
            const docData = doc.data();
            kycDocuments[doc.id] = docData.url || docData.photoUrl || docData.fileUrl || docData.documentUrl;
          });

          // 2. Fetch vehicle from 'vehicles' subcollection
          const vehiclesQuery = collection(db, 'drivers', driverId, 'vehicles');
          const vehiclesSnapshot = await getDocs(vehiclesQuery);
          let vehicle = null;
          if (!vehiclesSnapshot.empty) {
            const vehicleDoc = vehiclesSnapshot.docs[0];
            vehicle = { id: vehicleDoc.id, ...vehicleDoc.data() };
          }

          return {
            id: driverId,
            ...driverData,
            kycDocuments,
            vehicle,
          };
        })
      );

      setDrivers(driversData);
      setFilteredDrivers(driversData); // Initialize filtered drivers
    } catch (error) {
      console.error('Error fetching drivers, KYC, and vehicles:', error);
    }
    setLoading(false);
  };

  // Toggle driver status (activate/deactivate)
  const setDriverStatus = async (driverId, newStatus) => {
    try {
      await updateDoc(doc(db, 'drivers', driverId), {
        is_active: newStatus,
        updatedAt: new Date(),
      });
      const updatedDrivers = drivers.map(driver =>
        driver.id === driverId ? { ...driver, is_active: newStatus } : driver
      );
      setDrivers(updatedDrivers);
      
      // Update filtered drivers too
      setFilteredDrivers(prevFiltered => 
        prevFiltered.map(driver =>
          driver.id === driverId ? { ...driver, is_active: newStatus } : driver
        )
      );
    } catch (error) {
      console.error('Error updating driver status:', error);
    }
  };

  // Update KYC verification status
  const updateKYCStatus = async (driverId, status) => {
    try {
      await updateDoc(doc(db, 'drivers', driverId), {
        kycStatus: status,
        kycVerifiedAt: status === 'verified' ? new Date() : null,
        updatedAt: new Date(),
      });
      const updatedDrivers = drivers.map(driver =>
        driver.id === driverId ? { ...driver, kycStatus: status } : driver
      );
      setDrivers(updatedDrivers);
      
      // Update filtered drivers too
      setFilteredDrivers(prevFiltered =>
        prevFiltered.map(driver =>
          driver.id === driverId ? { ...driver, kycStatus: status } : driver
        )
      );
    } catch (error) {
      console.error('Error updating KYC status:', error);
    }
  };

  // Update vehicle verification status
  const updateVehicleStatus = async (driverId, status) => {
    try {
      await updateDoc(doc(db, 'drivers', driverId), {
        vehicleStatus: status,
        vehicleVerifiedAt: status === 'verified' ? new Date() : null,
        updatedAt: new Date(),
      });
      const updatedDrivers = drivers.map(driver =>
        driver.id === driverId ? { ...driver, vehicleStatus: status } : driver
      );
      setDrivers(updatedDrivers);
      
      // Update filtered drivers too
      setFilteredDrivers(prevFiltered =>
        prevFiltered.map(driver =>
          driver.id === driverId ? { ...driver, vehicleStatus: status } : driver
        )
      );
    } catch (error) {
      console.error('Error updating vehicle status:', error);
    }
  };

  // Status badge helper
  const getStatusBadge = (status) => {
    const statusConfig = {
      verified: { color: 'bg-green-100 text-green-700', icon: CheckCircle, text: 'Verified' },
      rejected: { color: 'bg-red-100 text-red-700', icon: XCircle, text: 'Rejected' },
      pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, text: 'Pending' },
      incomplete: { color: 'bg-orange-100 text-orange-700', icon: FileText, text: 'Incomplete' },
      'not-submitted': { color: 'bg-gray-100 text-gray-500', icon: FileText, text: 'Not Submitted' }
    };
    const config = statusConfig[status] || statusConfig['not-submitted'];
    const IconComponent = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${config.color}`}>
        <IconComponent className="w-3 h-3" />
        {config.text}
      </span>
    );
  };

  // Show modal
  const viewDocuments = (driver) => {
    setSelectedDriver(driver);
    setShowDocuments(true);
  };

  // Format document name for display
  const formatDocumentName = (docId) => {
    return docId
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace('Id', 'ID');
  };

  // Three-dot dropdown menu component
  const ActionsDropdown = ({ driver }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <MoreVertical className="w-4 h-4 text-gray-600" />
        </button>
        
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            ></div>
            <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
              <div className="py-1">
                <button
                  onClick={() => {
                    viewDocuments(driver);
                    setIsOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Eye className="w-4 h-4 mr-3" />
                  View Details
                </button>
                
                <div className="border-t border-gray-100 my-1"></div>
                
                {driver.kycStatus === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        updateKYCStatus(driver.id, 'verified');
                        setIsOpen(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4 mr-3" />
                      Approve KYC
                    </button>
                    <button
                      onClick={() => {
                        updateKYCStatus(driver.id, 'rejected');
                        setIsOpen(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                    >
                      <XCircle className="w-4 h-4 mr-3" />
                      Reject KYC
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                  </>
                )}
                
                {driver.vehicleStatus === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        updateVehicleStatus(driver.id, 'verified');
                        setIsOpen(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 transition-colors"
                    >
                      <Car className="w-4 h-4 mr-3" />
                      Approve Vehicle
                    </button>
                    <button
                      onClick={() => {
                        updateVehicleStatus(driver.id, 'rejected');
                        setIsOpen(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                    >
                      <XCircle className="w-4 h-4 mr-3" />
                      Reject Vehicle
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                  </>
                )}
                
                <button
                  onClick={() => {
                    setDriverStatus(driver.id, !driver.is_active);
                    setIsOpen(false);
                  }}
                  className={`flex items-center w-full px-4 py-2 text-sm transition-colors ${
                    driver.is_active 
                      ? 'text-red-700 hover:bg-red-50' 
                      : 'text-green-700 hover:bg-green-50'
                  }`}
                >
                  {driver.is_active ? (
                    <>
                      <XCircle className="w-4 h-4 mr-3" />
                      Deactivate Driver
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-3" />
                      Activate Driver
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading drivers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Drivers Management</h1>
          <p className="text-gray-600 mt-1">Manage driver registrations, KYC verification, and vehicle approvals</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{drivers.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KYC Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {drivers.filter(d => d.kycStatus === 'pending').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KYC Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {drivers.filter(d => d.kycStatus === 'verified').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {drivers.filter(d => d.is_active).length}
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Enhanced Table with In-Table Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Drivers ({filteredDrivers.length})</CardTitle>
          <CardDescription>
            Complete list of registered drivers with their verification status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center space-x-1 text-left hover:text-blue-600"
                      >
                        <span>Driver</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="mt-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Filter by name..."
                          value={tableFilters.name}
                          onChange={(e) => handleTableFilterChange('name', e.target.value)}
                          className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </TableHead>
                  
                  <TableHead>
                    <div className="flex items-center space-x-2">
                      <span>Vehicle</span>
                    </div>
                    <div className="mt-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Filter vehicle..."
                          value={tableFilters.vehicle}
                          onChange={(e) => handleTableFilterChange('vehicle', e.target.value)}
                          className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </TableHead>
                  
                  <TableHead>
                    <div className="flex items-center space-x-2">
                      <span>KYC Status</span>
                    </div>
                    <div className="mt-2">
                      <select
                        value={tableFilters.kycStatus}
                        onChange={(e) => handleTableFilterChange('kycStatus', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">All KYC</option>
                        <option value="pending">Pending</option>
                        <option value="verified">Verified</option>
                        <option value="rejected">Rejected</option>
                        <option value="not-submitted">Not Submitted</option>
                      </select>
                    </div>
                  </TableHead>
                  
                  <TableHead>
                    <div className="flex items-center space-x-2">
                      <span>Vehicle Status</span>
                    </div>
                    <div className="mt-2">
                      <select
                        value={tableFilters.vehicleStatus}
                        onChange={(e) => handleTableFilterChange('vehicleStatus', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">All Vehicle</option>
                        <option value="pending">Pending</option>
                        <option value="verified">Verified</option>
                        <option value="rejected">Rejected</option>
                        <option value="not-submitted">Not Submitted</option>
                      </select>
                    </div>
                  </TableHead>
                  
                  <TableHead>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleSort('createdAt')}
                        className="flex items-center space-x-1 text-left hover:text-blue-600"
                      >
                        <span>Joined</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </div>
                  </TableHead>
                  
                  <TableHead>
                    <div className="flex items-center space-x-2">
                      <span>Status</span>
                    </div>
                    <div className="mt-2">
                      <select
                        value={tableFilters.status}
                        onChange={(e) => handleTableFilterChange('status', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </TableHead>
                  
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrivers.map((driver) => (
                  <TableRow key={driver.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {driver.photoUrl ? (
                          <img
                            src={driver.photoUrl}
                            alt={driver.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {driver.name || 'Unnamed Driver'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {driver.email}
                          </p>
                          {driver.phone && (
                            <p className="text-xs text-muted-foreground">
                              {driver.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {driver.vehicle ? (
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {driver.vehicle.brand} {driver.vehicle.model}
                          </p>
                          <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {driver.vehicle.category}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {driver.vehicle.number}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Car className="h-4 w-4" />
                          <span className="text-sm">No vehicle</span>
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-2">
                        {getStatusBadge(driver.kycStatus || 'not-submitted')}
                        <p className="text-xs text-muted-foreground">
                          {Object.keys(driver.kycDocuments || {}).length} docs
                        </p>
                        {driver.kycStatus === 'pending' && (
                          <div className="flex gap-1">
                            <button
                              className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                              onClick={() => updateKYCStatus(driver.id, 'verified')}
                            >
                              Approve
                            </button>
                            <button
                              className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                              onClick={() => updateKYCStatus(driver.id, 'rejected')}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-2">
                        {getStatusBadge(driver.vehicleStatus || 'not-submitted')}
                        {driver.vehicleStatus === 'pending' && (
                          <div className="flex gap-1">
                            <button
                              className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                              onClick={() => updateVehicleStatus(driver.id, 'verified')}
                            >
                              Approve
                            </button>
                            <button
                              className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                              onClick={() => updateVehicleStatus(driver.id, 'rejected')}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <p className="text-sm">
                        {driver.createdAt && driver.createdAt.toDate
                          ? driver.createdAt.toDate().toLocaleDateString()
                          : driver.addedAt || '—'}
                      </p>
                    </TableCell>
                    
                    <TableCell>
                      <span className={`inline-block px-2 py-1 rounded-lg text-xs font-semibold ${
                        driver.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {driver.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <ActionsDropdown driver={driver} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Document Viewer Modal */}
      {showDocuments && selectedDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Driver Details - {selectedDriver.name}</h2>
              <button
                onClick={() => setShowDocuments(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Driver Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Driver Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-center mb-4">
                    {selectedDriver.photoUrl ? (
                      <img
                        src={selectedDriver.photoUrl}
                        alt={selectedDriver.name}
                        className="w-24 h-24 rounded-full object-cover border"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div><strong>Name:</strong> {selectedDriver.name || 'Not provided'}</div>
                  <div><strong>Email:</strong> {selectedDriver.email || 'Not provided'}</div>
                  <div><strong>Phone:</strong> {selectedDriver.phone || 'Not provided'}</div>
                  <div><strong>UID:</strong> {selectedDriver.uid || 'Not provided'}</div>
                  <div>
                    <strong>Status:</strong>
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      selectedDriver.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {selectedDriver.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    <strong>KYC Status:</strong>
                    <span className="ml-2">
                      {getStatusBadge(selectedDriver.kycStatus || 'not-submitted')}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Vehicle Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Vehicle Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {selectedDriver.vehicle ? (
                    <>
                      {selectedDriver.vehicle.photoUrl && (
                        <div className="flex justify-center mb-4">
                          <img
                            src={selectedDriver.vehicle.photoUrl}
                            alt="Vehicle"
                            className="w-24 h-16 object-cover border rounded"
                          />
                        </div>
                      )}
                      <div><strong>Brand:</strong> {selectedDriver.vehicle.brand}</div>
                      <div><strong>Model:</strong> {selectedDriver.vehicle.model}</div>
                      <div><strong>Category:</strong> {selectedDriver.vehicle.category}</div>
                      <div><strong>Type:</strong> {selectedDriver.vehicle.type}</div>
                      <div><strong>Number:</strong> {selectedDriver.vehicle.number}</div>
                      
                      <div>
                        <strong>Vehicle Status:</strong>
                        <span className="ml-2">
                          {getStatusBadge(selectedDriver.vehicleStatus || 'not-submitted')}
                        </span>
                      </div>

                      {selectedDriver.vehicle.documentUrl && (
                        <div className="mt-4">
                          <strong>Vehicle Document:</strong>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => window.open(selectedDriver.vehicle.documentUrl, '_blank')}
                              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              View Document
                            </button>
                            <button
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = selectedDriver.vehicle.documentUrl;
                                link.download = `${selectedDriver.name}_vehicle_document`;
                                link.click();
                              }}
                              className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" />
                              Download
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500">No vehicle information available</p>
                  )}
                </CardContent>
              </Card>

              {/* KYC Documents */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    KYC Documents ({Object.keys(selectedDriver.kycDocuments || {}).length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedDriver.kycDocuments && Object.keys(selectedDriver.kycDocuments).length > 0 ? (
                      Object.entries(selectedDriver.kycDocuments).map(([docType, docUrl]) => (
                        <div key={docType} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">{formatDocumentName(docType)}</span>
                          <div className="flex gap-2">
                            {docUrl ? (
                              <>
                                <button
                                  onClick={() => window.open(docUrl, '_blank')}
                                  className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  View
                                </button>
                                <button
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = docUrl;
                                    link.download = `${selectedDriver.name}_${docType}`;
                                    link.click();
                                  }}
                                  className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-1"
                                >
                                  <Download className="w-3 h-3" />
                                  Download
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-gray-500">No file</span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No KYC documents uploaded</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              {selectedDriver.kycStatus === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      updateKYCStatus(selectedDriver.id, 'verified');
                      setShowDocuments(false);
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve KYC
                  </button>
                  <button
                    onClick={() => {
                      updateKYCStatus(selectedDriver.id, 'rejected');
                      setShowDocuments(false);
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject KYC
                  </button>
                </div>
              )}
              
              {selectedDriver.vehicleStatus === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      updateVehicleStatus(selectedDriver.id, 'verified');
                      setShowDocuments(false);
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
                  >
                    <Car className="w-4 h-4" />
                    Approve Vehicle
                  </button>
                  <button
                    onClick={() => {
                      updateVehicleStatus(selectedDriver.id, 'rejected');
                      setShowDocuments(false);
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject Vehicle
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
