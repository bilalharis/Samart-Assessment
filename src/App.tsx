

import React, { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import Landing from './screens/Landing';
import TeacherDashboard from './screens/teacher/TeacherDashboard';
import PrincipalDashboard from './screens/principal/PrincipalDashboard';
import ParentDashboard from './screens/parent/ParentDashboard';
import StudentDashboard from './screens/student/StudentDashboard';
import NotificationBell from './components/NotificationBell';
import CopilotButton from './components/copilot/CopilotButton';
import { Role } from './types';
import { BookOpen, Shield, Users, User, Building } from 'lucide-react';

const App: React.FC = () => {
  const authContext = useContext(AuthContext);

  const renderDashboard = () => {
    if (!authContext || !authContext.user) {
      return <Landing />;
    }

    switch (authContext.user.role) {
      case Role.TEACHER:
        return <TeacherDashboard />;
      case Role.PRINCIPAL:
        return <PrincipalDashboard />;
      case Role.PARENT:
        return <ParentDashboard />;
      case Role.STUDENT:
        return <StudentDashboard />;
      default:
        return <Landing />;
    }
  };

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case Role.TEACHER:
        return <BookOpen className="h-6 w-6 text-royal-blue" />;
      case Role.PRINCIPAL:
        return <Shield className="h-6 w-6 text-royal-blue" />;
      case Role.PARENT:
        return <Users className="h-6 w-6 text-royal-blue" />;
      case Role.STUDENT:
        return <User className="h-6 w-6 text-royal-blue" />;
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {authContext && authContext.user && (
        <header className="bg-white shadow-md">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center space-x-4">
                 <Building className="h-10 w-10 text-royal-blue" />
                <h1 className="text-xl font-bold text-royal-blue">Smart Assessment</h1>
              </div>
              <div className="flex items-center space-x-4">
                <CopilotButton />
                <NotificationBell />
                <div className="flex items-center space-x-2">
                  {getRoleIcon(authContext.user.role)}
                  <span className="font-semibold text-gray-700">{authContext.user.name}</span>
                </div>
                <button
                  onClick={() => authContext.logout()}
                  className="rounded-md bg-royal-blue px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-gold-accent focus:ring-offset-2"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>
      )}
      <main>
        {renderDashboard()}
      </main>
    </div>
  );
};

export default App;
