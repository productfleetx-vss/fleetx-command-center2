# Project memory

## Product intent & audience

- Vite + React app that triggers outbound phone calls through Convin via an edge-function relay/forwarder.
- Currently intended for internal/team use only; no public access control yet.

## Brand personality & voice

- Not yet inferred from project context.

## Visual design & UX direction

- Not yet inferred from project context.

## Decisions, constraints & rationale

- Call relay is gated by three edge-function secrets (names case-sensitive): `CONVIN_API_KEY`, `CONVIN_API_TOKEN`, and `CONVIN_LIVE`.
- `CONVIN_LIVE` must be set to exactly `true` to enable dialing; otherwise the relay performs a dry run: accepts the payload (HTTP 200) but does not dial.
- Dry-run behavior is intentional as a safety default.
- Security constraint: keep `CONVIN_LIVE` off until the app is reachable only by the team, because any visitor can currently request a dial.
- Edge-function secrets must be added manually via the database/Secrets UI (assistant cannot write secrets, only list them).
- Build status at last check: passed cleanly, no errors.

## Open questions & assumptions

- Access control / auth strategy for the app is unresolved.
- Whether `CONVIN_LIVE=true` should be enabled once keys are added is pending user confirmation.
- UI/brand/visual direction not yet established.