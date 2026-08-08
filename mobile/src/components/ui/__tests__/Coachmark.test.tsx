import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Coachmark } from "../Coachmark";

const ANCHOR = { x: 20, y: 100, width: 60, height: 60 };

describe("Coachmark", () => {
  it("renders nothing when not visible", async () => {
    const { toJSON } = await render(
      <Coachmark
        visible={false}
        anchor={ANCHOR}
        text="Hint"
        onDismiss={jest.fn()}
        dismissA11yLabel="Tutup hint"
      />
    );
    expect(toJSON()).toBeNull();
  });

  it("renders nothing when the target hasn't been measured yet", async () => {
    const { toJSON } = await render(
      <Coachmark
        visible
        anchor={null}
        text="Hint"
        onDismiss={jest.fn()}
        dismissA11yLabel="Tutup hint"
      />
    );
    expect(toJSON()).toBeNull();
  });

  it("shows the hint text and an OK button when visible", async () => {
    const { getByText, getByRole } = await render(
      <Coachmark
        visible
        anchor={ANCHOR}
        text="Hint"
        onDismiss={jest.fn()}
        dismissA11yLabel="Tutup hint"
      />
    );
    expect(getByText("Hint")).toBeTruthy();
    expect(getByRole("button", { name: "Tutup hint" })).toBeTruthy();
  });

  it("calls onDismiss only when the OK button is pressed", async () => {
    const onDismiss = jest.fn();
    const { getByRole } = await render(
      <Coachmark
        visible
        anchor={ANCHOR}
        text="Hint"
        onDismiss={onDismiss}
        dismissA11yLabel="Tutup hint"
      />
    );
    fireEvent.press(getByRole("button", { name: "Tutup hint" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
