import { fireEvent, render } from "@testing-library/react-native";

import { RecordingIndicator } from "../RecordingIndicator";

describe("RecordingIndicator", () => {
  it("shows the elapsed time formatted as m:ss", async () => {
    const { getByText } = await render(<RecordingIndicator durationMs={7_900} onCancel={jest.fn()} />);
    expect(getByText("0:07")).toBeTruthy();
  });

  it("updates when duration advances", async () => {
    const { getByText, rerender } = await render(
      <RecordingIndicator durationMs={1_000} onCancel={jest.fn()} />
    );
    expect(getByText("0:01")).toBeTruthy();

    await rerender(<RecordingIndicator durationMs={61_000} onCancel={jest.fn()} />);
    expect(getByText("1:01")).toBeTruthy();
  });

  it("fires onCancel when the cancel button is pressed", async () => {
    const onCancel = jest.fn();
    const { getByText } = await render(<RecordingIndicator durationMs={3_000} onCancel={onCancel} />);

    fireEvent.press(getByText("Batal"));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
