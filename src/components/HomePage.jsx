import React, { useRef } from 'react';

const modules = [
  {
    id: 1,
    title: 'Essay Critique',
    questionsCompleted: 24,
    createdDate: 'January 31st, 2026',
    thumbnail: '/assets/ph1.png',
  },
  {
    id: 2,
    title: 'Advanced Functions',
    questionsCompleted: 24,
    createdDate: 'January 31st, 2026',
    thumbnail: '/assets/ph2.png',
  },
  {
    id: 3,
    title: 'Biology',
    questionsCompleted: 24,
    createdDate: 'January 31st, 2026',
    thumbnail: '/assets/ph3.png',
  },
  {
    id: 4,
    title: 'AI Design',
    questionsCompleted: 24,
    createdDate: 'January 31st, 2026',
    thumbnail: '/assets/ph4.png',
  },
];

const HomePage = ({ onStartLearning }) => {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      onStartLearning();
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      onStartLearning();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero */}
      <div className="relative border-b border-black/50 overflow-hidden py-28" style={{ backgroundImage: "url('/assets/backgroundimage.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}>

        {/* Heading */}
        <div className="relative z-10 flex flex-col items-center text-white text-center">
          <h1 className="text-[32px] font-semibold font-karla leading-normal">
            What do you want to teach today?
          </h1>
          <p className="text-lg font-mulish mt-1">
            Upload any content and we'll make a workbook for you.
          </p>
        </div>

        {/* Upload card */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.mp3,.mp4"
          className="hidden"
        />
        <div
          className="relative z-10 mx-auto mt-6 w-[637px] bg-white/10 hover:bg-white/20 rounded p-10 flex flex-col items-center gap-5 cursor-pointer transition-all duration-200 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)] hover:backdrop-blur-sm"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          {/* Upload icon */}
          <svg className="w-[40px] h-[40px]" viewBox="68 34 42 42" fill="none">
            <path d="M82.141 45.977L86.312 41.804L86.344 62.251C86.344 63.494 87.351 64.501 88.594 64.501C89.836 64.501 90.844 63.494 90.844 62.251L90.812 41.83L94.96 45.977C95.823 46.871 97.247 46.896 98.141 46.032C99.035 45.169 99.059 43.745 98.196 42.851C98.178 42.832 98.16 42.814 98.141 42.796L93.323 37.978C90.687 35.342 86.414 35.342 83.778 37.978L83.777 37.978L78.96 42.796C78.096 43.69 78.121 45.114 79.015 45.977C79.887 46.819 81.269 46.819 82.141 45.977Z" fill="white"/>
            <path d="M104.249 57.75C103.006 57.75 101.999 58.757 101.999 60V66.886C101.998 67.225 101.724 67.499 101.385 67.5H75.613C75.275 67.499 75.001 67.225 75 66.886V60C75 58.757 73.992 57.75 72.75 57.75C71.507 57.75 70.5 58.757 70.5 60V66.886C70.503 69.709 72.791 71.996 75.613 72H101.385C104.208 71.996 106.495 69.709 106.498 66.886V60C106.498 58.757 105.491 57.75 104.249 57.75Z" fill="white"/>
          </svg>

          <div className="text-center text-white">
            <p className="text-xl font-medium font-karla">Drop your lecture content here</p>
            <p className="text-sm font-mulish mt-1">Supported formates: PDF, MP3, MP4</p>
          </div>

          {/* Divider */}
          <div className="w-full flex items-center gap-4 opacity-75">
            <div className="flex-1 h-px bg-white" />
            <span className="text-white text-sm font-mulish">or</span>
            <div className="flex-1 h-px bg-white" />
          </div>

          {/* Browse button */}
          <button
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            className="bg-[#0c8e3f] hover:bg-[#0a7534] transition-colors text-white px-10 py-4 rounded-md flex items-center gap-4 text-lg font-mulish"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 28" fill="none">
              <path d="M14.191 0.775H3.305C2.385 0.775 1.503 1.141 0.852 1.791C0.201 2.442 -0.164 3.324 -0.164 4.244V28.528H22.963V9.548L14.191 0.775ZM14.869 4.723L19.015 8.87H14.869V4.723ZM2.149 26.215V4.244C2.149 3.938 2.271 3.644 2.487 3.427C2.704 3.21 2.998 3.088 3.305 3.088H12.556V11.183H20.651V26.215H2.149Z" fill="white"/>
            </svg>
            Browse Files
          </button>
        </div>
      </div>

      {/* Previous modules */}
      <div className="max-w-[1368px] mx-auto px-9 py-16">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-2xl font-bold font-mulish text-black">Previous learning modules</h2>
          <button className="bg-white border border-black/35 px-6 py-3 rounded flex items-center gap-4 text-base font-mulish text-black">
            View All
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-6">
          {modules.map((m) => (
            <div key={m.id} className="bg-white border border-black/50 rounded-lg p-6 flex flex-col gap-4">
              <div className="aspect-[328/201] border border-black/35 rounded overflow-hidden">
                <img src={m.thumbnail} alt={m.title} className="w-full h-full object-cover" />
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="text-2xl font-bold font-mulish text-black">{m.title}</h3>
                <div className="flex items-center gap-2 text-base font-mulish text-black/75">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {m.questionsCompleted} Questions completed
                </div>
                <div className="flex items-center gap-2.5 text-base font-mulish text-black/75">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                  </svg>
                  Created on {m.createdDate}
                </div>
              </div>

              <button className="w-full bg-white border border-black/35 px-6 py-3 rounded flex items-center justify-center gap-4 text-base font-mulish text-black">
                Continue learning
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
