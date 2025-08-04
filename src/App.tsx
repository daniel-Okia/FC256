import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import CreateAdmin from './pages/setup/CreateAdmin';
import InitializeAccounts from './pages/setup/InitializeAccounts';
import Dashboard from './pages/dashboard/Dashboard';
import Members from './pages/members/Members';
import MemberDetail from './pages/members/MemberDetail';
import Training from './pages/training/Training';
import Friendlies from './pages/friendlies/Friendlies';
import Leadership from './pages/leadership/Leadership';
import Transactions from './pages/transactions/Transactions';
import MembershipFees from './pages/membership-fees/MembershipFees';
import Attendance from './pages/attendance/Attendance';
import Profile from './pages/profile/Profile';
import Inventory from './pages/inventory/Inventory';
import PlayerAnalytics from './pages/analytics/PlayerAnalytics';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router basename="/">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/setup/admin" element={<CreateAdmin />} />
          <Route path="/setup/accounts" element={<InitializeAccounts />} />
          
          {/* Protected routes with layout */}
          <Route element={<Layout />}>
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/members" 
              element={
                <ProtectedRoute>
                  <Members />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/members/:id" 
              element={
                <ProtectedRoute>
                  <MemberDetail />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/training" 
              element={
                <ProtectedRoute>
                  <Training />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/friendlies" 
              element={
                <ProtectedRoute>
                  <Friendlies />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/leadership" 
              element={
                <ProtectedRoute>
                  <Leadership />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/transactions" 
              element={
                <ProtectedRoute>
                  <Transactions />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/membership-fees" 
              element={
                <ProtectedRoute>
                  <MembershipFees />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/attendance" 
              element={
                <ProtectedRoute>
                  <Attendance />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/inventory" 
              element={
                <ProtectedRoute>
                  <Inventory />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/analytics" 
              element={
                <ProtectedRoute>
                  <PlayerAnalytics />
                </ProtectedRoute>
              } 
            />
          </Route>
          
          {/* Fallback routes */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404\" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;