import React from "react";
import { render } from "@testing-library/react-native";

import { ChatHistorySkeleton } from "@/features/ai/components/ChatHistorySkeleton";

describe("ChatHistorySkeleton", () => {
  it("renders a placeholder chat layout", async () => {
    const { getByTestId } = await render(<ChatHistorySkeleton />);
    expect(getByTestId("chat-history-skeleton")).toBeTruthy();
  });
});
