/** A3.8-L: actual fixed-tick lock/keyway support hand.
 * This is an anchor, never a second lock, inventory or action timer.
 */
import {doorLeafSegment,type Door,type Pt} from './breach-core.ts';
import {handlePoint,lockpickReachable} from './breach-door.ts';
import {contactWithinReach,type PhysicalContact}
 from './breach-physical-contact-anchor.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import type {Session,TeamActor} from './breach-game.ts';
const reach=20.2,retain=22.4;
export function lockpickContactCandidate(s:Session,a:TeamActor,d:Door,
 prior:PhysicalContact|null=null):PhysicalContact|null{
 if(a.health<=0||a.surrendered||a.reload>0||a.treatmentActive||
    a.traversal||a.squeeze||a.pace==='run'||!lockpickReachable(a.p,d)||
    d.kind==='shutter'||d.kind==='sliding')return null;
 const handle=handlePoint(d),leaf=doorLeafSegment(d);
 const dx=leaf.b.x-leaf.a.x,dz=leaf.b.y-leaf.a.y;
 const len=Math.hypot(dx,dz);
 if(len<=1e-6)return null;
 let nx=-dz/len,nz=dx/len;
 if((a.p.x-handle.x)*nx+(a.p.y-handle.y)*nz<0){
  nx=-nx;nz=-nz;
 }
 // The wrist reaches the keyway while the feet remain on their actual
 // side of the closed door. Probe stops BEFORE its solid leaf.
 const f={x:Math.cos(a.heading),y:Math.sin(a.heading)};
 const l={x:-f.y,y:f.x};
 const origin={x:a.p.x+f.x*4+l.x*4,
   y:a.posture==='crouch'?13:20,
   z:a.p.y+f.y*4+l.y*4};
 const target:Pt={x:handle.x+nx*1.2,y:handle.y+nz*1.2};
 const physical:PhysicalContact={intent:'tool',limb:'support-hand',
  anchor:{target:'door',id:d.id+':keyway',
   point:{x:handle.x,y:19,z:handle.y},
   normal:{x:nx,y:0,z:nz}},
  startedAt:s.seconds,releasedAt:null};
 const e={from:origin,acquireReach:reach,retainReach:retain,
   lineClear:sessionWorldGeometry(s).isClear(
    {x:origin.x,y:origin.z},target,s.doors)};
 return contactWithinReach(physical,e,!!prior&&
   prior.releasedAt===null&&prior.anchor.id===physical.anchor.id)?
  physical:null;
}
