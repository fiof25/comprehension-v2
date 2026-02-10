import React, { useRef, useEffect } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';

const statusStyles = {
  GREEN: { bg: '#CFFFE1', border: '#00A928', dot: '#89CCA1', text: '#5B886B', label: 'Convinced' },
  YELLOW: { bg: '#FFF8DC', border: '#F9A825', dot: '#F9A825', text: '#8B7A2B', label: 'Unsure' },
  RED: { bg: '#FFE0E0', border: '#D32F2F', dot: '#D32F2F', text: '#8B2B2B', label: 'Unconvinced' },
};

const AgentCard = ({ name, avatar, bgColor, borderColor, status, opinion }) => {
  const style = statusStyles[status] || statusStyles.RED;

  return (
    <div
      className="rounded"
      style={{ background: bgColor, border: `1px solid ${borderColor}`, padding: '12px 14px' }}
    >
      <div className="flex items-start gap-3">
        <img src={avatar} alt={name} className="w-[80px] h-[80px] object-contain shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-baseline gap-3">
            <span className="font-karla font-medium" style={{ fontSize: 22, lineHeight: '26px', letterSpacing: '-0.04em', minWidth: 95 }}>
              {name}
            </span>
            <div
              className="flex items-center gap-1.5 rounded-full relative" style={{ background: style.bg, border: `0.5px solid ${style.border}`, padding: '3px 12px', top: '-1px' }}
            >
              <div className="rounded-full" style={{ width: 9, height: 9, background: style.dot }} />
              <span className="font-karla font-medium" style={{ fontSize: 14, lineHeight: '18px', letterSpacing: '-0.04em', color: style.text }}>
                {style.label}
              </span>
            </div>
          </div>
          <p className="font-mulish text-black/85" style={{ fontSize: 13, lineHeight: '18px' }}>
            &ldquo;{opinion}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
};

const ResultsPage2 = ({ agentState, messages, onNext, onBack }) => {
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center bg-white py-6 px-6 overflow-hidden">
      <div className="w-full max-w-[914px] flex flex-col gap-6 h-full">
        {/* Title */}
        <div className="shrink-0">
          <h1 className="font-karla font-semibold text-black" style={{ fontSize: 22, lineHeight: '28px' }}>
            This is how well you convinced Thomas and Jamie
          </h1>
          <p className="font-mulish text-black/75" style={{ fontSize: 14, lineHeight: '20px', marginTop: 4 }}>
            See their current stance on the question.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-6 flex-1 min-h-0">
          {/* Left: Agent cards */}
          <div className="flex flex-col gap-4 shrink-0" style={{ width: 445 }}>
            <div className="rounded bg-[#F9F9F9] border border-black/15" style={{ padding: '10px 14px' }}>
              <p className="font-karla font-medium text-black" style={{ fontSize: 15, lineHeight: '20px' }}>
                How did the drought affect forests and other non-farming communities across Canada?
              </p>
            </div>
            <AgentCard
              name="Jamie"
              avatar="/assets/jamiechat.png"
              bgColor="#FFF3F8"
              borderColor="#F7D4E9"
              status={agentState.jamie?.status || 'RED'}
              opinion={agentState.jamie?.opinion || ''}
            />
            <AgentCard
              name="Thomas"
              avatar="/assets/thomaschat.png"
              bgColor="#F4F9FF"
              borderColor="#BDD7F6"
              status={agentState.thomas?.status || 'RED'}
              opinion={agentState.thomas?.opinion || ''}
            />
          </div>

          {/* Right: Conversation History */}
          <div className="flex-1 border border-black/35 rounded flex flex-col overflow-hidden" style={{ padding: '0 16px 16px' }}>
            <div className="shrink-0 flex items-center border-b border-black/15" style={{ height: 48 }}>
              <span className="font-mulish font-bold text-black" style={{ fontSize: 18, lineHeight: '23px' }}>
                Conversation History
              </span>
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 min-h-0 pt-6">
              {messages.map((msg, idx) => {
                if (msg.role === 'user') {
                  return (
                    <div key={idx} className="flex justify-end">
                      <div
                        className="bg-[#fafafa] border border-[#d7d7d7] rounded font-mulish text-black"
                        style={{ padding: '8px 12px', fontSize: 13, lineHeight: '17px', maxWidth: 300 }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                }
                const isJamie = msg.character === 'jamie';
                return (
                  <div key={idx} className="flex items-start gap-2">
                    <img
                      src={isJamie ? '/assets/jamiechat.png' : '/assets/thomaschat.png'}
                      alt={msg.character}
                      className="w-7 h-7 object-contain shrink-0 mt-1"
                    />
                    <div
                      className={`rounded font-mulish text-black ${isJamie ? 'bg-[#FDF2F8]' : 'bg-[#f5f9ff]'}`}
                      style={{ padding: '8px 12px', fontSize: 13, lineHeight: '17px', maxWidth: 300 }}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between shrink-0">
          <button
            onClick={onBack}
            className="border border-black/35 rounded flex items-center justify-center gap-6 text-black font-mulish hover:bg-gray-50 transition-colors"
            style={{ padding: '12px 24px', width: 224, height: 48, fontSize: 16, lineHeight: '20px' }}
          >
            <ArrowLeft className="w-6 h-6" />
            Back
          </button>
          <button
            onClick={onNext}
            className="bg-[#0C8E3F] rounded flex items-center justify-center gap-6 text-white font-mulish hover:bg-[#0a7534] transition-colors"
            style={{ padding: '12px 24px', width: 224, height: 48, fontSize: 16, lineHeight: '20px' }}
          >
            Next
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage2;
