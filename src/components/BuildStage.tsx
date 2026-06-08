import { useState } from 'react';
import type { RatingCategory } from '@/types';
import './BuildStage.css';

/** One of the 9 category rings around the silhouette. */
export interface StageSlot {
  category: RatingCategory;
  label: string;
  /** filled assignment, if any */
  fill?: {
    rating: number;
    playerName: string;
    photoUrl?: string; // when present and loadable, shown as the face; falls back to initials
  };
  /** available to assign right now (a player is active and this slot is empty) */
  highlighted?: boolean;
  onClick?: () => void;
}

export interface BuildStageProps {
  slots: StageSlot[]; // exactly 9, in display order: [0..2]=top, [3..5]=left, [6..8]=right
  ovr: number | null;
  /** ratings of the currently-active (selected, not-yet-assigned) player, for the live preview fill */
  className?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** A single category ring. Renders a face when a verified photo loads, else the player's initials. */
function Ring({ slot }: { slot: StageSlot }) {
  const [imgFailed, setImgFailed] = useState(false);
  const filled = !!slot.fill;
  const showFace = filled && !!slot.fill!.photoUrl && !imgFailed;
  const clickable = !!slot.onClick && (slot.highlighted || filled);

  return (
    <div className={`ring ${filled ? 'ring--filled' : ''} ${slot.highlighted ? 'ring--open' : ''}`}>
      <button
        type="button"
        className="ring__disc"
        onClick={slot.onClick}
        disabled={!clickable}
        aria-label={filled ? `${slot.label}: ${slot.fill!.playerName} (${slot.fill!.rating})` : `Assign ${slot.label}`}
      >
        {showFace ? (
          <img className="ring__face" src={slot.fill!.photoUrl} alt="" onError={() => setImgFailed(true)} />
        ) : filled ? (
          <span className="ring__initials">{initials(slot.fill!.playerName)}</span>
        ) : (
          <span className="ring__dot" aria-hidden />
        )}
        {filled && <span className="ring__rating">{slot.fill!.rating}</span>}
      </button>
      <span className="ring__label">{slot.label}</span>
      {filled && <span className="ring__player">{slot.fill!.playerName}</span>}
    </div>
  );
}

/** Clean human silhouette — static, no animation. A simple "videogame avatar" basketball figure. */
function Figure() {
  return (
    <svg className="stage__figure" viewBox="0 0 120 240" aria-hidden role="presentation">
      <defs>
        <linearGradient id="figFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a3f4a" />
          <stop offset="55%" stopColor="#23262d" />
          <stop offset="100%" stopColor="#16181d" />
        </linearGradient>
      </defs>
      <g fill="url(#figFill)" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5">
        {/* head */}
        <circle cx="60" cy="30" r="17" />
        {/* neck */}
        <rect x="52" y="44" width="16" height="12" rx="5" />
        {/* torso */}
        <path d="M37 58 Q60 50 83 58 L78 132 Q60 140 42 132 Z" />
        {/* left arm */}
        <path d="M37 60 Q24 64 22 96 Q21 116 27 134 L36 132 Q33 110 35 92 Q37 74 44 66 Z" />
        {/* right arm */}
        <path d="M83 60 Q96 64 98 96 Q99 116 93 134 L84 132 Q87 110 85 92 Q83 74 76 66 Z" />
        {/* left leg */}
        <path d="M43 130 Q50 138 50 160 L47 220 Q46 230 38 230 Q31 230 31 220 L35 158 Q37 140 43 130 Z" />
        {/* right leg */}
        <path d="M77 130 Q70 138 70 160 L73 220 Q74 230 82 230 Q89 230 89 220 L85 158 Q83 140 77 130 Z" />
      </g>
    </svg>
  );
}

export function BuildStage({ slots, ovr, className = '' }: BuildStageProps) {
  const top = slots.slice(0, 3);
  const left = slots.slice(3, 6);
  const right = slots.slice(6, 9);
  return (
    <div className={`stage-grid ${className}`}>
      <div className="stage-grid__top">
        {top.map((s) => <Ring key={s.category} slot={s} />)}
      </div>
      <div className="stage-grid__side stage-grid__side--left">
        {left.map((s) => <Ring key={s.category} slot={s} />)}
      </div>
      <div className="stage-grid__center">
        <Figure />
        <div className="stage__ovr">
          <span className="stage__ovr-num">{ovr ?? '—'}</span>
          <span className="stage__ovr-label">OVR</span>
        </div>
      </div>
      <div className="stage-grid__side stage-grid__side--right">
        {right.map((s) => <Ring key={s.category} slot={s} />)}
      </div>
    </div>
  );
}
