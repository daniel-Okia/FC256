import React from 'react';
import PageHeader from '../../components/layout/PageHeader';

function Training() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader 
        title="Training" 
        description="View and manage training sessions"
      />
      
      <div className="mt-8">
        {/* Training content will be implemented later */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-gray-600 dark:text-gray-300">
            Training management features coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Training;