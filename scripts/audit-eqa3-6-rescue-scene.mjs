/** EQA3.6: build seeded world-truth rescue scene sheets for human review.
 * This is a geometry schematic, NOT a screenshot of shipped fog/3D UI.
 * No mission/faction/player decisions are changed. Forensic records from
 * the actual 60Hz session may overlay authoritative casualty shot paths.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {generateSite} from '../src/breach-site.ts';
import {newSession,team,enemies,availableDeployments,selectDeployment}
 from '../src/breach-game.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {activateSite,doorOpticalSegment,doorCenter} from '../src/breach-core.ts';
import {sweptBodyClear} from '../src/breach-navigation.ts';
import {exposure} from '../src/breach-combat.ts';
import {windowPaneSegment} from '../src/breach-windows.ts';
const args=new Map(process.argv.slice(2).filter(x=>x.includes('='))
 .map(x=>x.replace(/^--/,'').split('=')));
const selectedSeed=Number(args.get('seed')??0);
const cases=selectedSeed?[[selectedSeed,'rescue']]:[[13,'rescue'],[17,'rescue']];
const outDir=args.get('out')??'artifacts/eqa3-6';
const rawReport=args.get('report')?
 JSON.parse(readFileSync(args.get('report'),'utf8')):null;
mkdirSync(outDir,{recursive:true});
const round=x=>Math.round(x*100)/100;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const esc=s=>String(s??'').replace(/&/g,'&amp;')
 .replace(/</g,'&lt;').replace(/>/g,'&gt;')
 .replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const F=p=>round(p);
const seg=(a,b,color,width=2,extra='')=>
 `<line x1="${F(a.x)}" y1="${F(a.y)}" x2="${F(b.x)}" y2="${F(b.y)}" stroke="${color}" stroke-width="${width}" ${extra}/>`;
const dot=(p,r,color,stroke='#f9f0df')=>
 `<circle cx="${F(p.x)}" cy="${F(p.y)}" r="${r}" fill="${color}" stroke="${stroke}" stroke-width="1.3"/>`;
const rect=(x,y,w,h,fill,extra='')=>
 `<rect x="${F(x)}" y="${F(y)}" width="${F(w)}" height="${F(h)}" fill="${fill}" ${extra}/>`;
const text=(x,y,t,size=11,fill='#e9e7dd',extra='')=>
 `<text x="${F(x)}" y="${F(y)}" font-size="${size}" font-family="Arial,Helvetica,sans-serif" fill="${fill}" ${extra}>${esc(t)}</text>`;
const manifest=[];
for(const [seed,mission] of cases){
 if(![13,17].includes(seed))throw Error('EQA3.6 only snapshots verified rescue scenes');
 const site=generateSite(seed,'small',undefined,{mission,enableIncidentIntent:true});
 const available=newSession(0,seed,'floor-plan','small',mission,site,
  {enableCivilians:true});
 const alternate=availableDeployments(available)
   .find(d=>d.id!=='FRONT'&&d.kind!=='window')?.id;
 activateSite(null);
 for(const entry of ['FRONT',alternate].filter(Boolean)){
  const s=newSession(0,seed,'floor-plan','small',mission,site,
   {enableCivilians:true});
  if(entry!=='FRONT'&&!selectDeployment(s,entry))
   throw Error('Scene insertion rejected: '+entry);
  const world=sessionWorldGeometry(s);
  const civilian=s.civilians.find(x=>x.rescueTarget);
  if(!civilian)throw Error('Missing live rescue civilian in '+seed);
  const foes=enemies(s),friends=team(s);
  const radius=23;
  const points=[];
  for(let i=0;i<16;i++){
   const theta=2*Math.PI*i/16;
   const p={x:civilian.p.x+radius*Math.cos(theta),
     y:civilian.p.y+radius*Math.sin(theta)};
   // Actual local SECURE/FOLLOW geometry, not a legal global MOVEMENT route.
   const contactClear=world.passable(p,8)&&
     sweptBodyClear(p,civilian.p,s.doors,5.5,world);
   const opticallyExposed=foes.some(foe=>foe.health>0&&
     !exposure(foe.p,p,s.doors,false,
       foe.posture==='crouch',true,world.walls,world.cover).blocked);
   points.push({p,contactClear,opticallyExposed,
     // Initial armed actors are forensic world-truth, not scout intel.
     nearInitialGuard:foes.reduce((acc,e)=>
       Math.min(acc,distance(e.p,p)),Infinity)});
  }
  const near=foes.map(e=>({id:e.id,p:e.p,
     gap:round(distance(e.p,civilian.p)),
     opticalRay:!exposure(e.p,civilian.p,s.doors,false,
       e.posture==='crouch',true,world.walls,world.cover).blocked}))
    .sort((a,b)=>a.gap-b.gap);
  const trace=rawReport?.rows?.find(r=>r.seed===seed&&
     r.mission===mission&&r.insertion===entry);
  const harmed=trace?.harmWitnesses??[];
  const bounds=site.bounds??{minX:0,minY:0,maxX:640,maxY:740};
  const W=bounds.maxX-bounds.minX,H=bounds.maxY-bounds.minY;
  const parts=[];
  parts.push(rect(bounds.minX-24,bounds.minY-55,W+48,H+105,'#16242a'));
  parts.push(rect(bounds.minX,bounds.minY,W,H,'#374741',
    'stroke="#556863" stroke-width="1"'));
  for(const room of site.rooms){
   parts.push(rect(room.x+1,room.y+1,Math.max(0,room.w-2),
      Math.max(0,room.h-2),room.kind==='hall'?'#45574e':'#52635c',
      'stroke="#64776d" stroke-width=".8"'));
  }
  for(const cover of s.coverState){
   parts.push(rect(cover.x-cover.w/2,cover.y-cover.h/2,
     cover.w,cover.h,cover.low?'#93886e':'#736957',
     'stroke="#c7bb97" stroke-width=".8" opacity=".85"'));
  }
  for(const wall of world.walls)parts.push(seg(wall.a,wall.b,'#dee0c9',3.4));
  for(const w of s.windows)parts.push(seg(windowPaneSegment(w).a,
      windowPaneSegment(w).b,'#80c8e7',3));
  for(const door of s.doors){
   const hinge=doorOpticalSegment(door);
   parts.push(seg(hinge.a,hinge.b,
      ['glazed','french'].includes(door.style??'')?'#71c9dc':'#e5af6b',4));
  }
  // Local contact ring encodes geometry and unconfirmed physical angles.
  for(const q of points){
   const color=!q.contactClear?'#747c80':
    q.opticallyExposed?'#ee9d53':'#73bfa0';
   parts.push(dot(q.p,4.3,color,'#16242a'));
  }
  for(const foe of foes){
   parts.push(dot(foe.p,9,'#c9676c','#fff4e2'));
   parts.push(seg(foe.p,{x:foe.p.x+13*Math.cos(foe.heading),
     y:foe.p.y+13*Math.sin(foe.heading)},'#ffafb2',2));
  }
  for(const friendly of friends){
   parts.push(dot(friendly.p,8,'#6a9fcb','#fff4e2'));
  }
  for(const harm of harmed){
   const shot=harm.associatedShot;
   if(!shot)continue;
   parts.push(seg(shot.from,shot.to,'#f4485f',3,
      'stroke-dasharray="8 3" opacity=".92"'));
   parts.push(dot(shot.from,3,'#ff8390'));
  }
  parts.push(dot(civilian.p,10,'#f2dc81','#251e1a'));
  parts.push(text(civilian.p.x+12,civilian.p.y-10,
    'RESCUE',11,'#ffeba4','font-weight="bold"'));
  parts.push(dot(s.scenario.extract,7,'#b8e4b5','#273b37'));
  parts.push(text(s.scenario.extract.x+9,s.scenario.extract.y+2,'EXTRACT',9));
  parts.push(text(bounds.minX,bounds.minY-35,
    `EQA3.6  ${site.archetype?.toUpperCase()} ${seed} · RESCUE · ${entry}`,
    16,'#f4f0df','font-weight="bold"'));
  parts.push(text(bounds.minX,bounds.maxY+22,
    'World truth / initial geometry · NOT player fog or a screenshot of gameplay',
    11,'#fff0cc'));
  parts.push(text(bounds.minX,bounds.maxY+39,
    'Blue squad   Red hostiles   Gold civilian   Dots: local reach (green cover / amber exposed / gray blocked)',
    10,'#d7ded9'));
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${F(bounds.minX-24)} ${F(bounds.minY-55)} ${F(W+48)} ${F(H+105)}" width="850" height="${Math.round(850*(H+105)/(W+48))}" role="img" aria-label="Forensic geometry diagram of ${site.archetype} rescue seed ${seed}, entry ${entry}"><g>${parts.join('')}</g></svg>\n`;
  const base=`rescue-${seed}-${entry.toLowerCase()}`;
  writeFileSync(`${outDir}/${base}.svg`,svg);
  const row={seed,mission,entry,archetype:site.archetype,
   geometry:'initial physical world; not a rendered player camera',
   rooms:site.rooms.length,walls:world.walls.length,doors:s.doors.length,
   cover:s.coverState.length,windows:s.windows.length,
   civilian:{id:civilian.id,p:{...civilian.p},health:civilian.health},
   initialSquad:friends.map(a=>({id:a.id,p:{...a.p}})),
   initialHostiles:near,
   contactRing:{radius,locations:points.length,
      localContactClear:points.filter(x=>x.contactClear).length,
      locallyClearButOpticallyExposed:points.filter(x=>
        x.contactClear&&x.opticallyExposed).length,
      locallyClearAndOpticallyCovered:points.filter(x=>
        x.contactClear&&!x.opticallyExposed).length},
   observedHarmRays:harmed.map(h=>({at:round(h.at),victimId:h.victimId,
     actorId:h.actorId,sourceSide:h.sourceSide,shotId:h.shotId,
     intended:h.associatedShot?.firingActorTargetId??null,
     from:h.associatedShot?.from??null,to:h.associatedShot?.to??null})),
   svg:`${base}.svg`};
  manifest.push(row);
  activateSite(null);
 }
}
writeFileSync(`${outDir}/manifest.json`,
 JSON.stringify({schema:'EQA3.6/physical-rescue-visual-v1',
 note:'Read-only initial world truth and actual projectile overlays; local ring is not full navigation/reaction or player-perceived LOS',scenes:manifest},null,2)+'\n');
console.log(JSON.stringify({scenes:manifest},null,2));
if(!manifest.length||manifest.some(x=>!x.contactRing.localContactClear))
 process.exitCode=1;