import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Pencil, FileText, BookOpen } from 'lucide-react';
import Chat from './components/Chat';
import QuestionSection from './components/QuestionSection';
import HomePage from './components/HomePage';
import LoadingScreen from './components/LoadingScreen';
import QuestionSelectionView from './components/QuestionSelectionView';
import ResultsPage from './components/ResultsPage';
import ResultsPage2 from './components/ResultsPage2';

const StarIcon = () => (
  <svg viewBox="0 0 32 32" className="w-8 h-[30px]">
    <path
      d="M16 2L19.09 11.26L29 11.44L21.18 17.14L24.09 26.56L16 21.12L7.91 26.56L10.82 17.14L3 11.44L12.91 11.26L16 2Z"
      fill="#FDB022"
    />
  </svg>
);

const AutoScaleText = ({ children, maxFontSize = 19, minFontSize = 13 }) => {
  const textRef = useRef(null);
  const [fontSize, setFontSize] = useState(maxFontSize);
  const maxHeight = 56; // inner content height (80px container - 24px padding)

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    // Start at max and shrink until it fits
    let size = maxFontSize;
    el.style.fontSize = `${size}px`;

    while (size > minFontSize && el.scrollHeight > maxHeight) {
      size -= 1;
      el.style.fontSize = `${size}px`;
    }
    setFontSize(size);
  }, [children, maxFontSize, minFontSize]);

  return (
    <div className="bg-[#fafafa] border border-[#d7d7d7] rounded" style={{ padding: '12px 14px', height: '80px', overflow: 'hidden' }}>
      <h2 ref={textRef} className="font-semibold font-karla text-black" style={{ fontSize: `${fontSize}px`, lineHeight: 1.37 }}>
        {children}
      </h2>
    </div>
  );
};

