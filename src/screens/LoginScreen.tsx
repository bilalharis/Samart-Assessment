import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { mockUsers } from '../data/mockData';
import Card from '../components/ui/Card';
import { Shield, BookOpen, Users, User as UserIcon } from 'lucide-react';
import { Role } from '../types';

const roleIcons = {
  [Role.PRINCIPAL]: <Shield className="h-10 w-10 text-gold-accent" />,
  [Role.TEACHER]: <BookOpen className="h-10 w-10 text-gold-accent" />,
  [Role.PARENT]: <Users className="h-10 w-10 text-gold-accent" />,
  [Role.STUDENT]: <UserIcon className="h-10 w-10 text-gold-accent" />,
};

const LoginScreen: React.FC = () => {
  const authContext = useContext(AuthContext);

  if (!authContext) {
    return <div>Loading...</div>;
  }

  const { login } = authContext;

  const staffUsers = mockUsers.filter(u => u.role === Role.PRINCIPAL || u.role === Role.TEACHER);
  const principalUser = staffUsers.find(u => u.role === Role.PRINCIPAL);
  const teacherUsers = staffUsers.filter(u => u.role === Role.TEACHER);

  const studentUsers = mockUsers.filter(u => u.role === Role.STUDENT);
  const guardianUsers = mockUsers.filter(u => u.role === Role.PARENT);

  const teachers = mockUsers.filter(u => u.role === Role.TEACHER);

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-royal-blue">Welcome to Smart Assessment</h1>
        <p className="mt-2 text-lg text-gray-600">The Future of School-Wide Assessment is Here.</p>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold text-royal-blue mb-4">School Staff</h2>
        
        {/* Principal */}
        {principalUser && (
            <div className="flex justify-center w-full mb-6">
                <button key={principalUser.userId} onClick={() => login(principalUser)} className="text-left w-full max-w-sm">
                    <Card className="hover:shadow-2xl hover:border-gold-accent border-2 border-transparent transition-all duration-300 transform hover:-translate-y-1 h-full">
                        <div className="flex items-center space-x-4">
                            <div className="bg-royal-blue p-3 rounded-full">
                                {roleIcons[principalUser.role]}
                            </div>
                            <div>
                                <p className="text-lg font-bold text-gray-800">{principalUser.name}</p>
                                <p className="text-sm capitalize text-gray-500">{principalUser.role}</p>
                            </div>
                        </div>
                    </Card>
                </button>
            </div>
        )}
        
        {/* Teachers */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 max-w-3xl mx-auto">
          {teacherUsers.map((user) => (
            <button key={user!.userId} onClick={() => login(user!)} className="text-left w-full">
              <Card className="hover:shadow-2xl hover:border-gold-accent border-2 border-transparent transition-all duration-300 transform hover:-translate-y-1 h-full">
                <div className="flex items-center space-x-4">
                  <div className="bg-royal-blue p-3 rounded-full">
                    {roleIcons[user!.role]}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-800">{user!.name}</p>
                    <p className="text-sm capitalize text-gray-500">{user.role === Role.TEACHER ? user.subject + ' Teacher' : user.role}</p>
                  </div>
                </div>
              </Card>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold text-royal-blue mb-4">Student Profiles</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {studentUsers.map((user) => {
            const borderClass = user.gender === 'female' ? 'border-pink-400' : 'border-blue-400';
            const scienceTeacher = teachers.find(t => t.subject === 'Science' && t.classId === user.classId);
            const mathsTeacher = teachers.find(t => t.subject === 'Maths' && t.classId === user.classId);
            
            return (
              <button key={user.userId} onClick={() => login(user)} className="text-left w-full">
                <Card className="hover:shadow-2xl hover:border-gold-accent border-2 border-transparent transition-all duration-300 transform hover:-translate-y-1 h-full flex flex-col">
                  <div className="flex flex-col items-center text-center">
                    <div className={`w-24 h-24 rounded-full mb-4 border-4 ${borderClass} bg-gray-200 flex items-center justify-center`}>
                      <UserIcon className="w-12 h-12 text-gray-500" />
                    </div>
                    <p className="text-xl font-bold text-gray-800">{user.name}</p>
                    <p className="text-md capitalize text-gray-500">{user.role}</p>
                  </div>
                  <div className="mt-4 pt-4 border-t w-full overflow-hidden">
                     <div className="flex space-x-4 overflow-x-auto pb-2 -mb-2">
                        {scienceTeacher && (
                             <div className="flex-shrink-0 text-center bg-gray-100 p-2 rounded-lg w-32">
                                <p className="text-sm font-bold text-royal-blue">Science</p>
                                <p className="text-xs text-gray-600 truncate">{scienceTeacher.name}</p>
                            </div>
                        )}
                        {mathsTeacher && (
                             <div className="flex-shrink-0 text-center bg-gray-100 p-2 rounded-lg w-32">
                                <p className="text-sm font-bold text-royal-blue">Maths</p>
                                <p className="text-xs text-gray-600 truncate">{mathsTeacher.name}</p>
                            </div>
                        )}
                     </div>
                  </div>
                </Card>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold text-royal-blue mb-4">Guardian Profiles</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {guardianUsers.map((user) => {
             const child = user.childIds ? mockUsers.find(u => u.userId === user.childIds![0]) : null;
             return (
                <button key={user!.userId} onClick={() => login(user!)} className="text-left w-full">
                <Card className="hover:shadow-2xl hover:border-gold-accent border-2 border-transparent transition-all duration-300 transform hover:-translate-y-1 h-full">
                    <div className="flex items-center space-x-4">
                    <div className="bg-royal-blue p-3 rounded-full">
                        {roleIcons[user!.role]}
                    </div>
                    <div>
                        <p className="text-lg font-bold text-gray-800">{user!.name}</p>
                        {child && <p className="text-sm text-gray-500">Guardian of {child.name}</p>}
                    </div>
                    </div>
                </Card>
                </button>
            )
          })}
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;