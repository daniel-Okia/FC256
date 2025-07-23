# FC256 Team Management Portal

A comprehensive web application for managing FC256 football team operations, including member management, training schedules, friendly matches, attendance tracking, financial management, and leadership structure.

## 🏆 Features

### Core Functionality
- **Member Management**: Complete roster management with positions, jersey numbers, and status tracking
- **Training Sessions**: Schedule and manage training sessions at Kiyinda Main Field
- **Friendly Matches**: Schedule matches, record detailed results with enhanced scoring system
- **Attendance Tracking**: Record and analyze attendance for training and matches
- **Financial Management**: Track contributions and expenses in UGX currency
- **Leadership Structure**: Manage comprehensive organizational roles and responsibilities
- **Dashboard Analytics**: Real-time insights with charts and performance metrics

### Enhanced Match Results System
- **Simplified Scoring**: FC256 vs Opponent scoring format
- **Team Composition**: Track number of players fielded by each team
- **Venue Management**: Home, Away, and Neutral venue support
- **Player Statistics**: Goal scorers, assists, cards, and man of the match
- **Match Reports**: Detailed match analysis and notes
- **Performance Tracking**: Win/loss/draw statistics and trends

### User Roles & Permissions
- **Admin**: Full system access and management
- **Manager**: Team operations and member management
- **Member**: Limited access to view personal information

## 🚀 Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom design system
- **Backend**: Firebase (Authentication + Firestore)
- **Charts**: Chart.js with React Chart.js 2
- **Forms**: React Hook Form
- **PDF Export**: jsPDF with AutoTable
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **State Management**: Zustand + React Context

## 📋 Prerequisites

- Node.js 18+ and npm
- Firebase project with Firestore and Authentication enabled
- Modern web browser with JavaScript enabled

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd fc256-management
npm install
```

### 2. Firebase Configuration
Create a `.env` file in the root directory with your Firebase configuration:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Application Settings
VITE_APP_NAME=FC256
VITE_APP_VERSION=1.0.0
```

### 3. Firestore Security Rules
Apply these security rules to your Firestore database:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user exists in users collection
    function isValidUser() {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/users/$(request.auth.uid));
    }
    
    // Helper function to get user data
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    // Helper function to check user role
    function hasRole(role) {
      return isValidUser() && getUserData().role == role;
    }
    
    // Helper function to check if user is admin or manager
    function isAdminOrManager() {
      return hasRole('admin') || hasRole('manager');
    }
    
    // Users collection - users can read their own data, admins/managers can manage all
    match /users/{userId} {
      allow read: if isAuthenticated() && 
                     (request.auth.uid == userId || isAdminOrManager());
      allow write: if isAuthenticated() && 
                      (request.auth.uid == userId || isAdminOrManager());
    }
    
    // Members collection - all authenticated users can read, admins/managers can write
    match /members/{memberId} {
      allow read: if isValidUser();
      allow write: if isAdminOrManager();
    }
    
    // Events collection (training & friendlies) - admins/managers only
    match /events/{eventId} {
      allow read, write: if isAdminOrManager();
    }
    
    // Attendance collection - admins/managers only
    match /attendance/{attendanceId} {
      allow read, write: if isAdminOrManager();
    }
    
    // Leadership collection - all can read, admins/managers can write
    match /leadership/{leadershipId} {
      allow read: if isValidUser();
      allow write: if isAdminOrManager();
    }
    
    // Contributions collection - admins/managers only
    match /contributions/{contributionId} {
      allow read, write: if isAdminOrManager();
    }
    
    // Expenses collection - admins/managers only
    match /expenses/{expenseId} {
      allow read, write: if isAdminOrManager();
    }
    
    // Inventory collection - all can read, admins/managers can write
    match /inventory/{inventoryId} {
      allow read: if isValidUser();
      allow write: if isAdminOrManager();
    }
    
    // Deny all other requests
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 4. Firebase Authentication Setup
Enable the following authentication methods in your Firebase console:
- Email/Password authentication
- Disable email verification for easier setup (optional)

### 5. Initialize Default Accounts (Optional)
The application includes utilities to create default admin and manager accounts:

**Admin Account:**
- Email: danielokia256@gmail.com
- Role: Administrator

**Manager Account:**
- Email: piuspaul392@gmail.com
- Role: Team Manager

Navigate to `/setup/accounts` to initialize these accounts with secure passwords.

## 🏃‍♂️ Running the Application

### Development Mode
```bash
npm run dev
```
Access the application at `http://localhost:5173`

### Production Build
```bash
npm run build
npm run preview
```

## 📱 Application Structure

### Core Pages
- **Dashboard**: Overview with statistics, charts, and recent activity
- **Members**: Complete team roster management
- **Training**: Training session scheduling and management
- **Friendlies**: Friendly match scheduling and results tracking
- **Attendance**: Attendance recording and analysis
- **Leadership**: Organizational structure management
- **Contributions**: Financial tracking (income and expenses)
- **Profile**: User account management

