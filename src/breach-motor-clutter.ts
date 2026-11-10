import {sessionWorldGeometry,publishSessionCoverToActiveSite} from './breach-world-context.ts';
/** A true contact shove of loose cover, never a shortcut around a wall. */
import {type Pt} from './breach-core.ts';
import type {TeamActor,Session} from './breach-game.ts';
import {autoShoveLightCover} from './breach-movable-cover.ts';
import type {ActorMotorHooks} from './breach-motor-contract.ts';
export function tryAutoClearClutter(
 s:Session,a:TeamActor,to:Pt,hooks:ActorMotorHooks):boolean{
  if(a.side!=='blue'||s.seconds-a.lastAutoShoveAt<=.38)return false;
  const moved=autoShoveLightCover(s.coverState,a.p,to,sessionWorldGeometry(s).walls,s.doors,
    s.operators.filter(other=>other!==a&&other.health>0).map(other=>other.p));
  if(moved===null)return false;
  a.lastAutoShoveAt=s.seconds;a.velocity=0;
  a.nav=[];a.retryRouteAt=0;a.blockedTime=0;
  s.objectRevision++;
  publishSessionCoverToActiveSite(s);
  const prop=s.coverState[moved],where={x:prop.x,y:prop.y};
  hooks.hear(s,where,prop.toppled?95:40,'furniture');
  if(prop.toppled)hooks.battleEvent(s,'interaction',a,where,
    a.name+' KNOCKED OVER '+(prop.fixture??'CLUTTER').toUpperCase());
  return true;
}
