/** Early ST Lab uses the actual tactical renderer and actual generated sites.
 * A proposal is deliberately a shadow snapshot, not a playable migration. */
import {TacticalScene3D} from './breach-3d.ts';
import {generateSite,type Site,type SiteScale} from './breach-site.ts';
import {newSession,team} from './breach-game.ts';
import {activateSite} from './breach-core.ts';
import {proposeStreetInfrastructure,streetConflicts} from './worldgen/street-infrastructure.ts';
import type {StreetKind} from './worldgen/street-standards.ts';
import {planPublicStreet} from './worldgen/public-street-layout.ts';
const select=(id:string)=>document.getElementById(id) as HTMLSelectElement;
const seed=document.getElementById('seed') as HTMLInputElement,scale=select('scale'),kind=select('kind'),layout=select('layout'),view=select('view');
const viewport=document.getElementById('viewport')!,output=document.getElementById('diagnostics')!;
const scene=new TacticalScene3D();viewport.append(scene.canvas);
let base:Site,active:Site,session:ReturnType<typeof newSession>;
function draw(){
 if(!session)return;
 scene.resize(Math.max(1,viewport.clientWidth),Math.max(1,viewport.clientHeight));
 scene.setMode(view.value==='top'?'top':'iso');scene.resetCamera();scene.view.zoom=1;
 const selected=team(session)[0]?.id;if(!selected)return;
 scene.update(session,selected,1/60,null,true);scene.update(session,selected,1/60,null,true);
 const p=active.streetInfrastructure,r=planPublicStreet(active);
 const width=r?(r.entry==='north'||r.entry==='south'?r.road.depth:r.road.width):0;
 const stats=scene.performanceStats();
 output.textContent=(base.archetype??'site')+' · seed '+base.seed+' · '+(p?p.kind+' · '+(p.cropped?'cropped':'full')+' · '+p.completeLanes+'/'+p.nominalLanes+' complete lanes':'legacy')+' · road '+(width/20).toFixed(2)+'m · '+(p?streetConflicts(base,p).length+' existing fixture conflicts · ':'')+stats.calls+' draws · '+stats.triangles+' triangles';
}
function rebuild(){
 const p=layout.value==='proposal'?proposeStreetInfrastructure(base,kind.value==='auto'?undefined:kind.value as StreetKind):null;
 active=p?{...base,streetInfrastructure:p}:base;
 activateSite(active);session=newSession(0,active.seed,'exterior-known',scale.value as SiteScale,undefined,active);
 scene.applySite(active);draw();
}
function generate(){
 const n=Math.max(1,Math.min(999999,Math.floor(Number(seed.value)||4)));seed.value=String(n);
 base=generateSite(n,scale.value as SiteScale);rebuild();
}
document.getElementById('generate')!.addEventListener('click',generate);
scale.addEventListener('change',generate);layout.addEventListener('change',rebuild);kind.addEventListener('change',rebuild);view.addEventListener('change',draw);
const resize=new ResizeObserver(draw);resize.observe(viewport);generate();
window.addEventListener('pagehide',()=>resize.disconnect());
