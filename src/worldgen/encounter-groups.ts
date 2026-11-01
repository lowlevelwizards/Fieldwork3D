/** Assign social and tactical groups before the physical placement pass.
 * Groups do not confer omniscient player knowledge to AI. */
import type {Site} from '../breach-site.ts';
import type {EncounterActorSpec,EncounterGroup,EncounterPremise} from './encounter-types.ts';
import {encounterRng} from './encounter-rng.ts';
export function composeEncounterGroups(site:Site,source:EncounterActorSpec[],
 premise:EncounterPremise,seed:number):{actors:EncounterActorSpec[];groups:EncounterGroup[]}{
 const rng=encounterRng(seed,4);
 const actors=source.map(a=>({...a}));
 // A seeded shuffle prevents higher original indices from always being grouped.
 const remaining=actors.map((a,i)=>({a,i,k:rng()}))
  .sort((a,b)=>a.k-b.k||a.i-b.i).map(x=>x.a);
 const groups:EncounterGroup[]=[];
 const maxGroup=premise==='defensive'||premise==='hideout'?4:3;
 for(let groupIndex=0;remaining.length;groupIndex++){
  const roll=rng(),n=roll<.28?1:roll<.76?2:Math.min(maxGroup,3+(rng()<.25?1:0));
  const members=remaining.splice(0,Math.min(n,remaining.length));
  const groupId='group-'+groupIndex;
  const purpose:EncounterGroup['purpose']=
   premise==='hideout'||premise==='defensive'?'organised':
   premise==='guarded'?'security':'occupants';
  const first=members[0];
  const firstRoom=site.rooms.find(r=>r.kind==='room'&&
   first.position.x>=r.x&&first.position.x<=r.x+r.w&&
   first.position.y>=r.y&&first.position.y<=r.y+r.h);
  const zoneId=firstRoom?.zoneId??firstRoom?.id;
  for(const a of members){
   const room=site.rooms.find(r=>r.kind==='room'&&
    a.position.x>=r.x&&a.position.x<=r.x+r.w&&
    a.position.y>=r.y&&a.position.y<=r.y+r.h);
   a.groupId=groupId;a.roomId=room?.id;a.zoneId=room?.zoneId??room?.id;
   a.role=purpose==='security'&&members.indexOf(a)===0?'sentry':
     purpose==='organised'&&members.indexOf(a)===0?'leader':'occupant';
  }
  groups.push({id:groupId,purpose,zoneId,members:members.map(a=>a.id)});
 }
 return {actors,groups};
}
