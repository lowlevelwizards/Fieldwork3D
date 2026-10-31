/** Transient screen-projected responses for user-authored tactical orders.
 * Effects never inspect enemy/hidden world state; callers pass only approved points. */
export type FeedbackPoint={x:number;y:number};
export type FeedbackKind='select'|'node'|'route'|'command'|'error';
type Effect={kind:FeedbackKind;point:FeedbackPoint;from?:FeedbackPoint;
  text?:string;born:number;duration:number};
export class TacticalFeedback{
  private events:Effect[]=[];
  emit(kind:FeedbackKind,point:FeedbackPoint,text?:string,from?:FeedbackPoint){
    this.events.push({kind,point:{...point},from:from?{...from}:undefined,
      text,born:performance.now(),duration:kind==='route'?490:kind==='error'?430:360});
    if(this.events.length>20)this.events.splice(0,this.events.length-20);
  }
  clear(){this.events.length=0}
  draw(g:CanvasRenderingContext2D,project:(p:FeedbackPoint)=>FeedbackPoint,
    now:number,preview?:{origin:FeedbackPoint;direction:FeedbackPoint;pie:boolean}){
    this.events=this.events.filter(e=>now-e.born<e.duration);
    for(const e of this.events){
      const t=Math.min(1,Math.max(0,(now-e.born)/e.duration));
      const p=project(e.point);
      const fade=Math.pow(1-t,1.4);
      g.save();g.globalAlpha=fade;
      const color=e.kind==='error'?'#d79380':'#d7d0a3';
      g.strokeStyle=color;g.fillStyle=color;
      g.lineWidth=e.kind==='select'?2.3:1.8;
      if(e.kind==='route'&&e.from){
        const a=project(e.from),q=project(e.point);
        g.setLineDash([5,5]);g.lineDashOffset=-45*t;
        g.beginPath();g.moveTo(a.x,a.y);
        g.lineTo(a.x+(q.x-a.x)*Math.min(1,t*2.4),
          a.y+(q.y-a.y)*Math.min(1,t*2.4));g.stroke();
      }
      g.setLineDash([]);
      g.beginPath();g.arc(p.x,p.y,8+24*t,0,Math.PI*2);g.stroke();
      g.beginPath();g.arc(p.x,p.y,3+3*(1-t),0,Math.PI*2);g.fill();
      if(e.text&&t<.72){
        g.font='600 11px "IBM Plex Sans",sans-serif';
        g.textAlign='center';g.fillText(e.text.toUpperCase(),p.x,p.y-26-6*t);
      }
      g.restore();
    }
    if(preview){
      const p=project(preview.origin),q=project(preview.direction);
      const angle=Math.atan2(q.y-p.y,q.x-p.x);
      const radius=Math.min(67,Math.max(22,Math.hypot(q.x-p.x)));
      g.save();g.strokeStyle='#dbcd93';g.lineWidth=1.8;g.globalAlpha=.75;
      g.setLineDash([4,5]);g.beginPath();g.moveTo(p.x,p.y);
      g.lineTo(p.x+Math.cos(angle)*radius,p.y+Math.sin(angle)*radius);g.stroke();
      if(preview.pie){
        g.setLineDash([]);g.beginPath();
        g.arc(p.x,p.y,radius,angle-.42,angle+.42);g.stroke();
      }
      g.restore();
    }
  }
}
