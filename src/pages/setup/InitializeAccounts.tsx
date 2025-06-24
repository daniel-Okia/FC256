import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, User, Key, CheckCircle, AlertCircle, Copy, Eye, EyeOff } from 'lucide-react';
import { 
  initializeHardcodedAccounts, 
  ADMIN_CREDENTIALS, 
  MANAGER_CREDENTIALS 
} from '../../utils/initialize-accounts';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ThemeToggle from '../../components/layout/ThemeToggle';

interface AccountInfo {
  email: string;
  password: string;
  role: string;
}

const InitializeAccounts: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleInitialize = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await initializeHardcodedAccounts();
      
      if (result.success) {
        setSuccess(true);
        setAccounts(result.accounts);
      } else {
        setError(result.message);
      }
    } catch (error: any) {
      console.error('Error initializing accounts:', error);
      setError(error.message || 'Failed to initialize accounts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const togglePasswordVisibility = (email: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [email]: !prev[email]
    }));
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <img 
                src="/fc256-logo.png" 
                alt="FC256 Logo" 
                className="h-20 w-20 object-contain"
              />
            </div>
            
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 via-yellow-500 to-secondary-600 bg-clip-text text-transparent">
              Accounts Initialized!
            </h2>
          </div>
          
          <Card className="animate-fade-in border border-yellow-200 dark:border-yellow-800/30 shadow-lg">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Accounts Created Successfully
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your admin and manager accounts are ready to use. Save these credentials securely.
              </p>
            </div>

            {/* Account Credentials */}
            <div className="space-y-6">
              {accounts.map((account, index) => (
                <div key={account.email} className="bg-gray-50 dark:bg-neutral-700/30 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center mb-4">
                    <div className="flex-shrink-0">
                      {account.role.includes('Admin') ? (
                        <Crown className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                      ) : (
                        <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div className="ml-3">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {account.role}
                      </h4>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email Address
                      </label>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-mono">
                          {account.email}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(account.email, `email-${index}`)}
                          className="flex-shrink-0"
                        >
                          <Copy size={16} />
                          {copiedField === `email-${index}` ? 'Copied!' : ''}
                        </Button>
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Password
                      </label>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-mono">
                          {showPasswords[account.email] ? account.password : '••••••••••••••••••'}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => togglePasswordVisibility(account.email)}
                          className="flex-shrink-0"
                        >
                          {showPasswords[account.email] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(account.password, `password-${index}`)}
                          className="flex-shrink-0"
                        >
                          <Copy size={16} />
                          {copiedField === `password-${index}` ? 'Copied!' : ''}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Security Warning */}
            <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertCircle size={20} className="text-yellow-600 dark:text-yellow-400 mt-0.5" />
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                    Security Notice
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Please save these credentials securely and consider changing the passwords after your first login for enhanced security.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => navigate('/login')}
                fullWidth
                className="bg-gradient-to-r from-primary-600 to-yellow-500 hover:from-primary-700 hover:to-yellow-600 text-white font-semibold"
              >
                Go to Login
              </Button>
              
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                fullWidth
              >
                Initialize Again
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img 
              src="/fc256-logo.png" 
              alt="FC256 Logo" 
              className="h-20 w-20 object-contain"
            />
          </div>
          
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 via-yellow-500 to-secondary-600 bg-clip-text text-transparent">
            Initialize Accounts
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Create hardcoded admin and manager accounts for FC256
          </p>
        </div>
        
        <Card className="animate-fade-in border border-yellow-200 dark:border-yellow-800/30 shadow-lg">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-6">
              <Key className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create Default Accounts
            </h3>
            
            <div className="space-y-4 mb-6">
              {/* Admin Account Preview */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Crown size={20} className="text-yellow-600 dark:text-yellow-400 mr-2" />
                  <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                    Administrator Account
                  </h4>
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Email: {ADMIN_CREDENTIALS.email}
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Name: {ADMIN_CREDENTIALS.userData.name}
                </p>
              </div>

              {/* Manager Account Preview */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <User size={20} className="text-blue-600 dark:text-blue-400 mr-2" />
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Manager Account
                  </h4>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Email: {MANAGER_CREDENTIALS.email}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Name: {MANAGER_CREDENTIALS.userData.name}
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
            )}

            <Button 
              onClick={handleInitialize}
              fullWidth 
              isLoading={isLoading}
              className="bg-gradient-to-r from-primary-600 to-yellow-500 hover:from-primary-700 hover:to-yellow-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isLoading ? 'Creating Accounts...' : 'Initialize Accounts'}
            </Button>

            <div className="mt-6 text-center">
              <Button
                onClick={() => navigate('/login')}
                variant="ghost"
                size="sm"
              >
                Already have accounts? Go to Login
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default InitializeAccounts;