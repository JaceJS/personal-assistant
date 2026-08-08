import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { UserBubble } from "@/features/ai/components/UserBubble";
import { createUserTextMessage } from "@/features/finance/utils/chatMessageUtils";

describe("UserBubble", () => {
  it("renders the message content", async () => {
    const message = createUserTextMessage("sate 20.000");
    const { getByText } = await render(<UserBubble message={message} />);
    expect(getByText("sate 20.000")).toBeTruthy();
  });

  it("fires onLongPress with the message and touch position when long-pressed", async () => {
    const onLongPress = jest.fn();
    const message = createUserTextMessage("sate 20.000");
    const { getByTestId } = await render(
      <UserBubble message={message} onLongPress={onLongPress} />
    );
    fireEvent(getByTestId("user-bubble"), "longPress", {
      nativeEvent: { pageX: 120, pageY: 340 },
    });
    expect(onLongPress).toHaveBeenCalledWith(message, 120, 340);
  });

  it("does not throw when onLongPress is not provided", async () => {
    const message = createUserTextMessage("sate 20.000");
    const { getByTestId } = await render(<UserBubble message={message} />);
    expect(() => fireEvent(getByTestId("user-bubble"), "longPress")).not.toThrow();
  });

  it("shows a sending indicator (icon only) while the message has not been sent yet", async () => {
    const message = { ...createUserTextMessage("sate 20.000"), status: "sending" as const };
    const { getByTestId, queryByTestId } = await render(<UserBubble message={message} />);
    expect(getByTestId("status-icon-sending")).toBeTruthy();
    expect(queryByTestId("status-icon-sent")).toBeNull();
    expect(queryByTestId("status-icon-failed")).toBeNull();
  });

  it("shows a sent indicator (icon only) once the message is confirmed sent", async () => {
    const message = { ...createUserTextMessage("sate 20.000"), status: "sent" as const };
    const { getByTestId, queryByTestId } = await render(<UserBubble message={message} />);
    expect(getByTestId("status-icon-sent")).toBeTruthy();
    expect(queryByTestId("status-icon-sending")).toBeNull();
  });

  it("shows a failed indicator (icon only) when the message failed to send", async () => {
    const message = { ...createUserTextMessage("sate 20.000"), status: "failed" as const };
    const { getByTestId, queryByTestId } = await render(<UserBubble message={message} />);
    expect(getByTestId("status-icon-failed")).toBeTruthy();
    expect(queryByTestId("status-icon-sent")).toBeNull();
  });

  it("shows the send time", async () => {
    const message = {
      ...createUserTextMessage("sate 20.000"),
      createdAt: new Date("2026-01-01T14:32:00"),
    };
    const { getByText } = await render(<UserBubble message={message} />);
    expect(getByText("14.32")).toBeTruthy();
  });
});
