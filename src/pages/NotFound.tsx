import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, RefreshCw } from 'lucide-react';
import Button from '../components/ui/Button';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-neutral-900 px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-md mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img 
            src="/fc256-logo.png" 
            alt="FC256 Logo" 
            className="h-20 w-20 object-contain"
            onError={(e) => {
              // Hide image if it fails to load
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>

        {/* Error Code */}
        <h1 className="text-6xl font-bold bg-gradient-to-r from-primary-600 via-yellow-500 to-secondary-600 bg-clip-text text-transparent mb-4">
          404
        </h1>
        
        {/* Error Message */}
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Page Not Found
        </h2>
        
        <p className="text-base text-gray-500 dark:text-gray-400 mb-8">
          Sorry, we couldn't find the page you're looking for. The page may have been moved, deleted, or you may have entered an incorrect URL.
        </p>

        {/* Action Buttons */}
        <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
          <Link to="/" className="block sm:inline-block">
            <Button 
              leftIcon={<Home size={18} />}
              className="w-full sm:w-auto bg-gradient-to-r from-primary-600 to-yellow-500 hover:from-primary-700 hover:to-yellow-600 text-white"
            >
              Go to Dashboard
            </Button>
          </Link>
          
          <Button
            variant="outline"
            leftIcon={<ArrowLeft size={18} />}
            onClick={handleGoBack}
            className="w-full sm:w-auto"
          >
            Go Back
          </Button>
          
          <Button
            variant="ghost"
            leftIcon={<RefreshCw size={18} />}
            onClick={handleRefresh}
            className="w-full sm:w-auto"
          >
            Refresh Page
          </Button>
        </div>

        {/* Help Text */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Having trouble?</strong> Try refreshing the page or clearing your browser cache. 
            If the problem persists, please contact your team administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;