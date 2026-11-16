# Dispatch D1.1 — existing police references only

## Shipped scope
This stage adds **read-only campaign-content context** to exactly four already
authored appearance references:

| Appearance reference | Current timeline | Role |
| --- | --- | --- |
| `us-swat-mp5-1995` | `us-swat-archetype` | tactical-police |
| `us-swat-2015` | `us-swat-archetype` | tactical-police |
| `us-police-polo-2020` | `us-police-patrol` | patrol |
| `russian-omon-2002` | `russian-omon` | tactical-police |

`src/dispatch-content-foundation.ts` owns only the **opt-in list** and its
read-only lookup and integrity audit. The existing faction catalog still owns
the authored appearance; faction timelines own the agency, role and period.
No duplicate firearm, wardrobe, country, issue dates or gear definitions.

The context explicitly says `evidenceScope: 'visual-reference-only'`.
Appearances, even dated ones, do not prove historical issuance of individual
equipment items.

## What this does *not* do
- No playable Dispatch campaign or new save slot.
- No whitelist, item lock, dynamic equipment filter or price/inventory change.
- No newly named agencies, historical issue claims, models, weapons or patches.
- No changes to Quick Play, Sandbox, legacy campaigns, tactical mechanics,
  Operator Studio rendering or the existing faction browser.
- No classification of every military/irregular appearance into Operations or
  Wasteland. These settings are vocabulary only until needed.

## Follow-up
D1.2 can normalize any additional organizational role information that is
actually missing, using these four cases as the acceptance fixture.
D1.3 can expose the same context in a UI if a real consumer needs it.
D2 may later apply **separate** rules for campaign-only item availability,
with explicit unknown handling and preserved unrestricted sandbox modes.

## Verification
Run `node --experimental-strip-types --test tests/dispatch-content-foundation.test.mjs`
then `npm run check`. The audit must return zero issues and all existing
timeline/reference regression tests must remain intact.

## D1.2 — normalized organization and role grouping

The same four looks now expose a stable read-only organization → role timeline
→ dated visual snapshot view via `dispatchStarterOrganizations()`. There are
**only two** organization identities in this seed:

- `us-police-generic`: agency-neutral US police archetype; two role timelines
  (classic/modern tactical SWAT; patrol). These are *not* named city or federal
  agencies.
- `russian-omon`: broader OMON tactical-police unit family, not an invented
  specific local detachment; one tactical-police timeline.

Names, country, police classification, role labels and representative years
come from existing `TIMELINE_ORGANIZATIONS`/`FACTION_TIMELINES`, never a
parallel authority. The only explicit new metadata is organization *scope*:
`agency-neutral` versus `unit-family`. Cross-reference audits catch missing
timelines, non-police classifications, country mismatch, missing scope and
dropped or duplicated snapshot memberships. Output is deterministic and frozen.

This does **not** change historical item evidence, claim that every OMON
detachment wears the same kit, create faction assets, or activate campaign
availability filtering. Legacy faction records and roster/saved gear do not
change. The downstream D1.3 consumer can query these grouped records without
creating another organization registry.
