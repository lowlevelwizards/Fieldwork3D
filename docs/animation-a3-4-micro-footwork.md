# A3.4 — bounded corrective motor steps

**Complete scope**
- Enhance existing `chooseFriendlyLaneStep` with 4, 7 and 10 unit compact candidates before legacy 12/20/28; compare both lateral sides before larger distances. Keep gun muzzle, live shoulder offset and final shot clearance authoritative.
- Add a pure named short-step selector (side-left, side-right, back, angled and support-foot reposition), with deterministic order, never directly moves an actor. Existing swept body clearance and interpersonal spacing are mandatory.
- Reuse `fireRetreatTarget` and `runOrders` physical motor with a short expiry/commitment; preserve WATCH/LOOK heading, authored PlanNodes, existing gait/footstep scheduler, and enforce cooldown after failure to prevent dithering.
- Prefer A3.2 shoulder adjustment, then A3.3 safe self posture where allowed, then local foot correction, then existing safe ready fallback. No repeated check every rendering frame.
- Improve diagnostics for chosen candidate, distance and reason in Physicality Lab; replay and pause safe.
**Acceptance**: smallest useful real move, no invisible translation or collision exemptions, planted feet stay scheduled, no runaway retry, no firing before fully safe, route unaffected.
