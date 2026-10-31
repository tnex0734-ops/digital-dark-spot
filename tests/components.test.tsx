import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccuracyNotice, DemoDatasetBadge, SourceDetailDrawer, VerificationChecklist } from "@/components/ResultUI";
import type { Source, VerificationTask } from "@/lib/research/schema";

const source: Source = {
  id: "test-source", title: "Illustrative source", domain: "Illustrative fixture, no live URL", url: null, origin: "illustrative", status: "reviewed", headings: ["Programme details"], authoritySignal: "Synthetic source; authority is not assessed", retrievalNote: "Bundled fixture.",
  dates: { published: "2026-07-01T00:00:00.000Z", modified: null, retrieved: "2026-11-01T00:00:00.000Z", validFrom: null, validTo: null },
};
const task: VerificationTask = { id: "verify-renewal", requirementId: "renewal", title: "Verify renewal conditions", why: "Not found in the sources reviewed.", nextSource: "Current official award terms", priority: "medium", priorityReason: "Medium impact and uncertainty; triage only, not a probability." };

describe("result controls and trust labels", () => {
  it("shows the illustrative demo label", () => {
    render(<DemoDatasetBadge />);
    expect(screen.getByText("Illustrative demo dataset")).toBeInTheDocument();
    expect(screen.getByText("Not live scholarship advice")).toBeInTheDocument();
  });

  it("shows the full accuracy notice", () => {
    render(<AccuracyNotice />);
    expect(screen.getByRole("heading", { name: "Important accuracy notice" })).toBeInTheDocument();
    expect(screen.getByText(/check the information twice using authoritative sources/)).toBeInTheDocument();
    expect(screen.getByText(/Machines can make mistakes\./)).toBeInTheDocument();
  });

  it("opens an accessible source detail panel and closes it with Escape", () => {
    const onClose = vi.fn();
    render(<SourceDetailDrawer source={source} onClose={onClose} />);
    expect(screen.getByRole("dialog", { name: "Illustrative source" })).toBeInTheDocument();
    expect(screen.getByText("Published")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("lets a user mark a checklist task without changing the evidence status", () => {
    const onToggle = vi.fn();
    render(<VerificationChecklist tasks={[task]} checkedIds={[]} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Mark Verify renewal conditions as checked" }));
    expect(onToggle).toHaveBeenCalledWith("verify-renewal", true);
    expect(screen.getByText(/Not found in the sources reviewed/)).toBeInTheDocument();
  });
});
