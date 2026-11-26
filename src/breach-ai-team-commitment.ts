import type {GroupRole} from './breach-ai-coordination.ts';
import type {EncounterDoctrine} from './breach-ai-doctrine.ts';
import type {NpcIdentity} from './breach-ai-identity.ts';

export type CoordinationMember={
  id:string;
  coordinationRole:GroupRole|null;
  coordinationUntil:number;
};

export function stableCoordination(
  members:readonly CoordinationMember[],
  now:number
):Record<string,GroupRole>{
  const active:Record<string,GroupRole>={};
  for(const member of members){
    if(member.coordinationRole&&member.coordinationUntil>now)
      active[member.id]=member.coordinationRole;
  }
  return active;
}

export function coordinationLeaseSeconds(
  role:GroupRole,uncertainty:number,
  doctrine:EncounterDoctrine='irregular',identity?:NpcIdentity
):number{
  const base=role==='investigate'?5.5:role==='watch'?7.5:8;
  const ambiguity=Math.max(0,Math.min(240,uncertainty));
  const discipline=doctrine==='organised'?1.5:
    doctrine==='security'?.75:0;
  const commitment=identity?(identity.discipline+identity.loyalty-1)*1.5:0;
  return Math.min(12.5,Math.max(5,base+ambiguity*.017+discipline+commitment));
}

export function renewCoordinationUntil(
  now:number,existing:number,role:GroupRole,uncertainty:number,
  doctrine:EncounterDoctrine='irregular',identity?:NpcIdentity
):number{
  return Math.max(existing,now+coordinationLeaseSeconds(role,uncertainty,doctrine,identity));
}
