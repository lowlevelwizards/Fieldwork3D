# Fieldwork

Fieldwork is a phone-friendly, browser-based tactical game. The main experience is Breach: squad planning and execution, physical movement and doors, equipment customization, visibility and knowledge, and mission outcomes. Quick Play and Campaign share the tactical simulation; earlier environment experiments remain available only where still maintained.

## Development

Requires Node.js 22 or newer.

```sh
npm install
npm run dev
npm run check
npm run build
```

Run a focused regression with `node --experimental-strip-types --test tests/<name>.test.mjs`. `npm test` runs the full suite. The production build is stamped and published by the Pages workflow after critical checks.

## Repository map

- `src/`: game, simulation, rendering, UI, authored content and maintained lab entry points.
- `tests/`: regression tests and fixtures.
- `scripts/`: diagnostics, acceptance tools and CI verification.
- `docs/`: design references, active roadmaps and architectural contracts.
- `.github/workflows/`: CI, specialist acceptance and production deployment.
- `index.html`: main game entry point; `vite.config.ts` defines additional built pages.

## Maintained references

- [Architecture ownership and simplification boundaries](docs/release-a-current-architecture-ownership.md)
- [Campaign guide](docs/CAMPAIGN_MODE.md)
- [Environment art direction](docs/fieldwork-environment-art.md)
- [Pixel texture art direction](docs/pixel-texture-art-direction.md)
- [Weapon art production standard](docs/art/weapons/weapon-production-standard.md)

## Development hygiene

Prefer existing domain tests, workflows and reusable tools over new stage-specific infrastructure. Test current behavior rather than historical implementation steps. Keep only living documentation and necessary contracts; completed implementation notes belong in PRs and Git history. Remove superseded code and temporary diagnostics once their replacements are verified. Do not remove save compatibility, runtime paths or unique regression coverage without a consumer audit.

Batch compatible changes on feature branches. Before merging a release, verify required checks and that the previous Pages release succeeded; after merge, verify the served build stamp. Do not queue overlapping production deployments.

The previous build-by-build README and retired documentation remain recoverable from Git history.
