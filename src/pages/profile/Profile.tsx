import React from 'react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { User, Mail, Phone, Calendar } from 'lucide-react';
import { formatDate } from '../../utils/date-utils';

const Profile: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div>
      <PageHeader
        title="Your Profile"
        description="View and manage your account information"
      />

      <div className="max-w-2xl mx-auto">
        <Card>
          <div className="text-center mb-6">
            <div className="inline-block p-4 rounded-full bg-primary-100 dark:bg-primary-900/30 mb-4">
              <User size={48} className="text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {user.name}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1 capitalize">
              {user.role}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center p-4 bg-gray-50 dark:bg-neutral-800 rounded-lg">
              <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Email
                </p>
                <p className="text-gray-900 dark:text-white">{user.email}</p>
              </div>
            </div>

            {user.phone && (
              <div className="flex items-center p-4 bg-gray-50 dark:bg-neutral-800 rounded-lg">
                <Phone className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Phone
                  </p>
                  <p className="text-gray-900 dark:text-white">{user.phone}</p>
                </div>
              </div>
            )}

            <div className="flex items-center p-4 bg-gray-50 dark:bg-neutral-800 rounded-lg">
              <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Member Since
                </p>
                <p className="text-gray-900 dark:text-white">
                  {formatDate(user.dateJoined)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="danger"
              onClick={logout}
              fullWidth
            >
              Sign Out
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Profile;