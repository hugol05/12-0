import { toPng } from 'html-to-image';

/**
 * Render a DOM node (the Results poster) to a PNG and share it.
 *
 * The poster already shows the whole story — record, OVR, awards, averages,
 * totals and the "Built With" DNA — so a pixel snapshot of it is the shareable
 * card. We capture at 2× for a crisp image on retina / when re-shared.
 *
 * Sharing prefers the Web Share API with a file attachment (works on iOS Safari
 * 15+ and Android Chrome → the system sheet posts the image straight to
 * Twitter/X, Messages, etc.). When file-sharing isn't available we fall back to
 * triggering a download so the player can post the saved image manually.
 */

export interface ShareImageOptions {
  /** File name (without sharing-sheet UI), e.g. "12-0-russell-breaker". */
  fileName?: string;
  /** Title + text passed to the Web Share sheet. */
  title?: string;
  text?: string;
  /** Solid backdrop painted behind the node so transparent corners aren't black. */
  backgroundColor?: string;
}

export type ShareImageResult = 'shared' | 'downloaded' | 'cancelled' | 'error';

async function nodeToBlob(node: HTMLElement, backgroundColor?: string): Promise<Blob> {
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor,
    // Some browsers race the first paint of web fonts/masks; a tiny settle avoids
    // a blank/half-rendered capture on the very first share tap.
    skipFonts: false,
  });
  const res = await fetch(dataUrl);
  return res.blob();
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // give the browser a tick to start the download before revoking
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Capture `node` to a PNG and share it (or download as a fallback).
 * Returns what happened so the caller can show the right confirmation.
 */
export async function shareNodeAsImage(
  node: HTMLElement,
  opts: ShareImageOptions = {},
): Promise<ShareImageResult> {
  const { fileName = '12-0-career', title = '12-0', text, backgroundColor = '#08090c' } = opts;
  let blob: Blob;
  try {
    blob = await nodeToBlob(node, backgroundColor);
  } catch {
    return 'error';
  }

  const file = new File([blob], `${fileName}.png`, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d?: ShareData) => boolean };

  if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title, text });
      return 'shared';
    } catch (e) {
      // AbortError = user dismissed the sheet; anything else → fall back to download.
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }

  try {
    download(blob, fileName);
    return 'downloaded';
  } catch {
    return 'error';
  }
}
