import React from 'react';
import { ArrowLeft } from 'lucide-react';

const fileInfo = {
  title: 'Drought on the Prairies',
  thumbnail: '/assets/drought_banner.png',
  topics: ['Reading', 'English', 'Science', 'Nature', 'Geography', 'Environment'],
};

const questions = [
  {
    id: 1,
    text: 'How did the drought affect forests and other non-farming communities across Canada?',
    tag: 'Comprehension',
    askedBy: 'Jamie and Thomas',
  },
  {
    id: 2,
    text: 'What similarities and differences did you notice between other regions droughts have affected and the Prairies?',
    tag: 'Comparison',
    askedBy: 'Thomas',
  },
];

const QuestionSelectionView = ({ onQuestionSelect, onBack }) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 52px)' }}>
      <div className="bg-white border-b border-black/35 px-6 py-2.5 flex items-center justify-between shrink-0" style={{ gap: '64px' }}>
        <button
          onClick={onBack}
          className="flex items-center gap-3 text-sm font-mulish text-black hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-[#374957]" />
          Back to home
        </button>
      </div>
      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {/* Left panel - file info */}
        <div className="w-[523px] bg-white rounded p-9 flex flex-col gap-8 shrink-0 overflow-y-auto">
          <div className="flex flex-col gap-2">
            <div className="aspect-[384/204] w-full rounded overflow-hidden">
              <img
                src={fileInfo.thumbnail}
                alt={fileInfo.title}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-base font-karla text-black mt-2">Chosen file:</p>
            <h2 className="text-2xl font-semibold font-karla text-black">{fileInfo.title}</h2>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-base font-mulish text-black">Chosen Topics</p>
            <div className="flex flex-wrap gap-4">
              {fileInfo.topics.map((topic, i) => (
                <span key={i} className="bg-[#e6e6e6] px-4 py-1 rounded-[20px] text-sm font-mulish text-black">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel - questions */}
        <div className="flex-1 bg-white rounded p-9 flex flex-col gap-9 overflow-y-auto">
          <div className="flex flex-col gap-3">
            <h1 className="text-[32px] font-semibold font-karla text-black">Your list of activities</h1>
            <p className="text-base font-mulish text-black">
              Topics will influence what kinds of problems and questions we will come up for you.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {questions.map((q) => (
              <div
                key={q.id}
                className="border border-black/15 rounded p-4 flex items-end justify-between gap-6"
                style={{
                  backgroundImage: `url(/assets/q${q.id}card.png)`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'right bottom',
                  backgroundRepeat: 'no-repeat',
                }}
              >
                <div className="flex flex-col gap-3 flex-1 min-w-0">
                  <p className="text-xl font-medium font-karla text-black leading-tight">
                    {q.text}
                  </p>
                  <span className="border border-[#0c8e3f] text-[#0c8e3f] text-sm font-mulish px-3 py-0.5 rounded w-fit">
                    {q.tag}
                  </span>
                  <span className="text-base font-mulish text-black/70">Asked by {q.askedBy}</span>
                </div>

                <button
                  onClick={() => q.id === 1 && onQuestionSelect(q.id)}
                  className={`${q.id === 1 ? 'bg-[#0c8e3f] hover:bg-[#0a7534] cursor-pointer' : 'bg-[#0c8e3f]/50 cursor-default'} transition-colors text-white px-4 py-2 rounded flex items-center gap-3 whitespace-nowrap shrink-0 self-center`}
                >
                  <span className="text-sm font-mulish">Start learning</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionSelectionView;
