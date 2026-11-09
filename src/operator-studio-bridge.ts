/** Stage 10c: same-origin embedded Operator Studio bridge.
 * Campaign and Quick Play saves remain in the tactical application.
 */
import {validateStudioAppearanceEdits,applyStudioRosterEdits,
  applyStudioCampaignEdits} from './operator-studio-batch-save.ts';
import type {RosterState} from './breach-roster.ts';
import type {CampaignState} from './campaign-state.ts';
import type {Session} from './breach-game.ts';
type CampaignMode='menu'|'home'|'mission'|'quick';
export type OperatorStudioBridgeHooks={
 getCampaign:()=>CampaignState|null;setCampaign:(value:CampaignState|null)=>void;
 getRoster:()=>RosterState;setRoster:(value:RosterState)=>void;
 getMode:()=>CampaignMode;getSelected:()=>string;
 getSession:()=>Session;isReplaying:()=>boolean;
 saveRoster:()=>boolean;saveCampaign:()=>boolean;
 applyQuickRoster:()=>void;onQuickSaved:()=>void;onCampaignSaved:()=>void;
};
export function createOperatorStudioBridge(config:OperatorStudioBridgeHooks){
/** Embedded Studio keeps the live mission mounted. The game remains the
 * sole authority for config.getCampaign()/Quick Play writes; the iframe edits a draft. */
let studioMode:'quick'|'campaign'='quick';
let studioSelected='rook';
let studioOverlay:HTMLDivElement|null=null;
let studioFrame:HTMLIFrameElement|null=null;
/** Keep one warm Studio context for short returns; release it after a bounded
 * hidden interval to avoid retaining two WebGL contexts indefinitely on iOS.
 * The iframe never owns tactical simulation or authoritative roster state. */
const STUDIO_WARM_RETAIN_MS=60_000;
let studioReady=false,studioOpenEpoch=0,studioInitSentEpoch=-1;
let studioReleaseTimer:ReturnType<typeof setTimeout>|null=null;
function sendStudioInit(){
 if(!studioOverlay||studioOverlay.hidden||
    studioInitSentEpoch===studioOpenEpoch)return;
 studioInitSentEpoch=studioOpenEpoch;
 if(!studioFrame?.contentWindow)return;
 const people=studioMode==='campaign'?
  config.getCampaign()?.operators.filter(o=>o.status!=='retired'&&o.status!=='lost')??[]:
  config.getRoster().members;
 studioFrame.contentWindow.postMessage({
  type:'fw-studio-init',mode:studioMode,selected:studioSelected,
  members:people.map(p=>({
   id:p.id,callsign:p.callsign,appearanceSeed:p.appearanceSeed,
   loadout:p.loadout,wardrobe:p.wardrobe,
   weapon:p.weapon,weaponConfiguration:p.weaponConfiguration
  })),
  readonly:studioMode==='campaign'?!!config.getCampaign()?.activeContractId:
   config.getSession().phase!=='planning'||config.isReplaying()
 },location.origin);
}
function closeOperatorStudio(){
 if(!studioOverlay||studioOverlay.hidden)return;
 studioOverlay.hidden=true;
 studioFrame?.contentWindow?.postMessage({type:'fw-studio-suspend'},location.origin);
 if(studioReleaseTimer!==null)clearTimeout(studioReleaseTimer);
 studioReleaseTimer=setTimeout(()=>{
  studioReleaseTimer=null;
  if(!studioOverlay?.hidden||!studioFrame)return;
  studioFrame.src='about:blank';
  studioReady=false;studioInitSentEpoch=-1;
 },STUDIO_WARM_RETAIN_MS);
}
function openOperatorStudio(id?:string,requestedMode?:'quick'|'campaign'){
 studioMode=requestedMode??(config.getMode()==='home'||config.getMode()==='mission'?
  'campaign':'quick');
 if(studioMode==='campaign'&&!config.getCampaign())return;
 if(!studioOverlay){
  studioOverlay=document.createElement('div');
  studioOverlay.id='operatorStudioOverlay';studioOverlay.hidden=true;
  studioFrame=document.createElement('iframe');
  studioFrame.title='Fieldwork Operator Studio';
  studioOverlay.append(studioFrame);document.body.append(studioOverlay);
  studioFrame.onload=()=>{
   if(studioOverlay&&!studioOverlay.hidden)sendStudioInit();
  };
 }
 studioSelected=id??(studioMode==='campaign'?config.getCampaign()?.operators[0]?.id:'rook')??'rook';
 if(studioReleaseTimer!==null){
  clearTimeout(studioReleaseTimer);studioReleaseTimer=null;
 }
 studioOpenEpoch++;
 studioOverlay.hidden=false;
 const url=new URL('./operator-studio.html',location.href);
 url.searchParams.set('embedded','1');url.searchParams.set('mode',studioMode);
 url.searchParams.set('operator',studioSelected);
 // A hidden frame still owns the already compiled rig and GPU resources.
 // Send fresh authoritative roster/readonly state rather than navigate it.
 if(!studioFrame!.getAttribute('src')||
    studioFrame!.getAttribute('src')==='about:blank'){
  studioReady=false;
  studioFrame!.src=url.href;
 }else if(studioReady)sendStudioInit();
}
document.getElementById('openOperatorStudio')?.addEventListener('click',()=>
 openOperatorStudio(config.getSelected(),'quick'));
window.addEventListener('message',event=>{
 if(!studioFrame?.contentWindow||event.source!==studioFrame.contentWindow||
    event.origin!==location.origin||!event.data||typeof event.data!=='object')return;
 const msg=event.data as {type?:string;id?:unknown;
  wardrobe?:unknown;entries?:unknown};
 if(msg.type==='fw-studio-ready'){
  studioReady=true;sendStudioInit();return;
 }
 if(msg.type==='fw-studio-close'){closeOperatorStudio();return;}
 const batch=msg.type==='fw-studio-commit-batch';
 if(!batch&&msg.type!=='fw-studio-commit')return;
 const edits=validateStudioAppearanceEdits(batch?msg.entries:
  [{id:msg.id,wardrobe:msg.wardrobe}]);
 let ok=false;
 const currentCampaign=config.getCampaign();
 if(edits&&studioMode==='quick'&&config.getSession().phase==='planning'&&!config.isReplaying()){
  const next=applyStudioRosterEdits(config.getRoster(),edits);
  if(next){
   const previous=config.getRoster();config.setRoster(next);
   ok=config.saveRoster();
   if(ok){config.applyQuickRoster();
    config.onQuickSaved();}
   else config.setRoster(previous);
  }
 }else if(edits&&studioMode==='campaign'&&currentCampaign&&!currentCampaign.activeContractId){
  const next=applyStudioCampaignEdits(currentCampaign,edits);
  if(next){
   const previous=currentCampaign;config.setCampaign(next);
   ok=config.saveCampaign();
   if(ok)config.onCampaignSaved();
   else config.setCampaign(previous);
  }
 }
 if(edits?.length)studioSelected=edits[0].id;
 if(batch){
  studioFrame.contentWindow.postMessage({
   type:'fw-studio-batch-saved',ids:edits?.map(e=>e.id)??[],ok
  },location.origin);
 }else{
  studioFrame.contentWindow.postMessage({
   type:'fw-studio-saved',id:msg.id,ok
  },location.origin);
 }
});

 return {open:openOperatorStudio,close:closeOperatorStudio,
   get visible(){return !!studioOverlay&&!studioOverlay.hidden;}};
}
