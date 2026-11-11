import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAfterActionModelPresenter} from
 '../src/ui/breach-after-action-model.ts';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('V4-3: no browser/WebGL context is a safe null presentation, not a fatal error',()=>{
 assert.equal(createAfterActionModelPresenter([
  {id:'rook',name:'ROOK',side:'blue',appearanceSeed:1,weapon:'carbine'}
 ]),null);
});

test('V4-3: recorded manifest, identical rigs and neutral deterministic pose are authoritative',()=>{
 const rig=source('src/ui/breach-after-action-model.ts');
 const controller=source('src/ui/breach-after-action-controller.ts');
 assert.match(rig,/import \{createOperatorRig,poseOperator/);
 assert.match(rig,/weaponConfiguration:actor\.weaponConfiguration/);
 assert.match(rig,/equipment:actor\.equipment,wardrobe:actor\.wardrobe/);
 assert.match(rig,/appearanceSeed:actor\.appearanceSeed/);
 assert.match(rig,/deterministic:true/);
 assert.match(rig,/down:false,surrender:false,aiming:false/);
 assert.match(controller,/const identities=recorder\.manifest\?\.actors\?\?\[\]/);
 assert.doesNotMatch(rig,/damageDecal|hitMarker|impactPosition/);
 assert.doesNotMatch(rig,/requestAnimationFrame\(|setInterval\(/);
});

test('V4-3: viewer builds at most one renderer and caches a rig per actor id',()=>{
 const rig=source('src/ui/breach-after-action-model.ts');
 assert.equal((rig.match(/new THREE\.WebGLRenderer\(/g)||[]).length,1);
 assert.match(rig,/const models=new Map<string,Model>\(\)/);
 assert.match(rig,/const existing=models\.get\(actor\.id\);if\(existing\)return existing/);
 assert.match(rig,/for\(const actor of roster\)build\(actor\)/);
 assert.match(rig,/host\.replaceChildren\(canvas\)/);
 assert.match(rig,/selected=operatorId/);
 assert.match(rig,/observer\?\.disconnect\(\)/);
 assert.match(rig,/renderer\.forceContextLoss\(\)/);
 assert.match(rig,/if\(lost\)\{[\s\S]*?nextHost\.textContent='3D VIEW UNAVAILABLE/);
 assert.match(rig,/NO RECORDED MODEL FOR THIS CONTACT/);
});

test('V4-3: Squad uses real model surface; Combat reuses it without introducing a second viewer',()=>{
 const squad=source('src/ui/breach-after-action-squad.ts');
 const combat=source('src/ui/breach-after-action-combat.ts');
 const controller=source('src/ui/breach-after-action-controller.ts');
 assert.match(squad,/data-after-squad-model/);
 assert.match(controller,/presentModel\(root,s\.recorder,squadHost\?\?combatHost/);
 assert.match(controller,/presenter\.show\(host,operatorId\)/);
 assert.match(controller,/owner\.presenter\?\.hide\(\)/);
 assert.match(combat,/model\.dataset\.afterModel=active\.id/);
 assert.doesNotMatch(squad,/createSquadMiniature|SVGSVGElement/);
 assert.match(controller,/modelHost\.setAttribute\('data-after-squad-model'/);
});

test('V4-3: no historical WebGL resources survive menu exit or mission replacement',()=>{
 const main=source('src/breach-main.ts');
 const sheets=source('src/ui/breach-mission-screens.ts');
 const controller=source('src/ui/breach-after-action-controller.ts');
 assert.match(main,/function releaseMissionPresentation\(\):void\{[\s\S]{0,170}disposeAfterActionPresentation\(ui\.debrief\)/);
 assert.match(sheets,/disposeAfterActionPresentation\(ui\.debrief\)/);
 assert.match(controller,/if\(owner&&owner\.recorder!==recorder\)/);
 assert.match(controller,/unavailable:boolean/);
 assert.match(controller,/if\(owner\.unavailable\)/);
 assert.match(controller,/owner\.version\+\+;owner\.presenter\?\.dispose\(\);models\.delete\(root\)/);
 assert.match(controller,/if\(!models\.has\(root\)&&!root\.hidden\)renderers\.get\(root\)\?\.\(\)/);
});

test('V4-3: exactly one WebGL presenter is reused, not a DOM-independent animation or replay owner',()=>{
 const controller=source('src/ui/breach-after-action-controller.ts');
 assert.match(controller,/const models=new WeakMap<HTMLElement,ModelOwner>\(\)/);
 assert.match(controller,/void import\('\.\/breach-after-action-model\.ts'\)/);
 assert.match(controller,/const current=root\.querySelector<HTMLElement>/);
 assert.match(controller,/\[data-after-squad-model\], \[data-after-model\]/);
 assert.match(controller,/owner\.presenter\.show\(current,id\)/);
 assert.doesNotMatch(controller,/mountAfterActionModel/);
});
