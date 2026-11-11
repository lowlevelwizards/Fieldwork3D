/** DEV-only real-session Bodycam acceptance hook. Not a controller.
 * Installs only when explicitly enabled by the entrypoint; never exposes
 * replay sight through ordinary production controls. */
import type {Session} from './breach-game.ts';
import {team,planMove} from './breach-game.ts';
import type {Pt} from './breach-core.ts';
import type {Site} from './breach-site.ts';
import type {TacticalScene3D,ViewMode} from './breach-3d.ts';
import type {MissionRecorder} from './breach-replay.ts';
import type {ReplayKnowledgeController} from './breach-replay-knowledge-controller.ts';
import type {ReplayCameraController} from './breach-replay-camera-controller.ts';
import type {ReplayPlaybackController} from './breach-replay-playback-controller.ts';
import {intelPassable} from './breach-intel.ts';
import {SQUEEZE_RADIUS} from './breach-navigation.ts';
import {measureReplaySquadDoorEntry,type ReplaySquadEntryReview} from './breach-replay-squad-entry.ts';
export type ReplayBodycamQaPort={
 readonly state:Session;
 readonly recorder:MissionRecorder;
 readonly stage:TacticalScene3D|null;
 readonly replaying:boolean;
 readonly viewMode:ViewMode;
 selected:string;
 readonly cssW:number;
 readonly cssH:number;
 replayKnowledge:ReplayKnowledgeController;
 replayCamera:ReplayCameraController;
 replayPlayback:ReplayPlaybackController;
 chooseReplayCamera:(choice:'free'|'operator'|'squad'|'director')=>void;
 cameraMode:(mode:ViewMode)=>void;
 seekReplay:(time:number)=>void;
 updateReplayHud:()=>void;updateHud:()=>void;invalidateFog:()=>void;
 worldToScreen:(point:Pt,height?:number)=>Pt;
 resetIndoorSite:(site:Site)=>void;
};
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function installReplayBodycamQa(port:ReplayBodycamQaPort):void{

  type BodycamQa={
    activate:(mount:'chest'|'helmet')=>boolean;
    seek:(time:number)=>boolean;
    stop:()=>void;
    diagnostic:()=>ReturnType<TacticalScene3D['inspectReplayBodycamQa']>|null;
    /** Read-only candidate taps; browser must author with real pointer input. */
    routeCandidates:()=>Array<{world:Pt;screen:Pt}>;
    planned:()=>{actorId:string;path:Pt[]}|null;
    motionSamples:()=>Array<{at:number;p:Pt;heading:number}>;
    prepareIndoorEntry:()=>boolean;
    indoorEntryReview:()=>ReplaySquadEntryReview|null;
  };
  const qa:BodycamQa={
    activate(mount){
      if(!port.replaying||!port.stage||port.viewMode==='plan2d')return false;
      const observer=team(port.state)[0];
      if(!observer||!port.recorder.frames[0]?.knowledge?.operatorVisibleActorIds?.[observer.id])
        return false;
      port.replayKnowledge.observerId=observer.id;
      port.replayKnowledge.omniscient=false;
      port.replayKnowledge.groundLensOn=false;
      port.replayPlayback.pause();
      port.chooseReplayCamera('free');
      port.selected=observer.id;
      port.replayCamera.followId=observer.id;
      port.cameraMode('iso');
      port.stage.setReplayBodycam({actorId:observer.id,mount,
        stabilization:'balanced',fov:95});
      port.seekReplay(Math.min(.1,port.recorder.duration));
      port.updateReplayHud();
      return true;
    },
    seek(time){
      if(!port.replaying||!Number.isFinite(time))return false;
      port.replayPlayback.pause();
      port.seekReplay(Math.max(0,Math.min(time,port.recorder.duration)));
      return true;
    },
    stop(){
      port.stage?.setReplayBodycam(null);
      port.replayKnowledge.observerId=null;
      port.replayKnowledge.omniscient=false;
      port.invalidateFog();
      if(port.replaying)port.updateReplayHud();
    },
    diagnostic:()=>port.stage?.inspectReplayBodycamQa()??null,
    routeCandidates(){
      if(port.replaying||!port.stage||port.state.phase!=='planning')return [];
      const actor=team(port.state)[0];if(!actor)return [];
      const result:Array<{world:Pt;screen:Pt}>=[];
      for(const radius of [55,78,105,42])
        for(const bearing of [0,-.6,.6,-1.15,1.15,2.1,-2.1]){
          const angle=actor.heading+bearing;
          const world={x:actor.p.x+Math.cos(angle)*radius,
            y:actor.p.y+Math.sin(angle)*radius};
          if(!intelPassable(world,port.state.intel,SQUEEZE_RADIUS))continue;
          const screen=port.worldToScreen(world,0);
          if(screen.x<35||screen.x>port.cssW-35||
             screen.y<85||screen.y>port.cssH-200)continue;
          if(team(port.state).some(a=>distance(
             port.worldToScreen(a.p,24),screen)<38))continue;
          result.push({world,screen});
        }
      return result;
    },
    planned(){
      const actor=team(port.state)[0];
      return actor?{actorId:actor.id,
        path:actor.plan.filter(n=>n.kind==='move').map(n=>({...n.p}))}:null;
    },
    motionSamples(){
      const id=team(port.state)[0]?.id;
      if(!id)return [];
      return port.recorder.frames.flatMap(f=>{
        const actor=f.actors.find(a=>a.id===id);
        return actor?[{at:f.t,p:{...actor.p},heading:actor.heading}]:[];
      });
    },
    prepareIndoorEntry(){
      // Deterministic two-room indoor training fixture: two enclosed roofs,
      // one physical hinged doorway. This still uses the real session motor,
      // authored MOVE orders and normal MissionRecorder; no replay synthesis.
      if(port.replaying||port.state.phase!=='planning')return false;
      const at=(x:number,y:number):Pt=>({x,y});
      const site:Site={
        seed:731,name:'BODYCAM INDOOR ENTRY / QA',layout:'corridor',
        training:true,archetype:'office',roomCount:2,
        rooms:[
          {id:'entry-room',x:240,y:110,w:140,h:150,
            kind:'room',tone:.42,purpose:'lobby'},
          {id:'inner-room',x:240,y:260,w:140,h:180,
            kind:'room',tone:.39,purpose:'office'}
        ],
        walls:[
          {a:at(240,110),b:at(380,110)},
          {a:at(240,110),b:at(240,440)},
          {a:at(380,110),b:at(380,440)},
          {a:at(240,440),b:at(380,440)},
          {a:at(240,260),b:at(290,260)},
          {a:at(332,260),b:at(380,260)}
        ],
        doors:[{id:'ENTRY',a:at(290,260),b:at(332,260),
          kind:'hinged',hinge:'a',swing:-1,open:true,openedAt:0}],
        cover:[],windows:[],entrance:at(311,200),
        spawn:[at(300,200),at(308,173),at(316,146),at(325,119)],
        enemies:[],objective:at(320,400),extract:at(325,420),
        bounds:{minX:0,minY:0,maxX:640,maxY:500}
      };
      port.resetIndoorSite(site);
      const crew=team(port.state).slice(0,4);
      if(crew.length!==4)return false;
      const goals=[at(300,350),at(312,365),at(325,380),at(339,394)];
      const accepted=crew.every((actor,i)=>
        planMove(port.state,actor.id,goals[i]));
      port.updateHud();return accepted;
    },
    indoorEntryReview(){
      if(port.recorder.frames.length<2)return null;
      return measureReplaySquadDoorEntry(port.recorder.frames,'ENTRY',
        team(port.state).map(a=>a.id),0,port.recorder.duration);
    }
  };
  (window as typeof window&{__fieldworkBodycamQa?:BodycamQa})
    .__fieldworkBodycamQa=qa;

}
