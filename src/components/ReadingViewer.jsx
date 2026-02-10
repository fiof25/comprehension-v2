import React from 'react';
import { ArrowLeft } from 'lucide-react';

const ReadingViewer = ({ onComplete, onBack }) => {
  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-6 pb-2">
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Read and discuss the contents of this reading</h1>
        <p className="text-sm text-gray-400 mt-1 font-medium">Press continue when you are finished reading</p>
      </div>

      {/* PDF centered — wrapper clips the browser's native toolbar */}
      <div className="flex-1 flex items-center justify-center min-h-0 px-8 py-4">
        <div className="w-full max-w-[700px] h-full rounded-lg border border-gray-100 bg-gray-50 overflow-hidden">
          <iframe
            src="/assets/Drought_Reading.pdf#toolbar=0"
            title="Drought Reading"
            className="w-full border-none"
            style={{ height: 'calc(100% + 40px)', marginTop: '-40px' }}
          />
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="px-8 py-3 flex justify-between items-center">
        <button
          onClick={onBack}
          className="px-6 py-2.5 border border-gray-200 text-gray-600 text-sm font-bold rounded-lg hover:bg-gray-50 transition-all flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to questions
        </button>
        <button
          onClick={onComplete}
          className="bg-[#0c8e3f] hover:bg-[#0a7534] transition-colors text-white px-6 py-2.5 rounded flex items-center gap-3 text-sm font-mulish"
        >
          Continue
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ReadingViewer;
