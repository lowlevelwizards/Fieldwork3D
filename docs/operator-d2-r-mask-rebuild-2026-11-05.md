# D2-R mask reconstruction — reference and fit contract

Date: 2026-11-05 · Baseline: d3b487481c00710b515b5e0350933ea113eed3fc
Scope: replace all six facial protective silhouettes; retain identifiers, cosmetic-only behavior, material slots, save migration, and lazy model allocation.

## Canonical attachment
The existing skull is 8×8×8, center (0,3,0), front -Z4, sides X±4, top Y7, chin Y-.65, eyes around Y3.45, brow Y4.3. Rebuild against src/operator-head-anatomy.ts, not a different head. One unit is one stylized pixel for consistent scale; large steps should generally exceed .35 units. All mask geometry is strictly render-only.

## Reference archetypes and key silhouettes
- half-mask: close fitted 6–8-sided nose/mouth shield, cheek flares, rear elastic straps, eyes exposed. Solid and mesh front styles.
- respirator-half: tapered upper nose seal, narrow chin, left/right angled compact bayonet filters rather than front-facing binoculars. Dual/central filter modes.
- gas-gp5: one continuous scalp/ear/neck rubber hood, two small round eyepieces, narrowed lower face and downward-oriented threaded center cartridge. NO back-of-head harness.
- gas-m17: wider bulbous rubber facepiece, two separate eyepieces, large integrated cheek-filter housings, centered low speech/exhale; no external canister.
- gas-m40: angular two-eye mask, prominent central outlet and ONE projecting off-axis cheek cartridge; rear head harness.
- gas-m50: a SINGLE wide wraparound visor opening with sculpted nose notch, low compact two-sided conformal filter housings; no separate binocular eye windows.

Historical references/representative families:
GP-5 ShM-62 hood; US Army M17/M17A2; M40/M42; Avon M50/FM50/JSGPM; 3M 7500 industrial half-respirator; OneTigris-style lower mesh tactical guard.
Reference source URLs:
- https://www.gasmaskking.com/us-army-m17a2-field-protective
- https://man.fas.org/dod-101/sys/land/m40m42.htm
- https://www.avon-protection.com/media/embdjwnr/avon-protection_m50-respirator_product-brochure_en.pdf
- https://www.af.mil/News/Article-Display/Article/118535/ramstein-airmen-improve-training-effectiveness-with-new-m-50-mask/
No physical respiratory protection, real-device fit, or filter certification claims are implied.

## Acceptance
1. R0: checked reference contract, independent identity rules and 8-unit landmarks.
2. R1: reusable polygon outline, real cut-out lens apertures, angled/canted filter modules, polygon rims, and connected straps; material-independent topology.
3. R2: lower masks preserve solid/mesh and twin/compact groups; no geometry churn on mode switch.
4. R3: GP-5/M17 have true separate eye apertures; GP-5 is an enclosing hood; M17 cheeks are attached volumes, not external cylinders.
5. R4: M40 has precisely one side cartridge; M50 exactly one single visor surface and precisely two conformal filters.
6. R5: independent neutral-silhouette, front/side fit, black-material and headwear compatibility review; mask changes must not modify gameplay collision.
7. Release: focused D2 mask tests, tsc/Vite build, mobile Studio preview; branch commits are grouped, production remains paused while any Pages deployment is in flight. Only merge at verified stable checkpoint.

## Proposed fit bounds in canonical game units
- half-mask: x±4.3, y[-.7,3.2], z[-5.7,-3.4].
- industrial respirator: face seal x±3.1,y[-.85,3.55]; cartridges increase width to ~10.5 total.
- GP-5: hood x±4.55,y[-2.3,7.55]; front canister slopes down from mouth at y~.6.
- M17: x±4.5,y[-1.2,5.6], cheek bulges ahead of the faceplate.
- M40: x±4.5,y[-1.0,5.7], with single side canister extending further out/forward.
- M50: width 8.4 faceplate, high continuous visor y[2.4,5.3], two low shallow side filters.

These are stylized targets, not manufacturer dimensions. Silhouette and anatomical fit take precedence over microscopic model features. Keep labels/mesh names needed by existing saved-output and geometry regression tests.
