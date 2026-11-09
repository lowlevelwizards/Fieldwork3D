/** Floor Plan fog and recorded personal-discovery masks.
 * Mask generation uses authoritative intel from the current session.
 * Does not discover ground, query historic actor LOS, or alter sim state.
 */
import {W,H} from './breach-core.ts';
import type {Session} from './breach-game.ts';
import type {ViewMode} from './breach-3d.ts';
import {paintFogMask,maskBounds,FOG_WIDTH,FOG_HEIGHT} from './breach-fog-mask.ts';
import {paintReplayPersonalGround} from './breach-replay-ground-overlay.ts';
import type {ReplayKnowledgeController} from './breach-replay-knowledge-controller.ts';
import type {ReplayPlaybackController} from './breach-replay-playback-controller.ts';
export function createBreach2DVisibilityRenderer(config:{
 draw:CanvasRenderingContext2D;
 getState:()=>Session;isReplaying:()=>boolean;getViewMode:()=>ViewMode;
 replayKnowledge:ReplayKnowledgeController;
 replayPlayback:ReplayPlaybackController;
 debugPalette:boolean;
}){
 const {draw,getState,isReplaying,getViewMode,replayKnowledge,
 replayPlayback,debugPalette}=config;
const fogCanvas=document.createElement('canvas');
fogCanvas.width=FOG_WIDTH;fogCanvas.height=FOG_HEIGHT;
const fogContext=fogCanvas.getContext('2d');
if(!fogContext)throw Error('Fog canvas unavailable');
const replayGroundCanvas=document.createElement('canvas');
const replayGroundContext=replayGroundCanvas.getContext('2d');
if(!replayGroundContext)throw Error('Replay ground canvas unavailable');
let fogStamp=-1;
let fogSession:Session|null=null;
let fogIntelMode='';let fogSeenRevision=-1;
function renderReplayPersonalGround():void{
  const state=getState(),replaying=isReplaying(),viewMode=getViewMode();
  if(!replaying||!replayKnowledge.groundLensOn||viewMode!=='plan2d'||
    !replayKnowledge.observerId||!replayKnowledge.personalGround)return;
  const observed=replayKnowledge.personalGround.at(
    replayPlayback.time,replayKnowledge.observerId);
  if(!observed)return;
  if(replayKnowledge.groundCacheObserver!==replayKnowledge.observerId||
     replayKnowledge.groundCacheCount!==observed.size||
     replayKnowledge.groundCacheSite!==state.site){
    paintReplayPersonalGround(replayGroundContext!,state.site,observed);
    replayKnowledge.groundCacheObserver=replayKnowledge.observerId;
    replayKnowledge.groundCacheCount=observed.size;
    replayKnowledge.groundCacheSite=state.site;
  }
  const b=maskBounds(state.site);
  draw.drawImage(replayGroundCanvas,b.minX,b.minY,
    b.maxX-b.minX,b.maxY-b.minY);
}
function fog(){
  const state=getState(),replaying=isReplaying();
  if(replaying&&replayKnowledge.omniscient)return;
  if(fogStamp<0||fogSession!==state||fogIntelMode!==state.intel.mode||
    fogSeenRevision!==state.seenGroundRevision||
    state.seconds<fogStamp||state.seconds-fogStamp>.055){
    fogStamp=state.seconds;fogSession=state;fogIntelMode=state.intel.mode;
    fogSeenRevision=state.seenGroundRevision;
    paintFogMask(fogContext!,state,
      debugPalette?
        'palette':'normal');
  }
  draw.drawImage(fogCanvas,0,0,W,H);
}

 return {renderPersonalGround:renderReplayPersonalGround,renderFog:fog,
   invalidate:()=>{fogStamp=-1;}};
}
