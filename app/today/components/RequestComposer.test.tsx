import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RequestComposer } from "./RequestComposer";

describe("RequestComposer", () => {
  it("disables submit when the request body is empty", () => {
    render(
      <RequestComposer value="" onChange={vi.fn()} onSubmit={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: "남기기" })).toBeDisabled();
  });
});
