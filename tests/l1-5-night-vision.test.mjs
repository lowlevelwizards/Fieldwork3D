import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {newSession,toggleNvg} from '../src/breach-game.ts';
import {initialEquipmentLoadout,setEquipmentChoice,readEquipmentLoadout}
 from '../src/equipment-loadouts.ts';
import {initialWardrobe,readWardrobe} from '../src/operator-wardrobe-data.ts';
import {HELMET_FIELD_DEFAULTS} from '../src/operator-helmet-field-policy.ts';
import {nvgMounted,nvgOperational,nvgEditable,nvgControlState}
 from '../src/equipment-night-vision.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
import {createHelmetFieldLayers,updateHelmetFieldLayers}
 from '../src/operator-helmet-field-visuals.ts';
import {readFileSync} from 'node:fs';
const kit=()=>setEquipmentChoice(initialEquipmentLoadout(),'utility','utility-nvg');
const look=()=>({...initialWardrobe(),
 styles:{headwear:'ach'},helmetField:{...HELMET_FIELD_DEFAULTS,shroud:true}});
const actor=()=>({name:'Rook',health:4,equipment:kit(),wardrobe:look(),
 nvgDeployed:false});
test('L1.5 actual utility device and effective shroud both required',()=>{
 const a=actor();
 assert.equal(nvgMounted(a),true);
 assert.equal(nvgOperational(a),false);
 assert.equal(nvgOperational({...a,nvgDeployed:true}),true);
 assert.equal(nvgMounted({...a,equipment:initialEquipmentLoadout()}),false);
 assert.equal(nvgMounted({...a,wardrobe:{...a.wardrobe,helmetField:undefined}}),false);
 assert.equal(nvgMounted({...a,wardrobe:{...a.wardrobe,helmetField:{
  ...HELMET_FIELD_DEFAULTS,goggles:'eyes',battery:true,strobe:true}}}),false,
  'cosmetic goggles/strobe/battery are not night-vision hardware');
 assert.equal(nvgMounted({...a,equipment:setEquipmentChoice(kit(),'head','head-cap')}),false);
 for(const headwear of ['bare','patrol-cap','soviet-steel','police-helmet']){
  assert.equal(nvgMounted({...a,wardrobe:{...a.wardrobe,
   styles:{headwear}}}),false,headwear);
 }
 for(const headwear of ['mich-2001','mich-2002','pasgt'])
  assert.equal(nvgMounted({...a,wardrobe:{...a.wardrobe,
   styles:{headwear}}}),true,headwear);
});
test('L1.5 saved kit and legacy wardrobe missing field do not auto-provision',()=>{
 assert.equal(readEquipmentLoadout(kit(),'carbine').slots.utility,'utility-nvg');
 assert.equal(nvgMounted({equipment:kit(),wardrobe:readWardrobe(initialWardrobe())}),false);
 assert.equal(nvgMounted({equipment:kit(),wardrobe:readWardrobe(look())}),true);
});
test('L1.5 runtime toggle, phase, death, replay and independently equipped operators',()=>{
 const s=newSession();
 const a=s.operators.find(x=>x.id==='rook'),other=s.operators.find(x=>x.id==='moss');
 assert.ok(a&&other);
 a.equipment=kit();a.wardrobe=look();other.equipment=initialEquipmentLoadout();
 assert.equal(toggleNvg(s,a.id),true);
 assert.equal(a.nvgDeployed,true);
 assert.equal(nvgOperational(a),true);
 assert.equal(toggleNvg(s,other.id),false);
 assert.notEqual(other.nvgDeployed,true);
 const rev=s.illuminationRevision;
 assert.equal(toggleNvg(s,a.id),true);
 assert.equal(a.nvgDeployed,false);
 assert.equal(s.illuminationRevision,rev+1);
 s.phase='won';
 assert.equal(toggleNvg(s,a.id),false);
 assert.equal(nvgEditable(a,'running',true),false);
 assert.equal(nvgControlState(a,'running',true).disabled,true);
 a.nvgDeployed=true;a.health=0;
 assert.equal(nvgOperational(a),false);
 assert.equal(nvgControlState(a,'running').pressed,false);
 assert.equal(nvgControlState(a,'running').disabled,true);
});
test('L1.5 replay snapshots restore up/down and legacy films default off',()=>{
 const s=newSession(),a=s.operators.find(x=>x.id==='rook');
 a.equipment=kit();a.wardrobe=look();
 const down=snapshot(s);assert.equal(down.actors.find(x=>x.id===a.id).nvgDeployed,false);
 assert.equal(toggleNvg(s,a.id),true);
 const up=snapshot(s);assert.equal(up.actors.find(x=>x.id===a.id).nvgDeployed,true);
 applyReplayFrame(s,down);assert.equal(a.nvgDeployed,false);
 applyReplayFrame(s,up);assert.equal(a.nvgDeployed,true);
 const old={...down,actors:down.actors.map(x=>{const c={...x};delete c.nvgDeployed;return c;})};
 applyReplayFrame(s,old);
 assert.equal(a.nvgDeployed,false,'old recordings do not inherit future state');
});
test('L1.5 visual model uses cached helmet geometry and actual up/down mounts',()=>{
 const root=new THREE.Group(),v=createHelmetFieldLayers(root,'ach');
 const field={...HELMET_FIELD_DEFAULTS,shroud:true};
 updateHelmetFieldLayers(v,field,0x606c61,true,'eyes-none',true,true,false);
 const raised=v.modules['nvg-stowed'],down=v.modules['nvg-deployed'];
 assert.equal(raised.visible,true);
 assert.equal(down.visible,false);
 const geometry=raised.children[0].children[0];
 updateHelmetFieldLayers(v,field,0x606c61,true,'eyes-none',true,true,true);
 assert.equal(raised.visible,false);assert.equal(down.visible,true);
 assert.equal(raised.children[0].children[0],geometry);
 updateHelmetFieldLayers(v,field,0x606c61,true,'eyes-none',true,false,true);
 assert.equal(raised.visible,false);assert.equal(down.visible,false);
});
test('L1.5 selected optical treatment has no fog/perception/AI writes',()=>{
 const read=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
 const hud=read('ui/tactical-hud-controller.ts'),sty=read('breach-style.css');
 assert.match(hud,/body\.classList\.toggle\('nvg-selected-view'/);
 assert.match(hud,/nvgOperational\(friendly\.find/);
 assert.match(hud,/e\.code==='KeyN'/);
 assert.match(hud,/nvg\.click\(\)/);
 assert.match(sty,/#breachCanvas/);assert.match(sty,/#breach3dCanvas/);
 assert.match(read('breach-3d.ts'),/nvgDeployed:actor\.nvgDeployed===true/);
 assert.match(read('breach-tactical-control-commands.ts'),/if\(!a\|\|!nvgEditable\(a,s\.phase\)\)return false/);
});
