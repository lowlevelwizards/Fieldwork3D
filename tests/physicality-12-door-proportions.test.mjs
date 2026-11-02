import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {doorProportions,DOOR_PANEL_END_RECESS}
 from '../src/breach-door-proportions.ts';
import {doorLeafSegment,activateSite,passable,OPERATOR_RADIUS}
 from '../src/breach-core.ts';
import {initDoor,advanceDoor,pushDoor} from '../src/breach-door.ts';
const door=(style='wood')=>initDoor({
 id:'D',a:{x:100,y:100},b:{x:148,y:100},
 open:false,openedAt:-1,hinge:'a',swing:-1,kind:'hinged',style
},0);
test('symbolic proportions stay chunky without a deep frame or threshold',()=>{
 const wood=doorProportions({kind:'hinged',style:'wood'});
 const reinforced=doorProportions({kind:'hinged',style:'reinforced'});
 assert.ok(wood.jambWidth>=2.5&&wood.jambWidth<4);
 assert.ok(wood.jambDepth<8);
 assert.ok(wood.thresholdDepth<8);
 assert.ok(wood.thresholdHeight<1);
 assert.ok(wood.leafThickness<4);
 assert.ok(reinforced.jambWidth>=wood.jambWidth);
 assert.ok(reinforced.leafThickness>=wood.leafThickness);
});
test('moving leaf ends at its recessed modeled latch, not outside the frame',()=>{
 const d=door();
 const leaf=doorLeafSegment(d);
 const length=Math.hypot(leaf.b.x-leaf.a.x,leaf.b.y-leaf.a.y);
 assert.ok(Math.abs(length-(48-DOOR_PANEL_END_RECESS))<.00001);
 d.open=true;
 for(let i=0;i<80;i++)advanceDoor(d,1/60);
 const after=doorLeafSegment(d);
 assert.ok(Math.abs(Math.hypot(after.b.x-after.a.x,after.b.y-after.a.y)-
   length)<.00001);
});
test('full structural aperture stays walkable while the open leaf swings',()=>{
 const d=door();
 activateSite({seed:10,name:'door geometry regression',layout:'corridor',
  rooms:[],walls:[{a:{x:0,y:100},b:{x:100,y:100}},
   {a:{x:148,y:100},b:{x:240,y:100}}],
  doors:[d],cover:[],entrance:{x:124,y:125},
  spawn:[],enemies:[],objective:{x:150,y:150},extract:{x:90,y:120},
  roomCount:0,bounds:{minX:0,minY:0,maxX:250,maxY:250}});
 try{
  assert.equal(passable({x:124,y:100},OPERATOR_RADIUS),true,
    'jamb styling must not close the underlying walkable gap');
  d.open=true;d.openFraction=.95;
  for(let i=0;i<40;i++)pushDoor(d,2);
  for(let i=0;i<80;i++)advanceDoor(d,1/60);
  assert.ok(d.openFraction>.95,'slimmed styling must preserve pressure overswing');
 }finally{activateSite(null);}
});
test('both the active and legacy renderers use the same frame proportions',()=>{
 const source=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.ok(source.split('doorProportions(door)').length>=3);
 assert.ok(source.includes('const jambX=length/2+profile.jambWidth/2-.25'));
 assert.ok(source.includes('const jambX=width/2+profile.jambWidth/2-.25'));
 assert.ok(!source.includes('width+7,4,12,doorTrim'));
});
