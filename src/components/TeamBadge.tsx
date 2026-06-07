/**
 * TeamBadge — the team-identity primitive (WS2 design foundation).
 *
 * Colors + abbreviation only (no logos — trademark-safe). Reads official colors
 * from `@/theme/teamColors` by franchise id. WS4/WS5 use this everywhere a team
 * appears: roll cards, Built-With, per-season cards, the career journey.
 *
 * Props:
 *   - franchiseId   keys teamColors (the `id` in franchises.json, e.g. "PHO")
 *   - abbreviation? shown text; defaults to franchiseId (pass the dataset's
 *                   `abbreviation`, which differs for PHO→PHX, BRK→BKN)
 *   - name?         accessible label / tooltip; defaults to abbreviation
 *   - size?         'sm' | 'md' | 'lg' (default 'md')
 *   - className?    extra classes for layout
 */
import './TeamBadge.css';
import { getTeamColors } from '@/theme/teamColors';

export interface TeamBadgeProps {
  franchiseId: string;
  abbreviation?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TeamBadge({
  franchiseId,
  abbreviation,
  name,
  size = 'md',
  className = '',
}: TeamBadgeProps) {
  const colors = getTeamColors(franchiseId);
  const label = abbreviation ?? franchiseId;
  const fullName = name ?? label;

  return (
    <span
      className={`team-badge team-badge--${size} ${className}`.trim()}
      style={
        {
          '--tb-primary': colors.primary,
          '--tb-secondary': colors.secondary,
          '--tb-text': colors.text,
        } as React.CSSProperties
      }
      title={fullName}
      aria-label={fullName}
      role="img"
    >
      {label}
    </span>
  );
}
