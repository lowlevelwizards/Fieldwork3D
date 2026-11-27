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
