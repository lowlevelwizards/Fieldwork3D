/** R8: the one authority over what the replay camera is photographing.
 * Returns a declarative shot, never a camera position or a renderer action.
 * May use a disclosed future cue to anticipate a FRIENDLY, never a future
 * hostile coordinate. Every caller uses the same story hierarchy.
 */
import type {DirectorActor} from './breach-replay-cinematic-director.ts';
import {type DirectorIntent,
  type DirectorDoorAnchor} from './breach-replay-director-intent.ts';
import type {DirectorFutureCue} from './breach-replay-director-events.ts';
import type {DirectorFilmBeat} from './breach-replay-director-film.ts';
import type {DirectorEntryEvent} from './breach-replay-director-crossings.ts';

export type Point={x:number;y:number};
export type DirectorEditorialKind=
  'establish'|'follow'|'door'|'entry'|'engage'|'settle';
export type DirectorEditorialShot={
  id:string;kind:DirectorEditorialKind;priority:number;
  primaryActorId:string;secondaryActorIds:string[];
  target:Point|null;door:DirectorDoorAnchor|null;
  /** Bounded optional lead point from an already-authored future order. */
  interest:Point|null;
  doorId:string|null;actionDirection:Point;
  required:Point[];optional:Point[];
  /** A true crossing is a cue to evaluate framing, never an automatic cut. */
  firstEntry:boolean;
  reason:string;
};
export type DirectorEditorialEvidence={
  intents:readonly DirectorIntent[];
  beat?:DirectorFilmBeat|null;
  actionPair?:{shooter:Point;target:Point}|null;
  upcoming:DirectorFutureCue|null;
  entry?:DirectorEntryEvent|null
};
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const unit=(v:Point):Point=>{
  const d=Math.hypot(v.x,v.y);
  return d>1e-4?{x:v.x/d,y:v.y/d}:{x:1,y:0};
};
function direction(actor:DirectorActor,intent?:DirectorIntent):Point{
  return unit(intent?.direction??{
    x:Math.cos(actor.heading??0),y:Math.sin(actor.heading??0)});
}
export function selectDirectorEditorialShot(
  _time:number,actors:readonly DirectorActor[],e:DirectorEditorialEvidence
):DirectorEditorialShot|null{
  const friends=actors.filter(a=>a.side==='blue'&&a.health>0&&
    Number.isFinite(a.p.x)&&Number.isFinite(a.p.y));
  if(!friends.length)return null;
  const byId=(id:string|null|undefined)=>friends.find(a=>a.id===id);
  const intent=(id:string)=>e.intents.find(i=>i.actorId===id);
  const doorIntents=e.intents.filter(i=>i.door&&
    i.door.distance<105&&
    ['approach','stack','breach','entry'].includes(i.kind));
  const strongestDoor=doorIntents.slice().sort((a,b)=>{
    const value=(i:DirectorIntent)=>(
      i.kind==='breach'?3:i.kind==='entry'?2.6:
      i.kind==='stack'?2:1)+
      (105-i.door!.distance)/140;
    return value(b)-value(a)||a.actorId.localeCompare(b.actorId);
  })[0];
  let primary:DirectorActor|undefined;
  let kind:DirectorEditorialKind='establish';
  let reason='establish geography',priority=1;
  let door:DirectorDoorAnchor|null=null;
  let doorId:string|null=null,target:Point|null=null;
  let firstEntry=false;
  if(e.beat?.kind==='fight'&&byId(e.beat.actorId)){
    primary=byId(e.beat.actorId);
    kind='engage';priority=6;reason='recorded firefight';
    // The caller must apply historical visibility gating to actionPair.
    // A cue alone is NEVER proof that a future enemy should be shown.
    if(e.actionPair)target=e.beat.actorId===e.beat.shooterId?
      e.actionPair.target:e.actionPair.shooter;
  }else if(e.upcoming?.kind==='contact'&&byId(e.upcoming.actorId)){
    primary=byId(e.upcoming.actorId);
    kind='engage';priority=5;reason='anticipate friendly contact';
  }else if(e.entry&&byId(e.entry.actorId)){
    primary=byId(e.entry.actorId);
    kind='entry';priority=5.5;
    firstEntry=e.entry.first;reason='recorded first doorway crossing';
    doorId=e.entry.doorId;
    door=intent(primary!.id)?.door??null;
  }else if(e.beat?.kind==='door'&&byId(e.beat.actorId)){
    primary=byId(e.beat.actorId);
    kind='door';priority=4.8;reason='recorded door action';
    doorId=e.beat.doorId;
    door=intent(primary!.id)?.door??null;
    target={...e.beat.target};
  }else if(strongestDoor&&byId(strongestDoor.actorId)){
    primary=byId(strongestDoor.actorId);
    kind='door';priority=4.2;reason='planned door approach';
    doorId=strongestDoor.door!.id;
    door=strongestDoor.door;
  }
  if(!primary){
    const movers=friends.filter(a=>{
      const i=intent(a.id);
      return (i?.speed??a.velocity??0)>7||
        (!!i&&i.route.length>1&&
          distance(i.position,i.route.at(-1)!)>17&&
          ['travel','approach'].includes(i.kind));
    });
    if(movers.length){
      primary=movers.slice().sort((a,b)=>{
        const value=(a:DirectorActor)=>(
          intent(a.id)?.speed??a.velocity??0)+
          (intent(a.id)?.route.length??0)*.2;
        return value(b)-value(a)||a.id.localeCompare(b.id);
      })[0];
      kind='follow';priority=2.6;
      reason='meaningful authored movement';
    }else{
      primary=friends.slice().sort((a,b)=>a.id.localeCompare(b.id))[0];
      kind=e.intents.some(i=>i.kind==='overwatch')?
        'settle':'establish';
      reason=kind==='settle'?'holding overwatch':'quiet geography';
    }
  }
  if(!primary)return null;
  const i=intent(primary.id);
  const travel=direction(primary,i);
  const toward=target??door?.mid??(
    kind==='follow'&&i?.route.length?i.route.at(-1):null);
  let actionDirection=toward?unit({
    x:toward.x-primary.p.x,y:toward.y-primary.p.y}):travel;
  if(kind==='settle'&&i?.watchDirection)actionDirection=
    unit(i.watchDirection);
  if(kind==='entry'&&i?.direction)actionDirection=travel;
  let interest:Point|null=null;
  if(kind==='follow'&&i?.watchDirection){
    // An ACTIVE WATCH may lean the framing without changing the action.
    actionDirection=unit({
      x:travel.x*.7+i.watchDirection.x*.3,
      y:travel.y*.7+i.watchDirection.y*.3});
  }else if(kind==='follow'&&i?.plannedAttention){
    const future=i.plannedAttention;
    const proximity=Math.max(.15,Math.min(1,1-future.distance/240));
    if(future.kind==='watch'){
      const amount=.18+.3*proximity;
      actionDirection=unit({
        x:travel.x*(1-amount)+future.direction.x*amount,
        y:travel.y*(1-amount)+future.direction.y*amount
      });
      interest={x:primary.p.x+actionDirection.x*76,
        y:primary.p.y+actionDirection.y*76};
    }else{
      // Future authored door/action locations may lead a travel frame,
      // but cannot introduce future unseen threats as subjects.
      const towardFuture=unit({
        x:future.at.x-primary.p.x,
        y:future.at.y-primary.p.y
      });
      const amount=.15+.2*proximity;
      actionDirection=unit({
        x:travel.x*(1-amount)+towardFuture.x*amount,
        y:travel.y*(1-amount)+towardFuture.y*amount
      });
      const length=Math.min(95,
        Math.max(65,Math.hypot(future.at.x-primary.p.x,
          future.at.y-primary.p.y)));
      interest={x:primary.p.x+actionDirection.x*length,
        y:primary.p.y+actionDirection.y*length};
    }
  }
  // Other actors remain supporting cast; never silently promote their
  // positions to required frame bounds in a fight.
  const secondary=friends.filter(a=>a.id!==primary!.id&&
    distance(a.p,primary!.p)<160)
    .sort((a,b)=>distance(a.p,primary!.p)-
      distance(b.p,primary!.p)||a.id.localeCompare(b.id))
    .filter(a=>kind!=='follow'||(
      distance(a.p,primary!.p)<95&&(
      (intent(a.id)?.speed??a.velocity??0)>7||
      (intent(a.id)?.route.length??0)>1)))
    .slice(0,3);
  const required=[{...primary.p}];
  const mandatory=kind==='engage'?target:
    (kind==='door'||kind==='entry')?(door?.mid??target):null;
  if(mandatory)required.push({...mandatory});
  const optional=secondary.map(a=>({...a.p}));
  if(kind==='follow'&&i&&i.route.length>1){
    const lead=i.route.find(p=>distance(p,primary!.p)>25);
    if(lead)optional.push({...lead});
  }
  const identity=kind==='engage'?
    e.beat?.id??'contact:'+primary.id:
    kind==='door'?'door:'+(doorId??primary.id):
    kind==='entry'?'entry:'+(e.entry?.sequenceId??doorId)+
      ':'+primary.id:
    kind+':'+primary.id;
  return {id:identity,kind,priority,primaryActorId:primary.id,
    secondaryActorIds:secondary.map(a=>a.id),target,door,doorId,
    interest,
    actionDirection,required,optional,firstEntry,reason};
}