### Key Components
- **Authentication**: Secure login/logout with role-based access
- **Real-time Updates**: Live data synchronization across all users
- **PDF Export**: Professional reports for all major sections
- **Responsive Design**: Mobile-first design with desktop optimization
- **Dark Mode**: Complete dark/light theme support

## 💰 Financial Management

The application uses **Ugandan Shillings (UGX)** as the primary currency:
- Contribution tracking (monetary and in-kind)
- Expense categorization and tracking
- Financial reporting and balance calculations
- PDF export for financial records

### Expense Categories
- Equipment, Transport, Medical, Facilities
- Referees, Food & Refreshments, Uniforms
- Training Materials, Administration, Other

## 🏅 Match Results System

### Enhanced Scoring Features
- **Simplified Format**: Always shows "FC256 X - Y Opponent"
- **Team Composition**: Track players fielded (e.g., 11v11, 9v9)
- **Venue Support**: Home (Kiyinda Main Field), Away, Neutral
- **Player Statistics**: Goals, assists, cards, man of the match
- **Performance Analytics**: Win rate, recent form, trends

### Match Data Structure
```typescript
interface MatchDetails {
  fc256Score: number;           // FC256's score
  opponentScore: number;        // Opponent's score
  result: 'win' | 'draw' | 'loss';
  venue: 'home' | 'away' | 'neutral';
  fc256Players: number;         // Players FC256 fielded
  opponentPlayers: number;      // Players opponent fielded
  goalScorers: string[];        // Member IDs
  assists: string[];            // Member IDs
  yellowCards: string[];        // Member IDs
  redCards: string[];           // Member IDs
  manOfTheMatch: string;        // Member ID
  matchReport: string;          // Detailed analysis
  attendance: number;           // Spectator count
}
```

## 🔐 Security Features

- **Role-based Access Control**: Admin, Manager, Member permissions
- **Firestore Security Rules**: Comprehensive data protection
- **Authentication Required**: All operations require valid login
- **Data Validation**: Client and server-side validation
- **Secure PDF Export**: No sensitive data exposure

## 📊 Analytics & Reporting

### Dashboard Insights
- Team performance metrics
- Financial summaries
- Attendance trends
- Recent activity feeds

### PDF Export Capabilities
- Member roster reports
- Financial statements
- Attendance records
- Match results summaries
- Leadership directory

## 🎨 Design System

### Color Palette
- **Primary**: Blue (#4f4fe6) - Main brand color
- **Secondary**: Red (#f43f4e) - Accent color
- **Yellow**: (#eab308) - Highlight color (from logo)
- **Success**: Green (#22c55e) - Positive actions
- **Warning**: Orange (#f59e0b) - Caution states
- **Error**: Red (#ef4444) - Error states

### Typography
- **Primary Font**: Inter (body text)
- **Heading Font**: Montserrat (headings)
- **Responsive Scaling**: Mobile-first approach

## 🚀 Deployment

### Netlify (Recommended)
```bash
npm run build
# Deploy dist/ folder to Netlify
```

### Vercel
```bash
npm run build
# Deploy using Vercel CLI or GitHub integration
```

### Firebase Hosting
```bash
npm run build
firebase deploy
```

## 🔧 Environment Variables

Required environment variables for production:

```env
VITE_FIREBASE_API_KEY=production_api_key
VITE_FIREBASE_AUTH_DOMAIN=production_domain
VITE_FIREBASE_PROJECT_ID=production_project_id
VITE_FIREBASE_STORAGE_BUCKET=production_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=production_sender_id
VITE_FIREBASE_APP_ID=production_app_id
VITE_FIREBASE_MEASUREMENT_ID=production_measurement_id
```

## 🐛 Troubleshooting

### Common Issues

1. **Firebase Configuration Errors**
   - Verify all environment variables are set correctly
   - Check Firebase project settings match your configuration
   - Ensure Firestore and Authentication are enabled

2. **Permission Denied Errors**
   - Verify Firestore security rules are applied correctly
   - Check user authentication status
   - Confirm user role assignments

3. **Build Errors**
   - Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
   - Check TypeScript errors: `npm run lint`

## 📞 Support & Contact

**Team Manager**: Pius Paul
- Email: piuspaul392@gmail.com
- Phone: +256 700 654 321
 Phone: +256782633089
- Role: Team Manager

**Technical Administrator**: Daniel Okia
- Email: danielokia256@gmail.com
- Role: System Administrator

## 📄 License

This project is proprietary software developed for FC256 football team. All rights reserved.

## 🔄 Version History

- **v1.0.0**: Initial release with core functionality
- Enhanced match results system
- Comprehensive financial management
- Real-time dashboard analytics
- Professional PDF export capabilities

---

**FC256 Team Management Portal** - Excellence • Discipline • Teamwork