import type {GroupRole} from './breach-ai-coordination.ts';

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
  role:GroupRole,uncertainty:number
):number{
  const base=role==='investigate'?5.5:role==='watch'?7.5:8;
  const ambiguity=Math.max(0,Math.min(240,uncertainty));
  return Math.min(11.5,Math.max(5,base+ambiguity*.017));
}

export function renewCoordinationUntil(
  now:number,existing:number,role:GroupRole,uncertainty:number
):number{
  return Math.max(existing,now+coordinationLeaseSeconds(role,uncertainty));
}