function App() {
  const [activeStep, setActiveStep] = useState('home'); // 'home' | 'loading' | 'questionSelect' | 'question' | 'results' | 'results2'
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [prefillAnswer, setPrefillAnswer] = useState('');
  const [resultsData, setResultsData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isJamieTyping, setIsJamieTyping] = useState(false);
  const [isThomasTyping, setIsThomasTyping] = useState(false);

  // Clean up generated files on page load (session reset)
  useEffect(() => {
    fetch('/api/reset-session', { method: 'POST' }).catch(() => {});
  }, []);

  // Activity-driven state
  const [activitiesList, setActivitiesList] = useState([]); // list of activity summaries for question selection
  const [selectedActivity, setSelectedActivity] = useState(null); // full activity object for the current session
  const [uploadedContentUrl, setUploadedContentUrl] = useState(null); // blob URL for PDF or YouTube embed URL

  const [checklist, setChecklist] = useState([
    { id: 'analogy', label: 'Use an analogy in your explanation', completed: false },
    { id: 'example', label: 'Bring up an example from the text', completed: false },
    { id: 'story', label: '(Bonus) Tell an interesting story', completed: false },
  ]);
  const [agentState, setAgentState] = useState({
    jamie: { opinion: '', status: 'RED' },
    thomas: { opinion: '', status: 'RED' },
  });

  // When an activity is selected, load its full data and initialize state
  const handleSelectActivitySlug = async (slug) => {
    try {
      // Check if full activity data is already in the list (from upload-pdf)
      const cached = activitiesList.find(a => a.slug === slug && a.characterPositions);
      const activity = cached || await fetch(`/api/activities/${slug}`).then(r => r.json());
      setSelectedActivity(activity);

      // Initialize from activity data
      setAgentState({
        jamie: {
          opinion: activity.characterPositions.jamie.opinion,
          status: activity.characterPositions.jamie.status,
        },
        thomas: {
          opinion: activity.characterPositions.thomas.opinion,
          status: activity.characterPositions.thomas.status,
        },
      });

      if (activity.checklist && activity.checklist.length > 0) {
        setChecklist(activity.checklist.map(c => ({ ...c, completed: false })));
      }

      setMessages([]);
      setActiveStep('question');
    } catch (error) {
      console.error('Error loading activity:', error);
    }
  };

  // Initial greeting - Triggered when moving to the question step with a selected activity
  useEffect(() => {
    if (activeStep === 'question' && messages.length === 0 && selectedActivity) {
      setMessages([
        {
          role: 'assistant',
          character: 'jamie',
          content: selectedActivity.initialMessages.jamie,
          timestamp: new Date(),
          status: agentState.jamie.status,
        },
        {
          role: 'assistant',
          character: 'thomas',
          content: selectedActivity.initialMessages.thomas,
          timestamp: new Date(),
          status: agentState.thomas.status,
        },
      ]);
    }
  }, [activeStep, messages.length, selectedActivity]);

  const handleSendMessage = async (text) => {
    if (isJamieTyping || isThomasTyping) return;

    // Prevent duplicate submission if same text sent within 1 second
    if (messages.length > 0 &&
        messages[messages.length-1].content === text &&
        messages[messages.length-1].role === 'user' &&
        new Date() - new Date(messages[messages.length-1].timestamp) < 1000) {
      return;
    }

    const userMessage = { role: 'user', content: text, timestamp: new Date() };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setIsJamieTyping(true); // Set early to prevent double submission

    getAIResponses(newMessages);
  };

  const getAIResponses = async (history) => {
    setIsJamieTyping(true);
    setIsThomasTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          agentState: agentState,
          activitySlug: selectedActivity?.slug,
        })
      }).then(res => res.json());

      if (response.responses) {
        const updatedState = response.updatedState || agentState;
        const newMsgs = response.responses.map(r => ({
          role: 'assistant',
          character: r.character,
          content: r.message,
          timestamp: new Date(),
          status: updatedState[r.character]?.status
        }));

        setMessages(prev => [...prev, ...newMsgs]);

        if (response.updatedState) {
          setAgentState(response.updatedState);
        }
        if (response.checklist) {
          setChecklist(prev => prev.map(item => ({
            ...item,
            completed: item.completed || !!response.checklist[item.id],
          })));
        }
      } else if (response.error) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          character: 'jamie',
          content: "Sorry, we're having trouble thinking right now. (Error: " + response.error + ")",
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Error getting AI responses:', error);
    } finally {
      setIsJamieTyping(false);
      setIsThomasTyping(false);
    }
  };

  // Auto-transition from loading to question selection
  useEffect(() => {
    if (activeStep === 'loading') {
      const timer = setTimeout(() => setActiveStep('questionSelect'), 1000);
      return () => clearTimeout(timer);
    }
  }, [activeStep]);

  const questionText = selectedActivity?.question?.text || selectedActivity?.questionText || '';

  const renderContent = () => {
    if (activeStep === 'home') {
      return (
        <HomePage
          onStartLearning={() => setActiveStep('loading')}
          onSelectActivity={(activities, contentUrl) => {
            setActivitiesList(activities);
            if (contentUrl) setUploadedContentUrl(contentUrl);
            setActiveStep('loading');
          }}
        />
      );
    }
    if (activeStep === 'loading') {
      return <LoadingScreen />;
    }
    if (activeStep === 'questionSelect') {
      return (
        <QuestionSelectionView
          activities={activitiesList}
          onQuestionSelect={handleSelectActivitySlug}
          onBack={() => setActiveStep('home')}
        />
      );
    }

    if (activeStep === 'results' && resultsData) {
      return (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Secondary Nav Bar */}
          <div className="bg-white border-b border-black/35 px-6 py-2.5 flex items-center justify-between shrink-0" style={{ gap: '64px' }}>
            <button
              onClick={() => setActiveStep('questionSelect')}
              className="flex items-center gap-3 text-sm font-mulish text-black hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-[#374957]" />
              Back to home
            </button>
            <div className="flex items-center gap-5 bg-[#efefef] rounded px-2.5 py-1.5 flex-1 max-w-[700px]">
              <span className="text-xs font-mulish text-black/75">Whiteboard activity</span>
              <span className="text-xs font-mulish text-black/75">Question 1 of 3</span>
            </div>
            <button className="flex items-center gap-3 text-sm font-mulish text-black cursor-default">
              Skip Question
              <ArrowLeft className="w-6 h-6 text-[#374957] rotate-180" />
            </button>
          </div>
          <ResultsPage
            answer={resultsData.answer}
            grades={resultsData.grades}
            onNext={() => setActiveStep('results2')}
            onBack={() => setActiveStep('questionSelect')}
          />
        </div>
      );
    }

    if (activeStep === 'results2') {
      return (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Secondary Nav Bar */}
          <div className="bg-white border-b border-black/35 px-6 py-2.5 flex items-center justify-between shrink-0" style={{ gap: '64px' }}>
            <button
              onClick={() => setActiveStep('questionSelect')}
              className="flex items-center gap-3 text-sm font-mulish text-black hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-[#374957]" />
              Back to home
            </button>
            <div className="flex items-center gap-5 bg-[#efefef] rounded px-2.5 py-1.5 flex-1 max-w-[700px]">
              <span className="text-xs font-mulish text-black/75">Whiteboard activity</span>
              <span className="text-xs font-mulish text-black/75">Question 1 of 3</span>
            </div>
            <button className="flex items-center gap-3 text-sm font-mulish text-black cursor-default">
              Skip Question
              <ArrowLeft className="w-6 h-6 text-[#374957] rotate-180" />
            </button>
          </div>
          <ResultsPage2
            agentState={agentState}
            messages={messages}
            questionText={questionText}
            onNext={() => setActiveStep('home')}
            onBack={() => setActiveStep('results')}
          />
        </div>
      );
    }

    // Question/discussion step - new two-column layout
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Secondary Nav Bar */}
        <div className="bg-white border-b border-black/35 px-6 py-2.5 flex items-center justify-between shrink-0" style={{ gap: '64px' }}>
          <button
            onClick={() => setActiveStep('questionSelect')}
            className="flex items-center gap-3 text-sm font-mulish text-black hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-[#374957]" />
            Back to home
          </button>
          <div className="flex items-center gap-5 bg-[#efefef] rounded px-2.5 py-1.5 flex-1 max-w-[700px]">
            <span className="text-xs font-mulish text-black/75">Discussion Activity</span>
            <span className="text-xs font-mulish text-black/75">Question 1 of 3</span>
          </div>
          <button className="flex items-center gap-3 text-sm font-mulish text-black cursor-default">
            Skip Question
            <ArrowLeft className="w-6 h-6 text-[#374957] rotate-180" />
          </button>
        </div>

        {/* Two-column layout */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Column - Discussion */}
          <div className="w-[734px] flex flex-col overflow-hidden border-r border-black/35 bg-white shrink-0">
            {/* Question info header */}
            <div className="p-6 border-b border-black/35 flex gap-4">
              <div className="flex-1 flex flex-col gap-[11px]">
                <AutoScaleText>&ldquo;{questionText}&rdquo;</AutoScaleText>
                <p className="font-mulish text-black/60" style={{ fontSize: '13px', lineHeight: '18px' }}>Thomas and Jamie have different stances on this question. Try to clarify their concerns and develop your final answer.</p>
              </div>
              {/* Learning checklist */}
              <div className="min-w-[220px] border border-black/35 rounded p-3 shrink-0 self-stretch flex flex-col gap-3">
                <span className="text-sm font-semibold font-mulish text-black" style={{ lineHeight: '18px' }}>Learning checklist</span>
                <div className="flex flex-col gap-3">
                  {checklist.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="w-4 h-4 flex-shrink-0">
                        {item.completed ? (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <rect width="16" height="16" rx="2" fill="#0C8E3F" />
                            <path d="M4 8L7 11L12 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <rect x="0.5" y="0.5" width="15" height="15" rx="1.5" stroke="#966503" />
                          </svg>
                        )}
                      </div>
                      <span
                        className="font-mulish text-xs"
                        style={{ lineHeight: '16px', color: item.completed ? '#0C8E3F' : '#966503' }}
                      >
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chat area */}
            <Chat
              messages={messages}
              onSendMessage={handleSendMessage}
              isJamieTyping={isJamieTyping}
              isThomasTyping={isThomasTyping}
              agentState={agentState}
              onFinish={() => setShowFinishModal(true)}
              onSubmitAsAnswer={(content) => { setPrefillAnswer(content); setShowFinishModal(true); }}
            />
          </div>

          {/* Column toggle button */}
          <div className="absolute left-[714px] top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-[0_4px_4px_rgba(0,0,0,0.09),0_1px_2px_rgba(0,0,0,0.1)] flex items-center justify-center">
            <span className="text-black text-xs">‹ ›</span>
          </div>

          {/* Right Column - Tabbed content with PDF */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-center bg-white border-b border-black/35">
              <div className="flex items-center justify-center gap-2 px-5 py-2.5 cursor-default">
                <Pencil className="w-3.5 h-3.5 text-[#374957]" />
                <span className="text-sm font-mulish text-black">Whiteboard</span>
              </div>
              <div className="flex items-center justify-center gap-2 px-5 py-2.5 border-b border-[#0c8e3f]">
                <FileText className="w-3.5 h-3.5 text-[#0c8e3f]" />
                <span className="text-sm font-mulish text-[#0c8e3f]">Uploaded Content</span>
              </div>
              <div className="flex items-center justify-center gap-2 px-5 py-2.5 cursor-default">
                <BookOpen className="w-3.5 h-3.5 text-[#374957]" />
                <span className="text-sm font-mulish text-black">Rubric</span>
              </div>
            </div>

            {/* Content viewer (PDF or YouTube) */}
            <div className="flex-1 min-h-0 bg-[#525659]">
              {(() => {
                const contentSrc = uploadedContentUrl || selectedActivity?.pdf || '/assets/Drought_Reading.pdf';
                const isYoutube = contentSrc.includes('youtube.com/embed');
                return (
                  <iframe
                    src={isYoutube ? contentSrc : `${contentSrc}#toolbar=0&navpanes=0&view=FitH`}
                    title="Reading Content"
                    className="w-full h-full border-none"
                    {...(isYoutube ? { allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture', allowFullScreen: true } : {})}
                  />
                );
              })()}
            </div>
          </div>
        </div>

        {/* Finish conversation modal */}
        {showFinishModal && (
          <QuestionSection
            onClose={() => { setShowFinishModal(false); setPrefillAnswer(''); }}
            agentState={agentState}
            prefillAnswer={prefillAnswer}
            checklist={checklist}
            activitySlug={selectedActivity?.slug}
            questionText={questionText}
            onResults={(data) => { setResultsData(data); setShowFinishModal(false); setActiveStep('results'); }}
          />
        )}
      </div>
    );
  };

  return (
    <div className="h-screen bg-[#f6f6f6] flex flex-col overflow-hidden">
      {/* Navbar - consistent across all screens */}
      <header className="bg-[#1a1a1a] h-[52px] flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-1 px-3 cursor-pointer" onClick={() => setActiveStep('home')}>
          <StarIcon />
          <span className="text-white text-lg font-bold font-karla">Protégé</span>
        </div>
        <div className="flex items-center gap-5 text-white text-sm font-mulish">
          <span className="cursor-pointer">Login</span>
          <span className="cursor-pointer">Signup</span>
        </div>
      </header>

      {/* Screen Content */}
      {renderContent()}
    </div>
  );
}

export default App;
