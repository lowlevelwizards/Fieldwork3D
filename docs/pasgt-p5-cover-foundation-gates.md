# PASGT P5 foundation checkpoint: visual design and implementation gates

Original PASGT shell cuboid volumes MUST remain unchanged. Deliver only
P5-A shell-relative fitting, P5-B approved-metric camo and panel seams, and
P5-C near-flush elastic. Field dress variants are unchanged until cover
foundation is visually approved.

Coverage geometry: original peak, ear and nape source boxes supply extents.
One highly constrained ear transition near real ear coverage onset, not a
long triangular exposed hard-shell wedge. No cloth simulation or smoothing.

Crown/side UV: one common unfolded metric atlas based on physical edge
travel distances and seven atlas pixels per model unit. Actual sampled
pattern density exactly matches FABRIC_CAMO_DENSITY per print, including
woodland, six-color desert and Flecktarn. No hidden PASGT zoom multiplier.
Top seams at ±2.6 model X and short front/back continuation, subtle and
two only. Keep hem as a restrained folded edge; no decorative rivets.

Elastic band: 0.72 unit height on the UPRIGHT region, less than 0.1 unit
outward from its reference surface. Build independent bare-shell/covered
fit geometry once; toggle visibility only. No roof shelf over brow.

Release checkpoints:
1. Critical P5/P4 tests + production Vite/TS + Studio mobile smoke.
2. Review five matching camera captures (bare, solid cover, M81 cover,
   elastic cover, bare elastic) in front/side/rear/3/4, at full/gameplay size.
3. Compare 3/6-color desert and Flecktarn UV density to approved uniform.
4. Respect main branch and Pages production queue; merge only when visually
   approved and CI is green, and verify live hash after any merge.

Do not yet remake foliage, scrim or net or mass-ship those options.
