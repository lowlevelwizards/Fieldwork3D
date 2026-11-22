import {sessionWorldGeometry,publishSessionCoverToActiveSite} from './breach-world-context.ts';
/** A true contact shove of loose cover, never a shortcut around a wall. */
import {type Pt} from './breach-core.ts';
import type {TeamActor,Session} from './breach-game.ts';
import {autoShoveLightCover} from './breach-movable-cover.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {OPERATOR_RADIUS} from './breach-core.ts';
import {retainSweptFollowOnAfterPhysicalShove}
 from './breach-rehearsed-portal-continuation.ts';
import type {ActorMotorHooks} from './breach-motor-contract.ts';
export function tryAutoClearClutter(
 s:Session,a:TeamActor,to:Pt,hooks:ActorMotorHooks):boolean{
  if(a.side!=='blue'||s.seconds-a.lastAutoShoveAt<=.38)return false;
  const moved=autoShoveLightCover(s.coverState,a.p,to,sessionWorldGeometry(s).walls,s.doors,
    s.operators.filter(other=>other!==a&&other.health>0).map(other=>other.p));
  if(moved===null)return false;
  a.lastAutoShoveAt=s.seconds;a.velocity=0;
  s.objectRevision++;
  publishSessionCoverToActiveSite(s);
  // D3.35 P9: a verified real crossed-door prefix may remain useful
  // AFTER this actor's actual physical cover shove. Keep the exact
  // disposable route only while its next <=4u stride is full-body
  // swept clear against the UPDATED world. Every remaining physical
  // tick still collides normally; otherwise preserve old reset.
  const world=sessionWorldGeometry(s);
  const retained=retainSweptFollowOnAfterPhysicalShove(
    a,s.doors,s.seconds,
    (from,to)=>sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,world));
  if(!retained)a.nav=[];
  a.retryRouteAt=0;a.blockedTime=0;
  const prop=s.coverState[moved],where={x:prop.x,y:prop.y};
  hooks.hear(s,where,prop.toppled?95:40,'furniture');
  if(prop.toppled)hooks.battleEvent(s,'interaction',a,where,
    a.name+' KNOCKED OVER '+(prop.fixture??'CLUTTER').toUpperCase());
  return true;
}
