# Fieldwork texture 2.0 — visual acceptance and release gate

The target is **clean, constructed material identity**, not dense pixel noise.

## Fixed map references

Use the map lab at normal tactical zoom, full overview, and close inspection:

| Building | Seed | Expected qualities |
| --- | ---: | --- |
| Clinic | 120 | Mint/cream, pale washable floors, clean cabinetry; not gray dungeon |
| Garage | 126 | Calm industrial slabs; contrasting road and lawn |
| Restaurant | 128 | Warm timber, deliberate floorboards; localized neglect |
| Apartment | 134 | Domestic warm plaster; visually distinct room surfaces |
| Utility | 141 | Industrial panel seams, cinderblock and equipment not grime |
| Office | 158 | Restrained professional carpet and painted walls |

## Release gate

- Surface palette is not darkened globally.
- Clean manufactured surfaces mostly consist of uninterrupted color.
- Grass/soil/gravel/asphalt remain visually distinct at full-map zoom.
- Floorboard and masonry joints remain discrete and scale-consistent.
- Property condition only creates a small bounded number of wear marks.
- Textures preserve cutaways, collision, cover and fog logic.
- No per-frame procedural texture allocation.
- Check material preview in Asset Lab and verify live iPhone Safari view.
- Run TypeScript, texture-specific unit tests and production build before merge.
- Verify Pages deployment after merge; audit release screenshots when available.

Procedural textures deliberately share physical pixel density but NOT visual
information density. Fine source detail is progressively neutralized by the
cached authored mip chain, retaining building color at distant zoom.
