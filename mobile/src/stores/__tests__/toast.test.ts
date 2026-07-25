import { useToastStore } from "../toast";

const reset = () =>
  useToastStore.setState({ message: "", type: "info", visible: false, queue: [] });

describe("toast store", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    reset();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("shows a toast immediately when none is visible", () => {
    useToastStore.getState().showToast("Struk tersimpan", "success");

    const s = useToastStore.getState();
    expect(s.visible).toBe(true);
    expect(s.message).toBe("Struk tersimpan");
    expect(s.type).toBe("success");
  });

  it("queues a second toast instead of overwriting the visible one", () => {
    useToastStore.getState().showToast("Struk tersimpan", "success");
    useToastStore.getState().showToast("Suara tersimpan", "success");

    const s = useToastStore.getState();
    expect(s.message).toBe("Struk tersimpan");
    expect(s.queue).toEqual([{ message: "Suara tersimpan", type: "success" }]);
  });

  it("auto-advances to the next queued toast once the current one times out", () => {
    useToastStore.getState().showToast("Struk tersimpan", "success");
    useToastStore.getState().showToast("Suara tersimpan", "success");

    jest.advanceTimersByTime(3000);

    const s = useToastStore.getState();
    expect(s.visible).toBe(true);
    expect(s.message).toBe("Suara tersimpan");
    expect(s.queue).toEqual([]);
  });

  it("preserves FIFO order across three queued toasts", () => {
    useToastStore.getState().showToast("First", "info");
    useToastStore.getState().showToast("Second", "info");
    useToastStore.getState().showToast("Third", "info");

    jest.advanceTimersByTime(3000);
    expect(useToastStore.getState().message).toBe("Second");

    jest.advanceTimersByTime(3000);
    expect(useToastStore.getState().message).toBe("Third");
  });

  it("hides and stops after the last toast times out with nothing queued", () => {
    useToastStore.getState().showToast("Struk tersimpan", "success");

    jest.advanceTimersByTime(3000);

    expect(useToastStore.getState().visible).toBe(false);
  });

  it("manual hideToast immediately advances to the next queued toast", () => {
    useToastStore.getState().showToast("Struk tersimpan", "success");
    useToastStore.getState().showToast("Suara tersimpan", "success");

    useToastStore.getState().hideToast();

    const s = useToastStore.getState();
    expect(s.visible).toBe(true);
    expect(s.message).toBe("Suara tersimpan");
  });

  it("manual hideToast with an empty queue just hides", () => {
    useToastStore.getState().showToast("Struk tersimpan", "success");

    useToastStore.getState().hideToast();

    expect(useToastStore.getState().visible).toBe(false);
  });
});
