import test from 'node:test';
import assert from 'node:assert/strict';
import {safeLabWindow,safeLabZoom,safeLabProjectionShift}
 from '../src/operator-lab-camera-framing.ts';
import {readFileSync} from 'node:fs';
test('center target is projected into the unobscured area, not entire canvas',()=>{
 const v=safeLabWindow(390,844,88,428,121);
 assert.equal(v.top,133);
 assert.equal(v.bottom,414);
 const zoom=safeLabZoom('full',v);
 const shift=safeLabProjectionShift(v,zoom);
 const ndc=-shift*zoom/36;
 const y=(1-ndc)*v.viewportHeight/2;
 assert.ok(Math.abs(y-(v.top+v.bottom)/2)<1e-6);
 assert.ok(zoom<.45,'default full operator should fit the small visible phone window');
 assert.ok(safeLabZoom('head',v)<1.52,'head preview cannot become giant');
});
test('full-body and head framing adapt to occlusion and phone geometry',()=>{
 const phone=safeLabWindow(390,844,90,445,125);
 const landscape=safeLabWindow(844,390,55,265,60);
 assert.ok(safeLabZoom('full',phone)<safeLabZoom('head',phone));
 assert.ok(safeLabZoom('full',landscape)>0);
 const collapsed=safeLabWindow(390,844,90,675,125);
 assert.ok(safeLabZoom('full',collapsed)>safeLabZoom('full',phone));
 const a=safeLabProjectionShift(phone,.5),b=safeLabProjectionShift(phone,1);
 assert.ok(Math.abs(a)>Math.abs(b));
});
test('Lab uses measured UI and does not override user zoom each frame',()=>{
 const s=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 assert.match(s,/getBoundingClientRect\(\)\.top/);
 assert.match(s,/getBoundingClientRect\(\)\.bottom/);
 assert.match(s,/ResizeObserver/);
 assert.match(s,/safeLabZoom\(mode,safeView/);
 assert.match(s,/control.addEventListener\('change',updateSafeProjection\)/);
 assert.doesNotMatch(s,/focus==='head'\?3\.0/);
});
