import React from 'react';
import { Home, BookOpen, Trophy, Star } from 'lucide-react';

const Sidebar = () => {
  return (
    <div className="w-20 bg-[#1e40af] flex flex-col items-center py-6 flex-shrink-0">
      <div className="mb-10">
        <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
          <Star className="text-white fill-white w-6 h-6" />
        </div>
      </div>
      
      <nav className="flex flex-col space-y-8 flex-1">
        <button className="p-3 bg-white/20 rounded-xl text-white">
          <Home className="w-6 h-6" />
        </button>
        <button className="p-3 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-all">
          <BookOpen className="w-6 h-6" />
        </button>
        <button className="p-3 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-all">
          <Trophy className="w-6 h-6" />
        </button>
      </nav>

      <div className="mt-auto">
        <div className="w-12 h-12 rounded-full border-2 border-white/50 overflow-hidden bg-white/20 p-0.5">
          <div className="w-full h-full rounded-full overflow-hidden bg-blue-100">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
