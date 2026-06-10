// Durability <-> career-length (years in the league) curve.
//
// Single source of truth, shared by:
//  - the simulation engine (`career.ts`): a player's Durability rating determines how long their
//    Frankenstein career lasts (`yearsFromDurability`).
//  - the data pipeline (`scripts/data/build.ts`): each real player's Durability rating is derived
//    from how many seasons they ACTUALLY played (`durabilityFromYears`), so that — by design —
//    feeding a real player's durability back through `yearsFromDurability` reproduces roughly the
//    real player's career length. Give your build LeBron's durability and you should get a
//    LeBron-length career.
//
// Anchored to the owner's explicit years-in-league spec (2026-06-10): 87->15, 89->16, 91->17,
// 95->18, 96->19, 98->20, 99->22 (≈"21+"). Points below 87 are extrapolated for shorter careers.
export const DURABILITY_YEARS: ReadonlyArray<readonly [number, number]> = [
  [25, 4], [60, 7], [70, 10], [80, 13], [87, 15], [89, 16], [91, 17], [95, 18], [96, 19], [98, 20], [99, 22],
];

/** Durability rating (25-99) -> years in the league, piecewise-linear over DURABILITY_YEARS. */
export function yearsFromDurability(durability: number): number {
  const pts = DURABILITY_YEARS;
  if (durability <= pts[0][0]) return pts[0][1];
  if (durability >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [d0, y0] = pts[i];
    const [d1, y1] = pts[i + 1];
    if (durability <= d1) return y0 + ((y1 - y0) * (durability - d0)) / (d1 - d0);
  }
  return pts[pts.length - 1][1];
}

/** Inverse of yearsFromDurability: years played -> durability rating (25-99), clamped. */
export function durabilityFromYears(years: number): number {
  const inv = [...DURABILITY_YEARS].map(([d, y]) => [y, d] as const).sort((a, b) => a[0] - b[0]);
  if (years <= inv[0][0]) return inv[0][1];
  if (years >= inv[inv.length - 1][0]) return inv[inv.length - 1][1];
  for (let i = 0; i < inv.length - 1; i++) {
    const [y0, d0] = inv[i];
    const [y1, d1] = inv[i + 1];
    if (years <= y1) return d0 + ((d1 - d0) * (years - y0)) / (y1 - y0);
  }
  return inv[inv.length - 1][1];
}
