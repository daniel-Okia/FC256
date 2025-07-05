import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import ThemeToggle from '../../components/layout/ThemeToggle';

interface LoginFormData {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const { login, isAuthenticated, error, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    // If user is already authenticated, redirect
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <img 
                src="/fc256-logo.png" 
                alt="FC256 Logo" 
                className="h-20 w-20 object-contain"
              />
            </div>
          </div>
          
          {/* Title with updated colors to match logo */}
          <h2 className="text-3xl font-bold mb-2">
            <span className="text-blue-600 dark:text-blue-400">F</span>
            <span className="text-blue-600 dark:text-blue-400">C</span>
            <span className="text-yellow-500 dark:text-yellow-400">2</span>
            <span className="text-yellow-500 dark:text-yellow-400">5</span>
            <span className="text-red-500 dark:text-red-400">6</span>
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in to access your team management portal
          </p>
        </div>
        
        <Card className="animate-fade-in border border-yellow-200 dark:border-yellow-800/30 shadow-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              label="Email address"
              type="email"
              leftIcon={<Mail size={18} />}
              error={errors.email?.message}
              fullWidth
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                leftIcon={<Lock size={18} />}
                rightIcon={
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
                error={errors.password?.message}
                fullWidth
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters',
                  },
                })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-primary-600 dark:text-primary-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            {error && <p className="text-error-600 text-sm">{error}</p>}

            <Button 
              type="submit" 
              fullWidth 
              isLoading={isLoading}
              className="bg-gradient-to-r from-primary-600 to-yellow-500 hover:from-primary-700 hover:to-yellow-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Sign in
            </Button>
          </form>
          
          <div className="mt-8">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="font-medium text-primary-600 dark:text-primary-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
                >
                  Sign up here
                </Link>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                Only registered team members can create accounts.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;