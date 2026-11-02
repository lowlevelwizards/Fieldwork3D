/** Transient screen-projected responses for user-authored tactical orders.
 * Effects never inspect enemy/hidden world state; callers pass only approved points. */
export type FeedbackPoint={x:number;y:number};
export type FeedbackKind='select'|'node'|'route'|'command'|'error';
/** A prospective command, never confirmed until its game rule validates on release. */
export type TacticalPreviewMode='look'|'pie'|'strafe'|'flash'|'focus'|'suppress'|'drag'|'carry';
export type TacticalOrderPreview={origin:FeedbackPoint;direction:FeedbackPoint;mode:TacticalPreviewMode};
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
    now:number,preview?:TacticalOrderPreview){
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
      if(!Number.isFinite(p.x+p.y+q.x+q.y))return;
      const angle=Math.atan2(q.y-p.y,q.x-p.x);
      const separation=Math.hypot(q.x-p.x,q.y-p.y);
      const radius=Math.min(68,Math.max(22,separation));
      const isAim=preview.mode==='look'||preview.mode==='pie'||preview.mode==='strafe';
      const isArea=preview.mode==='flash'||preview.mode==='suppress';
      const lineColor=preview.mode==='flash'?'#ebc17c':
        preview.mode==='suppress'?'#dfaa87':'#d7d5aa';
      const captions:Record<TacticalPreviewMode,string>={
        look:'LOOK',pie:'PIE · TRACK',strafe:'STRAFE · HOLD',
        flash:'FLASH · TARGET',focus:'FOCUS · TARGET',
        suppress:'SUPPRESS · AREA',drag:'DRAG · DESTINATION',
        carry:'CARRY · DESTINATION'
      };
      g.save();
      g.strokeStyle=lineColor;g.fillStyle=lineColor;g.lineWidth=1.8;
      g.globalAlpha=.82;g.setLineDash([5,5]);g.beginPath();
      g.moveTo(p.x,p.y);
      if(isAim){
        g.lineTo(p.x+Math.cos(angle)*radius,p.y+Math.sin(angle)*radius);
      }else g.lineTo(q.x,q.y);
      g.stroke();g.setLineDash([]);
      if(isAim){
        // Look and strafe show the chosen facing; pie includes a sweep sector.
        const tip={x:p.x+Math.cos(angle)*radius,y:p.y+Math.sin(angle)*radius};
        g.beginPath();g.moveTo(tip.x,tip.y);
        g.lineTo(tip.x-Math.cos(angle-.48)*10,tip.y-Math.sin(angle-.48)*10);
        g.moveTo(tip.x,tip.y);
        g.lineTo(tip.x-Math.cos(angle+.48)*10,tip.y-Math.sin(angle+.48)*10);
        g.stroke();
        if(preview.mode==='pie'){
          g.beginPath();g.arc(p.x,p.y,radius,angle-.42,angle+.42);
          g.stroke();
        }
      }else{
        // A prospective destination, not a guarantee that a throw or shot is valid.
        const areaRadius=preview.mode==='flash'?26:preview.mode==='suppress'?22:11;
        g.globalAlpha=.67;g.beginPath();
        g.arc(q.x,q.y,areaRadius,0,Math.PI*2);g.stroke();
        if(isArea){
          g.globalAlpha=.14;g.beginPath();
          g.arc(q.x,q.y,areaRadius,0,Math.PI*2);g.fill();
        }else{
          g.globalAlpha=.8;g.beginPath();
          g.moveTo(q.x-7,q.y);g.lineTo(q.x+7,q.y);
          g.moveTo(q.x,q.y-7);g.lineTo(q.x,q.y+7);g.stroke();
        }
      }
      // Label is offset so the touch itself does not cover the instruction.
      const label=captions[preview.mode];
      g.globalAlpha=.94;g.font='700 10px "IBM Plex Sans",sans-serif';
      g.textAlign='center';g.textBaseline='middle';
      const labelX=isAim?p.x+Math.cos(angle)*radius:q.x;
      const labelY=(isAim?p.y+Math.sin(angle)*radius:q.y)-34;
      const half=g.measureText(label).width/2+7;
      g.fillStyle='#1c2d29';g.fillRect(labelX-half,labelY-9,half*2,19);
      g.fillStyle=lineColor;g.fillText(label,labelX,labelY);
      g.restore();
    }
  }
}
