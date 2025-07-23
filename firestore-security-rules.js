rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user exists in users collection (with fallback)
    function isValidUser() {
      return isAuthenticated() && (
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) ||
        request.auth.token.email_verified == true
      );
    }
    
    // Helper function to get user data (with fallback)
    function getUserData() {
      return exists(/databases/$(database)/documents/users/$(request.auth.uid)) 
        ? get(/databases/$(database)/documents/users/$(request.auth.uid)).data
        : { role: 'member' }; // Default role for new users
    }
    
    // Helper function to check user role
    function hasRole(role) {
      return isAuthenticated() && getUserData().role == role;
    }
    
    // Helper function to check if user is admin or manager
    function isAdminOrManager() {
      return hasRole('admin') || hasRole('manager');
    }
    
    // Users collection - more permissive for user creation and self-management
    match /users/{userId} {
      allow read: if isAuthenticated() && (
        request.auth.uid == userId || 
        isAdminOrManager() ||
        // Allow reading during user creation process
        request.auth.token.email_verified == true
      );
      allow write: if isAuthenticated() && (
        request.auth.uid == userId || 
        isAdminOrManager() ||
        // Allow user creation during registration
        (request.auth.uid == userId && !exists(/databases/$(database)/documents/users/$(userId)))
      );
    }
    
    // Members collection - all authenticated users can read, admins/managers can write
    match /members/{memberId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && isAdminOrManager();
    }
    
    // Events collection (training & friendlies) - all authenticated users can read, admins/managers can write
    match /events/{eventId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && isAdminOrManager();
    }
    
    // Attendance collection - all authenticated users can read, admins/managers can write
    match /attendance/{attendanceId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && isAdminOrManager();
    }
    
    // Leadership collection - all authenticated users can read, admins/managers can write
    match /leadership/{leadershipId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && isAdminOrManager();
    }
    
    // Contributions collection - all authenticated users can read, admins/managers can write
    match /contributions/{contributionId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && isAdminOrManager();
    }
    
    // Expenses collection - all authenticated users can read, admins/managers can write
    match /expenses/{expenseId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && isAdminOrManager();
    }
    
    // Inventory collection - all authenticated users can read, admins/managers can write
    match /inventory/{inventoryId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && isAdminOrManager();
    }
    
    // Deny all other requests
    match /{document=**} {
      allow read, write: if false;
    }
  }
}