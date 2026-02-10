import React, { useRef, useEffect, useState } from 'react';
import { Send, Check } from 'lucide-react';

const statusBadge = {
  RED: { symbol: '?', color: '#DC2626' },
  YELLOW: { symbol: '~', color: '#D97706' },
  GREEN: { symbol: '!', color: '#16A34A' },
};

const statusTooltip = {
  RED: { label: 'Unconvinced', bg: '#FFE0E0', border: '#D32F2F', dot: '#E57373', text: '#8B4444' },
  YELLOW: { label: 'Unsure', bg: '#FFF8DC', border: '#F9A825', dot: '#FFD54F', text: '#7A6A2E' },
  GREEN: { label: 'Convinced', bg: '#CFFFE1', border: '#00A928', dot: '#89CCA1', text: '#5B886B' },
};

const Chat = ({ messages, onSendMessage, isJamieTyping, isThomasTyping, agentState, onFinish, onSubmitAsAnswer }) => {
  const scrollRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isJamieTyping, isThomasTyping]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const input = e.target.elements.message;
    if (input.value.trim()) {
      onSendMessage(input.value);
      input.value = '';
    }
  };

  const showTooltip = (e, character) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      character,
      x: rect.right + 8,
      y: rect.top - 8,
    });
  };

  const hideTooltip = () => setTooltip(null);

  const renderTooltipPortal = () => {
    if (!tooltip) return null;
    const status = agentState?.[tooltip.character]?.status;
    const config = statusTooltip[status];
    if (!config) return null;
    const name = tooltip.character === 'jamie' ? 'Jamie' : 'Thomas';
    return (
      <div
        className="fixed z-50 flex items-center gap-1.5 whitespace-nowrap pointer-events-none"
        style={{
          left: tooltip.x,
          top: tooltip.y,
          transform: 'translateY(-100%)',
          background: config.bg,
          border: `1px solid ${config.border}`,
          borderRadius: '50px',
          padding: '4px 12px',
        }}
      >
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: config.dot }} />
        <span className="font-karla font-medium" style={{ fontSize: '12px', letterSpacing: '-0.04em', color: config.text }}>
          {name} is {config.label}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 justify-between">
      {renderTooltipPortal()}
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-[20px] px-6 pt-6 pb-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start items-center gap-2'} ${msg.role === 'user' ? 'group relative' : ''}`}>
            {msg.role === 'assistant' && (
              <div
                className="w-12 h-12 flex-shrink-0 cursor-pointer relative"
                onMouseEnter={(e) => showTooltip(e, msg.character)}
                onMouseLeave={hideTooltip}
              >
                <img
                  src={`/assets/${msg.character === 'jamie' ? 'jamiechat.png' : 'thomaschat.png'}`}
                  alt={msg.character}
                  className="w-full h-full object-cover"
                />
                {msg.status && statusBadge[msg.status] && (
                  <span
                    className={`absolute top-0 font-bold text-[17px] leading-none ${msg.character === 'jamie' ? 'left-[4px]' : 'left-[8px]'}`}
                    style={{
                      color: statusBadge[msg.status].color,
                      opacity: 0.7,
                      transform: 'rotate(-10deg)',
                    }}
                  >
                    {statusBadge[msg.status].symbol}
                  </span>
                )}
              </div>
            )}
            <div className={`rounded font-mulish ${
              msg.role === 'user'
                ? 'bg-[#fafafa] border border-[#d7d7d7] text-black'
                : msg.character === 'jamie'
                  ? 'bg-[#FDF2F8] border border-[#f0d5e8] text-black'
                  : 'bg-[#f5f9ff] border border-[#c2d5f2] text-black'
            }`} style={{
              padding: '10px 14px',
              fontSize: '14px',
              lineHeight: '18px',
              maxWidth: msg.role === 'user' ? '380px' : '500px',
            }}>
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <button
                onClick={() => onSubmitAsAnswer(msg.content)}
                className="absolute -bottom-6 right-0 hidden group-hover:flex items-center gap-1.5 px-2.5 py-1 bg-white border border-black/20 rounded shadow-sm text-xs font-mulish text-black/70 hover:text-black hover:border-black/35 transition-all z-10"
              >
                <Check className="w-3 h-3" />
                Submit as answer
              </button>
            )}
          </div>
        ))}

        {(isJamieTyping || isThomasTyping) && (
          <div className="flex items-center gap-2">
            <div
              className="w-12 h-12 flex-shrink-0 animate-pulse cursor-pointer relative"
              onMouseEnter={(e) => showTooltip(e, isJamieTyping ? 'jamie' : 'thomas')}
              onMouseLeave={hideTooltip}
            >
              {(() => {
                const char = isJamieTyping ? 'jamie' : 'thomas';
                const badge = statusBadge[agentState?.[char]?.status];
                return (
                  <>
                    <img
                      src={`/assets/${isJamieTyping ? 'jamiechat.png' : 'thomaschat.png'}`}
                      alt="typing"
                      className="w-full h-full object-cover opacity-50"
                    />
                    {badge && (
                      <span
                        className="absolute top-0 left-[8px] font-bold text-[17px] leading-none"
                        style={{
                          color: badge.color,
                          opacity: 0.7,
                          transform: 'rotate(-10deg)',
                        }}
                      >
                        {badge.symbol}
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
            <div className="bg-[#f5f9ff] border border-[#c2d5f2] text-gray-400 rounded font-mulish animate-pulse" style={{ padding: '10px 14px', fontSize: '14px', lineHeight: '18px' }}>
              {isJamieTyping ? 'Jamie is thinking...' : 'Thomas is reflecting...'}
            </div>
          </div>
        )}
      </div>

      {/* Finish conversation button */}
      <div className="flex justify-end px-6 py-2">
        <button
          onClick={onFinish}
          className="bg-[#e6f4ea] border border-[#0c8e3f]/30 rounded flex items-center gap-3 text-sm font-mulish text-[#0c8e3f] hover:bg-[#d4edda] transition-colors"
          style={{ padding: '8px 16px', height: '36px', lineHeight: '18px' }}
        >
          Finish conversation
          <Check className="w-5 h-5" />
        </button>
      </div>

      {/* Input area */}
      <div className="border-t border-black/30 px-6 py-4">
        <form onSubmit={handleSubmit} className="flex gap-[10px]">
          <input
            name="message"
            autoComplete="off"
            placeholder="Engage in the conversation here..."
            className="flex-1 bg-white border border-black/50 rounded font-mulish outline-none focus:border-black/70 transition-all placeholder:text-black/50"
            style={{ padding: '10px 14px', fontSize: '14px', lineHeight: '18px', height: '40px' }}
          />
          <button type="submit" className="w-10 h-10 bg-white border border-black/35 rounded flex items-center justify-center hover:bg-gray-50 transition-all active:scale-95">
            <Send className="w-5 h-5 text-black" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
