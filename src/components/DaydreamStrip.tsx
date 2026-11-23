import { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';

/**
 * Single inline hand-drawn stick-figure daydream strip above the footer.
 * Animates strictly via CSS transform/opacity and pauses automatically when
 * prefers-reduced-motion is enabled, the tab is hidden, or the user toggles Pause.
 */
export function DaydreamStrip() {
  const [userPaused, setUserPaused] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const [tabHidden, setTabHidden] = useState<boolean>(() =>
    typeof document !== 'undefined' ? document.hidden : false
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    // Automatically pause CSS animations when the browser tab is hidden to save resources.
    const handleVisibilityChange = () => {
      setTabHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const isPaused = userPaused || tabHidden;

  return (
    <div
      className="daydream-strip mx-auto flex max-w-[1360px] flex-wrap items-center justify-center gap-3 px-4 pb-1 sm:px-6 lg:px-10"
      data-paused={isPaused ? 'true' : 'false'}
    >
      <svg
        viewBox="0 0 640 108"
        fill="none"
        aria-hidden="true"
        className="block h-24 w-full max-w-2xl"
      >
        {/* Floor baseline */}
        <path
          d="M24 96H616"
          stroke="var(--ink)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Named part: Chair */}
        <g id="daydream-chair">
          <path
            d="M120 46V74M120 74H148M124 74V96M144 74V96"
            stroke="var(--ink)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect
            x="116"
            y="45"
            width="6"
            height="18"
            rx="2.5"
            fill="var(--lavender)"
            stroke="var(--ink)"
            strokeWidth="1.8"
          />
        </g>

        {/* Named part: Body */}
        <g id="daydream-body">
          <path
            d="M144 49L148 73M148 73L167 75L168 96M146 73L157 78L158 96"
            stroke="var(--ink)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Named part: Desk */}
        <g id="daydream-desk">
          <path
            d="M174 66H272M184 66V96M260 66V96"
            stroke="var(--ink)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          {/* Small notebook & pen cup resting on the lab desk */}
          <rect
            x="206"
            y="58"
            width="30"
            height="8"
            rx="2"
            fill="var(--lavender)"
            stroke="var(--ink)"
            strokeWidth="1.8"
          />
          <rect
            x="244"
            y="55"
            width="12"
            height="11"
            rx="2"
            fill="var(--white)"
            stroke="var(--ink)"
            strokeWidth="1.8"
          />
          <path
            d="M248 55L246 49M252 55L254 50"
            stroke="var(--ink)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </g>

        {/* Named part: Arms (back arm resting, front hand gently tapping on desk) */}
        <g id="daydream-arms">
          <path
            d="M144 55L133 67"
            stroke="var(--ink)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <g className="daydream-anim daydream-hand-anim">
            <path
              d="M146 56L167 63L191 63"
              stroke="var(--ink)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx="193"
              cy="63"
              r="3"
              fill="var(--white)"
              stroke="var(--ink)"
              strokeWidth="1.8"
            />
          </g>
        </g>

        {/* Named part: Head & Eyes */}
        <g id="daydream-head" className="daydream-anim daydream-head-anim">
          <path
            d="M142 22C146 17 151 18 153 22"
            stroke="var(--ink)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle
            cx="148"
            cy="35"
            r="12.5"
            fill="var(--white)"
            stroke="var(--ink)"
            strokeWidth="2.3"
          />
          <path
            d="M144 40.5C147 42.5 151 42.5 154 40.5"
            stroke="var(--ink)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <g id="daydream-eyes" className="daydream-anim daydream-eyes-anim">
            <ellipse cx="145.5" cy="34" rx="1.6" ry="1.9" fill="var(--ink)" />
            <ellipse cx="153.5" cy="34" rx="1.6" ry="1.9" fill="var(--ink)" />
          </g>
        </g>

        {/* Named part: Thought Bubble + 4 Cross-fading Doodles */}
        <g id="daydream-thought-bubble" className="daydream-anim daydream-bubble-anim">
          <circle
            cx="179"
            cy="27"
            r="3.5"
            fill="var(--lavender)"
            stroke="var(--ink)"
            strokeWidth="1.7"
          />
          <circle
            cx="198"
            cy="20"
            r="5.5"
            fill="var(--lavender)"
            stroke="var(--ink)"
            strokeWidth="1.7"
          />
          <path
            d="M214 22C232 18 248 26 266 25"
            stroke="var(--ink)"
            strokeWidth="1.8"
            strokeDasharray="4 5"
            strokeLinecap="round"
          />

          {/* Scalloped thought cloud */}
          <path
            d="M298 66C282 66 272 56 274 44C275 33 286 26 298 28C304 16 320 11 334 17C343 9 362 9 371 18C384 12 403 18 408 31C421 31 430 41 428 53C426 64 415 71 402 69C394 78 377 80 366 74C355 81 337 81 327 73C316 78 302 74 298 66Z"
            fill="var(--white)"
            stroke="var(--ink)"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />

          {/* 1. Oscilloscope doodle */}
          <g className="daydream-anim daydream-doodle-1" transform="translate(328 24)">
            <rect
              x="2"
              y="5"
              width="44"
              height="32"
              rx="4"
              fill="var(--white)"
              stroke="var(--ink)"
              strokeWidth="2"
            />
            <rect
              x="7"
              y="10"
              width="23"
              height="18"
              rx="2"
              fill="var(--lavender)"
              stroke="var(--ink)"
              strokeWidth="1.6"
            />
            <path
              d="M9 19C12 13 15 13 18 19C21 25 24 25 27 19"
              stroke="var(--ink)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <circle cx="37" cy="14" r="2.6" fill="var(--white)" stroke="var(--ink)" strokeWidth="1.6" />
            <circle cx="37" cy="24" r="2.6" fill="var(--lavender)" stroke="var(--ink)" strokeWidth="1.6" />
          </g>

          {/* 2. Flask doodle */}
          <g className="daydream-anim daydream-doodle-2" transform="translate(331 21)">
            <path
              d="M14 5H26M17 5V16L7 35C6 37.2 7.5 40 10 40H30C32.5 40 34 37.2 33 35L23 16V5"
              fill="var(--white)"
              stroke="var(--ink)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M11 28H29L31.8 35C32.3 36.4 31.3 38 29.8 38H10.2C8.7 38 7.7 36.4 8.2 35L11 28Z"
              fill="var(--lavender)"
              stroke="var(--ink)"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <circle cx="17" cy="33" r="1.7" fill="var(--white)" stroke="var(--ink)" strokeWidth="1.4" />
            <circle cx="24" cy="31.5" r="1.3" fill="var(--white)" stroke="var(--ink)" strokeWidth="1.4" />
          </g>

          {/* 3. Circuit board doodle */}
          <g className="daydream-anim daydream-doodle-3" transform="translate(330 22)">
            <rect
              x="5"
              y="4"
              width="34"
              height="34"
              rx="4"
              fill="var(--lavender)"
              stroke="var(--ink)"
              strokeWidth="2"
            />
            <rect
              x="14"
              y="13"
              width="16"
              height="16"
              rx="2"
              fill="var(--white)"
              stroke="var(--ink)"
              strokeWidth="1.8"
            />
            <path
              d="M9 14H14M9 21H14M9 27H14M30 14H35M30 21H35M30 27H35M19 8V13M25 8V13M19 29V34M25 29V34"
              stroke="var(--ink)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </g>

          {/* 4. Gear doodle */}
          <g className="daydream-anim daydream-doodle-4" transform="translate(330 21)">
            <path
              d="M19 5H25L26.5 9.8C27.9 10.3 29.2 11 30.3 12L34.8 10L38.2 15.8L34.3 19C34.6 20.5 34.6 22 34.3 23.5L38.2 26.7L34.8 32.5L30.3 30.5C29.2 31.5 27.9 32.2 26.5 32.7L25 37.5H19L17.5 32.7C16.1 32.2 14.8 31.5 13.7 30.5L9.2 32.5L5.8 26.7L9.7 23.5C9.4 22 9.4 20.5 9.7 19L5.8 15.8L9.2 10L13.7 12C14.8 11 16.1 10.3 17.5 9.8L19 5Z"
              fill="var(--lavender)"
              stroke="var(--ink)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <circle
              cx="22"
              cy="21.2"
              r="6"
              fill="var(--white)"
              stroke="var(--ink)"
              strokeWidth="2"
            />
          </g>

          {/* Trailing sparkles to the right of the thought cloud */}
          <path
            d="M446 36C486 24 522 46 566 34"
            stroke="var(--ink)"
            strokeWidth="1.8"
            strokeDasharray="5 6"
            strokeLinecap="round"
          />
          <path
            d="M582 22L585 30L593 33L585 36L582 44L579 36L571 33L579 30Z"
            fill="var(--lavender)"
            stroke="var(--ink)"
            strokeWidth="1.7"
          />
          <circle
            cx="474"
            cy="52"
            r="3.5"
            fill="var(--lavender)"
            stroke="var(--ink)"
            strokeWidth="1.6"
          />
        </g>
      </svg>

      <div className="flex items-center gap-2.5 shrink-0">
        <span className="text-sm text-[var(--ink)]">Lab daydream</span>
        <button
          type="button"
          onClick={() => setUserPaused((prev) => !prev)}
          aria-label={userPaused ? 'Play animation' : 'Pause animation'}
          aria-pressed={userPaused}
          className="labora-btn labora-btn-paper !min-h-[40px] !px-3 text-sm"
        >
          {userPaused ? (
            <Play className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <Pause className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span>{userPaused ? 'Play' : 'Pause'}</span>
        </button>
      </div>
    </div>
  );
}
