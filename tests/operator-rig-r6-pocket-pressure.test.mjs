import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';
import {rigContactFrame} from '../src/operator-rig-contact-frame.ts';
import {RIG_FRONT_PROFILES} from '../src/operator-armor-rig-silhouettes.ts';
import {RIG_POCKET_PRESSURE} from '../src/operator-rig-garment-relief.ts';

function pose(r,top,rig){
 let equipment=initialEquipmentLoadout();
 equipment=setEquipmentChoice(equipment,'armor','armor-none');
 equipment=setEquipmentChoice(equipment,'rig',rig==='no-rig'?'rig-none':'rig-light');
 poseOperator(r,{x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,deterministic:true,unarmedPreview:true,
  equipment,wardrobe:{...initialWardrobe(),styles:{
   top,trousers:'bdu-trousers',armorStyle:'armor-bare',rigStyle:rig,
   headwear:'bare',beltStyle:'no-belt',packStyle:'no-pack'
  }}
 },0);
}
const tops=[
 ['bdu-shirt','micro-rig'],
 ['acu-shirt','chest-placard'],
 ['smock-jacket','full-chest'],
 ['gorka-jacket','split-front']
];
test('RIG-R6 blouse pockets compress in/down and return to their authored pose',()=>{
 const r=createOperatorRig('rook','blue');
 try{
  for(const [top,rig] of tops){
   pose(r,top,'no-rig');
   const torso=(top==='bdu-shirt'||top==='acu-shirt'?
    r.visualKit.fieldBlouses[top]:r.visualKit.newUpper.cuts[top]).torso;
   const pockets=[];
   torso.traverse(o=>{if(o instanceof THREE.Mesh&&o.userData.armorCompressible)
    pockets.push(o);});
   assert.ok(pockets.length>=4,top+' independently pressable pockets');
   const before=pockets.map(o=>({id:o.uuid,x:o.position.x,y:o.position.y,
    z:o.position.z,sx:o.scale.x}));
   pose(r,top,rig);
   const frame=rigContactFrame('armor-bare',top,rig);
   pockets.forEach((o,i)=>{
    const b=before[i];
    assert.equal(o.uuid,b.id,'never replace the pocket mesh or material');
    assert.ok(Math.abs(o.position.x-(b.x-RIG_POCKET_PRESSURE.inset))<1e-6);
    assert.ok(Math.abs(o.position.y-(b.y-RIG_POCKET_PRESSURE.drop))<1e-6);
    assert.ok(Math.abs(o.position.z-b.z*RIG_POCKET_PRESSURE.lateralScale)<1e-6);
    assert.ok(Math.abs(o.scale.x-b.sx*RIG_POCKET_PRESSURE.depthScale)<1e-6);
    o.geometry.computeBoundingBox();
    // A compressed pocket may overlap the inner backing surface a little.
    // It MUST NOT protrude through the visible FRONT face of the rig.
    const face=o.position.x+o.geometry.boundingBox.max.x*o.scale.x;
    const rigVisibleFront=RIG_FRONT_PROFILES[rig].front+frame.rigShiftX;
    assert.ok(face<=rigVisibleFront-.10,
     top+'/'+rig+' covered fabric must stay behind front webbing: '+
     face.toFixed(2)+' > '+rigVisibleFront.toFixed(2));
   });
   const positions=pockets.map(o=>o.position.x);
   pose(r,top,rig);
   assert.deepEqual(pockets.map(o=>o.position.x),positions,
    'no accumulating deformation during repeated game poses');
   pose(r,top,'no-rig');
   pockets.forEach((o,i)=>{
    assert.equal(o.position.x,before[i].x);
    assert.equal(o.position.y,before[i].y);
    assert.equal(o.position.z,before[i].z);
    assert.equal(o.scale.x,before[i].sx);
   });
  }
 }finally{r.dispose();}
});
