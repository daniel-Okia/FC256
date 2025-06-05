import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import { canUserAccess, Permissions } from '../../utils/permissions';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const toggleProfileMenu = () => {
    setProfileMenuOpen(!profileMenuOpen);
  };

  const closeMenus = () => {
    setIsOpen(false);
    setProfileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    closeMenus();
  };

  const navItems = [
    { name: 'Dashboard', path: '/', roles: Permissions.VIEW_DASHBOARD },
    { name: 'Training', path: '/training', roles: Permissions.VIEW_EVENTS },
    { name: 'Friendlies', path: '/friendlies', roles: Permissions.VIEW_EVENTS },
    { name: 'Members', path: '/members', roles: Permissions.VIEW_MEMBERS },
    { name: 'Leadership', path: '/leadership', roles: Permissions.VIEW_LEADERSHIP },
    { name: 'Contributions', path: '/contributions', roles: Permissions.VIEW_CONTRIBUTIONS },
  ];

  const filteredNavItems = navItems.filter(
    (item) => user && canUserAccess(user.role, item.roles)
  );

  return (
    <nav className="bg-white dark:bg-neutral-900 shadow-sm border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center" onClick={closeMenus}>
              <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Fitholics FC
              </span>
            </Link>
            <div className="hidden md:ml-6 md:flex md:space-x-4">
              {filteredNavItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    location.pathname === item.path
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400'
                  }`}
                  onClick={closeMenus}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <ThemeToggle />
            {user ? (
              <div className="ml-3 relative">
                <div>
                  <button
                    className="flex items-center max-w-xs text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    id="user-menu"
                    aria-expanded="false"
                    aria-haspopup="true"
                    onClick={toggleProfileMenu}
                  >
                    <span className="sr-only">Open user menu</span>
                    <div className="flex items-center">
                      <Avatar
                        src={user.avatarUrl}
                        alt={user.name}
                        size="sm"
                        className="mr-2"
                      />
                      <span className="hidden md:inline-block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {user.name}
                      </span>
                      <ChevronDown
                        size={16}
                        className="ml-1 text-gray-500 dark:text-gray-400"
                      />
                    </div>
                  </button>
                </div>
                {profileMenuOpen && (
                  <div
                    className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-neutral-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="user-menu"
                  >
                    <div className="py-1" role="none">
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">
                          {user.role}
                        </p>
                      </div>
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-700"
                        role="menuitem"
                        onClick={closeMenus}
                      >
                        Your Profile
                      </Link>
                      <button
                        className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-700"
                        role="menuitem"
                        onClick={handleLogout}
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login">
                <Button size="sm" className="ml-4">
                  Sign In
                </Button>
              </Link>
            )}
            <div className="-mr-2 flex md:hidden ml-2">
              <button
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-neutral-800"
                aria-expanded="false"
                onClick={toggleMenu}
              >
                <span className="sr-only">Open main menu</span>
                {isOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-gray-800">
          <div className="pt-2 pb-3 space-y-1">
            {filteredNavItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`block pl-3 pr-4 py-2 text-base font-medium ${
                  location.pathname === item.path
                    ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-neutral-800'
                }`}
                onClick={closeMenus}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;