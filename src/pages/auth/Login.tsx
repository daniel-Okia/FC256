import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, Lock, User } from 'lucide-react';
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
  const [demoAccounts] = useState([
    { role: 'Admin', email: 'admin@fitholicsfc.com', password: 'password' },
    { role: 'Manager', email: 'manager@fitholicsfc.com', password: 'password' },
    { role: 'Member', email: 'member@fitholicsfc.com', password: 'password' },
  ]);

  const from = location.state?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    setValue,
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

  const handleDemoLogin = (email: string, password: string) => {
    setValue('email', email);
    setValue('password', password);
    handleSubmit(onSubmit)();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <User className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome to Fitholics FC
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in to access your team management portal
          </p>
        </div>
        
        <Card className="animate-fade-in">
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

            <Input
              label="Password"
              type="password"
              leftIcon={<Lock size={18} />}
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

            {error && <p className="text-error-600 text-sm">{error}</p>}

            <Button type="submit" fullWidth isLoading={isLoading}>
              Sign in
            </Button>
          </form>
          
          <div className="mt-8">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              Demo Accounts
            </h3>
            <div className="space-y-2">
              {demoAccounts.map((account) => (
                <Button
                  key={account.role}
                  size="sm"
                  variant={account.role === 'Admin' ? 'primary' : account.role === 'Manager' ? 'secondary' : 'outline'}
                  fullWidth
                  onClick={() => handleDemoLogin(account.email, account.password)}
                  type="button"
                >
                  Sign in as {account.role}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;