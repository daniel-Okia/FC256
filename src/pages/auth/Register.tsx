import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MemberService } from '../../services/firestore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import ThemeToggle from '../../components/layout/ThemeToggle';

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
}

const Register: React.FC = () => {
  const { register: registerUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const watchPassword = watch('password');

  const validateMemberEmail = async (email: string): Promise<boolean> => {
    try {
      setIsValidating(true);
      const members = await MemberService.getAllMembers();
      const memberExists = members.some(member => 
        member.email.toLowerCase() === email.toLowerCase()
      );
      return memberExists;
    } catch (error) {
      console.error('Error validating member email:', error);
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setRegistrationError(null);
      
      // First, validate that the email exists in the members list
      const isValidMember = await validateMemberEmail(data.email);
      
      if (!isValidMember) {
        setRegistrationError('This email is not registered as a team member. Please contact your team administrator.');
        return;
      }

      // Get the member data to use for user profile
      const members = await MemberService.getAllMembers();
      const memberData = members.find(member => 
        member.email.toLowerCase() === data.email.toLowerCase()
      );

      if (!memberData) {
        setRegistrationError('Member data not found. Please contact your team administrator.');
        return;
      }

      // Create the user account with member data
      const userData = {
        name: memberData.name,
        email: memberData.email,
        role: 'member' as const,
        phone: memberData.phone || '',
        avatarUrl: memberData.avatarUrl || '',
      };

      await registerUser(data.email, data.password, userData);
      
      // Redirect to dashboard after successful registration
      navigate('/', { replace: true });
    } catch (error: any) {
      console.error('Registration error:', error);
      setRegistrationError(error.message || 'Registration failed. Please try again.');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
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
                src="/Fitholics Logo.png" 
                alt="FC256 Logo" 
                className="h-20 w-20 object-contain"
              />
            </div>
          </div>
          
          {/* Title with gradient */}
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 via-yellow-500 to-secondary-600 bg-clip-text text-transparent">
            Join FC256
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Create your account to access the team portal
          </p>
        </div>
        
        <Card className="animate-fade-in border border-yellow-200 dark:border-yellow-800/30 shadow-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              label="Full Name"
              type="text"
              leftIcon={<User size={18} />}
              error={errors.name?.message}
              fullWidth
              placeholder="Enter your full name"
              {...register('name', {
                required: 'Full name is required',
                minLength: {
                  value: 2,
                  message: 'Name must be at least 2 characters',
                },
              })}
            />

            <Input
              label="Email address"
              type="email"
              leftIcon={<Mail size={18} />}
              error={errors.email?.message}
              fullWidth
              placeholder="Enter your registered email"
              helperText="Use the email address registered with the team"
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
                placeholder="Create a strong password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters',
                  },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
                  },
                })}
              />
            </div>

            <div className="relative">
              <Input
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                leftIcon={<Lock size={18} />}
                rightIcon={
                  <button
                    type="button"
                    onClick={toggleConfirmPasswordVisibility}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
                error={errors.confirmPassword?.message}
                fullWidth
                placeholder="Confirm your password"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (value) =>
                    value === watchPassword || 'Passwords do not match',
                })}
              />
            </div>

            {registrationError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-700 dark:text-red-300 text-sm">{registrationError}</p>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <User size={20} className="text-blue-600 dark:text-blue-400 mt-0.5" />
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Team Member Registration
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Only registered team members can create accounts. Your email must be in our team roster.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              fullWidth 
              isLoading={isLoading || isValidating}
              className="bg-gradient-to-r from-primary-600 to-yellow-500 hover:from-primary-700 hover:to-yellow-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isValidating ? 'Validating...' : 'Create Account'}
            </Button>
          </form>
          
          <div className="mt-8">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-medium text-primary-600 dark:text-primary-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Register;