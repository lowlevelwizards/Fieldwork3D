# CI queue recovery and release policy

## Immediate recovery
- Preserve the current Pages deployment and all current-head PR checks.
- The queue-recovery workflow is limited to superseded same-repository pull-request runs; the manual entry defaults to dry run.
- Use the run log to verify cancellations; do not rerun failed tests indiscriminately.
- The recovery validation workflow audits the complete checked-in inventory and runs routing contracts.
- Do not merge another release while the current Pages deployment is queued, running, failed, or serving a different build SHA.

## Development and release
- Keep intermediate roadmap work on feature branches. Batch logically compatible stages; run the relevant critical checks on the final revision.
- Use the central PR orchestrator for affected-domain regression and reusable acceptance suites. Preserve original focused and historical commands.
- PR concurrency is per workflow and PR number, not a repository-wide lock. Manual runs and production deployments are not cancelled by superseded PRs.
- Equipment acceptance routes isolated backpack, belt and footwear changes separately; shared and unknown source changes retain all three lanes. Non-main historical entry points remain available.
- npm download caching shares package tarballs, not node_modules or compiled output. The repository does not have a committed package-lock.json; do not substitute npm ci until a reviewed lockfile exists.
- Manual full regression and release preflight remain available in primary CI. Pages continues to test and build the same production SHA.

## Remaining migration
Inventory all independent PR triggers and classify by current domain, historical/manual-only, or required release gate. Migrate each group into reusable routing only after verifying original test commands, source ownership, historical entry points and required check compatibility. Do not disable all workflows or bypass tests just to reduce queue counts. Add timeouts and PR-specific concurrency to further high-fanout lanes. Measure queue counts, runner time and test coverage before and after each batch. Coordinate production releases through one shared checkpoint.
