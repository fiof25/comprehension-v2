import React from 'react';

const LoadingScreen = () => {
  return (
    <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          {/* Loader icon */}
          <svg className="w-10 h-10 animate-spin" viewBox="0 0 40 40" fill="none" style={{ animationDuration: '2s' }}>
            <line x1="20" y1="2" x2="20" y2="10" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="20" y1="30" x2="20" y2="38" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="2" y1="20" x2="10" y2="20" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="30" y1="20" x2="38" y2="20" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="7.27" y1="7.27" x2="12.93" y2="12.93" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="27.07" y1="27.07" x2="32.73" y2="32.73" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="7.27" y1="32.73" x2="12.93" y2="27.07" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="27.07" y1="12.93" x2="32.73" y2="7.27" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />
          </svg>

          <div className="text-center text-black">
            <h2 className="text-[32px] font-semibold font-karla leading-tight">
              Generating questions
            </h2>
            <p className="text-base font-mulish mt-3">
              Please choose one you would like to explore.
            </p>
          </div>
        </div>
    </div>
  );
};

export default LoadingScreen;
