import {
  MIN_RECORDING_MS,
  formatRecordingDuration,
  isRecordingTooShort,
} from "../recordingUtils";

describe("formatRecordingDuration", () => {
  it("formats zero as 0:00", () => {
    expect(formatRecordingDuration(0)).toBe("0:00");
  });

  it("floors sub-second remainders", () => {
    expect(formatRecordingDuration(7_900)).toBe("0:07");
  });

  it("pads seconds under ten", () => {
    expect(formatRecordingDuration(65_000)).toBe("1:05");
  });

  it("handles multi-minute durations", () => {
    expect(formatRecordingDuration(600_000)).toBe("10:00");
  });

  it("clamps negative input to 0:00", () => {
    expect(formatRecordingDuration(-500)).toBe("0:00");
  });
});

describe("isRecordingTooShort", () => {
  it("rejects durations below the minimum", () => {
    expect(isRecordingTooShort(MIN_RECORDING_MS - 1)).toBe(true);
  });

  it("accepts durations at the minimum", () => {
    expect(isRecordingTooShort(MIN_RECORDING_MS)).toBe(false);
  });

  it("rejects zero", () => {
    expect(isRecordingTooShort(0)).toBe(true);
  });
});
