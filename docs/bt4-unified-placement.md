# BT4 unified equipment placement

Baseline bbe8efe, after backpack harness changes. The existing carry ledger is numeric and its visuals are independent. The new pure fixed-position contract is staged to prevent two parallel authorities from mutating inventory.

- BT4.0–1: belt slot counts 0/1/4/5/7, reversible leather hip; fixed face spans, combined rear claims, adjacent face projected collision. No extra capacity from cosmetic style aliases.
- BT4.2: actual registered chest magazine cells, explicit clothing pockets, canonical pack profiles. Historical waist conservatively owns the waist until a complete authored reservation map exists. Modular armor/auxiliary rig and external pack sockets must still be authored.
- BT4.3–4: per-category carrier priorities, item dimensions, stable IDs, conservative fit, bounded deterministic search; no manual placement dependence.
- BT4.5: auto holder family selection, expanded primary variant and combined waist positions. Grouping multiple items into holders remains outstanding.
- BT4.9 contract: consuming a manifest item leaves its holder and reservations in place.

The resolver is not yet the live inventory authority. BT4.6–14 (migration, live visual/animation adapters, field transactions, UI, exhaustive cross-carrier fit and release) must be completed before enabling it. Current V1 paths remain unchanged in this checkpoint.

Auxiliary rig cells are now registered when the real non-magazine pouch is authored. Compatible modular bare plate fronts have a conservative mutually exclusive two-small-or-one-wide layout, using the actual plate envelope. These are staged placement inputs, not a claim of verified fit in moving poses.

BT4.5 grouping: compatible pistol magazines, wedges and shells may share the real multi-cell holder; independent item identities remain in the manifest and single-holder alternatives remain available. Consumption retains the claimed holder. The focused tests include ordering, capacity, optional items, identity and static waist overlap.

The loadout adapter now reads real saved primary/secondary/field identities and native primary dimensions, counts radio and medical tools, and quotes a proposed placement from real registered rig cells. Operator Lab exposes a cached read-only automatic fit audit. Current secondary dimensions and some tool envelopes are provisional artwork metadata; actual holster and animation migration remains outstanding. The diagnostic intentionally does not modify V1 inventory or render the new manifest yet.

The transaction adapter projects a complete fit to detached V1 carrier fields, conserving magazine IDs/rounds and field quantities. It is not yet committed by the roster or deployment. The Lab audit can render proposed belt and plate attachments and native magazines in registered cells, temporarily masking legacy props only during that preview render. Concealed storage is not drawn. Runtime retrieval/consumption and cross-carrier collision certification remain outstanding.

The chest pouch construction recipe and headless slot metadata now share one source. A loadout quote can resolve genuine rig cells without instantiating meshes; historical waist metadata and closed P83 cargo are also registered. This prepares roster/pre-deployment integration without adding rendering work to simulation frames.

The resolver now reserves neutral-pose 3D waist/chest envelopes and checks existing rig pouch and backpack body exclusion volumes. These are conservative static fit checks, not dynamic pose collision certification; pack size comes from the canonical profile and existing fitted contact frame.

BT4.9–10 contract: exact content-cell retrieval uses existing access timing by carrier; returns reuse compatible existing holder cells (including their stable lane index) or truly free concealed storage, never generate a new exposed holder during combat. These pure transaction candidates still need to be called by the authoritative reload, item-use and pickup systems before release.

## Rolling BT4 gameplay batch
BT4.7/9: explicit staged deployment mode now accepts only a complete conserved fit, stores mission-local reservations separately from stock, uses them for field retrieval/spending and wedge return, and reconciles campaign issue reductions without removing holders. Legacy production deployment remains unchanged; explicit opt-in failure leaves actor untouched. Secondary magazine cell exchange helper is staged for the next integration commit. No release until live primary, secondary, visuals, replay and preparation transactions are migrated.

BT4.6/7/9/10: opted-in primary and secondary reloads consume and replace the exact reserved cell; shell loads remove individual planned shell IDs; medical and entry-tool access use the manifest. Primary retention commits at insertion instead of restaging at detach, so a canceled reload leaves the old loaded stock untouched. Replay captures and restores mission reservations, with immutable subtree sharing. Explicit unified deployment remains staged, pending renderer handoff and preparation integration.

BT4.8 staged live rendering: holder cache keyed by physical slot reservation, exact content cell visibility, manifest ID lookup, field-hand handoff and authored pistol mounting. Legacy props are suppressed only for opted-in actors. Current secondary magazine mesh remains an approximation, concealed retrieval anchors are provisional, and mobile/dynamic clearance acceptance remains outstanding.

BT4.12 staged owner transaction: Roster and Campaign carry-gear/field-item commits accept an explicit unified fit mode. Existing Campaign stock, contract, content eligibility and field quantity gates remain in force. Headless preparation summaries count physical positions, not items or mutually exclusive armor alternatives. Legacy UI still defaults to the old mode; production activation and all other editor/undo/preset consumers remain to be migrated. Live holder cache now uses immutable manifest identity for the ordinary idle frame and explicitly releases its geometry on rig disposal.

BT4.8/12: the Lab automatic fit uses the staged gameplay renderer, not a second overlay; carrier occupancy and unfitted items are reported, with shell reserve selection. Glock spare bodies use model-specific grip dimensions and shared baseplate artwork. M9 audition remains separate until its physical inventory exists. Unspecified wardrobe and pack paths use authored carrier geometry in unified mode.

BT4.11/13: independent initial-manifest validation rejects duplicate claims/content, missing or unissued items, incompatible carrier/holder and pairwise reservation overlap before committing a preparation or deployment quote. Added a deterministic 150-outfit matrix with actual rig-cell recipes and both holster sides. Optional Lab pose diagnostic checks oriented holder-shell bounds after the actual pose commits. This is a holder broad-phase check, not complete dynamic rig/body/pack clipping certification. No production activation or legacy-save removal in this batch.
