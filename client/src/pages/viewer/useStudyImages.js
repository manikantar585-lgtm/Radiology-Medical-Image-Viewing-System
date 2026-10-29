import { useCallback, useEffect, useState } from "react";

import { API_URL, jsonHeaders } from "../../api/http";

async function fetchJson(url) {
  const response = await fetch(url, { headers: jsonHeaders() });
  return response.ok ? response.json() : {};
}

function byImageOrder(a, b) {
  const orderA = Number(a?.imageOrder ?? a?.ImageOrder ?? 0);
  const orderB = Number(b?.imageOrder ?? b?.ImageOrder ?? 0);
  return orderA !== orderB ? orderA - orderB : Number(a?.id || 0) - Number(b?.id || 0);
}

/**
 * Loads the first series of a study and its images, sorted by image order.
 * Falls back to all study images when the series has none (legacy uploads).
 */
export function useStudyImages(patientId, studyId) {
  const [images, setImages] = useState([]);
  const [series, setSeries] = useState(null);
  const [selectedImageId, setSelectedImageId] = useState(null);

  const reload = useCallback(async () => {
    if (!patientId || !studyId) {
      setImages([]);
      setSeries(null);
      setSelectedImageId(null);
      return;
    }

    const studyQuery = `patientId=${patientId}&studyId=${studyId}`;

    try {
      let loadedSeries = null;
      try {
        const data = await fetchJson(`${API_URL}/api/series?${studyQuery}`);
        loadedSeries = Array.isArray(data?.series) ? data.series[0] || null : data?.series || null;
      } catch (error) {
        console.warn("Series loading warning:", error);
      }
      setSeries(loadedSeries);

      const seriesQuery = loadedSeries?.id ? `&seriesId=${loadedSeries.id}` : "";
      let data = await fetchJson(`${API_URL}/api/images?${studyQuery}${seriesQuery}`);
      let loadedImages = Array.isArray(data?.images) ? data.images : [];

      if (loadedImages.length === 0 && loadedSeries?.id) {
        data = await fetchJson(`${API_URL}/api/images?${studyQuery}`);
        loadedImages = Array.isArray(data?.images) ? data.images : [];
      }

      loadedImages.sort(byImageOrder);
      setImages(loadedImages);
      setSelectedImageId(loadedImages[0]?.id ?? null);
    } catch (error) {
      console.error("Study image loading error:", error);
      setImages([]);
      setSeries(null);
      setSelectedImageId(null);
      alert(error?.message || "Unable to load study images.");
    }
  }, [patientId, studyId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { images, series, selectedImageId, setSelectedImageId, reload };
}
