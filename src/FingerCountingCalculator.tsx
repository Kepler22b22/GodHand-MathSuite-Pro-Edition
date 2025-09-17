import React, { useEffect, useMemo, useRef, useState } from "react";


export default function FingerCountingCalculator() {
  const [expr, setExpr] = useState("3 + 3");
  const [error, setError] = useState<string | null>(null);
  const [A, B] = useMemo(() => parseExpr(expr), [expr]);

  // finger labels; empty string means unmarked
  const [labels, setLabels] = useState<string[]>(Array(10).fill(""));
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const lastRunId = useRef(0);

  type Mode = "sketch" | "svg2" | "photo";
  const [mode, setMode] = useState<Mode>("svg2");

  // photo mode
  const [leftPhoto, setLeftPhoto] = useState<string | null>(null);
  const [rightPhoto, setRightPhoto] = useState<string | null>(null);

  useEffect(() => {
    setLabels(Array(10).fill(""));
    setHighlightIdx(null);
    setResultOpen(false);
    setError(null);
  }, [A, B]);

  function handleRun() {
    const err = validate(A, B);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    runAnimation(A!, B!);
  }

  async function runAnimation(a: number, b: number) {
    if (isRunning) return;
    setIsRunning(true);
    setResultOpen(false);
    const runId = ++lastRunId.current;

    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
    const safeSet = (fn: () => void) => {
      if (lastRunId.current === runId) fn();
    };

    safeSet(() => setLabels(Array(10).fill("")));
    safeSet(() => setHighlightIdx(null));

    // Step 1: mark 1..A starting at left thumb
    for (let i = 0; i < a; i++) {
      safeSet(() => {
        setHighlightIdx(i);
        setLabels((prev) => {
          const next = [...prev];
          next[i] = String(i + 1);
          return next;
        });
      });
      await sleep(480);
    }

    // Step 2: temporary 1..B on next fingers
    for (let j = 0; j < b; j++) {
      const idx = a + j;
      safeSet(() => {
        setHighlightIdx(idx);
        setLabels((prev) => {
          const next = [...prev];
          next[idx] = String(j + 1);
          return next;
        });
      });
      await sleep(480);
    }

    // Step 3: replace temp with A+1..A+B
    for (let j = 0; j < b; j++) {
      const idx = a + j;
      safeSet(() => {
        setHighlightIdx(idx);
        setLabels((prev) => {
          const next = [...prev];
          next[idx] = String(a + j + 1);
          return next;
        });
      });
      await sleep(380);
    }

    safeSet(() => setHighlightIdx(null));
    await sleep(200);
    safeSet(() => setResultOpen(true));
    safeSet(() => setIsRunning(false));
  }

  return (
    <div className="page">
      <div className="container">
        <h1>Finger-Counting Calculator</h1>
        <p className="muted">Only supports addition where the result is less than 10. Format: <code>A + B</code>.</p>

        <div className="row">
          <input
            className="input"
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            placeholder="e.g., 3 + 3"
          />
          <button onClick={handleRun} disabled={isRunning} className="btn">
            {isRunning ? "Playing…" : "Play"}
          </button>
        </div>

        <div className="row">
          <div className="mode">
            <label><input type="radio" name="mode" checked={mode === "svg2"} onChange={() => setMode("svg2")} /> Pretty SVG</label>
            <label><input type="radio" name="mode" checked={mode === "sketch"} onChange={() => setMode("sketch")} /> Simple SVG</label>
            <label><input type="radio" name="mode" checked={mode === "photo"} onChange={() => setMode("photo")} /> Photos</label>
          </div>

          {mode === "photo" && (
            <div className="row">
              <label className="upload">
                Upload Left Hand
                <input type="file" accept="image/*" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setLeftPhoto(URL.createObjectURL(f));
                }} />
              </label>
              <label className="upload">
                Upload Right Hand
                <input type="file" accept="image/*" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setRightPhoto(URL.createObjectURL(f));
                }} />
              </label>
            </div>
          )}
        </div>

        <QuickTests onPick={(t) => setExpr(t)} />

        {error && <div className="error">{error}</div>}
      </div>

      <div className="svg-wrap">
        {mode === "photo" ? (
          <HandsPhoto labels={labels} highlightIdx={highlightIdx} leftSrc={leftPhoto} rightSrc={rightPhoto} />
        ) : mode === "sketch" ? (
          <HandsSketch labels={labels} highlightIdx={highlightIdx} />
        ) : (
          <HandsPrettySVG labels={labels} highlightIdx={highlightIdx} />
        )}
      </div>

      {resultOpen && A != null && B != null && (
        <div className="overlay" onClick={() => setResultOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="muted">Result</div>
            <div className="big">{A + B}</div>
            <div className="muted">{A} + {B} = {A + B}</div>
            <button className="btn" onClick={() => setResultOpen(false)}>Close</button>
          </div>
        </div>
      )}

      <div className="footer">
        Modes: Pretty SVG / Simple SVG / Photos. Animation: mark 1…A; mark 1…B; relabel to A+1…A+B; show result.
      </div>
    </div>
  );
}

