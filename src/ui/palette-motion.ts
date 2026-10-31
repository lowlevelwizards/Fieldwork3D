/** Frame-rate independent critically damped spring for screen-space UI. */
export interface Axis{position:number;velocity:number}
export function springAxis(axis:Axis,target:number,dt:number,omega=18):Axis{
  const t=Math.max(0,Math.min(dt,.05));
  if(t===0)return axis;
  const error=axis.position-target;
  const decay=Math.exp(-omega*t);
  const position=target+(error*(1+omega*t)+axis.velocity*t)*decay;
  const velocity=(axis.velocity*(1-omega*t)-error*omega*omega*t)*decay;
  if(Math.abs(position-target)<.25&&Math.abs(velocity)<1)
    return{position:target,velocity:0};
  return{position,velocity};
}
export class PaletteMotion{
  x:Axis={position:0,velocity:0};
  y:Axis={position:0,velocity:0};
  targetX=0;targetY=0;anchorX=0;anchorY=0;
  active=false;
  set(x:number,y:number,ax:number,ay:number){
    this.targetX=x;this.targetY=y;this.anchorX=ax;this.anchorY=ay;
    if(!this.active){
      this.x={position:x,velocity:0};this.y={position:y,velocity:0};
      this.active=true;
    }
  }
  hide(){this.active=false}
  step(dt:number,reduced=false){
    if(!this.active)return;
    if(reduced){
      this.x={position:this.targetX,velocity:0};
      this.y={position:this.targetY,velocity:0};
    }else{
      this.x=springAxis(this.x,this.targetX,dt);
      this.y=springAxis(this.y,this.targetY,dt);
    }
  }
}
