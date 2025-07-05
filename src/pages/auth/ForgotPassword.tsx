import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { MemberService } from '../../services/firestore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import ThemeToggle from '../../components/layout/ThemeToggle';

interface ForgotPasswordFormData {
  email: string;
}

const ForgotPassword: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>();

  const validateMemberEmail = async (email: string): Promise<boolean> => {
    try {
      const members = await MemberService.getAllMembers();
      const memberExists = members.some(member => 
        member.email.toLowerCase() === email.toLowerCase()
      );
      return memberExists;
    } catch (error) {
      console.error('Error validating member email:', error);
      return false;
    }
  };

  const onSubmit = async (data: ForgotPasswordFormData) => {
    if (!auth) {
      setError('Authentication service is not available. Please try again later.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // First, validate that the email exists in the members list
      const isValidMember = await validateMemberEmail(data.email);
      
      if (!isValidMember) {
        setError('This email is not registered as a team member. Please contact your team administrator.');
        return;
      }

      // Send password reset email
      await sendPasswordResetEmail(auth, data.email);
      setEmailSent(true);
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      let errorMessage = 'Failed to send password reset email. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please wait before trying again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    const email = getValues('email');
    if (email) {
      await onSubmit({ email });
    }
  };

  if (emailSent) {
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
            
            <h2 className="text-3xl font-bold mb-2">
              <span className="text-gray-700 dark:text-gray-300">Check Your Email</span>
            </h2>
          </div>
          
          <Card className="animate-fade-in border border-yellow-200 dark:border-yellow-800/30 shadow-lg">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Password Reset Email Sent
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                We've sent a password reset link to <strong>{getValues('email')}</strong>. 
                Check your email and follow the instructions to reset your password.
              </p>
              
              <div className="space-y-4">
                <Button
                  onClick={handleResendEmail}
                  variant="outline"
                  fullWidth
                  isLoading={isLoading}
                >
                  Resend Email
                </Button>
                
                <Link to="/login">
                  <Button variant="ghost" fullWidth leftIcon={<ArrowLeft size={18} />}>
                    Back to Sign In
                  </Button>
                </Link>
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
          
          <h2 className="text-3xl font-bold mb-2">
            <span className="text-gray-700 dark:text-gray-300">Reset Password</span>
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Enter your email to receive a password reset link
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

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Mail size={20} className="text-blue-600 dark:text-blue-400 mt-0.5" />
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Team Member Email Required
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Only registered team members can reset their passwords. Your email must be in our team roster.
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
              Send Reset Link
            </Button>
          </form>
          
          <div className="mt-8">
            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
              >
                <ArrowLeft size={16} className="mr-1" />
                Back to Sign In
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;