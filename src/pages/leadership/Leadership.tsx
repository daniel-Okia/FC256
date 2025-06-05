import React from 'react';
import PageHeader from '../../components/layout/PageHeader';

function Leadership() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader 
        title="Leadership" 
        description="View and manage team leadership roles"
      />
      
      <div className="mt-8">
        {/* Leadership content will be implemented later */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-gray-600 dark:text-gray-300">
            Leadership management features coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Leadership;