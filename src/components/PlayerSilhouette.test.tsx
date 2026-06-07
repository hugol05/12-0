import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { RatingCategory } from '@/types';
import { PlayerSilhouette } from './PlayerSilhouette';

const ALL: Partial<Record<RatingCategory, number>> = {
  shooting: 97,
  height: 88,
  playmaking: 70,
  defense: 60,
  rebounding: 80,
  athleticism: 75,
  basketballIq: 90,
  clutch: 94,
  durability: 85, // ignored — no zone
};

describe('PlayerSilhouette', () => {
  it('renders an accessible svg image at every mode', () => {
    for (const mode of ['building', 'complete', 'poster'] as const) {
      const html = renderToStaticMarkup(<PlayerSilhouette filled={ALL} mode={mode} />);
      expect(html).toContain('<svg');
      expect(html).toContain('role="img"');
    }
  });

  it('labels how many of the 8 zones are lit (durability never counts)', () => {
    const html = renderToStaticMarkup(
      <PlayerSilhouette filled={{ shooting: 90, clutch: 80, durability: 99 }} mode="poster" />,
    );
    // 2 zones lit (durability excluded), 8 total.
    expect(html).toContain('2 of 8 attributes lit');
  });

  it('renders nothing-lit cleanly (only the dark base figure)', () => {
    const html = renderToStaticMarkup(<PlayerSilhouette filled={{}} mode="building" />);
    expect(html).toContain('0 of 8 attributes lit');
    expect(html).toContain('<svg');
  });

  it('honours the size prop', () => {
    const html = renderToStaticMarkup(
      <PlayerSilhouette filled={ALL} mode="complete" size="lg" />,
    );
    expect(html).toContain('silhouette--lg');
  });
});
