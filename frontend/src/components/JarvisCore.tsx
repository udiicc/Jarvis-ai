import { useId, type CSSProperties } from "react";
import type { CoreState } from "../types";

const ticks = Array.from({ length: 120 }, (_, index) => {
  const angle = (index * Math.PI) / 60;
  const radius = index % 5 === 0 ? 251 : 258;
  return {
    x1: 300 + Math.sin(angle) * radius,
    y1: 300 - Math.cos(angle) * radius,
    x2: 300 + Math.sin(angle) * 266,
    y2: 300 - Math.cos(angle) * 266,
    major: index % 5 === 0,
  };
});
// Deterministic geometry: no random render values, timers, or animation re-renders.
const particles = Array.from({ length: 180 }, (_, index) => {
  const angle = index * 2.399963229728653;
  const radius = 112 * Math.sqrt((index + 0.5) / 180);
  return {
    x: 300 + Math.cos(angle) * radius,
    y: 300 + Math.sin(angle) * radius,
    radius: index % 7 === 0 ? 2.2 : 1,
    opacity: 0.25 + (index % 6) * 0.1,
  };
});
const labels: Record<CoreState, string> = {
  idle: "SYSTEM ONLINE · IDLE",
  processing: "PROCESSING",
  responding: "RESPONDING",
  offline: "BACKEND OFFLINE",
  error: "REQUEST ERROR",
  listening: "LISTENING",
  connecting: "CONNECTING",
};

export function OrbitalRing({
  radius,
  className,
  segments,
}: {
  radius: number;
  className: string;
  segments: string;
}) {
  return (
    <g className={`orbital-ring ${className}`}>
      <circle
        cx="300"
        cy="300"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeDasharray={segments}
      />
      <circle cx="300" cy={300 - radius} r="3" fill="currentColor" />
      <path
        d={`M ${295} ${300 - radius - 7} h10 M300 ${300 - radius - 12} v10`}
        stroke="currentColor"
        fill="none"
      />
    </g>
  );
}

export function NeuralParticleField() {
  return (
    <g className="neural-field">
      {particles.map((point, index) => (
        <g key={index}>
          {index % 3 === 0 && (
            <line
              x1={point.x}
              y1={point.y}
              x2={particles[(index + 9) % particles.length].x}
              y2={particles[(index + 9) % particles.length].y}
              stroke="currentColor"
              opacity=".11"
              strokeWidth=".6"
            />
          )}
          <circle
            className="neural-particle"
            cx={point.x}
            cy={point.y}
            r={point.radius}
            fill="currentColor"
            opacity={point.opacity}
            style={{ animationDelay: `${-(index % 9)}s` } as CSSProperties}
          />
        </g>
      ))}
    </g>
  );
}

