import React from 'react';
import { ArrowRight } from 'lucide-react';

const DiamondChart = ({ scores }) => {
  const cx = 175;
  const cy = 155;
  const maxRV = 130;
  const maxRH = 105;

  const axes = [
    { label: 'Understanding', dx: 0, dy: -1, maxR: maxRV, lx: 175, ly: 12 },
    { label: 'Evidence', dx: 1, dy: 0, maxR: maxRH, lx: 320, ly: 160 },
    { label: 'Connections', dx: 0, dy: 1, maxR: maxRV, lx: 175, ly: 310 },
    { label: 'Content', dx: -1, dy: 0, maxR: maxRH, lx: 30, ly: 160 },
  ];

  const values = [
    scores.understanding / 100,
    scores.evidence / 100,
    scores.connections / 100,
    scores.content / 100,
  ];

  const bgPoints = axes.map(a => `${cx + a.dx * a.maxR},${cy + a.dy * a.maxR}`).join(' ');

  const dataPoints = axes.map((a, i) => {
    const r = Math.max(values[i] * a.maxR, 6);
    return `${cx + a.dx * r},${cy + a.dy * r}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 350 330" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <polygon points={bgPoints} fill="#F4F4F4" stroke="#D3D3D3" strokeWidth="1.2" />
      <line x1={cx} y1={cy - maxRV} x2={cx} y2={cy + maxRV} stroke="#D3D3D3" strokeWidth="1.2" />
      <line x1={cx - maxRH} y1={cy} x2={cx + maxRH} y2={cy} stroke="#D3D3D3" strokeWidth="1.2" />
      <polygon points={dataPoints} fill="rgba(255, 192, 255, 0.45)" stroke="rgba(200, 100, 200, 0.5)" strokeWidth="1.5" />
      {axes.map((a) => (
        <text
          key={a.label}
          x={a.lx}
          y={a.ly}
          className="font-karla"
          fontSize="13"
          fontWeight="500"
          letterSpacing="-0.04em"
          fill="#000"
          textAnchor="middle"
        >
          {a.label}
        </text>
      ))}
    </svg>
  );
};

const ResultsPage = ({ answer, grades, onNext }) => {
  const categories = [
    { key: 'content', label: 'Content' },
    { key: 'understanding', label: 'Understanding' },
    { key: 'connections', label: 'Connections' },
    { key: 'evidence', label: 'Evidence' },
  ];

  const totalPoints = categories.reduce((sum, c) => sum + (grades[c.key]?.score || 0), 0);
  const scores = {};
  categories.forEach(c => { scores[c.key] = grades[c.key]?.score || 0; });

  return (
    <div className="flex-1 flex flex-col items-center bg-white py-5 px-6 overflow-hidden">
      <div className="w-full max-w-[987px] flex flex-col gap-4 h-full">
        {/* Header */}
        <h1 className="font-karla font-semibold text-black shrink-0" style={{ fontSize: '22px', lineHeight: '28px' }}>
          Well done! You've completed this activity.
        </h1>

        {/* Final answer box */}
        <div className="bg-[#F9F9F9] border border-black/35 rounded flex flex-col gap-1 shrink-0" style={{ padding: '12px 14px', maxHeight: '120px' }}>
          <span className="font-mulish font-bold text-black" style={{ fontSize: '15px', lineHeight: '19px' }}>
            Your final answer
          </span>
          <p className="font-mulish text-black overflow-y-auto" style={{ fontSize: '13px', lineHeight: '18px' }}>
            {answer}
          </p>
        </div>

        {/* Score + Chart row - takes remaining space */}
        <div className="flex gap-5 justify-center flex-1 min-h-0">
          {/* Left: Score panel */}
          <div className="border border-black/35 rounded flex flex-col shrink-0 overflow-hidden" style={{ padding: 12, width: 482, gap: 8 }}>
            {/* Tab bar */}
            <div className="flex items-center w-full shrink-0" style={{ height: 36 }}>
              <div className="flex-1 flex items-center justify-center gap-2 pb-1.5 border-b-2 border-[#0C8E3F]">
                <svg width="14" height="15" viewBox="0 0 16 17" fill="none">
                  <path d="M14 1H2C1.44772 1 1 1.44772 1 2V15C1 15.5523 1.44772 16 2 16H14C14.5523 16 15 15.5523 15 15V2C15 1.44772 14.5523 1 14 1Z" stroke="#009936" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="8" cy="6" r="1" fill="#009936" />
                  <line x1="5" y1="9" x2="11" y2="9" stroke="#009936" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="5" y1="12" x2="11" y2="12" stroke="#009936" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className="font-mulish text-[#009936]" style={{ fontSize: 13, lineHeight: '16px' }}>Score</span>
              </div>
            </div>

            {/* Category rows - scrollable */}
            <div className="flex flex-col overflow-y-auto min-h-0 flex-1" style={{ gap: 12 }}>
            {categories.map((cat) => (
              <div key={cat.key} className="flex items-center w-full rounded shrink-0" style={{ padding: '8px 12px', minHeight: 60, gap: 12 }}>
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <span className="font-mulish font-bold text-black" style={{ fontSize: 17, lineHeight: '21px' }}>{cat.label}</span>
                  <span className="font-mulish text-black/70 line-clamp-2" style={{ fontSize: 11, lineHeight: '14px' }}>
                    {grades[cat.key]?.feedback || ''}
                  </span>
                </div>
                <div
                  className="rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ width: 48, height: 48, background: '#FBB934' }}
                >
                  <span className="font-mulish text-black" style={{ fontSize: 24, lineHeight: '30px' }}>
                    {grades[cat.key]?.score ?? 0}
                  </span>
                </div>
              </div>
            ))}
            </div>

            {/* Divider */}
            <div className="w-full border-t border-black/35 shrink-0" />

            {/* Total */}
            <div className="flex items-center justify-end gap-2 px-2 shrink-0">
              <span className="font-mulish text-black" style={{ fontSize: 12, lineHeight: '15px' }}>Total Points:</span>
              <span className="font-karla font-bold text-black" style={{ fontSize: 30, lineHeight: '36px' }}>{totalPoints}</span>
            </div>
          </div>

          {/* Right: Diamond chart */}
          <div className="border border-[#A6A6A6] rounded flex items-center justify-center" style={{ width: 482, padding: 16 }}>
            <DiamondChart scores={scores} />
          </div>
        </div>

        {/* Next button */}
        <div className="flex justify-end shrink-0">
          <button
            onClick={onNext}
            className="bg-[#0C8E3F] rounded flex items-center justify-center gap-4 text-white font-mulish hover:bg-[#0a7534] transition-colors"
            style={{ padding: '10px 20px', width: 224, height: 40, fontSize: 14, lineHeight: '18px' }}
          >
            View Agent Results
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
