/** Small recorded-action window for photographic preference ONLY.
 * This never changes the editorial subject, camera cuts or knowledge.
 * Treat a burst as one exchange, not as a new shot request per bullet. */
import type {RecordedShot} from './breach-replay-ballistics.ts';
export type DirectorActionLine={
  start:{x:number;y:number};
  end:{x:number;y:number};
  hit:boolean;shooterId:string;targetId:string|null
};
export function directorRecentAction(
  shots:readonly RecordedShot[],time:number,
  eligible:(shot:RecordedShot)=>boolean,
  limit=6
):DirectorActionLine[]{
  return shots.filter(shot=>
    eligible(shot)&&Number.isFinite(shot.recordedAt)&&
    shot.recordedAt<=time+.001&&time-shot.recordedAt<=.72&&
    Number.isFinite(shot.start.x)&&Number.isFinite(shot.start.y)&&
    Number.isFinite(shot.end.x)&&Number.isFinite(shot.end.y))
    .slice(-limit).map(shot=>({
      start:{...shot.start},end:{...shot.end},
      hit:!!shot.hit,shooterId:shot.shooterId,
      targetId:shot.targetId??null
    }));
}
