import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';

const QuestionSelectionView = ({ activities: activitiesProp, onQuestionSelect, onBack }) => {
  const [fetchedActivities, setFetchedActivities] = useState([]);

  // Fetch activities if none were passed as props
  useEffect(() => {
    if (!activitiesProp || activitiesProp.length === 0) {
      fetch('/api/activities')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setFetchedActivities(data);
        })
        .catch(err => console.error('Failed to load activities:', err));
    }
  }, [activitiesProp]);

  const activities = (activitiesProp && activitiesProp.length > 0) ? activitiesProp : fetchedActivities;

  // Group activities by title to show file info from the first one
  const fileInfo = activities.length > 0 ? {
    title: activities[0].title,
    thumbnail: activities[0].thumbnail,
    topics: activities[0].topics,
  } : { title: '', thumbnail: '', topics: [] };

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
            {activities.map((a, index) => (
              <div
                key={a.slug}
                className="border border-black/15 rounded p-4 flex items-end justify-between gap-6"
                style={{
                  backgroundImage: `url(/assets/q${index + 1}card.png)`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'right bottom',
                  backgroundRepeat: 'no-repeat',
                }}
              >
                <div className="flex flex-col gap-3 flex-1 min-w-0">
                  <p className="text-xl font-medium font-karla text-black leading-tight">
                    {a.questionText || a.question?.text}
                  </p>
                  <span className="border border-[#0c8e3f] text-[#0c8e3f] text-sm font-mulish px-3 py-0.5 rounded w-fit">
                    {a.tag || a.question?.tag}
                  </span>
                  <span className="text-base font-mulish text-black/70">Asked by {a.askedBy || a.question?.askedBy}</span>
                </div>

                <button
                  onClick={() => onQuestionSelect(a.slug)}
                  className="bg-[#0c8e3f] hover:bg-[#0a7534] cursor-pointer transition-colors text-white px-4 py-2 rounded flex items-center gap-3 whitespace-nowrap shrink-0 self-center"
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
