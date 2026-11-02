import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {paintFogMask} from '../src/breach-fog-mask.ts';
function fakeContext(){
 const calls=[],ctx={
  canvas:{width:120,height:120},filter:'none',
  globalCompositeOperation:'source-over',fillStyle:'#000',
  save(){calls.push(['save'])},restore(){calls.push(['restore'])},
  setTransform(){},clearRect(){},beginPath(){},moveTo(){},
  lineTo(){},closePath(){},rect(){},fill(){},stroke(){calls.push(['stroke'])},
  clip(){throw new Error('Even-odd room clipping must not return')},
  fillRect(x,y,w,h){calls.push(['rect',this.globalCompositeOperation,
    this.fillStyle,x,y,w,h])},
 };
 return {ctx,calls};
}
test('VIS-05: intersecting building room modules remain dark in Exterior Known',()=>{
 const {ctx,calls}=fakeContext();
 const s={
  intel:{mode:'exterior-known'},seenGround:new Set(),doors:[],
  operators:[],
  site:{seed:7,bounds:{minX:-30,minY:-30,maxX:110,maxY:110},
   rooms:[
    {x:0,y:0,w:55,h:65},
    {x:35,y:35,w:55,h:65},
   ]}
 };
 paintFogMask(ctx,s);
 const cover=calls.filter(c=>c[1]==='source-over'&&c[2]==='#000'&&c[5]===55);
 assert.ok(cover.some(c=>c[3]===0&&c[4]===0));
 assert.ok(cover.some(c=>c[3]===35&&c[4]===35));
 assert.ok(calls.some(c=>c[1]==='destination-out'&&c[3]<0));
});
test('VIS-05 ground-space mask cannot project over exterior terrain',()=>{
 const source=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.doesNotMatch(source,/overheadFog|roomFogRoofs|roomFogMaterial/);
 assert.match(source,/this\.smoothFog=new THREE\.Mesh/);
 assert.match(source,/this\.smoothFog\.rotation\.x=-Math\.PI\/2;/);
 assert.match(source,/this\.exteriorKnownFog\.visible=clippedExteriorFog;/);
 assert.doesNotMatch(source,/paintOccupiedRoomContext/);
});
