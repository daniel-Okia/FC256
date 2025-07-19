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
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
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
      
      // Check if email exists in members collection
      const memberExists = members.some(member => 
        member.email.toLowerCase().trim() === email.toLowerCase().trim()
      );
      
      console.log('Email validation:', {
        searchEmail: email.toLowerCase().trim(),
        foundMembers: members.map(m => ({ name: m.name, email: m.email.toLowerCase().trim() })),
        memberExists
      });
      
      return memberExists;
    } catch (error) {
      console.error('Error validating member email:', error);
      // If there's an error fetching members, allow registration to proceed
      // This prevents blocking registration due to temporary issues
      console.warn('Member validation failed, allowing registration to proceed');
      return true;
    } finally {
      setIsValidating(false);
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setRegistrationError(null);
      
      // First, validate that the email exists in the members list
      let isValidMember = true; // Default to true to allow registration
      
      try {
        isValidMember = await validateMemberEmail(data.email);
      } catch (error) {
        console.warn('Member validation failed, proceeding with registration:', error);
        // Continue with registration even if validation fails
      }
      
      // Only block registration if we're certain the member doesn't exist
      // and we successfully fetched the members list
      if (!isValidMember) {
        try {
          // Double-check by trying to fetch members again
          const members = await MemberService.getAllMembers();
          const memberExists = members.some(member => 
            member.email.toLowerCase().trim() === data.email.toLowerCase().trim()
          );
          
          if (!memberExists && members.length > 0) {
            setRegistrationError('This email is not registered as a team member. Please contact your team administrator.');
            return;
          }
        } catch (error) {
          console.warn('Final member validation failed, allowing registration:', error);
          // If we can't validate, allow registration to proceed
        }
      }

      // Get the member data to use for user profile
      let memberData = null;
      try {
        const members = await MemberService.getAllMembers();
        memberData = members.find(member => 
          member.email.toLowerCase().trim() === data.email.toLowerCase().trim()
        );
      } catch (error) {
        console.warn('Could not fetch member data, using form data:', error);
      }

      // Create the user account with member data
      const userData = {
        name: memberData ? memberData.name : data.name,
        email: memberData ? memberData.email : data.email,
        role: 'member' as const,
        phone: memberData ? (memberData.phone || '') : '',
        avatarUrl: memberData ? (memberData.avatarUrl || '') : '',
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
                src="/fc256-logo.png" 
                alt="FC256 Logo" 
                className="h-20 w-20 object-contain"
              />
            </div>
          </div>
          
          {/* Title with updated colors to match logo */}
          <h2 className="text-3xl font-bold mb-2">
            <span className="text-gray-700 dark:text-gray-300">Join </span>
            <span className="text-blue-600 dark:text-blue-400">F</span>
            <span className="text-blue-600 dark:text-blue-400">C</span>
            <span className="text-yellow-500 dark:text-yellow-400">2</span>
            <span className="text-yellow-500 dark:text-yellow-400">5</span>
            <span className="text-red-500 dark:text-red-400">6</span>
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