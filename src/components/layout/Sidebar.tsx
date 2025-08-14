import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Calendar, 
  Trophy, 
  Crown, 
  CreditCard,
  User,
  X,
  ClipboardList,
  Package,
  TrendingUp,
  CreditCard as MembershipIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { canUserAccess, Permissions } from '../../utils/permissions';
import { twMerge } from 'tailwind-merge';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();

  const navItems = [
    { 
      name: 'Dashboard', 
      path: '/', 
      icon: Home, 
      roles: Permissions.VIEW_DASHBOARD 
    },
    { 
      name: 'Training', 
      path: '/training', 
      icon: Calendar, 
      roles: Permissions.VIEW_EVENTS 
    },
    { 
      name: 'Friendlies', 
      path: '/friendlies', 
      icon: Trophy, 
      roles: Permissions.VIEW_EVENTS 
    },
    { 
      name: 'Members', 
      path: '/members', 
      icon: Users, 
      roles: Permissions.VIEW_MEMBERS 
    },
    { 
      name: 'Attendance', 
      path: '/attendance', 
      icon: ClipboardList, 
      roles: Permissions.VIEW_ATTENDANCE 
    },
    { 
      name: 'Inventory', 
      path: '/inventory', 
      icon: Package, 
      roles: Permissions.VIEW_INVENTORY 
    },
    { 
      name: 'Leadership', 
      path: '/leadership', 
      icon: Crown, 
      roles: Permissions.VIEW_LEADERSHIP 
    },
    { 
      name: 'Transactions', 
      path: '/transactions', 
      icon: CreditCard, 
      roles: Permissions.VIEW_CONTRIBUTIONS 
    },
    { 
      name: 'Membership Fees', 
      path: '/membership-fees', 
      icon: MembershipIcon, 
      roles: Permissions.VIEW_MEMBERSHIP_FEES 
    },
    { 
      name: 'Profile', 
      path: '/profile', 
      icon: User, 
      roles: Permissions.VIEW_DASHBOARD 
    },
    { 
      name: 'Analytics', 
      path: '/analytics', 
      icon: TrendingUp, 
      roles: Permissions.VIEW_DASHBOARD 
    },
  ];

  const filteredNavItems = navItems.filter(
    (item) => user && canUserAccess(user.role, item.roles)
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={twMerge(
          'fixed top-0 left-0 h-full w-64 bg-white dark:bg-neutral-900 border-r border-gray-200 dark:border-gray-800 z-50 transform transition-transform duration-300 ease-in-out',
          'lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <Link to="/" className="flex items-center space-x-3" onClick={onClose}>
            {/* Logo */}
            <img 
              src="/fc256-logo.png" 
              alt="FC256 Logo" 
              className="h-8 w-8 object-contain"
            />
            {/* Updated text with better color matching */}
            <span className="text-xl font-bold">
              <span className="text-blue-800 dark:text-blue-300">F</span>
              <span className="text-blue-800 dark:text-blue-300">C</span>
              <span className="text-yellow-500 dark:text-yellow-400">2</span>
              <span className="text-yellow-500 dark:text-yellow-400">5</span>
              <span className="text-white dark:text-white">6</span>
            </span>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={onClose}
                className={twMerge(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-gradient-to-r from-primary-100 via-yellow-50 to-secondary-100 text-primary-700 dark:from-primary-900/20 dark:via-yellow-900/10 dark:to-secondary-900/20 dark:text-primary-400 border border-yellow-200 dark:border-yellow-800/30'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-neutral-800 dark:hover:text-white'
                )}
              >
                <Icon 
                  size={20} 
                  className={twMerge(
                    'mr-3',
                    isActive 
                      ? 'text-primary-600 dark:text-primary-400' 
                      : 'text-gray-400 dark:text-gray-500'
                  )} 
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User info at bottom */}
        {user && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-primary-100 via-yellow-100 to-secondary-100 dark:from-primary-900/30 dark:via-yellow-900/20 dark:to-secondary-900/30 flex items-center justify-center border border-yellow-200 dark:border-yellow-800/30">
                  <User size={16} className="text-primary-600 dark:text-primary-400" />
                </div>
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {user.role}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;