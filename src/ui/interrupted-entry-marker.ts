/** D3.30G: selected operator's historically witnessed entry location.
 * Never derives current lock/open/visibility from the physical door state.
 * This is read-only, display-only information; the regular door interaction
 * palette remains the sole way to author a physical OPEN/KICK/tool order.
 */
import {doorCenter,type Pt} from '../breach-core.ts';
import type {Session,TeamActor} from '../breach-game.ts';
export function interruptedEntryPoint(
 s:Pick<Session,'doors'>,actor:Pick<TeamActor,'interruptedDoorPlan'>
):Pt|null{
 const id=actor.interruptedDoorPlan?.doorId;
 if(!id)return null;
 const witnessed=s.doors.find(d=>d.id===id);
 return witnessed?doorCenter(witnessed):null;
}
export function paintInterruptedEntryMarker(
 draw:CanvasRenderingContext2D,at:Pt
):void{
 draw.save();
 draw.strokeStyle='#e6bf89';draw.fillStyle='#e6bf89';
 draw.lineWidth=2.2;draw.setLineDash([4,4]);
 draw.beginPath();draw.arc(at.x,at.y,13,0,Math.PI*2);draw.stroke();
 draw.setLineDash([]);
 draw.beginPath();draw.moveTo(at.x-5,at.y);draw.lineTo(at.x+5,at.y);
 draw.moveTo(at.x,at.y-5);draw.lineTo(at.x,at.y+5);draw.stroke();
 draw.font='700 11px "Saira Condensed",sans-serif';
 draw.textAlign='left';
 draw.fillText('ENTRY INTERRUPTED',at.x+18,at.y-12);
 draw.restore();
}
