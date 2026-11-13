import test from 'node:test';
import assert from 'node:assert/strict';
import {acquisitionSeconds} from '../src/breach-firing-cadence.ts';
import {rangeSpreadScale,shotDispersionCone}
 from '../src/breach-shot-ignition.ts';

test('V3 aiming time grows smoothly without interfering with sight acquisition',()=>{
 const base={base:.30,moving:false,skillFactor:1,enemy:false,
  attachmentFactor:1,cautious:false};
 const near=acquisitionSeconds({...base,range:120});
 const across=acquisitionSeconds({...base,range:600});
 const far=acquisitionSeconds({...base,range:1400});
 assert.ok(near<across&&across<far);
 assert.ok(far<near*1.9,'bounded far-distance handling cost');
 assert.equal(acquisitionSeconds(base),near,
  'legacy calls with no range default to the short sight clock');
});

test('V3 physical shot cone degrades beyond weapon optimal range',()=>{
 assert.equal(rangeSpreadScale(0,250),1);
 assert.equal(rangeSpreadScale(250,250),1);
 assert.ok(rangeSpreadScale(600,250)>1);
 assert.ok(rangeSpreadScale(1400,250)>rangeSpreadScale(600,250));
 assert.ok(rangeSpreadScale(10000,250)<=1.75);
 const shooter={weapon:'carbine',stability:1,suppression:0,
  injuryStage:0,recoil:0,turning:0,velocity:0,
  skills:{longRange:50,precision:50,pointShooting:50}};
 const mods={turn:1,acquisition:1,recovery:1,recoilKick:1,
  noise:1,optic:'irons',stable:1};
 const near=shotDispersionCone(shooter,'ads',120,false,mods,165);
 const far=shotDispersionCone(shooter,'ads',800,false,mods,165);
 assert.ok(far>near*1.1,
  'same fixed-step RNG and barrel model gain a bounded range-based angular spread');
});
