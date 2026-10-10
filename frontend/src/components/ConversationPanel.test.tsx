import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { MessageContent } from "./ConversationPanel";
afterEach(cleanup);
it("renders fenced code and untrusted markup as text", () => {
  const { container } = render(
    <MessageContent
      text={
        'Primer: čćžšđ\n```python\nprint("hello")\n```\n<script>alert("unsafe")</script>'
      }
    />,
  );
  expect(container.querySelector("pre code")).toHaveTextContent(
    'print("hello")',
  );
  expect(container.querySelector("script")).toBeNull();
  expect(screen.getByText(/Primer: čćžšđ/)).toBeInTheDocument();
  expect(screen.getByText(/<script>/)).toBeInTheDocument();
});
