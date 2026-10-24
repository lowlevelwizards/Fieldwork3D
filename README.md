# Fieldwork — Ground Zero / Build 005: Moving Clouds

The diorama still has **one 10 × 10 meter physical ground slab**.
Simple Minecraft-like clouds now drift across its sky, changing in
coverage through the existing day/night clock.

## Atomic truths and consequences

- Cloud groups travel horizontally. Their positions are deterministic
  functions of the *existing* world clock. Time pause also pauses clouds.
- Cloud coverage increases near dawn and evening and clears at midday.
- Clouds fade in/out with coverage without sudden spawning.
- Their blocky bodies are clipped by four world-space planes at the
  region's exact ±5 metre boundaries.
- Blurred ground shadows project away from the light, following the same
  clouds and clipped to the region. They fade out at low sun angles and
  disappear at night.
- Their colors follow changing daylight and twilight illumination.

This is a minimal visual model of clouds and moving shadow, not simulated
vapor, wind fluid dynamics, storms, or gameplay visibility modifiers. The
ground shadows are efficient soft projected decals, not ray-traced shadows.

## Controls and verification

- A 24-hour cycle lasts **4 real minutes**.
- Play/pause time or scrub using the existing bottom timeline.
- **CLOUDS** slider: override coverage from 0–100%.
- **AUTO**: resume the natural day/night coverage pattern.
- One-finger/mouse horizontal drag: orbit; pinch/wheel: zoom.

Inspect sunrise at 06:30, midday at 12:30, sunset at 18:30 and night
at 00:00. Cloud shadows should be strongest under the midday sun, and
both cloud geometry and shadows stop at the slab edge.

No characters, gameplay, world economy, AI, missions or props were added.
Earlier builds are preserved on
[`archive/pre-ground-zero-2026-10-23`](../../tree/archive/pre-ground-zero-2026-10-23).

Local checks: `npm install && npm test && npm run build`.
