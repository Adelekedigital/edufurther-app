import { useState } from 'react';

/**
 * A photo that won't load shows the initials instead (every avatar and photo
 * frame). Returns the src to draw, or null once it failed; a new src gets its
 * own try. `ref` also catches an image that broke before hydration, whose
 * error fired before React listened.
 */
export function useImageFallback(src: string | null | undefined) {
  const [failed, setFailed] = useState<string | null>(null);
  const photo = src && failed !== src ? src : null;
  return {
    photo,
    onError: () => {
      if (photo) setFailed(photo);
    },
    ref: (el: HTMLImageElement | null) => {
      if (photo && el?.complete && el.naturalWidth === 0) setFailed(photo);
    },
  };
}
