import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnswerComposer } from "./AnswerComposer";

describe("AnswerComposer", () => {
  it("clamps typed newlines at the shared cap instead of letting the field silently fail validation", () => {
    const onChange = vi.fn();

    render(
      <AnswerComposer
        anonymous={false}
        disabled={false}
        isAnsweringHeldRequest={false}
        isLoadingNickname={false}
        nickname={null}
        pending={false}
        value=""
        onCancelHeld={vi.fn()}
        onChange={onChange}
        onSubmit={vi.fn()}
        onToggleAnonymous={vi.fn()}
      />,
    );

    fireEvent.input(screen.getByLabelText("답변 남기기"), {
      target: { value: "한\n두\n세\n네\n다섯\n여섯째 줄까지 눌러봄" },
    });

    expect(onChange).toHaveBeenCalledWith("한\n두\n세\n네\n다섯");
  });
});
