/** C6: The authoritative geometry of one architectural window.
 * Both canvas and Three.js presentations must consume this physical
 * aperture, never invent render-only holes or independent collider sizes.
 * This module is pure: no Session, renderer, replay or active-world access.
 */
import type {Pt,Segment,Obstacle} from '../breach-core.ts';
import type {WindowOpening,Site} from '../breach-site.ts';
import {windowVisualHeadHeight} from '../breach-opening-proportions.ts';

export function windowApertureSegment(
  opening:Pick<WindowOpening,'x'|'y'|'width'|'vertical'>
):Segment{
  const half=opening.width/2;
  return opening.vertical?
    {a:{x:opening.x,y:opening.y-half},b:{x:opening.x,y:opening.y+half}}:
    {a:{x:opening.x-half,y:opening.y},b:{x:opening.x+half,y:opening.y}};
}

/** A full-height glass barrier remains physically tall even when the
 * opening has zero sill. Keep the legacy traversal `low` flag unchanged.
 */
export function windowBarrierFootprint(opening:WindowOpening):Obstacle{
  const sill=opening.sillHeight??14;
  return {
    x:opening.x,y:opening.y,
    w:opening.vertical?10:opening.width,
    h:opening.vertical?opening.width:10,
    low:sill<25,
    fixture:opening.sillHeight===0?'glass-barrier':'window-sill',
    topHeight:opening.sillHeight===0?
      opening.headHeight??windowVisualHeadHeight(opening.style):sill
  };
}
const finitePoint=(p:Pt)=>Number.isFinite(p.x)&&Number.isFinite(p.y);
const close=(a:number,b:number,tolerance=.01)=>Math.abs(a-b)<=tolerance;
const isBarrier=(o:Obstacle)=>
  o.fixture==='window-sill'||o.fixture==='glass-barrier';
export function windowBarrierMatches(opening:WindowOpening,cover:Obstacle):boolean{
  // Most cover is furniture, so reject it before materializing a footprint.
  if(!isBarrier(cover))return false;
  const expected=windowBarrierFootprint(opening);
  return cover.fixture===expected.fixture&&
    close(cover.x,expected.x)&&close(cover.y,expected.y)&&
    close(cover.w,expected.w)&&close(cover.h,expected.h)&&
    cover.low===expected.low&&
    close(cover.topHeight??NaN,expected.topHeight??NaN);
}
export type WindowContractFinding={
  kind:'invalid-window'|'duplicate-window'|'missing-barrier'|
    'duplicate-barrier'|'orphan-barrier';
  id:string;detail:string;
};
/** Offline/Map Lab audit only. Real gameplay never runs this in a frame.
 * A structural pane must have exactly ONE matching physical barrier.
 */
export function auditWindowGeometryContract(
  site:Pick<Site,'windows'|'cover'>
):WindowContractFinding[]{
  const issues:WindowContractFinding[]=[],windows=site.windows??[];
  const ids=new Set<string>(),covered=new Set<number>();
  for(const window of windows){
    if(ids.has(window.id))issues.push({
      kind:'duplicate-window',id:window.id,detail:'duplicate opening id'});
    ids.add(window.id);
    const aperture=windowApertureSegment(window);
    const sill=window.sillHeight??14;
    const head=window.headHeight??windowVisualHeadHeight(window.style);
    if(!finitePoint(aperture.a)||!finitePoint(aperture.b)||
      !Number.isFinite(window.width)||window.width<=0||
      !Number.isFinite(sill)||sill<0||!Number.isFinite(head)||head<=sill){
      issues.push({kind:'invalid-window',id:window.id,
        detail:'nonfinite, degenerate or inverted glazing dimensions'});
    }
    const matches:number[]=[];
    site.cover.forEach((o,i)=>{
      if(windowBarrierMatches(window,o)){matches.push(i);covered.add(i);}
    });
    if(!matches.length)issues.push({kind:'missing-barrier',id:window.id,
      detail:'no physical barrier matches the window footprint'});
    if(matches.length>1)issues.push({kind:'duplicate-barrier',id:window.id,
      detail:matches.length+' barriers match the same opening'});
  }
  site.cover.forEach((o,i)=>{
    if(isBarrier(o)&&!covered.has(i))
      issues.push({kind:'orphan-barrier',id:'cover:'+i,
        detail:'window sill/glass collider has no matching aperture'});
  });
  return issues;
}