export default function JarvisCore({
  state,
  focused = false,
  mode = "mock",
}: {
  state: CoreState;
  focused?: boolean;
  mode?: string;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <div
      className={`jarvis-core ${focused ? "core-focused" : ""}`}
      data-state={state}
      role="img"
      aria-label={`JARVIS holographic core: ${labels[state].toLowerCase()}`}
    >
      <div className="core-atmosphere" />
      <svg className="core-svg" viewBox="0 0 600 600" aria-hidden="true">
        <defs>
          <radialGradient id={`${id}-sphere`}>
            <stop offset="0" stopColor="#127dff" stopOpacity=".36" />
            <stop offset=".66" stopColor="#009cd6" stopOpacity=".16" />
            <stop offset="1" stopColor="#00dfff" stopOpacity=".02" />
          </radialGradient>
          <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#40f3ff" stopOpacity=".85" />
            <stop offset=".5" stopColor="#137dff" stopOpacity=".12" />
            <stop offset="1" stopColor="#00dfff" stopOpacity=".7" />
          </linearGradient>
        </defs>
        <g className="alignment-guides" stroke="currentColor" fill="none">
          <path d="M300 9v36m0 510v36M9 300h36m510 0h36M78 78l23 23m398 398l23 23M78 522l23-23m398-398l23-23" />
          <circle cx="300" cy="300" r="282" strokeDasharray="2 15" />
          <path d="M45 220v-38h38M555 220v-38h-38M45 380v38h38M555 380v38h-38" />
        </g>
        <g className="radial-ticks" stroke="currentColor">
          {ticks.map((tick, index) => (
            <line
              key={index}
              {...{ x1: tick.x1, y1: tick.y1, x2: tick.x2, y2: tick.y2 }}
              strokeWidth={tick.major ? "1.5" : ".6"}
              opacity={tick.major ? ".9" : ".4"}
            />
          ))}
        </g>
        <circle
          className="outer-track"
          cx="300"
          cy="300"
          r="241"
          fill="none"
          stroke="currentColor"
          strokeWidth=".6"
        />
        <OrbitalRing
          radius={236}
          className="orbit-outer"
          segments="130 36 4 12 4 12 90 78 10 4 10 88"
        />
        <OrbitalRing
          radius={221}
          className="orbit-counter"
          segments="330 70 40 80 15 9"
        />
        <g
          className="orbital-ring orbit-blocks"
          stroke="currentColor"
          fill="none"
          strokeWidth="7"
        >
          <circle
            cx="300"
            cy="300"
            r="208"
            strokeDasharray="3 8"
            opacity=".36"
          />
          <circle
            cx="300"
            cy="300"
            r="208"
            strokeDasharray="73 580 90 565"
            opacity=".85"
          />
        </g>
        <circle
          cx="300"
          cy="300"
          r="196"
          fill="none"
          stroke={`url(#${id}-edge)`}
          strokeWidth=".75"
        />
        <g
          className="orbital-ring orbit-inner"
          stroke="currentColor"
          fill="none"
        >
          <circle
            cx="300"
            cy="300"
            r="178"
            strokeWidth="2"
            strokeDasharray="100 40 2 16 60 185"
          />
          <circle
            cx="300"
            cy="300"
            r="167"
            strokeWidth=".6"
            strokeDasharray="4 7"
            opacity=".5"
          />
          <path
            d="M290 113h20l10 9h-40zM290 487h20l10-9h-40z"
            fill="currentColor"
            opacity=".7"
          />
        </g>
        <circle
          className="energy-wave wave-one"
          cx="300"
          cy="300"
          r="146"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
        <circle
          className="energy-wave wave-two"
          cx="300"
          cy="300"
          r="146"
          fill="none"
          stroke="currentColor"
          strokeWidth=".7"
        />
        <circle
          className="intelligence-sphere"
          cx="300"
          cy="300"
          r="146"
          fill={`url(#${id}-sphere)`}
          stroke={`url(#${id}-edge)`}
          strokeWidth="1.4"
        />
        <g
          className="sphere-wireframe"
          stroke="currentColor"
          fill="none"
          opacity=".2"
          strokeWidth=".6"
        >
          {[36, 68, 99, 128].map((radius) => (
            <ellipse key={radius} cx="300" cy="300" rx={radius} ry="146" />
          ))}
          {[38, 76, 110].map((radius) => (
            <ellipse key={radius} cx="300" cy="300" rx="146" ry={radius} />
          ))}
          <path d="M154 300h292M300 154v292" />
        </g>
        <NeuralParticleField />
        <g className="orbital-ring orbit-ecliptic">
          <ellipse
            cx="300"
            cy="300"
            rx="247"
            ry="80"
            transform="rotate(-25 300 300)"
            fill="none"
            stroke="currentColor"
            strokeWidth=".8"
            opacity=".65"
          />
        </g>
        <g className="orbital-ring satellite-system">
          <circle cx="300" cy="147" r="3" fill="currentColor" />
          <circle
            cx="300"
            cy="147"
            r="8"
            fill="none"
            stroke="currentColor"
            strokeWidth=".5"
          />
          <circle cx="450" cy="325" r="2" fill="currentColor" />
        </g>
        <g className="core-svg-labels" fill="currentColor">
          <text x="300" y="31" textAnchor="middle">
            COGNITIVE INTERFACE / 01
          </text>
          <text x="300" y="579" textAnchor="middle">
            {mode === "openai"
              ? "PERSONAL ASSISTANT · OPENAI"
              : mode === "ollama"
                ? "LOCAL ASSISTANT · OLLAMA"
                : "LOCAL ASSISTANT · MOCK ENGINE"}
          </text>
          <text
            x="39"
            y="306"
            textAnchor="middle"
            transform="rotate(-90 39 306)"
          >
            INPUT CHANNEL
          </text>
          <text
            x="561"
            y="306"
            textAnchor="middle"
            transform="rotate(90 561 306)"
          >
            RESPONSE CHANNEL
          </text>
        </g>
        <g
          className="core-waveform"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          {Array.from({ length: 17 }, (_, index) => (
            <line
              key={index}
              x1={252 + index * 6}
              x2={252 + index * 6}
              y1={386 - (index % 5) * 2}
              y2={391 + (index % 5) * 2}
              style={{ animationDelay: `${index * 0.06}s` }}
            />
          ))}
        </g>
      </svg>
      <div className="core-identity">
        <span className="core-id-prefix">PERSONAL INTELLIGENCE</span>
        <h2>J.A.R.V.I.S.</h2>
        <span className="core-id-subtitle">ARTIFICIAL INTELLIGENCE SYSTEM</span>
        <div className="core-state-label">
          <i />
          {labels[state]}
        </div>
      </div>
    </div>
  );
}
