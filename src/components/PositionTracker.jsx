import React from 'react';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

const PositionTracker = ({ agentState }) => {
  const characters = [
    { id: 'jamie', name: 'Jamie', color: 'orange' },
    { id: 'thomas', name: 'Thomas', color: 'blue' }
  ];

  return (
    <div className="bg-white border-b border-gray-100 p-4">
      <div className="flex space-x-4">
        {characters.map((char) => {
          const state = agentState[char.id] || { status: 'RED', opinion: 'Calculating...' };
          const statusColor = 
            state.status === 'GREEN' ? 'text-green-600 bg-green-50 border-green-200' :
            state.status === 'YELLOW' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
            'text-red-600 bg-red-50 border-red-200';
          
          const Icon = state.status === 'GREEN' ? ShieldCheck : state.status === 'YELLOW' ? ShieldAlert : Shield;

          return (
            <div key={char.id} className={`flex-1 p-3 rounded-xl border ${statusColor} transition-all duration-500`}>
              <div className="flex items-center space-x-2 mb-1">
                <Icon className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{char.name}'s Stance</span>
                <span className={`ml-auto px-1.5 py-0.5 rounded text-[8px] font-black ${
                  state.status === 'GREEN' ? 'bg-green-200' : 
                  state.status === 'YELLOW' ? 'bg-yellow-200' : 
                  'bg-red-200'
                }`}>
                  {state.status}
                </span>
              </div>
              <p className="text-[11px] leading-tight font-medium">
                "{state.opinion}"
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PositionTracker;
