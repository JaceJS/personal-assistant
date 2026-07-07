import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import ProfileAvatar from "../ProfileAvatar";

describe("ProfileAvatar", () => {
  it("renders the initial letter when no photo uri is given", async () => {
    const { getByText, queryByTestId } = await render(
      <ProfileAvatar uri={null} initial="J" />
    );
    expect(getByText("J")).toBeTruthy();
    expect(queryByTestId("profile-avatar-image")).toBeNull();
  });

  it("renders the photo instead of the initial when a uri is given", async () => {
    const { getByTestId, queryByText } = await render(
      <ProfileAvatar uri="https://cdn.example.com/a.jpg" initial="J" />
    );
    expect(getByTestId("profile-avatar-image").props.source).toEqual({
      uri: "https://cdn.example.com/a.jpg",
    });
    expect(queryByText("J")).toBeNull();
  });

  it("does not render an edit badge when onEdit is not passed", async () => {
    const { queryByTestId } = await render(<ProfileAvatar uri={null} initial="J" />);
    expect(queryByTestId("profile-avatar-edit")).toBeNull();
  });

  it("renders an edit badge and calls onEdit when pressed", async () => {
    const onEdit = jest.fn();
    const { getByTestId } = await render(
      <ProfileAvatar uri={null} initial="J" onEdit={onEdit} />
    );
    fireEvent.press(getByTestId("profile-avatar-edit"));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