/* -------- parsing & validation -------- */
function parseExpr(s: string): [number | null, number | null] {
  const m = s.match(/^(\s*\d\s*)\+\s*(\d)\s*$/);
  if (!m) return [null, null];
  const a = Number(m[1].trim());
  const b = Number(m[2].trim());
  if (Number.isNaN(a) || Number.isNaN(b)) return [null, null];
  return [a, b];
}

function validate(a: number | null, b: number | null): string | null {
  if (a == null || b == null) return "Please enter an expression like ‘3 + 3’.";
  if (!Number.isInteger(a) || !Number.isInteger(b)) return "A and B must be single digits.";
  if (a < 0 || b < 0) return "Only non-negative single digits are supported.";
  if (a > 9 || b > 9) return "Only single digits (0–9) are supported.";
  if (a + b >= 10) return "Sum must be less than 10.";
  if (a + b === 0) return "Try something other than 0 + 0 🙂";
  return null;
}

/* -------- Simple SVG hands (sketch) -------- */
function HandsSketch({ labels, highlightIdx }: { labels: string[]; highlightIdx: number | null }) {
  const fingerPositions = useMemo(() => {
    const positions: { x: number; y: number }[] = [];
    const count = 10;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const x = 40 + t * 920;
      const y = 140 - 30 * Math.cos(t * Math.PI);
      positions.push({ x, y });
    }
    return positions;
  }, []);

  return (
    <div className="card">
      <svg viewBox="0 0 1000 260" className="svg">
        <rect x={90} y={170} rx={28} ry={28} width={180} height={56} className="palm" />
        <rect x={730} y={170} rx={28} ry={28} width={180} height={56} className="palm" />

        {fingerPositions.map((p, i) => {
          const isHL = highlightIdx === i;
          const label = labels[i] ?? "";
          return (
            <g key={i} transform={`translate(${p.x - 22}, ${p.y - 56})`}>
              <rect width={44} height={84} rx={22} className={`finger ${isHL ? "hl" : label ? "on" : "off"}`} />
              <line x1={6} y1={56} x2={38} y2={56} className="knuckle" />
              {label && (
                <text x={22} y={36} textAnchor="middle" dominantBaseline="middle" className={`label ${isHL ? "bold" : ""}`}>
                  {label}
                </text>
              )}
              <text x={22} y={98} textAnchor="middle" className="sub">
                {fingerName(i)}
              </text>
            </g>
          );
        })}

        <text x={180} y={240} textAnchor="middle" className="legend">Left Hand (Thumb → Pinky)</text>
        <text x={820} y={240} textAnchor="middle" className="legend">Right Hand (Thumb → Pinky)</text>
      </svg>
    </div>
  );
}

/* -------- Realistic SVG hands -------- */
function HandsPrettySVG({ labels, highlightIdx }: { labels: string[]; highlightIdx: number | null }) {
  const leftAnchors = [
    { x: 115, y: 90 },  // Left Thumb
    { x: 210, y: 60 },  // Left Index
    { x: 300, y: 52 },  // Left Middle
    { x: 385, y: 66 },  // Left Ring
    { x: 460, y: 92 },  // Left Pinky
  ];
  const rightAnchors = [
    { x: 540, y: 92 },  // Right Thumb
    { x: 615, y: 66 },  // Right Index
    { x: 700, y: 52 },  // Right Middle
    { x: 790, y: 60 },  // Right Ring
    { x: 885, y: 90 },  // Right Pinky
  ];
  const anchors = [...leftAnchors, ...rightAnchors];

  return (
    <div className="card">
      <svg viewBox="0 0 1000 420" className="svg">
        <defs>
          <linearGradient id="skin" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fde7d8" />
            <stop offset="100%" stopColor="#f7cdb4" />
          </linearGradient>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="6" floodColor="#000" floodOpacity="0.15" />
          </filter>
        </defs>

        <g filter="url(#softShadow)">
          <path d="M100,260 C90,200 140,160 210,150 C240,146 265,150 300,160 C330,170 350,190 360,215 C365,230 360,250 350,270 C335,300 300,320 250,320 C180,320 120,300 100,260 Z" fill="url(#skin)" stroke="#e0a98f"/>
          <FingerPath d="M120,220 C110,170 120,120 140,110 C160,100 180,130 175,180 C170,215 150,230 120,220 Z" />
          <FingerPath d="M200,150 C200,110 210,60 230,50 C250,42 270,70 265,115 C260,145 240,160 200,150 Z" />
          <FingerPath d="M280,150 C280,102 292,45 315,40 C338,36 358,68 352,112 C346,145 325,162 280,150 Z" />
          <FingerPath d="M350,165 C350,120 362,70 382,62 C402,56 420,83 416,122 C412,152 394,170 350,165 Z" />
          <FingerPath d="M410,190 C410,150 420,112 438,106 C456,100 472,120 470,150 C468,176 452,194 410,190 Z" />
        </g>

        <g filter="url(#softShadow)">
          <path d="M900,260 C910,200 860,160 790,150 C760,146 735,150 700,160 C670,170 650,190 640,215 C635,230 640,250 650,270 C665,300 700,320 750,320 C820,320 880,300 900,260 Z" fill="url(#skin)" stroke="#e0a98f"/>
          <FingerPath d="M880,220 C890,170 880,120 860,110 C840,100 820,130 825,180 C830,215 850,230 880,220 Z" />
          <FingerPath d="M800,150 C800,110 790,60 770,50 C750,42 730,70 735,115 C740,145 760,160 800,150 Z" />
          <FingerPath d="M720,150 C720,102 708,45 685,40 C662,36 642,68 648,112 C654,145 675,162 720,150 Z" />
          <FingerPath d="M650,165 C650,120 638,70 618,62 C598,56 580,83 584,122 C588,152 606,170 650,165 Z" />
          <FingerPath d="M590,190 C590,150 580,112 562,106 C544,100 528,120 530,150 C532,176 548,194 590,190 Z" />
        </g>

        {anchors.map((a, i) => {
          const label = labels[i];
          if (!label) return null;
          const isHL = highlightIdx === i;
          return (
            <g key={i} transform={`translate(${a.x}, ${a.y})`}>
              <circle r={16} fill="#ffffff" stroke={isHL ? "#111" : "#cfcfcf"} />
              <text x={0} y={4} textAnchor="middle" className={isHL ? "bold" : ""} style={{ fontSize: 16 }}>
                {label}
              </text>
            </g>
          );
        })}

        <text x={220} y={360} textAnchor="middle" className="legend">Left Hand (Thumb → Pinky)</text>
        <text x={780} y={360} textAnchor="middle" className="legend">Right Hand (Thumb → Pinky)</text>
      </svg>
    </div>
  );
}

