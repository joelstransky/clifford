# Task 06: OpenTUI Verification

## Title
Verify `clifford tui` opens an OpenTUI-based dashboard.

## Context
The project has pivoted from Ink to OpenTUI for the dashboard implementation. We need to verify that the entry point correctly initializes the OpenTUI environment.

## Step-by-Step
1. Ensure the `tui` command in `src/index.ts` is correctly calling the OpenTUI initialization logic.
2. Run `clifford tui` in the terminal.
3. Verify that the TUI launches successfully without errors.
4. Verify the dashboard uses the OpenTUI framework.
5. Make any structural changes needed to remove any ink usage and ensure proper usage of opentui

## Verification
- Successful launch of `clifford tui` showing the sprint dashboard.
