/** Stage 3: prove exact provenance, not what a camera could show. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {groundFogLevel,groundKnowledgeAt,preciseGroundEvidenceAt,
  coarseGroundEvidenceAt} from '../src/breach-ground-knowledge.ts';
import {forEachGroundSightCandidate}
  from '../src/breach-ground-discovery.ts';
import {groundView,groundViewCandidate}
  from '../src/breach-ground-view.ts';
import {exteriorBriefedAt} from '../src/breach-site-footprint.ts';
const p=(x,y)=>({x,y});

test('four knowledge states preserve briefing and observation provenance',()=>{
 const room={id:'IN',kind:'room',tone:0,x:100,y:100,w:140,h:130};
 const site={seed:13,rooms:[room],
   bounds:{minX:0,minY:0,maxX:420,maxY:420}};
 const inside=p(180,180),outside=p(60,160);
 assert.equal(exteriorBriefedAt(site,outside),true);
 assert.equal(exteriorBriefedAt(site,inside),false);
 for(const mode of ['true-blind','exterior-known','floor-plan']){
   assert.equal(groundKnowledgeAt(mode,site,inside,false,false),
     mode==='floor-plan'?'briefed':'unknown');
   assert.equal(groundKnowledgeAt(mode,site,inside,false,true),'discovered');
   assert.equal(groundKnowledgeAt(mode,site,inside,true,false),'visible');
   assert.equal(groundKnowledgeAt(mode,site,outside,false,false),
     mode==='exterior-known'||mode==='floor-plan'?'briefed':'unknown');
 }
 assert.equal(groundKnowledgeAt('full-view',site,inside,false,false),'visible');
 assert.deepEqual(['visible','discovered','briefed','unknown']
   .map(groundFogLevel),[0,1,1,2]);
});

test('coarse memory and prebriefed plans are not precise ground evidence',()=>{
 const seen=new Set(['4,4']);
 assert.equal(coarseGroundEvidenceAt(seen,p(161,161)),true);
 assert.equal(preciseGroundEvidenceAt(seen,p(161,161)),false);
 seen.add('fine:8,8');
 assert.equal(preciseGroundEvidenceAt(seen,p(161,161)),true);
 assert.equal(preciseGroundEvidenceAt(seen,p(185,161)),false);
 seen.add('micro:-2,1');
 assert.equal(preciseGroundEvidenceAt(seen,p(-15,15)),true);
 assert.equal(preciseGroundEvidenceAt(seen,p(-5,15)),false);
 assert.equal(preciseGroundEvidenceAt(seen,p(NaN,15)),false);
 assert.equal(coarseGroundEvidenceAt(seen,p(Infinity,15)),false);
});

test('authoritative directional enumeration retains exact legacy cell order',()=>{
 const bounds={minX:-200,minY:-170,maxX:701,maxY:809};
 for(const step of [10,20])for(const [x,y,heading] of [
   [20,40,0],[240,115,1.7],[-45,333,-2.7],[650,730,3.12]]){
   const sight=groundView(x,y,heading);
   const old=[];
   const x0=Math.max(Math.floor(bounds.minX/step),Math.floor((x-240)/step));
   const x1=Math.min(Math.ceil(bounds.maxX/step)-1,Math.floor((x+240)/step));
   const y0=Math.max(Math.floor(bounds.minY/step),Math.floor((y-240)/step));
   const y1=Math.min(Math.ceil(bounds.maxY/step)-1,Math.floor((y+240)/step));
   for(let row=y0;row<=y1;row++)for(let col=x0;col<=x1;col++){
     const cx=col*step+step/2,cy=row*step+step/2;
     if(groundViewCandidate(sight,cx,cy))old.push([col,row,cx,cy]);
   }
   const fresh=[];
   forEachGroundSightCandidate(sight,bounds,step,(col,row,p)=>
     fresh.push([col,row,p.x,p.y]));
   assert.deepEqual(fresh,old,'same ordered cells and strict cone boundary');
 }
});
