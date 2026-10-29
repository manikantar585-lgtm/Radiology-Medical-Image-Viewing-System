/* Viewer keyboard shortcuts, configured in Settings and used by the ImageViewer. */

const STORAGE_KEY = "radiologyHotkeys";

export const DEFAULT_HOTKEYS = {
  zoom: "Z",
  zoomIn: "+",
  zoomOut: "-",
  zoomFit: "=",
  rotateRight: "R",
  rotateLeft: "L",
  reset: "Space",
  firstImage: "Home",
  lastImage: "End",
  nextImage: "ArrowDown",
  previousImage: "ArrowUp",
  cancel: "Escape",
};

/** Saved hotkeys merged over the defaults, so newly added actions always have a binding. */
export function getSavedHotkeys() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULT_HOTKEYS, ...JSON.parse(saved) } : DEFAULT_HOTKEYS;
  } catch {
    return DEFAULT_HOTKEYS;
  }
}

export function saveHotkeys(hotkeys) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hotkeys));
}

/** Normalises a configured key name or a KeyboardEvent.key for comparison. */
export function normalizeHotkey(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "space") {
    return " ";
  }
  if (normalized === "esc") {
    return "escape";
  }
  return normalized;
}
