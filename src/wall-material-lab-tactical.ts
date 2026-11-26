/** On-demand tactical lab: the actual scene builder and camera, no simulation
 * loop. Rebuild only when explicitly requested; one scene per lab document. */
import {TacticalScene3D} from './breach-3d.ts';
import {generateSite,type BuildingArchetype} from './breach-site.ts';
import {newSession,team} from './breach-game.ts';
import {activateSite} from './breach-core.ts';
export function createTacticalMaterialPreview(container:HTMLElement){
 const scene=new TacticalScene3D();
 const canvas=document.getElementById('breach3dCanvas') as HTMLCanvasElement;
 container.append(canvas);canvas.style.cssText='display:block;width:100%;height:auto;aspect-ratio:16/10;pointer-events:none;';
 let session:ReturnType<typeof newSession>|undefined;
 let key='';
 function draw(archetype:BuildingArchetype,seed:number,level:number,close:boolean,metric=false){
  const next=[archetype,seed,level,metric].join(':');
  const w=Math.max(1,container.clientWidth),h=Math.max(1,Math.round(w*10/16));
  scene.resize(w,h);
  if(next!==key||!session){
   const site={...generateSite(seed,'standard',undefined,{mission:'intel'},{archetype}),conditionLevel:level};
   scene.wallAudition={effect:'all',atlas:true,story:true,metric};
   activateSite(site);session=newSession(0,seed,'floor-plan','standard',undefined,site);
   scene.applySite(site);scene.resetCamera();key=next;
  }
  scene.setMode('iso');scene.view.zoom=close?2.5:1.25;
  scene.update(session,team(session)[0].id,1,null,true);
 }
 return {draw};
}
