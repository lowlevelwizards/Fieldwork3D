import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/breach-runtime-loop.ts',import.meta.url),'utf8');
test('P1.5e telemetry is opt-in, records each real frame but paints <=750ms',()=>{
 assert.match(source,/const perfTimeline=new PerformanceTimeline\(\)/);
 assert.match(source,/perfTimeline\.addCoarseFrame\(now,frameGap/);
 assert.match(source,/perfTimeline\.add\(\{at:now,raf:frameGap/);
 assert.match(source,/if\(Math\.floor\(now\/750\)/);
 assert.match(source,/perfPanel\.update\(output,perfTimeline/);
 assert.match(source,/const simulationStart=perfOverlay\?performance\.now\(\):0/);
 assert.match(source,/P1 750ms Q\/H\/M\/B/);
});
test('P1.5e timing and counters reset across mission session changes',()=>{
 assert.match(source,/if\(perfTimeline&&perfTimelineSession!==state\)/);
 assert.match(source,/perfTimeline\.reset\(\);perfTimelineSession=state/);
 assert.match(source,/intervalSight\[key\]\+=sightDelta\[key\]/);
 assert.match(source,/lastFogPaints=fogNow;lastShadowRefreshes=shadowNow/);
});
