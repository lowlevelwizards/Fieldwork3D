/**
 * A director's first decision: WHO is worth watching?
 * Pure film-time editorial selection; no physical camera positions,
 * no projection grades, no hidden actor coordinates.
 *
 * Head/chest mount choice belongs to the presentation layer. The subject
 * remains the same when the viewer switches mounts or seeks in the film.
 */
import type {DirectorEditorialShot}
  from './breach-replay-director-edit.ts';

export type DirectorCamDecision={
  actorId:string;kind:DirectorEditorialShot['kind'];
  importance:number;reason:string;
  /** Knot timestamp of the last actual cut, not the last bid. */
  startedAt:number;
  cutReason:string;
};
export type DirectorCamTimelineOptions={
  step?:number;minResidence?:number;switchAdvantage?:number;
};

export class ReplayDirectorSubjectTimeline{
  private readonly step:number;
  private readonly minResidence:number;
  private readonly switchAdvantage:number;
  private readonly maxIndex:number;
  private readonly solve:(time:number)=>readonly DirectorEditorialShot[];
  private readonly cache=new Map<number,DirectorCamDecision|null>();
  private solvedTo=-1;
  constructor(duration:number,
    solve:(time:number)=>readonly DirectorEditorialShot[],
    options:DirectorCamTimelineOptions={}){
    this.maxIndex=Math.ceil(Math.max(0,duration)/
      Math.max(.2,options.step??.5));
    this.step=Math.max(.2,options.step??.5);
    this.minResidence=options.minResidence??1.5;
    this.switchAdvantage=options.switchAdvantage??1.6;
    this.solve=solve;
  }
  clear():void{this.cache.clear();this.solvedTo=-1;}
  private choose(index:number,
    previous:DirectorCamDecision|null):DirectorCamDecision|null{
    const now=index*this.step;
    const bids=this.solve(now).filter(shot=>
      !!shot.primaryActorId&&Number.isFinite(shot.subjectImportance));
    if(!bids.length){
      // If a recording temporarily lacks a usable bid, the last camera
      // remains a valid recorded perspective. Never drop Director mode.
      return previous?{...previous,cutReason:'hold:recorded-gap'}:null;
    }
    bids.sort((a,b)=>(b.subjectImportance??0)-
      (a.subjectImportance??0)||b.priority-a.priority||
      a.primaryActorId.localeCompare(b.primaryActorId));
    const best=bids[0];
    const same=previous&&bids.find(b=>
      b.primaryActorId===previous.actorId);
    const current=same??null;
    const currentImportance=current?.subjectImportance??-Infinity;
    const importance=best.subjectImportance??0;
    const urgent=importance>=8.2&&
      currentImportance<7.6&&
      (best.kind==='engage'||best.firstEntry);
    const candidate=previous&&current&&
      (best.primaryActorId===previous.actorId||
       !urgent&&(now-previous.startedAt<this.minResidence||
         importance-currentImportance<this.switchAdvantage))?
      current:best;
    const cut=!!previous&&candidate.primaryActorId!==previous.actorId;
    return {
      actorId:candidate.primaryActorId,
      kind:candidate.kind,
      importance:candidate.subjectImportance??0,
      reason:candidate.subjectReason??candidate.reason,
      startedAt:cut||!previous?now:previous.startedAt,
      cutReason:!previous?'establish:recorded-subject':
        cut?(urgent?'cut:urgent-action':'cut:more-important-operator'):
        'hold:current-subject'
    };
  }
  sample(time:number):DirectorCamDecision|null{
    const t=Number.isFinite(time)?Math.max(0,time):0;
    const target=Math.min(this.maxIndex,Math.floor(t/this.step));
    // Chronological decisions are cached by FILM time, not render time.
    // Scrubbing forwards/backwards produces the same editing result.
    for(let i=this.solvedTo+1;i<=target;i++){
      const prior=i?this.cache.get(i-1)??null:null;
      this.cache.set(i,this.choose(i,prior));this.solvedTo=i;
    }
    return this.cache.get(target)??null;
  }
}
