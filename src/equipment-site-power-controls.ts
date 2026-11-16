/** L1.2: one deterministic physical control description for UI, 2D/3D
 * and fixed-step order execution. Existing architectural wall attachments
 * are the primary anchors; authored K1 sites receive explicit practice
 * stations. No collision geometry or random per-frame placement.
 */
import type {Site} from './breach-site.ts';
import type {Pt} from './breach-core.ts';
import {siteLightingTopology} from './equipment-site-lighting.ts';
import {MAIN_LIGHT_CIRCUITS,BACKUP_LIGHT_CIRCUIT,
 type SitePowerCircuit} from './equipment-site-power.ts';
export type SitePowerControl={
 id:string;kind:'breaker'|'switch';p:Pt;roomId:string;
 circuit?:SitePowerCircuit;fixtureId?:string;
 /** A source wall prop ID, or synthetic training station. */
 sourceDetailId?:string;
};
export const POWER_CONTROL_REACH=43;
export const POWER_ACTION_SECONDS=.65;
const electrical=(kind:string)=>kind==='breaker-panel'||kind==='electrical-box';
const wallSwitch=(kind:string)=>kind==='light-switch';
const center=(r:Site['rooms'][number]):Pt=>({
 x:r.x+r.w/2,y:r.y+r.h/2
});
const memo=new WeakMap<Site,readonly SitePowerControl[]>();
export function sitePowerControls(site:Site):readonly SitePowerControl[]{
 const saved=memo.get(site);
 if(saved)return saved;
 const lights=siteLightingTopology(site);
 const fixtureByRoom=new Map(lights.map(f=>[f.roomId,f.id]));
 const controls:SitePowerControl[]=[];
 const used=new Set<string>();
 const details=site.wallDetails??[];
 // Each existing wall-mounted switch is bound to the local room's
 // actual light; spare wall attachments remain decorative.
 for(const detail of details){
  if(!wallSwitch(detail.kind))continue;
  const fixtureId=fixtureByRoom.get(detail.roomId);
  if(!fixtureId||used.has(fixtureId))continue;
  used.add(fixtureId);
  controls.push({id:'switch:'+fixtureId,kind:'switch',
   roomId:detail.roomId,p:{x:detail.x,y:detail.y},
   fixtureId,sourceDetailId:detail.id});
 }
 // Training sites and archived sites with no decorated walls need an
 // explicit, physically visible practice switch instead of a ghost action.
 if(!details.length)for(const light of lights){
  const room=site.rooms.find(r=>r.id===light.roomId);
  if(!room)continue;
  controls.push({id:'switch:'+light.id,kind:'switch',
   roomId:room.id,p:{x:room.x+Math.min(16,room.w*.14),
    y:room.y+Math.min(16,room.h*.14)},fixtureId:light.id});
 }
 // A real breaker panel is shared by multiple labeled circuits. The
 // click context chooses the specific circuit before authoring a command.
 const panel=details.find(d=>electrical(d.kind));
 const room=site.rooms.find(r=>r.kind==='hall')??site.rooms[0];
 if(panel||room){
  const p=panel?{x:panel.x,y:panel.y}:center(room!);
  const roomId=panel?.roomId??room!.id;
  const circuits=[...MAIN_LIGHT_CIRCUITS,
    ...(lights.some(f=>f.backupEligible)?[BACKUP_LIGHT_CIRCUIT]:[])] as SitePowerCircuit[];
  for(const circuit of circuits)
   controls.push({id:'breaker:'+circuit,kind:'breaker',
    roomId,p:{...p},circuit,sourceDetailId:panel?.id});
 }
 // Always one immutable candidate list per site. It can be reused across
 // context queries, drawing and the order motor without repeated allocations.
 memo.set(site,controls);
 return controls;
}
export const controlPosition=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function powerControlAt(site:Site,id:string):SitePowerControl|undefined{
 return sitePowerControls(site).find(control=>control.id===id);
}
export function currentControlState(
 control:SitePowerControl,circuits:Record<string,boolean>,
 switches:Record<string,boolean>):boolean{
 return control.kind==='breaker'?
  !!circuits[control.circuit!]:switches[control.fixtureId!]!==false;
}
