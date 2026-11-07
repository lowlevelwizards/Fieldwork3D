# PASGT P5 field dress — visual and integration gate

Feature branch: feature/pasgt-p5-field-dress-20261107
Baseline: first P5 Cover Foundation release, commit a921002.

- Stage D: derive eight reinforced foliage cuts from fitted cover triangles
  using shared orthogonal tangent frames; all above the elastic band.
  The same positions and orientation are used by leaves and scrim.
- Stage E: exactly 3 recognizably distinct pixel-art foliage cards, six
  total instances; broad two-plane drooping static fabric ribbons for scrim
  in muted woodland, desert and urban color families.
- Stage F: six sparse, cover-hugging diagonals over the actual crown with
  downturned front, side and rear portions. No roof grid, no wire cylinders.
- Stage G: 20 branch-WebGL captures in a fixed Studio head camera, covering
  bare, solid cloth, M81, band, slit-only, foliage, scrim, net in multiple views.
  Do not infer visual approval merely from bounds, tests or successful CI.

Only PASGT-specific systems; unchanged shell geometry, wardrobe policy,
other headwear and global camo recipes.
No per-frame geometry creation, random placement or new customizable toggles.
Clean field-dress material separation. Field-dress outcome must be meaningfully
different between foliage, scrim and net at gameplay scale.

Release gate: TypeScript/Vite; narrow P5/P4 tests; Studio smoke and actual
capture inspection; verify Pages previous release hash; one merge only,
and verify new Pages hash before declaring production live.
If any silhouette fails visual review, keep PR draft and refine or defer it.
