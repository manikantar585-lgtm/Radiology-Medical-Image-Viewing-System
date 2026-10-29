import { useEffect, useState } from "react";

import { getSavedHotkeys, normalizeHotkey } from "../../utils/hotkeys";

const EDITABLE_TAGS = new Set(["input", "textarea", "select"]);

/**
 * Binds the user's configured viewer hotkeys to `actions`, a map from hotkey
 * name (e.g. "zoomIn") to handler. Keys typed into form fields are ignored.
 */
export function useViewerHotkeys(actions) {
  const [hotkeys] = useState(getSavedHotkeys);

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      if (EDITABLE_TAGS.has(target?.tagName?.toLowerCase()) || target?.isContentEditable) {
        return;
      }

      const key = normalizeHotkey(event.key);
      const action = Object.keys(actions).find((name) => normalizeHotkey(hotkeys[name]) === key);
      if (action) {
        event.preventDefault();
        actions[action]();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [actions, hotkeys]);
}
