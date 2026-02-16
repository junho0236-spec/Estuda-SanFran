
import React from 'react';
import { User } from 'lucide-react';

const Profile: React.FC = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-500">
      <div className="bg-slate-100 dark:bg-white/10 p-8 rounded-full mb-6">
        <User className="w-16 h-16 text-slate-400" />
      </div>
      <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
        Perfil do Estudante
      </h2>
      <p className="text-slate-500 font-bold mt-2 max-w-md">
        Esta área está em desenvolvimento. Em breve, você poderá visualizar suas estatísticas, conquistas e personalizar sua jornada acadêmica.
      </p>
    </div>
  );
};

export default Profile;
