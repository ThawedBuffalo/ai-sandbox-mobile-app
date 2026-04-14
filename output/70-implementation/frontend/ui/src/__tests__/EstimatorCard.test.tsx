import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../App";

describe("EstimatorCard", () => {
  let originalFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).fetch;
    }
    jest.restoreAllMocks();
  });

  it("renders heading and inputs", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Dental Cost Estimator" })).toBeInTheDocument();
    expect(screen.getByLabelText("Treatment Cost")).toBeInTheDocument();
    expect(screen.getByLabelText("Coverage Percentage")).toBeInTheDocument();
  });

  it("shows estimate result when API succeeds", async () => {
    const user = userEvent.setup();
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ planPays: 960, memberPays: 240 }),
    } as Response) as unknown as typeof globalThis.fetch;

    render(<App />);

    await user.clear(screen.getByLabelText("Treatment Cost"));
    await user.type(screen.getByLabelText("Treatment Cost"), "1200");
    await user.clear(screen.getByLabelText("Coverage Percentage"));
    await user.type(screen.getByLabelText("Coverage Percentage"), "80");
    await user.click(screen.getByRole("button", { name: "Estimate Cost" }));

    await waitFor(() => {
      expect(screen.getByText("Plan Pays")).toBeInTheDocument();
      expect(screen.getByText("Member Pays")).toBeInTheDocument();
    });
  });
});
