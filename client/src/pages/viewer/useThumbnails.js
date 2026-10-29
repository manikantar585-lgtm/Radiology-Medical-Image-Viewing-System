import { useCallback, useEffect, useRef, useState } from "react";

import { API_URL, authHeaders } from "../../api/http";

/**
 * Fetches a preview for each image (DICOM is rendered to PNG server-side) and
 * exposes them as object URLs. URLs are cached across reloads of the same
 * study and revoked when the viewer unmounts.
 */
export function useThumbnails(images) {
  const [thumbnailUrls, setThumbnailUrls] = useState({});
  const cacheRef = useRef({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const nextUrls = {};

      await Promise.all(
        images.map(async (item) => {
          if (cacheRef.current[item.id]) {
            nextUrls[item.id] = cacheRef.current[item.id];
            return;
          }
          try {
            const response = await fetch(`${API_URL}/api/images/${item.id}/preview`, {
              headers: authHeaders(),
            });
            if (!response.ok) {
              return;
            }
            const url = URL.createObjectURL(await response.blob());
            cacheRef.current[item.id] = url;
            nextUrls[item.id] = url;
          } catch (error) {
            console.warn("Thumbnail loading warning:", item.id, error);
          }
        })
      );

      if (!cancelled) {
        setThumbnailUrls(nextUrls);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [images]);

  useEffect(() => {
    const cache = cacheRef.current;
    return () => Object.values(cache).forEach((url) => URL.revokeObjectURL(url));
  }, []);

  /** Drops a deleted image's cached preview. */
  const evict = useCallback((imageId) => {
    const url = cacheRef.current[imageId];
    if (url) {
      URL.revokeObjectURL(url);
      delete cacheRef.current[imageId];
    }
  }, []);

  return { thumbnailUrls, evict };
}
