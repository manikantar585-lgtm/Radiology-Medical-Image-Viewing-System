import { fireEvent, render, screen } from "@testing-library/react";

import { getModality } from "./modality";
import { useViewerHotkeys } from "./useViewerHotkeys";

describe("getModality", () => {
  test.each([
    ["CT Chest", "CT"],
    ["MRI", "MR"],
    ["MR", "MR"],
    ["X-Ray", "XR"],
    ["Ultrasound", "US"],
    ["PET-CT", "CT"],
    ["PET", "PT"],
    ["", "OT"],
    [null, "OT"],
    ["Mammography", "MAMMOGRAPHY"],
  ])("%p -> %p", (input, expected) => {
    expect(getModality(input)).toBe(expected);
  });
});

describe("useViewerHotkeys", () => {
  function Harness({ actions }) {
    useViewerHotkeys(actions);
    return <input data-testid="field" />;
  }

  beforeEach(() => localStorage.clear());

  test("runs the action bound to the pressed key", () => {
    const actions = { zoomIn: jest.fn(), nextImage: jest.fn() };
    render(<Harness actions={actions} />);

    fireEvent.keyDown(window, { key: "ArrowDown" });

    expect(actions.nextImage).toHaveBeenCalledTimes(1);
    expect(actions.zoomIn).not.toHaveBeenCalled();
  });

  test("uses bindings saved in Settings", () => {
    localStorage.setItem("radiologyHotkeys", JSON.stringify({ zoomIn: "I" }));
    const actions = { zoomIn: jest.fn() };
    render(<Harness actions={actions} />);

    fireEvent.keyDown(window, { key: "i" });

    expect(actions.zoomIn).toHaveBeenCalledTimes(1);
  });

  test("ignores keys typed into form fields", () => {
    const actions = { nextImage: jest.fn() };
    render(<Harness actions={actions} />);

    fireEvent.keyDown(screen.getByTestId("field"), { key: "ArrowDown" });

    expect(actions.nextImage).not.toHaveBeenCalled();
  });
});
