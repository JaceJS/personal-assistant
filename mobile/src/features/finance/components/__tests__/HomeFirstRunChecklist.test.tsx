import React from "react";
import { render } from "@testing-library/react-native";

import HomeFirstRunChecklist from "@/features/finance/components/HomeFirstRunChecklist";

describe("HomeFirstRunChecklist", () => {
  it("shows an empty progress bar when no step is complete", async () => {
    const { getByTestId } = await render(
      <HomeFirstRunChecklist
        state={{ hasAccount: false, hasFirstTransaction: false, hasBudget: false, setupStep: 1 }}
      />
    );

    const fill = getByTestId("firstRunProgressBarFill");
    expect(fill.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: "0%" })])
    );
  });

  it("fills the bar to 33% once the account step is done", async () => {
    const { getByTestId } = await render(
      <HomeFirstRunChecklist
        state={{ hasAccount: true, hasFirstTransaction: false, hasBudget: false, setupStep: 2 }}
      />
    );

    const fill = getByTestId("firstRunProgressBarFill");
    expect(fill.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: "33%" })])
    );
  });

  it("fills the bar to 100% once every step is done", async () => {
    const { getByTestId } = await render(
      <HomeFirstRunChecklist
        state={{ hasAccount: true, hasFirstTransaction: true, hasBudget: true, setupStep: 3 }}
      />
    );

    const fill = getByTestId("firstRunProgressBarFill");
    expect(fill.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: "100%" })])
    );
  });
});
