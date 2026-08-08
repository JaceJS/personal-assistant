import React from "react";
import { render } from "@testing-library/react-native";

import { DateSeparator } from "@/features/ai/components/DateSeparator";

describe("DateSeparator", () => {
  it("shows the formatted day label", async () => {
    const { getByText } = await render(<DateSeparator date={new Date()} />);
    expect(getByText("Hari ini")).toBeTruthy();
  });
});
