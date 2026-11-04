/** R7C: a prepared defender needs real crouched protection *and* a
 * plausible firing lane through an authored threshold.
 * Scoring never makes an inaccessible position physically legal.
 */
import type {Site,Room} from '../breach-site.ts';
import type {Pt} from '../breach-core.ts';
import {roomThreatPoints,assessBallisticPosition} from './room-cover-audit.ts';

const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function preparedDefenderValue(site:Site,room:Room,p:Pt):number{
 const sources=roomThreatPoints(site,room);
 if(!sources.length)return 0;
 const cover=assessBallisticPosition(site,room,p,site.cover,sources);
 if(!cover.attackAngles)return -30;
 const protection=cover.crouchedBlocked/cover.attackAngles;
 const standing=cover.standingBlocked/cover.attackAngles;
 const firing=cover.firingAngles/cover.attackAngles;
 // Do not select an apparently "safe" hidden corner without a muzzle lane.
 return Math.round(protection*32+standing*8+firing*14-
  (cover.firingAngles===0?24:0));
}
export function preparedWatchHeading(site:Site,room:Room,p:Pt,
 original:number):number{
 const portals=roomThreatPoints(site,room);
 if(!portals.length)return original;
 const nearest=portals.slice().sort((a,b)=>distance(a,p)-distance(b,p))[0];
 return Math.atan2(nearest.y-p.y,nearest.x-p.x);
}
/** Stable sort (the caller's seeded order is the tie-breaker); only 22
 * candidate positions need 2.5D LOS scoring. The remaining legal positions
 * remain fallback options rather than reducing architectural capacity.
 */
export function rankPreparedPositions(site:Site,room:Room,
 positions:readonly Pt[]):Pt[]{
 const ranked=positions.slice(0,22).map((p,i)=>({
  p,position:i,score:preparedDefenderValue(site,room,p)
 })).sort((a,b)=>b.score-a.score||a.position-b.position);
 return [...ranked.map(x=>x.p),...positions.slice(22)];
}
