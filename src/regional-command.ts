import {spawnCutwoodsActors,stepActor,assignDestination,canSee,
  shootAt,type GroundedActor,type Vector2} from './regional-actors';
import {SITE_CENTER} from './regional-physical.ts';

/**
 * First complete, inspectable faction->platoon->squad->soldier objective
 * chain. The chain owns INTENT only. ActorMotor remains sole authority
 * for physical action on both the player and AI.
 */
export type FactionId='northline'|'commune';
export type FactionGoal={
  faction:FactionId;objective:'secure-crossing'|'hold-compound';
  priority:number;site:{x:number;z:number};status:'active'|'complete'|'failed';
};
export type PlatoonAssignment={faction:FactionId;objective:string;
  squadId:string;location:{x:number;z:number}};
export type SquadAssignment={squadId:string;leaderId:string;
  memberIds:string[];objective:string;
  posts:Record<string,Vector2>};
export type ContactReport={actorId:string;faction:FactionId;
  enemyId:string;x:number;z:number;time:number};
export type OperationState={
  elapsed:number;actors:GroundedActor[];playerId:string;
  goals:FactionGoal[];platoons:PlatoonAssignment[];
  squads:SquadAssignment[];reports:ContactReport[];
  log:string[];result:'active'|'won'|'lost';
  selectedActor:string|null;
};
export function newOperation():OperationState{
  const actors=spawnCutwoodsActors();
  return {elapsed:0,actors,playerId:'player',result:'active',
    selectedActor:'player',reports:[],log:['Northline: Secure the Cutwoods road crossing.'],
    goals:[
      {faction:'northline',objective:'secure-crossing',priority:1,
        site:{...SITE_CENTER},status:'active'},
      {faction:'commune',objective:'hold-compound',priority:1,
        site:{...SITE_CENTER},status:'active'},
    ],
    platoons:[
      {faction:'northline',objective:'secure-crossing',squadId:'n1',
        location:{...SITE_CENTER}},
      {faction:'commune',objective:'hold-compound',squadId:'c1',
        location:{...SITE_CENTER}},
    ],
    squads:[
      {squadId:'n1',leaderId:'north-lead',
        memberIds:['player','north-lead','north-scout'],
        objective:'approach and secure the crossing',
        posts:{
          'north-lead':{x:SITE_CENTER.x+10,z:SITE_CENTER.z+8},
          'north-scout':{x:SITE_CENTER.x-12,z:SITE_CENTER.z+18},
        }},
      {squadId:'c1',leaderId:'commune-sentry',
        memberIds:['commune-sentry'],objective:'defend the rural compound',
        posts:{'commune-sentry':{x:SITE_CENTER.x-15,z:SITE_CENTER.z+5}}},
    ],
  };
}
const dist=(a:Vector2,b:Vector2)=>Math.hypot(a.x-b.x,a.z-b.z);
const factionOf=(a:GroundedActor):FactionId=>
  a.team==='commune'?'commune':'northline';
const hostile=(a:GroundedActor,b:GroundedActor)=>
  factionOf(a)!==factionOf(b);
function event(state:OperationState,message:string):void{
  if(state.log.at(-1)===message)return;
  state.log.push(message);
  if(state.log.length>24)state.log.shift();
}
function nextPost(state:OperationState,actor:GroundedActor):Vector2|null{
  for(const squad of state.squads){
    const post=squad.posts[actor.id];
    if(post)return post;
  }
  return null;
}
export function orderPlayer(state:OperationState,point:Vector2):boolean{
  const player=state.actors.find(a=>a.id===state.playerId)!;
  return player.health>0&&assignDestination(player,point);
}
export function issueSquadOrder(state:OperationState,squadId:string,
  point:Vector2):boolean{
  const squad=state.squads.find(s=>s.squadId===squadId);
  if(!squad)return false;
  let success=false;
  squad.memberIds.forEach((id,i)=>{
    const a=state.actors.find(p=>p.id===id);
    if(!a||a.health<=0||a.team==='player')return;
    success=assignDestination(a,{
      x:point.x+(i%2?1:-1)*2.4,
      z:point.z+Math.floor(i/2)*2.4,
    })||success;
  });
  if(success){squad.objective='move to rally point';event(state,
    'Squad '+squadId+': moving to ordered position.');}
  return success;
}
export function playerFire(state:OperationState):boolean{
  const a=state.actors.find(p=>p.id===state.playerId)!;
  const contacts=state.actors.filter(p=>p.health>0&&hostile(a,p)&&
    canSee(a,p,65)).sort((p,q)=>dist(a,p)-dist(a,q));
  const target=contacts[0];
  if(!target){event(state,'No exposed hostile in weapon range.');return false;}
  const success=shootAt(a,target,65);
  if(success){
    event(state,a.name+' fired on '+target.name+'.');
    if(target.health<=0)event(state,target.name+' disabled.');
  }
  return success;
}
function report(state:OperationState,observer:GroundedActor,
  enemy:GroundedActor):void{
  if(observer.contact?.seenAt &&
    state.elapsed-observer.contact.seenAt<1.3)return;
  observer.contact={x:enemy.x,z:enemy.z,seenAt:state.elapsed};
  state.reports.push({actorId:observer.id,faction:factionOf(observer),
    enemyId:enemy.id,x:enemy.x,z:enemy.z,time:state.elapsed});
  if(state.reports.length>60)state.reports.shift();
  event(state,observer.name+': contact, '+enemy.name+'.');
}
export function stepOperation(state:OperationState,dt:number,
  playerInput:Vector2|null=null):void{
  if(state.result!=='active')return;
  const step=Math.max(0,Math.min(.07,dt));
  state.elapsed+=step;
  const player=state.actors.find(a=>a.id===state.playerId)!;
  for(const actor of state.actors){
    if(actor.health<=0)continue;
    if(actor.id!==player.id){
      const visible=state.actors.filter(other=>other.health>0&&
        hostile(actor,other)&&canSee(actor,other,52))
        .sort((a,b)=>dist(actor,a)-dist(actor,b))[0];
      if(visible){
        report(state,actor,visible);
        actor.task='engage';
        actor.heading=Math.atan2(visible.x-actor.x,visible.z-actor.z);
        if(dist(actor,visible)>20)assignDestination(actor,{
          x:visible.x,z:visible.z});
        else{actor.path=[];actor.destination=null;}
        if(dist(actor,visible)<55&&shootAt(actor,visible,55)){
          event(state,actor.name+' engaged '+visible.name+'.');
          if(visible.health<=0)event(state,visible.name+' down.');
        }
      }else{
        const contact=actor.contact;
        if(contact&&state.elapsed-contact.seenAt<9&&
          (!actor.destination||dist(actor,actor.destination)<2))
          assignDestination(actor,{x:contact.x,z:contact.z});
        if((!contact||state.elapsed-contact.seenAt>9)&&
          !actor.destination){
          const post=nextPost(state,actor);
          if(post&&dist(actor,post)>3)assignDestination(actor,post);
          else actor.task='guard';
        }
      }
    }
    stepActor(actor,step,actor.id===player.id?playerInput:null);
  }
  if(player.health<=0){state.result='lost';event(state,'Operator down.');}
  const enemy=state.actors.filter(a=>a.team==='commune'&&a.health>0);
  const secure=state.actors.some(a=>factionOf(a)==='northline'&&
    a.health>0&&dist(a,SITE_CENTER)<25);
  if(!enemy.length&&secure){
    state.result='won';state.goals[0].status='complete';
    state.goals[1].status='failed';
    event(state,'Cutwoods crossing secured.');
  }
}
