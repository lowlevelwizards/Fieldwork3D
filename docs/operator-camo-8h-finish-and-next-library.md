# Camouflage 8H — M98 micro-contour finishing pass

Baseline: approved 8G artwork, M98 density **3.0**; JGSDF Type II and Soldier 2000 frozen exactly.

## Goal and strict scope
After reviewing the real 8G operator in Quick Play, retain its strong three-color medium-scale breakup and simply make stepped corners a little less sharp. No changes to the existing 54 camouflage IDs, textile placement, palette, headwear scale, uniform eligibility, saves, gameplay, smart sort or any other camo master.

## Stage 8H-A
- Preserve the approved, periodically tiled 8/14/20 frequency field generator and all its numeric settings.
- On the **completed** 64×64 M98 master only, run a single simultaneous four-cardinal-neighbor check. Where three or four direct neighbors share a color and the source color has at most one supporting direct neighbor, repaint that pixel with the shared color. Read from an immutable source copy to avoid scan-order propagation.
- The offline reference simulation changes only **25 of 4096 pixels (0.61%)**. Original 8G edge count **1289** becomes approximately **1240**, smoothing only tiny corner hooks, not changing the macro structure.
- Coverage stays approximately **34.5% olive, 37.2% forest, 28.2% tan**; no new inks or tiny speckles.
- The exhaustive 12×18 crop maximum stays under 86% one color; worst crop approximately 83.3%, share exceeding 80% approximately 0.88% of positions, below the 1.5% acceptance ceiling.
- Garment density stays **3.0** (2.55 and 3.4 remain reference options, not selected runtime settings).

## Stage 8H-QA
- Focused 8H/8G/8F/8E/8D/8C/8B/8A/7C camo tests, R9 fabric metric repeat, TypeScript and Vite production build.
- Verify JGSDF Type II RGBA hash `05c026d4979bd4941a94e9f3415d16ca59e9fd706c42dbdb828ac0071d8871e7` and Soldier 2000 hash `4cd092f87a82a262c5ed78d5436f5e5725ab0a0cac8dc832adebd1f991505bb9` remain identical.
- Reuse the mobile print-review workflow to collect 18 fixed-light phone WebGL screenshots of unchanged BDU top/trousers at 2.55/3.0/3.4 and front/side/back at detail/gameplay zoom.
- Feature-branch commits only until all focus checks green; reconcile any newer main, ensure earlier GitHub Pages SHA was successfully deployed and is publicly served and there is no production release running. Merge once and verify the public release SHA.

## Next-catalog recommendations (separate future scope)
The next proposed **9A** batch is French CCE, Russian VSR-93, Swiss TAZ 90, British Desert DPM, South Korean Granite B and Indonesian Kopassus Flowing Blood, with Canadian CADPAT AR and USAF ABU digital tiger stripe as optional 9B additions. No new prints are created in 8H. For CADPAT-inspired products inspect Canadian government licensing guidance before replicating any official bitmap.
