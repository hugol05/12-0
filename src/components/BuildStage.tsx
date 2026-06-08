import { useState } from 'react';
import type { RatingCategory } from '@/types';
import { PlayerSilhouette } from './PlayerSilhouette';
import './BuildStage.css';

/** One of the 9 category rings around the silhouette. */
export interface StageSlot {
  category: RatingCategory;
  label: string;
  /** category emoji/glyph, shown inside an empty ring so its purpose is always clear */
  icon?: string;
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
  className?: string;
}

// Grid areas form a bracket (⊓): top row across, then left + right columns down,
// the figure filling the middle. Order matches the incoming slots.
const AREAS = ['tl', 'tc', 'tr', 'l1', 'l2', 'l3', 'r1', 'r2', 'r3'] as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** A single category ring. Shows the category icon when empty, a face/initials when filled. */
function Ring({ slot, area }: { slot: StageSlot; area: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  const filled = !!slot.fill;
  const showFace = filled && !!slot.fill!.photoUrl && !imgFailed;
  const clickable = !!slot.onClick && (slot.highlighted || filled);

  return (
    <div
      className={`ring ${filled ? 'ring--filled' : ''} ${slot.highlighted ? 'ring--open' : ''}`}
      style={{ gridArea: area }}
    >
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
          <span className="ring__icon" aria-hidden>{slot.icon}</span>
        )}
        {filled && <span className="ring__rating">{slot.fill!.rating}</span>}
      </button>
      <span className="ring__label">{slot.label}</span>
      {filled && <span className="ring__player">{slot.fill!.playerName}</span>}
    </div>
  );
}

export function BuildStage({ slots, ovr, className = '' }: BuildStageProps) {
  return (
    <div className={`stage-grid ${className}`}>
      {slots.map((s, i) => (
        <Ring key={s.category} slot={s} area={AREAS[i]} />
      ))}
      <div className="stage-grid__center">
        <PlayerSilhouette mode="building" size="md" className="stage__figure" />
        <div className="stage__ovr">
          <span className="stage__ovr-num">{ovr ?? '—'}</span>
          <span className="stage__ovr-label">OVR</span>
        </div>
      </div>
    </div>
  );
}
