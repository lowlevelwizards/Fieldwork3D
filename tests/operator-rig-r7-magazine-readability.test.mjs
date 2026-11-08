import test from 'node:test';
import assert from 'node:assert/strict';
import {RIG_MAGAZINE_MOUTHS,rigMagazineCellCount,rigMagazineMount}
 from '../src/operator-armor-rig-silhouettes.ts';
import {armorMountedMagazineSocket}
 from '../src/operator-armor-attachment-frame.ts';
import {rigContactFrame} from '../src/operator-rig-contact-frame.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';

test('R7 front rig silhouettes have explicit physical magazine pouch mouths',()=>{
 const mouths={
  'micro-rig':2,'chest-placard':3,'light-rig':4,'chicom-rig':3,
  'bandolier':4,'split-front':4,'full-chest':4,
  lbv:4,'sadf-webbing':4,'field-webbing':0
 };
 for(const [rig,count] of Object.entries(mouths)){
  const slots=RIG_MAGAZINE_MOUTHS[rig];
  assert.equal(slots.length,count,rig+' unique visible mag pouch mouths');
  for(const [x,y,z,width] of slots)
   assert.ok([x,y,z,width].every(Number.isFinite)&&width>1,
    rig+' mouth is a physical legible opening');
 }
 assert.equal(rigMagazineCellCount('micro-rig'),2,'tiny utility wings must not carry magazines');
 assert.equal(rigMagazineCellCount('chest-placard'),3,'fourth is not hidden in a false panel cell');
 assert.equal(rigMagazineCellCount('chicom-rig'),3,'two side pockets are utility, not mags');
 assert.equal(rigMagazineCellCount('bandolier'),4,'fifth is intentionally utility');
 assert.equal(rigMagazineCellCount('lbv'),4,'no phantom double-magazine positions');
 assert.equal(rigMagazineCellCount('sadf-webbing'),4,'P83 lower cargo bags are not magazine pouches');
});
test('R7 real magazines emerge from visible pouch mouths rather than the front plate',()=>{
 for(const armor of ['armor-bare','soft-flak','plate-standard','plate-heavy']){
  for(const [rig,count] of [['micro-rig',2],['chicom-rig',3],
   ['lbv',4],['sadf-webbing',4]]){
   const frame=rigContactFrame(armor,'bdu-shirt',rig);
   for(let i=0;i<count;i++){
    const sock=armorMountedMagazineSocket(rig,i,armor,1,'bdu-shirt');
    assert.ok([sock.x,sock.y,sock.z,sock.rotation].every(Number.isFinite));
    assert.ok(sock.x>frame.front.x,'magazine follows a real exterior surface');
   }
  }
 }
 const arm='plate-standard',top='bdu-shirt';
 const first=armorMountedMagazineSocket('chicom-rig',0,arm,1,top);
 const raw=rigMagazineMount('chicom-rig',0,arm);
 assert.ok(first.y>raw.y+1.2,'long classic magazine clears its tall flap');
});
function preview(r,rig,quantity){
 let equipment=initialEquipmentLoadout();
 equipment=setEquipmentChoice(equipment,'armor','armor-none');
 equipment=setEquipmentChoice(equipment,'rig',
  ['sadf-webbing','field-webbing','lbv'].includes(rig)?'rig-full':'rig-light');
 poseOperator(r,{x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,deterministic:true,unarmedPreview:true,
  magazineCarryLocations:Array(quantity).fill('rig'),equipment,
  wardrobe:{...initialWardrobe(),styles:{
   armorStyle:'armor-bare',rigStyle:rig,top:'combat-shirt',
   trousers:'bdu-trousers',headwear:'bare',beltStyle:'no-belt',packStyle:'no-pack'
  }}
 },0);
}
test('R7 visible magazines are the real loadout instances, not eight decorative fakes',()=>{
 const r=createOperatorRig('rook','blue');
 try{
  for(const [rig,n] of [
   ['chicom-rig',0],['chicom-rig',1],['chicom-rig',3],
   ['micro-rig',4],['lbv',4],['sadf-webbing',7],
   ['field-webbing',7]
  ]){
   preview(r,rig,n);
   const expected=Math.min(n,rig==='micro-rig'?2:
    rig==='sadf-webbing'?4:rig==='field-webbing'?6:rig==='lbv'?4:3);
   assert.equal(r.visualKit.magazines.rig.filter(m=>m.visible).length,expected,
    rig+' never invents a '+(expected+1)+'th pouch');
   if(rig==='field-webbing'){
    const last=r.visualKit.magazines.rig[6];
    assert.equal(last.visible,false,'seventh magazine has no dedicated PLCE pouch');
   }
  }
 }finally{r.dispose();}
});
