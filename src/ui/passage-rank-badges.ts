/** Q3: shared muted entry-order badges in Floor Plan and projected 3D.
 * No player input, plan mutation, visibility disclosure or motor authority.
 */
import type {Pt} from '../breach-core.ts';
import type {Session} from '../breach-game.ts';
import {thresholdRankMarkers,visiblePassageSchedule}
 from '../breach-passage-visual-ranks.ts';

export function paintPassageRanks(s:Session,
 draw:CanvasRenderingContext2D,project:(p:Pt)=>Pt,
 colorFor:(id:string)=>string,selected:string,replaying=false):void{
 if(replaying||s.phase!=='planning'&&s.phase!=='running')return;
 const schedule=visiblePassageSchedule(s);
 if(!schedule.size)return;
 draw.save();
 draw.textAlign='center';
 draw.textBaseline='middle';
 draw.font='700 11px "Saira Condensed",sans-serif';
 draw.lineWidth=1.05;
 for(const marker of thresholdRankMarkers(s,schedule)){
  const at=project(marker.point);
  if(!Number.isFinite(at.x+at.y))continue;
  draw.globalAlpha=marker.actorId===selected?.82:.47;
  draw.beginPath();draw.arc(at.x,at.y,7.2,0,Math.PI*2);
  draw.fillStyle='#253c37';draw.fill();
  draw.strokeStyle=colorFor(marker.actorId);draw.stroke();
  draw.fillStyle='#e2e5d7';draw.fillText(String(marker.rank+1),at.x,at.y+.3);
 }
 // Do not mirror crossing numbers on every actor: the duplicate mobile
 // labels sit directly on helmets and overlap the editable waypoint dots.

 draw.restore();
}
