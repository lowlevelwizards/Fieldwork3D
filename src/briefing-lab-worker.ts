/** Real site generation runs off the Briefing Lab UI thread. */
import {generateSite,type SiteScale} from './breach-site.ts';
import {newSession} from './breach-game.ts';
import {compileMissionFacts} from './briefing/mission-facts.ts';
import type {IntelMode} from './breach-intel.ts';
import type {OperationKind} from './breach-operations.ts';
import type {MissionTruth} from './briefing/briefing-types.ts';

export type LabGenerationRequest={
  id:number;seed:number;scale:SiteScale;mission:OperationKind;intel:IntelMode;
};
export type LabGenerationResponse=
  |{id:number;kind:'done';truth:MissionTruth}
  |{id:number;kind:'error';message:string};
const scope=self as unknown as{
  onmessage:((e:MessageEvent<LabGenerationRequest>)=>void)|null;
  postMessage:(message:LabGenerationResponse)=>void;
};
scope.onmessage=({data:request})=>{
  try{
    const site=generateSite(request.seed,request.scale,undefined,
      {mission:request.mission});
    const session=newSession(0,request.seed,request.intel,request.scale,
      request.mission,site);
    scope.postMessage({id:request.id,kind:'done',truth:compileMissionFacts(session)});
  }catch(error){
    scope.postMessage({id:request.id,kind:'error',message:
      error instanceof Error?error.message:String(error)});
  }
};
