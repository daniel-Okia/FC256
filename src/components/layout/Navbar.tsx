import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const toggleProfileMenu = () => {
    setProfileMenuOpen(!profileMenuOpen);
  };

  const closeMenus = () => {
    setProfileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    closeMenus();
  };

  return (
    <nav className="bg-white dark:bg-neutral-900 shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-neutral-800 mr-2"
              onClick={onMenuClick}
            >
              <span className="sr-only">Open main menu</span>
              <Menu className="block h-6 w-6" aria-hidden="true" />
            </button>

            {/* Logo - visible on mobile when sidebar is closed */}
            <Link to="/" className="lg:hidden flex-shrink-0 flex items-center space-x-2" onClick={closeMenus}>
              <img 
                src="/Fitholics Logo.png" 
                alt="FC256 Logo" 
                className="h-8 w-8 object-contain"
              />
              <span className="text-xl font-bold bg-gradient-to-r from-primary-600 via-yellow-500 to-secondary-600 bg-clip-text text-transparent">
                FC256
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {user ? (
              <div className="relative">
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
                <Button size="sm">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
