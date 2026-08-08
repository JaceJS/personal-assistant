import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { AIBubble } from "@/features/ai/components/AIBubble";
import {
  createAITypingMessage,
  rejectAIMessage,
  resolveAIMessage,
} from "@/features/finance/utils/chatMessageUtils";

const noop = () => {};

describe("AIBubble", () => {
  it("shows a retry button when the message failed", async () => {
    const failed = rejectAIMessage(
      createAITypingMessage("sate 20.000"),
      "Could not get a response."
    );
    const { getByText } = await render(<AIBubble message={failed} onRetry={noop} />);
    expect(getByText("Coba lagi")).toBeTruthy();
  });

  it("does not show a retry button for a successful reply", async () => {
    const resolved = resolveAIMessage(createAITypingMessage("halo"), "Halo juga!");
    const { queryByText } = await render(<AIBubble message={resolved} onRetry={noop} />);
    expect(queryByText("Coba lagi")).toBeNull();
  });

  it("does not show a retry button while typing", async () => {
    const typing = createAITypingMessage("halo");
    const { queryByText } = await render(<AIBubble message={typing} onRetry={noop} />);
    expect(queryByText("Coba lagi")).toBeNull();
  });

  it("does not show a retry button when onRetry is not provided", async () => {
    const failed = rejectAIMessage(
      createAITypingMessage("sate 20.000"),
      "Could not get a response."
    );
    const { queryByText } = await render(<AIBubble message={failed} />);
    expect(queryByText("Coba lagi")).toBeNull();
  });

  it("fires onRetry with the message on press", async () => {
    const onRetry = jest.fn();
    const failed = rejectAIMessage(
      createAITypingMessage("sate 20.000"),
      "Could not get a response."
    );
    const { getByText } = await render(<AIBubble message={failed} onRetry={onRetry} />);
    fireEvent.press(getByText("Coba lagi"));
    expect(onRetry).toHaveBeenCalledWith(failed);
  });

  it("fires onLongPress with the message and touch position when long-pressed", async () => {
    const onLongPress = jest.fn();
    const resolved = resolveAIMessage(createAITypingMessage("halo"), "Halo juga!");
    const { getByTestId } = await render(<AIBubble message={resolved} onLongPress={onLongPress} />);
    fireEvent(getByTestId("ai-bubble"), "longPress", {
      nativeEvent: { pageX: 60, pageY: 220 },
    });
    expect(onLongPress).toHaveBeenCalledWith(resolved, 60, 220);
  });

  it("shows the reply time", async () => {
    const resolved = {
      ...resolveAIMessage(createAITypingMessage("halo"), "Halo juga!"),
      createdAt: new Date("2026-01-01T14:32:00"),
    };
    const { getByText } = await render(<AIBubble message={resolved} />);
    expect(getByText("14.32")).toBeTruthy();
  });
});
