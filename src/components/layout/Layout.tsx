import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 flex w-full overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col lg:ml-0 min-w-0 w-full">
        <Navbar onMenuClick={toggleSidebar} />
        <main className="flex-1 py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-full mx-auto w-full overflow-hidden">
          <div className="w-full max-w-full overflow-hidden">
            <Outlet />
          </div>
        </main>
        <footer className="bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-gray-800 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-sm text-center text-gray-500 dark:text-gray-400">
              &copy; {new Date().getFullYear()} FC256. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
