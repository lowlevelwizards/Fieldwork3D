import test from 'node:test';
import assert from 'node:assert/strict';
import {approachingDoorLeaf,advanceDoor,initDoor,pushDoor,PUSHED_OPEN_LIMIT}
 from '../src/breach-door.ts';
import {pointToSegment,doorLeafSegment} from '../src/breach-core.ts';
const sample=()=>initDoor({id:'PUSH',a:{x:300,y:230},
 b:{x:352,y:230},open:true,openedAt:0,hinge:'a',swing:-1},0);
test('approaching open hinged leaf triggers assisted pressure, not sliding or held leaves',()=>{
 const d=sample(),leaf=doorLeafSegment(d);
 const mid={x:(leaf.a.x+leaf.b.x)/2,y:(leaf.a.y+leaf.b.y)/2};
 const nx=leaf.b.y-leaf.a.y,ny=-(leaf.b.x-leaf.a.x);
 const len=Math.hypot(nx,ny);
 const from={x:mid.x+nx/len*22,y:mid.y+ny/len*22};
 const toward={x:mid.x+nx/len*15,y:mid.y+ny/len*15};
 assert.equal(approachingDoorLeaf(from,toward,d),true);
 assert.equal(approachingDoorLeaf(from,toward,{...d,heldBy:'x'}),false);
 assert.equal(approachingDoorLeaf(from,toward,{...d,kind:'sliding'}),false);
});
test('door responds to repeated pressure beyond its standard stopping angle',()=>{
 const d=sample();d.openFraction=.99;
 for(let i=0;i<40;i++)pushDoor(d,2.1);
 assert.ok(d.pushTarget>1.12&&d.pushTarget<=PUSHED_OPEN_LIMIT);
 for(let i=0;i<120;i++)advanceDoor(d,1/60);
 assert.ok(d.openFraction>1.08);
});
test('hinge may swing away from a body but cannot swing deeper into one',()=>{
 const d=sample();d.openFraction=.4;
 const leaf=doorLeafSegment(d);
 const future=doorLeafSegment({...d,openFraction:.42});
 const mid={x:(leaf.a.x+leaf.b.x)/2,y:(leaf.a.y+leaf.b.y)/2};
 const newMid={x:(future.a.x+future.b.x)/2,
   y:(future.a.y+future.b.y)/2};
 const length=Math.hypot(newMid.x-mid.x,newMid.y-mid.y);
 const normal={x:(newMid.x-mid.x)/length,y:(newMid.y-mid.y)/length};
 // On the receding side the panel rotates away, so opening remains possible.
 const retreat={x:mid.x-normal.x*7,y:mid.y-normal.y*7};
 advanceDoor(d,1/30,[retreat]);
 assert.ok(d.openFraction>.4,'door should swing AWAY from body');
 // On the approaching side, penetration cannot become deeper.
 const pushing=sample();pushing.openFraction=.4;
 const blocker={x:mid.x+normal.x*7,y:mid.y+normal.y*7};
 const before=pointToSegment(blocker,doorLeafSegment(pushing));
 advanceDoor(pushing,1/30,[blocker]);
 const after=pointToSegment(blocker,doorLeafSegment(pushing));
 assert.ok(after>=before-.06,'door rotated INTO full-size body');
});
