/** Reusable, view-only physical action progress rings.
 * Exactly one owned DOM node per active actor. No nodes are allocated by
 * the animation loop after first use, and no gameplay clocks are mutated.
 */
type Point={x:number;y:number};
type RingActor={
  id:string;p:Point;health:number;
  plan:readonly {kind:string;toolMethod?:string;doorId?:string}[];
  actionTimer:number;lastDoorId?:string|null;
  treatmentActive:boolean;treatmentProgress:number;
};
type RingDoor={id:string;style?:string};
export class PhysicalActionRings {
  private readonly rings=new Map<string,HTMLDivElement>();
  private readonly doc:Pick<Document,'createElement'|'body'>;
  constructor(doc:Pick<Document,'createElement'|'body'>=document){
    this.doc=doc;
  }
  get size(){return this.rings.size;}
  update(actors:readonly RingActor[],doors:readonly RingDoor[],
    live:boolean,project:(point:Point)=>Point):void{
    // A new site or roster may have fewer operators. The old nodes must go.
    for(const [id,ring] of this.rings){
      if(actors.some(actor=>actor.id===id))continue;
      ring.remove();this.rings.delete(id);
    }
    for(const actor of actors){
      const order=actor.plan[0];
      const picking=order?.kind==='tool'&&order.toolMethod==='pick'&&
        actor.actionTimer>0&&actor.lastDoorId===order.doorId;
      const treating=actor.treatmentActive&&actor.treatmentProgress>0;
      const show=live&&actor.health>0&&(picking||treating);
      let ring=this.rings.get(actor.id);
      // Ordinary movement needs no DOM allocation at all.
      if(!ring&&!show)continue;
      if(!ring){
        ring=this.doc.createElement('div');
        ring.style.cssText='position:fixed;pointer-events:none;z-index:18;'+
          'width:42px;height:42px;border-radius:50%;'+
          'display:flex;align-items:center;justify-content:center;'+
          'box-shadow:0 0 0 1px rgba(220,202,158,.45);'+
          'font:700 9px Saira Condensed,sans-serif;color:#e8dfc6';
        const label=this.doc.createElement('span');
        label.style.cssText='background:#1d302a;border-radius:50%;'+
          'width:32px;height:32px;display:flex;align-items:center;'+
          'justify-content:center;text-align:center';
        ring.append(label);this.doc.body.append(ring);
        this.rings.set(actor.id,ring);
      }
      // Preserve the low-write DOM update optimization from main (#1133).
      if(ring.hidden===show)ring.hidden=!show;
      const display=show?'flex':'none';
      if(ring.style.display!==display)ring.style.display=display;
      if(!show)continue;
      const reinforced=doors.find(d=>d.id===order?.doorId)?.style==='reinforced';
      const progress=treating?actor.treatmentProgress:
        Math.min(1,actor.actionTimer/(reinforced?8.5:5.5));
      const pct=Math.round(Math.max(0,Math.min(1,progress))*100);
      const point=project(actor.p);
      const left=(point.x-21)+'px',top=(point.y-57)+'px';
      if(ring.style.left!==left)ring.style.left=left;
      if(ring.style.top!==top)ring.style.top=top;
      if(ring.dataset.progressPct!==String(pct)){
        ring.style.background='conic-gradient(#ddc69e '+(pct*3.6)+
          'deg,rgba(65,87,77,.86) 0deg)';
        ring.dataset.progressPct=String(pct);
      }
      const label=ring.firstElementChild;
      const text=(treating?'MED':'PICK')+' '+pct+'%';
      if(label&&label.textContent!==text)label.textContent=text;
    }
  }
  clear():void{
    for(const ring of this.rings.values())ring.remove();
    this.rings.clear();
  }
}
