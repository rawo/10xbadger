import React from "react";
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { BadgeRequirementsList } from "../BadgeRequirementsList";

describe("BadgeRequirementsList", () => {
  it("renders requirements and examples without crashing", () => {
    const requirements = [
      {
        id: "r1",
        title: "Requirement One",
        description: "Do X and Y",
        examples: ["Example A", "Example B"],
      },
      {
        id: "r2",
        description: "Do Z",
        examples: [],
      },
    ];

    const html = renderToString(<BadgeRequirementsList requirements={requirements} />);
    expect(html).toContain("Requirement One");
    expect(html).toContain("Do X and Y");
    // Examples are rendered only when a requirement is expanded (client-side); server render should not include examples
    expect(html).toContain("Do Z");
  });
});
