import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, error } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Show error state if there's an authentication error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900 px-4">
        <div className="text-center max-w-md">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Authentication Error
            </h2>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4">
              {error}
            </p>
            <div className="space-y-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => window.location.href = '/login'}
                className="w-full px-4 py-2 border border-red-300 text-red-700 dark:text-red-300 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render protected content
  return <>{children}</>;
};

export default ProtectedRoute;