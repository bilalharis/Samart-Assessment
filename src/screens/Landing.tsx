import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import { mockUsers } from '../data/mockData';
import { Role, User } from '../types';
import { Shield, BookOpen, Users, GraduationCap } from 'lucide-react';
import bg from '../assets/image.png';


type RoleKey = Role.PRINCIPAL | Role.TEACHER | Role.PARENT | Role.STUDENT;

/** Icon + style metadata per role */
const ROLE_META = {
  [Role.PRINCIPAL]: { label: 'Principal', Icon: Shield,        gradient: 'from-[#0033A0] to-[#0033A0]' },
  [Role.TEACHER]:   { label: 'Teacher',   Icon: BookOpen,      gradient: 'from-[#F9A826] to-[#F9A826]' },
  [Role.PARENT]:    { label: 'Parent',    Icon: Users,         gradient: 'from-[#2E7D32] to-[#2E7D32]' },
  [Role.STUDENT]:   { label: 'Student',   Icon: GraduationCap, gradient: 'from-rose-600 to-rose-500' },
};



/** Desired visual order on the landing page */
const ROLE_ORDER: RoleKey[] = [Role.PRINCIPAL, Role.TEACHER, Role.STUDENT, Role.PARENT];

export default function Landing() {
  const auth = useContext(AuthContext);
  const [openRole, setOpenRole] = useState<RoleKey | null>(null);

  function handlePick(user: User) {
    auth?.login(user);
    setOpenRole(null);
  }

  // Format name for teachers: "Name - <Subject> Teacher"
  const displayName = (u: User) =>
    u.role === Role.TEACHER && u.subject ? `${u.name} - ${u.subject} Teacher` : u.name;

  return (
    <div
      className="min-h-screen bg-cover bg-no-repeat bg-center flex flex-col items-center justify-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="py-10 text-center">
        <h1 className="text-4xl font-bold text-white">Welcome to Smart Assessment</h1>
        <p className="text-white text-[23px]">Choose your role to continue</p>
      </div>

      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-6 pb-16">
        {ROLE_ORDER.map((role) => {
          const { label, Icon, gradient } = ROLE_META[role];
          return (
            <div key={role} className="group relative">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 flex flex-col items-center">
             <div
  className={`w-14 h-14 rounded-full
              bg-royal-blue              /* solid fallback */
              bg-gradient-to-br ${gradient}  /* your dynamic gradient */
              flex items-center justify-center
              text-white shadow`}
>
  <Icon className="w-7 h-7" />
</div>

                <div className="mt-3 font-semibold text-gray-800">{label}</div>

                {/* Hover login button */}
                <button
                  onClick={() => setOpenRole(role)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity mt-4 px-4 py-2 rounded-md bg-royal-blue text-white text-sm font-medium"
                >
                  Login
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={!!openRole} onClose={() => setOpenRole(null)} title="Select a user to login">
        {openRole && (
          <div className="space-y-2">
            {mockUsers
              .filter((u) => u.role === openRole)
              .map((u) => (
                <button
                  key={u.userId}
                  onClick={() => handlePick(u)}
                  className="w-full text-left p-3 rounded-md border hover:border-royal-blue hover:bg-blue-50 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-gray-800">{displayName(u)}</div>
                    <div className="text-sm text-gray-500">{u.email}</div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-gray-100">
                    {ROLE_META[openRole].label}
                  </span>
                </button>
              ))}
            {mockUsers.filter((u) => u.role === openRole).length === 0 && (
              <p className="text-sm text-gray-600">No users found for this role.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