function FingerPath({ d }: { d: string }) {
  return <path d={d} fill="url(#skin)" stroke="#e0a98f" />;
}

function fingerName(i: number): string {
  const left = ["Thumb", "Index", "Middle", "Ring", "Pinky"];
  const right = ["Thumb", "Index", "Middle", "Ring", "Pinky"];
  return i < 5 ? left[i] : right[i - 5];
}

/* -------- Photo-based renderer -------- */
function HandsPhoto({
  labels,
  highlightIdx,
  leftSrc,
  rightSrc,
}: {
  labels: string[];
  highlightIdx: number | null;
  leftSrc: string | null;
  rightSrc: string | null;
}) {
  const leftAnchors = [
    { x: 12, y: 10 },
    { x: 26, y: 6 },
    { x: 40, y: 6 },
    { x: 55, y: 8 },
    { x: 68, y: 14 },
  ];
  const rightAnchors = [
    { x: 32, y: 14 },
    { x: 45, y: 8 },
    { x: 60, y: 6 },
    { x: 74, y: 6 },
    { x: 88, y: 10 },
  ];
  const anchors = [...leftAnchors, ...rightAnchors];

  return (
    <div className="card">
      <div className="grid2">
        <PhotoBox src={leftSrc} label="Left Hand" />
        <PhotoBox src={rightSrc} label="Right Hand" />
      </div>

      <div className="overlay-grid">
        {[0, 1].map((col) => (
          <div key={col} className="rel">
            {Array.from({ length: 5 }).map((_, k) => {
              const i = col * 5 + k;
              const text = labels[i];
              if (!text) return null;
              const { x, y } = anchors[i];
              const isHL = highlightIdx === i;
              return (
                <div
                  key={i}
                  className={`labelchip ${isHL ? "hl" : ""}`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  {text}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function PhotoBox({ src, label }: { src: string | null; label: string }) {
  return (
    <div className="photobox">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} style={{ objectFit: "contain", width: "100%", height: "100%" }} />
      ) : (
        <div className="muted">{label} not uploaded</div>
      )}
    </div>
  );
}

/* -------- Quick tests -------- */
function QuickTests({ onPick }: { onPick: (txt: string) => void }) {
  const cases = [
    "3 + 3",
    "1 + 8",
    "4 + 0",
    "0 + 0",
    "9 + 2",
    "a + b",
    "7+ 1",
  ];
  const rows = cases.map((c) => {
    const [a, b] = parseExpr(c);
    const msg = validate(a, b);
    return { c, status: msg ? `ERR: ${msg}` : "OK" };
  });
  return (
    <div className="tests">
      <div className="muted small">Quick tests (click to paste into input):</div>
      <div className="row wrap">
        {rows.map((r) => (
          <button
            key={r.c}
            onClick={() => onPick(r.c)}
            className="testbtn"
            title={r.status}
          >
            {r.c}
          </button>
        ))}
      </div>
    </div>
  );
}

