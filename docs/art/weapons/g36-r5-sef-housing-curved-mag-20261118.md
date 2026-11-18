# G36 R5 — SEF lettering on the trigger housing, magazine artwork following the actual curved body

**Review:** user 10:46–11:12 Nov 18 mobile Arsenal close-up IMG_8812.jpeg. R4 failure: white S only partly visible beside selector, red E hidden, F bled down the pistol grip; R4 magazine graphic read as 6 rigid horizontal bands rather than an angled/translucent curved G36 magazine. This is a narrow art correction, NOT another rebuild.

## Photo-specific reference decision

- HK original SEF trigger group has **F upper-left, E lower-left and S right of the pivot**, all on the compact trigger housing near/above the trigger-guard opening. This is visible on an actual HK G36 SEF 3-position grip photo (ZIB-Militaria "G36 grip FA empty S-E-F 3 Pos. H&K Assault Rifle Original", archived photo URL: https://www.zib-militaria.de/WebRoot/Store8/Shops/61431412/5ECC/DD01/6D9A/0ACF/F388/0A0C/6D12/5329/WhatsApp_Image_2020-06-18_at_10.22.41.jpeg). HK catalog confirms SEF genuine G36 option.
- The original G36 magazine is translucent polymer with cartridge/coupling features; for this game's 3-band cel art, represent their readable **direction and gentle value** on the ONE existing opaque atlas rather than requiring transparency.

## Stage A: all SEF text visible on receiver housing

- Do not modify selector hub/paddle: pivot x=-5.20, y=-1.96, two existing six-sided hubs; motion/weapon stats/optics unchanged.
- Replace R4 indices: S (-3.87,-1.86), E (-6.03,-2.00), F (-6.03,-1.66), **all z=±1.185**. R4 used E/F z=1.035 behind the 1.14-deep receiver and y=-2.57/-3.12 over the grip.
- New glyph size .38×.32. All vertical glyph extents fall between **-2.16 and -1.50**: bounded **above trigger-guard top -2.18** and below upper body bottom -1.49. Text appears on the flat lower receiver shell, only .045 in front of its modeled side.
- All letters clear the large .55-radius selector pivot; S clears the tip of right-facing paddle.
- Keep 3 S/E/F glyphs on each side using six quads, one pooled material/mesh, 12 triangles total, factory material assignment excluded. No additional geometry.
- Keep SEF rather than swapping to pictograms; actual pictured SEF layouts support this compact F/E-left/S-right configuration.

## Stage B: actual curved-magazine-aligned artwork

- Render in magazine-local coordinates: derive t=(topY-y)/length and cross-mag u from the **same** `arMagazineSample(G36_MAG30_CURVE,t)` tangent and normal used to build the production polymer magazine.
- Replace six rigid full-width world-space y-stripes with **five shorter inclined** low-contrast ghost cartridges at t=.29/.41/.54/.67/.80; individual length limits vary; art shears t by -0.065u for a clearly canted read. Taper endpoints and soften edges. No full-width rectangles, no cartridge text.
- Two faint molded coupler impressions now at local t=.37,u=-.69 and t=.65,u=.70, so they follow the curve too. The magazine material stays opaque (no alpha-sorting), original 3.32-width 5.56 feed, 30-round shape and reload hand position preserved.
- Reuses left/right 96×96 atlas tiles in shared 384×192 G36 pooled atlas with base 255 and gentle shades 230,234,244,220,246. Entire other atlas tiles, handguard, flash-hider, port, lens, stock are unchanged.
- Target exact old geometry **476 triangles / 23 meshes**, no shader/material/texture or per-frame work. Current texture is generated once from 96×96 tiles, not per frame.

## Stage C: focused release gate
- Re-baseline R1, R3, R4 inherited assertions to R5 coordinates and magazine shades.
- Add `weapon-g36-r5-sef-housing-curved-mag.test.mjs` verifying glyph footprint and undercut clearance, F/E/S arrangement, exact 6-quad material/UV retention, curved-magazine sampling and bilateral symmetry, opaque atlas and unchanged factory geometry+part IDs.
- Run focused G36 node tests/TS/build/real-WebGL mobile capture plus critical Arsenal mount/geometry and Ground Zero integration. Keep new PR unmerged for on-device art review unless explicitly approved for release; do not queue additional Pages deployments.
