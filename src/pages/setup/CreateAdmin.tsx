import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Crown, User, Mail, Phone, CheckCircle } from 'lucide-react';
import { createCustomAdminUser } from '../../utils/create-admin';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import ThemeToggle from '../../components/layout/ThemeToggle';

interface AdminFormData {
  name: string;
  email: string;
  phone: string;
}

const CreateAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<AdminFormData>({
    defaultValues: {
      name: 'Administrator',
      email: 'admin@fc256.com',
      phone: '+256 700 000 000',
    },
  });

  const onSubmit = async (data: AdminFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      await createCustomAdminUser({
        name: data.name,
        email: data.email,
        phone: data.phone,
      });

      setSuccess(true);
    } catch (error: any) {
      console.error('Error creating admin user:', error);
      setError(error.message || 'Failed to create admin user. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
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
              Admin Created!
            </h2>
          </div>
          
          <Card className="animate-fade-in border border-yellow-200 dark:border-yellow-800/30 shadow-lg">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Admin User Created Successfully
              </h3>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <div className="text-left">
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Admin Credentials:
                  </h4>
                  <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                    <p><strong>Name:</strong> {getValues('name')}</p>
                    <p><strong>Email:</strong> {getValues('email')}</p>
                    <p><strong>Phone:</strong> {getValues('phone')}</p>
                    <p><strong>Role:</strong> Administrator</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  <strong>Next Step:</strong> Go to the registration page to create a password for this admin account using the email: <strong>{getValues('email')}</strong>
                </p>
              </div>
              
              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/register')}
                  fullWidth
                  className="bg-gradient-to-r from-primary-600 to-yellow-500 hover:from-primary-700 hover:to-yellow-600 text-white font-semibold"
                >
                  Go to Registration
                </Button>
                
                <Button
                  onClick={() => navigate('/login')}
                  variant="outline"
                  fullWidth
                >
                  Go to Login
                </Button>
              </div>
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
            Create Admin User
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Set up the administrator account for FC256
          </p>
        </div>
        
        <Card className="animate-fade-in border border-yellow-200 dark:border-yellow-800/30 shadow-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              label="Administrator Name"
              type="text"
              leftIcon={<User size={18} />}
              error={errors.name?.message}
              fullWidth
              placeholder="Enter admin name"
              {...register('name', {
                required: 'Administrator name is required',
                minLength: {
                  value: 2,
                  message: 'Name must be at least 2 characters',
                },
              })}
            />

            <Input
              label="Admin Email"
              type="email"
              leftIcon={<Mail size={18} />}
              error={errors.email?.message}
              fullWidth
              placeholder="admin@fc256.com"
              helperText="This will be the admin login email"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
            />

            <Input
              label="Phone Number"
              type="tel"
              leftIcon={<Phone size={18} />}
              error={errors.phone?.message}
              fullWidth
              placeholder="+256 700 000 000"
              {...register('phone', {
                required: 'Phone number is required',
              })}
            />

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Crown size={20} className="text-blue-600 dark:text-blue-400 mt-0.5" />
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Administrator Setup
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    This will create an admin user in the database. After creation, you'll need to register with this email to set up the password.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              fullWidth 
              isLoading={isLoading}
              className="bg-gradient-to-r from-primary-600 to-yellow-500 hover:from-primary-700 hover:to-yellow-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Create Admin User
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default CreateAdmin;