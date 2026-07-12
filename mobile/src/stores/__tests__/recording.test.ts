import { useRecordingStore } from "../recording";

const reset = () =>
  useRecordingStore.setState({
    phase: "idle",
    audioUri: null,
    errorMessage: null,
    durationMs: 0,
  });

describe("recording store", () => {
  beforeEach(reset);

  it("starts idle with zero duration", () => {
    const s = useRecordingStore.getState();
    expect(s.phase).toBe("idle");
    expect(s.durationMs).toBe(0);
  });

  it("setDurationMs updates elapsed time", () => {
    useRecordingStore.getState().setDurationMs(4_200);
    expect(useRecordingStore.getState().durationMs).toBe(4_200);
  });

  it("setPhase('recording') clears a previous error and resets duration", () => {
    useRecordingStore.getState().setError("boom");
    useRecordingStore.getState().setDurationMs(9_000);

    useRecordingStore.getState().setPhase("recording");

    const s = useRecordingStore.getState();
    expect(s.phase).toBe("recording");
    expect(s.errorMessage).toBeNull();
    expect(s.durationMs).toBe(0);
  });

  it("setError moves phase to error with the message", () => {
    useRecordingStore.getState().setError("Izin mikrofon diperlukan.");

    const s = useRecordingStore.getState();
    expect(s.phase).toBe("error");
    expect(s.errorMessage).toBe("Izin mikrofon diperlukan.");
  });

  it("reset returns everything to initial state", () => {
    useRecordingStore.getState().setPhase("recording");
    useRecordingStore.getState().setDurationMs(3_000);
    useRecordingStore.getState().setAudioUri("file://a.m4a");

    useRecordingStore.getState().reset();

    const s = useRecordingStore.getState();
    expect(s.phase).toBe("idle");
    expect(s.audioUri).toBeNull();
    expect(s.errorMessage).toBeNull();
    expect(s.durationMs).toBe(0);
  });
});
