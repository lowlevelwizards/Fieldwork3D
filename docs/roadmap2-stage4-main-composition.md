# Roadmap 2 Stage 4 — finish reducing breach-main.ts
Stage 4 reduces main to composition, preserving simulation/replay/mission authority.

1. Extract replay HUD state sync and bind overlay controls exactly once (no listeners in a frame update).
2. Consolidate replay entry/exit presentation and module cleanup without reimplementing ReplayModeController.
3. Extract semantic pointer-release command dispatch; gesture controller continues to arbitrate multitouch/cancellation.
4. Extract blocked-movement feedback and authoring previews without new gameplay visibility/collision authority.
5. Clean dead imports/obsolete UI coordination, test listener idempotence and actual mission/replay/authoring behavior, run critical and focused UI gates, merge and verify Pages build.

No changes to 60 Hz simulation, AI, gunplay, LOS, generator, replay archive format, or Stage 5.
