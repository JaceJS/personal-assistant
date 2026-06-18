import { useVoiceQueueStore } from "../voiceQueue";

const reset = () => useVoiceQueueStore.setState({ queue: [], isProcessing: false });

describe("VoiceQueue store", () => {
  beforeEach(reset);

  describe("enqueue", () => {
    it("adds item with pending status", () => {
      useVoiceQueueStore.getState().enqueue("/path/to/audio.m4a");
      const { queue } = useVoiceQueueStore.getState();
      expect(queue).toHaveLength(1);
      expect(queue[0].status).toBe("pending");
      expect(queue[0].localUri).toBe("/path/to/audio.m4a");
      expect(queue[0].retryCount).toBe(0);
    });

    it("generates unique id per item", () => {
      const { enqueue } = useVoiceQueueStore.getState();
      enqueue("/path/1.m4a");
      enqueue("/path/2.m4a");
      const { queue } = useVoiceQueueStore.getState();
      expect(queue[0].id).not.toBe(queue[1].id);
    });

    it("throws when queue is full", () => {
      const { enqueue } = useVoiceQueueStore.getState();
      for (let i = 0; i < 20; i++) enqueue(`/path/${i}.m4a`);
      expect(() => enqueue("/path/overflow.m4a")).toThrow();
    });

    it("returns the created item", () => {
      const item = useVoiceQueueStore.getState().enqueue("/path/1.m4a");
      expect(item.localUri).toBe("/path/1.m4a");
      expect(item.id).toBeTruthy();
    });
  });

  describe("remove", () => {
    it("removes item by id", () => {
      useVoiceQueueStore.getState().enqueue("/path/1.m4a");
      const id = useVoiceQueueStore.getState().queue[0].id;
      useVoiceQueueStore.getState().remove(id);
      expect(useVoiceQueueStore.getState().queue).toHaveLength(0);
    });

    it("is no-op for unknown id", () => {
      useVoiceQueueStore.getState().enqueue("/path/1.m4a");
      useVoiceQueueStore.getState().remove("unknown-id");
      expect(useVoiceQueueStore.getState().queue).toHaveLength(1);
    });
  });

  describe("markUploading", () => {
    it("sets status to uploading", () => {
      useVoiceQueueStore.getState().enqueue("/path/1.m4a");
      const id = useVoiceQueueStore.getState().queue[0].id;
      useVoiceQueueStore.getState().markUploading(id);
      expect(useVoiceQueueStore.getState().queue[0].status).toBe("uploading");
    });
  });

  describe("markFailed", () => {
    it("sets status to failed and increments retryCount", () => {
      useVoiceQueueStore.getState().enqueue("/path/1.m4a");
      const id = useVoiceQueueStore.getState().queue[0].id;
      useVoiceQueueStore.getState().markFailed(id);
      const item = useVoiceQueueStore.getState().queue[0];
      expect(item.status).toBe("failed");
      expect(item.retryCount).toBe(1);
    });

    it("removes item after max retries exceeded", () => {
      useVoiceQueueStore.getState().enqueue("/path/1.m4a");
      const id = useVoiceQueueStore.getState().queue[0].id;
      useVoiceQueueStore.getState().markFailed(id);
      useVoiceQueueStore.getState().markFailed(id);
      useVoiceQueueStore.getState().markFailed(id);
      expect(useVoiceQueueStore.getState().queue).toHaveLength(0);
    });

    it("is no-op for unknown id", () => {
      useVoiceQueueStore.getState().enqueue("/path/1.m4a");
      useVoiceQueueStore.getState().markFailed("unknown-id");
      expect(useVoiceQueueStore.getState().queue).toHaveLength(1);
    });
  });

  describe("getNextPending", () => {
    it("returns first pending item", () => {
      useVoiceQueueStore.getState().enqueue("/path/1.m4a");
      useVoiceQueueStore.getState().enqueue("/path/2.m4a");
      const id = useVoiceQueueStore.getState().queue[0].id;
      useVoiceQueueStore.getState().markUploading(id);
      const next = useVoiceQueueStore.getState().getNextPending();
      expect(next?.localUri).toBe("/path/2.m4a");
    });

    it("returns null when queue is empty", () => {
      expect(useVoiceQueueStore.getState().getNextPending()).toBeNull();
    });

    it("returns null when all items are uploading", () => {
      useVoiceQueueStore.getState().enqueue("/path/1.m4a");
      const id = useVoiceQueueStore.getState().queue[0].id;
      useVoiceQueueStore.getState().markUploading(id);
      expect(useVoiceQueueStore.getState().getNextPending()).toBeNull();
    });
  });

  describe("setProcessing", () => {
    it("toggles isProcessing flag", () => {
      useVoiceQueueStore.getState().setProcessing(true);
      expect(useVoiceQueueStore.getState().isProcessing).toBe(true);
      useVoiceQueueStore.getState().setProcessing(false);
      expect(useVoiceQueueStore.getState().isProcessing).toBe(false);
    });
  });
});
