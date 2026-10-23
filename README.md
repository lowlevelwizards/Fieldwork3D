# Fieldwork 3D

**0.0.7 — Everything Is Connected**

Mobile-first isometric Three.js + TypeScript miniature field operations. A deliberately small but real power-distribution network now connects Cedar Relay's generator, switchgear, service relay, junction and radio mast. Rook and Mica trace faults through physical inspection, meter readings, actual breaker isolation, carrying replacement parts, and restoring service.

**Play:** https://lowlevelwizards.github.io/Fieldwork3D/

## A service call

Arrive at the truck and tap equipment in the scene. Rook walks to the machine and physically inspects it; its actual voltage and mechanical state are briefly reported. Mica independently heads to the generator to inspect source power and radios their findings (unless reassigned for an urgent repair).

A generator producing 120 V does *not* imply the mast is receiving it. Every link in the network has continuity, and each downstream load requires its upstream source and path.

Follow the evidence: inspect the relay, switchgear, cable junction and generator to find where power stops. The actual defect is unknown until somebody visits its machine.

Once the faulty machine has been identified, Mica gets the appropriate assignment. They retrieve a spare from the truck and deliver it to Rook, or operate the physical supply disconnect. Hazardous repairs only work after the feed is **actually isolated**. Hold the small contextual work chip near the affected machine to perform a repair; progress responds to your touch and the equipment's condition.

After the repair, Mica reconnects the supply before you can **TEST CIRCUIT**. A damaged short-circuit can trip protection again if the problem wasn't fixed. Certain oxidized relay terminals have an additional fault revealed only by the first energized test, requiring isolation, a second repair and retest.

You can also **LEAVE FOR LATER**, returning with the relay offline. Once the test passes, connected lights come on, the generator is audible, the mast flashes, and both operators return to the truck. Select **ANOTHER JOB** to attempt the next kind of breakdown.

Service faults rotate across **generator startup, open feeder, shorted junction, blown relay fuse, oxidized terminal, and jammed contactor**, with test outcomes derived from equipment condition.

## Interface and controls

The only persistent HUD is **CEDAR RELAY · 07:14 · OVERCAST**. Service actions appear beside the relevant machine, and status reports fade away.

- **Tap machine or ground:** inspect/approach, or route Rook around obstacles
- **Lower-left thumb:** floating movement joystick
- **Lower-right thumb:** floating horizontal isometric orbit
- **Pinch/twist:** zoom/orbit; upper-scene drag pans the map
- **Hold contextual action:** physically manipulate the diagnosed component
- **Test Circuit:** energized verification, only after the supply is connected
- **Leave For Later:** defer the repair and return
- **WASD/arrows:** desktop movement; **F/Q/E:** focus/rotate; **M:** toggle audio
- **Shift+R:** new service call after crew return

The incident index and completed/deferred totals persist in local browser storage.

## Implementation

- `src/systems/power-network.ts`: pure, deterministic connectivity graph, voltages, breakers, trips, load states and conditional faults.
- `src/fieldwork/network-job.ts`: observation-gated diagnosis, action progress, work safety, verification, retest and deferral.
- `src/world/power-yard.ts`: chunky low-poly generator and fan, switchgear, junction, physical conductors, support poles, indicator lights, subtle exhaust and energized facility effects.
- `src/crew/crew-mission.ts`: long-running deliveries, handoffs, isolation, reconnection and return obligations.
- `src/crew/companion-controller.ts`: independent generator survey and fault-specific navigation.
- `src/fieldwork/relay-site.ts`: existing tactile hinged cabinet and radio mast updated from actual network state.

The previous 0.0.6 isolated repair simulator is kept as tested foundation code rather than copied wholesale into a larger AI system.

## Development

Node 22+:

```sh
npm install
npm run dev
npm test
npm run check
npm run build
```

GitHub Actions validates commits to `main` and publishes the compiled Vite dist directory to GitHub Pages.
