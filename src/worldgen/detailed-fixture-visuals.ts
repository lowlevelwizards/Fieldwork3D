/** Lightweight, recognizable geometry for the former generic cubes.
 * Authoritative in both missions and the asset showroom. The scene owns
 * reusable box geometry; each feature is a handful of flat-shaded primitives.
 */
import * as THREE from 'three';
import type {Obstacle} from '../breach-core.ts';
import type {FixtureVisualContext} from './fixture-visuals.ts';
import {propDefinition} from './asset-catalog.ts';
import {fixtureComponentSurface} from './pixel-surface-selection.ts';
export const DETAILED_FIXTURE_IDS=new Set([
 'nightstand','side-table','rug','lamp','shower','office-chair',
 'trash-bag','recycling-bin','tipped-trash-bin','mop-bucket',
 'step-ladder','fire-extinguisher','supply-cart','storage-tote',
 'ice-machine','chest-freezer','upright-freezer','refrigerated-display','dish-rack','utility-sink','tool-rack','linen-cart',
 'computer','printer','cash-register','display-rack','product-box',
 'crate','box','pallet','compressor','cable-reel','planter','picnic-table',
 'patio-chair','grill','shed','dumpster','shipping-container','books',
 'papers','mug','tools','trash','packages','picture-frame',
 'prep-table','commercial-range','dish-station','handwash-station',
 'instrument-cart','retail-endcap','packing-station','parts-bin',
]);
export function renderDetailedFixture(group:THREE.Group,c:Obstacle,
 fixture:string,ctx:FixtureVisualContext,wood:THREE.Material,
 steel:THREE.Material,olive:THREE.Material,metal:THREE.Material):boolean{
 if(!DETAILED_FIXTURE_IDS.has(fixture))return false;
 const w=c.w,d=c.h,H=propDefinition(fixture)?.height??20;
 const b=(x:number,y:number,z:number,bw:number,bh:number,bd:number,
    mat:THREE.Material,cast=true)=>
   ctx.box(group,c.x+x,y,c.y+z,Math.max(.4,bw),Math.max(.3,bh),
     Math.max(.4,bd),mat,cast);
 const ink=ctx.solid(0x363f40,.9,'rubber'),light=ctx.solid(0xc5bca4,.92,'metal'),
   paper=ctx.solid(0xb9b09a,.97,'paper'),red=ctx.solid(0xa77762,.87,'metal'),
   green=ctx.solid(0x536e55,.9,'foliage'),glass=ctx.solid(0x64848a,.36);
 const legs=(top:number,spanW=w*.78,spanD=d*.75)=>{
   for(const sx of [-1,1])for(const sz of [-1,1])
    b(sx*spanW*.5,top*.5,sz*spanD*.5,2.6,top,2.6,steel);
 };
 switch(fixture){
 case 'prep-table':case 'packing-station':{
   const sanitary=fixture==='prep-table';
   const top=sanitary?light:wood;
   b(0,H-1.4,0,w,2.8,d,top);
   legs(H-2.8,w*.85,d*.73);
   b(0,H*.44,0,w*.82,2,d*.76,steel,false);
   if(sanitary){
    b(0,H+1.8,-d*.46,w*.95,3.2,2.2,light,false);
    for(const sign of [-1,1])b(sign*w*.26,H+.9,0,w*.20,1.6,d*.28,olive,false);
   }else{
    for(const sign of [-1,1])b(sign*w*.25,H+1.1,0,w*.28,2.2,d*.36,paper,false);
    b(-w*.39,H*.52,d*.36,3,H*.69,3,ink);
   }
   return true;
 }
 case 'commercial-range':{
   b(0,H*.48,0,w*.98,H*.91,d*.96,steel);
   b(0,H*.93,0,w,2.8,d,ink,false);
   for(const sx of [-.25,.25])for(const sz of [-.22,.22]){
    b(sx*w,H+1.0,sz*d,w*.24,.9,d*.22,ink,false);
    b(sx*w,H+1.7,sz*d,w*.11,.65,d*.09,light,false);
   }
   b(0,H*.49,d*.49,w*.69,H*.46,1.5,ink,false);
   b(0,H*.31,d*.53,w*.46,2,1.5,light,false);
   for(let n=-1;n<=1;n++)b(n*w*.22,H*.82,d*.50,3,3,2,red,false);
   b(0,H+7,-d*.47,w,13,2.4,light);
   return true;
 }
 case 'dish-station':case 'handwash-station':{
   const clinical=fixture==='handwash-station';
   b(0,H*.45,0,w*.94,H*.72,d*.86,clinical?light:steel);
   b(0,H*.83,-d*.39,w*.98,H*.29,2.4,light);
   b(0,H*.85,d*.06,w*.77,2.2,d*.68,steel,false);
   b(0,H*.88,d*.06,w*.57,1.3,d*.50,ink,false);
   for(const sx of [-.30,.30])b(sx*w,H+1.8,-d*.17,2.8,6,2.8,metal,false);
   b(0,H+3.8,-d*.15,w*.46,2.5,2.1,steel,false);
   if(clinical){
    b(-w*.34,H*.61,d*.45,w*.15,7,1.8,olive,false);
    b(w*.31,H*.61,d*.45,w*.17,7,1.8,red,false);
   }else b(0,H*.36,d*.45,w*.78,H*.30,1.2,ink,false);
   return true;
 }
 case 'instrument-cart':{
   for(const y of [H*.29,H*.58,H*.87]){
    b(0,y,0,w*.89,2,d*.84,light);
    for(const sx of [-1,1])b(sx*w*.42,y+2,0,1.8,4,d*.80,steel,false);
   }
   for(const sx of [-1,1])for(const sz of [-1,1]){
    b(sx*w*.39,H*.45,sz*d*.36,2,H*.85,2,steel);
    b(sx*w*.39,2,sz*d*.36,3.5,4,3.5,ink);
   }
   b(w*.39,H*.91,0,2,6,d*.75,steel);
   b(0,H*.93,0,w*.62,1.6,d*.59,olive,false);
   return true;
 }
 case 'retail-endcap':case 'parts-bin':{
   const parts=fixture==='parts-bin';
   b(0,H*.49,-d*.38,w*.92,H*.95,3,steel);
   for(const y of [H*.20,H*.43,H*.66,H*.89]){
    b(0,y,0,w*.94,2.6,d*.89,steel);
    for(const sx of [-.30,0,.30]){
     b(sx*w,y+4,d*.08,w*.25,8,d*.55,
       parts?(Math.abs(sx)<.01?red:olive):(Math.abs(sx)<.01?paper:wood));
     b(sx*w,y+4,d*.37,w*.22,1.3,1,ink,false);
    }
   }
   for(const sx of [-1,1])b(sx*w*.48,H*.51,0,2,H*.95,2,metal);
   return true;
 }
 case 'nightstand':case 'side-table':{
   const drawer=fixture==='nightstand';
   const y=H-1.2;b(0,y,0,w,2.4,d,wood);
   legs(drawer?H*.69:H-2.4);
   if(drawer){
    b(0,H*.70,d*.42,w*.78,H*.28,2,steel,false);
    b(0,H*.70,d*.48,3,2,1,light,false);
    b(0,3,0,w*.80,3,d*.78,wood);
   }
   return true;
 }
 case 'rug':{
   b(0,.19,0,w,.38,d,red,false);
   b(0,.42,0,w*.90,.1,d*.85,olive,false);
   for(const sx of [-1,1])b(sx*w*.46,.35,0,1,.2,d*.80,light,false);
   return true;
 }
 case 'lamp':{
   b(0,.9,0,w*.48,1.8,d*.48,steel);
   b(0,H*.42,0,2.1,H*.78,2.1,metal);
   b(0,H*.83,0,w*.86,H*.27,d*.86,paper,false);
   b(0,H-.6,0,w*.76,1.2,d*.76,wood,false);
   return true;
 }
 case 'shower':{
   // Rear plumbing wall, two structural returns, and an open-front entry.
   // Fixture does not rely on unattached floating pipes.
   b(0,1.25,0,w,2.5,d,light);
   b(0,2.65,0,w*.84,.65,d*.82,steel,false); // low tray recess
   b(0,2.9,d*.12,2,.75,d*.12,ink,false); // drain
   b(0,H*.50,-d*.46,w*.94,H*.90,2.0,light);
   for(const sign of [-1,1]){
     b(sign*w*.45,H*.49,0,1.8,H*.94,1.8,steel);
     b(sign*w*.44,H*.50,-d*.10,1.2,H*.83,d*.68,glass,false);
     b(sign*w*.44,H*.96,0,2.1,1.5,d*.91,steel,false);
   }
   // Properly mounted mixer, vertical riser and connected overhead head.
   b(-w*.18,H*.43,-d*.413,w*.23,3,1.4,steel,false);
   b(-w*.18,H*.43,-d*.32,2.7,1.5,1.7,metal,false);
   b(-w*.18,H*.69,-d*.42,1.9,H*.44,2.0,metal,false);
   b(-w*.18,H*.89,-d*.34,2,1.9,d*.18,metal,false);
   b(-w*.18,H*.88,-d*.20,5.2,1.5,d*.15,steel,false);
   // No across-the-front glass panel: the shower remains usable.
   return true;
 }
 case 'office-chair':{
   // Upholstery is carried by a connected height-adjustable column.
   const upholstery=ctx.solid(0x677f77,.94,'fabric');
   const underside=ctx.solid(0x38433f,.85,'plastic');
   b(0,H*.47,0,w*.84,3.3,d*.77,upholstery);
   b(0,H*.40,0,w*.65,1.7,d*.62,underside);
   const back=b(0,H*.73,-d*.36,w*.79,H*.47,3.4,upholstery);
   back.rotation.x=-.10;
   b(0,H*.89,-d*.39,w*.70,1.5,3.8,steel,false);
   b(0,H*.27,0,2.5,H*.30,2.5,metal); // central lift
   b(0,3.4,0,3.8,4.4,3.8,steel);
   // Five-spoke star, one caster at the tip of each spoke.
   for(let n=0;n<5;n++){
     const angle=n*Math.PI*2/5;
     const x=Math.cos(angle)*w*.29,z=Math.sin(angle)*d*.29;
     const foot=b(x,2.7,z,w*.44,1.8,2.7,underside);
     foot.rotation.y=-angle;
     b(x*1.55,1.45,z*1.55,2.7,2.7,2.7,ink);
   }
   for(const sign of [-1,1]){
     // A full L-shaped arm: rear anchor, upright, and horizontal arm pad.
     const x=sign*w*.37;
     b(x,H*.58,-d*.20,2.2,H*.25,2.2,steel);
     b(x,H*.66,d*.04,3.0,2.3,d*.57,underside);
     b(x,H*.69,d*.05,3.8,1.1,d*.51,upholstery,false);
   }
   return true;
 }
 case 'computer':{
   b(0,1,0,w*.71,2,d*.63,ink);
   b(0,H*.58,-d*.19,w*.83,H*.70,2.2,steel);
   b(0,H*.60,-d*.10,w*.71,H*.58,.8,glass,false);
   b(0,3,d*.29,w*.68,1.3,d*.22,light,false);
   b(0,2.8,d*.37,w*.57,.45,d*.12,ink,false); // keyboard key bed
   b(w*.39,H*.54,-d*.19,1.4,H*.34,1.6,steel,false); // monitor support
   b(0,2.0,-d*.10,2.3,5,2.3,steel);
   return true;
 }
 case 'printer':{
   b(0,H*.48,0,w*.96,H*.72,d*.92,steel);
   b(0,H*.88,-d*.22,w*.79,2,d*.32,ink,false);
   b(0,H*.62,d*.48,w*.80,2.2,4,ink,false);
   b(0,H*.62,d*.57,w*.62,.4,4,paper,false);
   b(w*.34,H*.86,d*.20,2,1.2,1,green,false);
   for(const x of [-.23,0,.23])
     b(x*w,H*.76,-d*.32,w*.16,1.1,d*.16,ink,false); // paper feed guides
   return true;
 }
 case 'cash-register':{
   b(0,H*.22,0,w,H*.44,d,steel);
   b(0,H*.55,-d*.18,w*.82,H*.34,d*.52,ink);
   b(0,H*.78,-d*.22,w*.63,1.3,d*.37,glass,false);
   b(0,H*.30,d*.49,w*.71,2,1.8,wood,false);
   b(w*.29,H*.52,d*.38,2,1.5,2,light,false);
   for(const x of [-.24,-.07,.10])
     b(x*w,H*.59,d*.20,w*.10,1.1,d*.08,light,false); // physical keypad rows
   return true;
 }
 case 'display-rack':{
   for(const sx of [-1,1])b(sx*w*.45,H*.5,0,2.8,H,d*.8,steel);
   for(const y of [3,H*.34,H*.63,H*.91]){
    b(0,y,0,w,2,d,wood);
    if(y>4)for(const sx of [-.30,0,.30])
      b(sx*w,y+3,0,w*.18,5,d*.33,y>H*.6?red:olive,false);
   }
   b(0,H*.92,d*.40,w,3,2,metal);
   return true;
 }
 case 'product-box':case 'box':case 'packages':case 'crate':{
   const crate=fixture==='crate',bundle=fixture==='packages';
   const base=crate?wood:bundle?paper:olive;
   b(0,H*.48,0,w*.96,H*.93,d*.96,base);
   b(0,H*.96,0,w,.9,d,steel,false);
   if(crate){
    for(const sz of [-1,1])for(const sx of [-.32,.32])
      b(sx*w,H*.51,sz*d*.51,w*.22,H*.72,1.4,wood,false);
    for(const sx of [-1,1])
      b(sx*w*.48,H*.51,0,1.6,H*.72,d*.8,steel,false);
   }else{
    b(0,H*.97,0,w*.14,.7,d,light,false);
    b(0,H*.57,d*.5,w*.47,H*.28,.7,paper,false);
    if(bundle)b(w*.22,H*.32,d*.51,w*.13,H*.35,.9,red,false);
   }
   return true;
 }
 case 'pallet':{
   for(const sx of [-.37,0,.37])b(sx*w,2.2,0,w*.15,4.2,d*.93,steel);
   for(const sz of [-.35,0,.35])b(0,H-.9,sz*d,w*.93,1.8,d*.20,wood);
   for(const sx of [-.44,.44])b(sx*w,H*.52,0,3,2,d*.95,wood);
   return true;
 }
 case 'compressor':{
   const tank=new THREE.Mesh(
     new THREE.CylinderGeometry(d*.36,d*.36,w*.70,10),steel);
   tank.rotation.z=Math.PI/2;tank.position.set(c.x,H*.42,c.y);
   tank.castShadow=true;group.add(tank);
   b(0,H*.70,0,w*.33,H*.35,d*.44,ink);
   b(-w*.28,H*.20,-d*.31,4,H*.35,4,metal);
   b(w*.28,H*.20,-d*.31,4,H*.35,4,metal);
   b(0,H*.38,d*.41,w*.68,1.6,2,light,false);
   return true;
 }
 case 'cable-reel':{
   const spool=ctx.solid(0x826b51,.91,'wood');
   const radius=d*.45;
   for(const sx of [-1,1]){
    const disc=new THREE.Mesh(new THREE.CylinderGeometry(
      radius,radius,2.5,10),spool);
    disc.rotation.z=Math.PI/2;
    disc.position.set(c.x+sx*w*.40,radius,c.y);
    disc.castShadow=true;group.add(disc);
   }
   const cable=new THREE.Mesh(new THREE.CylinderGeometry(
      radius*.62,radius*.62,w*.74,10),ink);
   cable.rotation.z=Math.PI/2;
   cable.position.set(c.x,radius,c.y);cable.castShadow=true;group.add(cable);
   b(0,radius,0,w*.9,2.2,2,steel,false);
   return true;
 }
 case 'planter':{
   b(0,H*.20,0,w*.75,H*.40,d*.75,red);
   b(0,H*.41,0,w*.87,2,d*.87,wood);
   b(0,H*.62,0,w*.46,H*.35,d*.46,green);
   for(const sx of [-.25,.25])
     b(sx*w,H*.81,sx*d,w*.35,H*.33,d*.32,green);
   return true;
 }
 case 'picnic-table':{
   b(0,H-1.6,0,w*.74,3.2,d*.48,wood);
   for(const sz of [-1,1]){
    b(0,H*.49,sz*d*.36,w*.92,3,d*.19,wood);
    b(-w*.28,H*.35,sz*d*.22,3,H*.68,3,steel);
    b(w*.28,H*.35,sz*d*.22,3,H*.68,3,steel);
   }
   return true;
 }
 case 'patio-chair':{
   b(0,H*.40,0,w*.78,3,d*.76,olive);
   b(0,H*.72,-d*.37,w*.78,H*.55,2.6,olive);
   legs(H*.40,w*.60,d*.64);
   for(const sx of [-1,1])b(sx*w*.43,H*.53,0,2.0,2,d*.70,metal);
   return true;
 }
 case 'grill':{
   b(0,H*.70,0,w*.81,H*.36,d*.78,ink);
   b(0,H*.94,0,w*.85,H*.12,d*.83,steel);
   b(0,H*.55,d*.36,w*.63,2,1.3,metal,false);
   for(const sx of [-1,1])b(sx*w*.28,H*.32,0,2.6,H*.56,2.6,steel);
   b(0,H*.96,-d*.22,w*.27,1.2,1.3,wood,false);
   return true;
 }
 case 'shed':{
   b(0,H*.39,0,w*.97,H*.75,d*.94,wood);
   for(const sz of [-1,1]){
    const roof=b(0,H*.84,sz*d*.25,w*1.08,3,d*.63,steel);
    roof.rotation.x=sz*.36;
   }
   b(0,H*.34,d*.49,w*.30,H*.61,1.1,ink,false);
   b(w*.105,H*.34,d*.52,2,2,1.3,light,false);
   for(const sx of [-.36,.36])
    b(sx*w,H*.46,d*.49,w*.11,H*.26,1.1,glass,false);
   return true;
 }
 case 'dumpster':{
   const painted=ctx.solid(0x587267,.84,fixtureComponentSurface('dumpster','body'));
   const lid=ctx.solid(0x303b38,.92,fixtureComponentSurface('dumpster','lid'));
   b(0,H*.43,0,w*.96,H*.78,d*.94,painted);
   b(0,H*.85,-d*.25,w*.98,3,d*.51,lid);
   b(0,H*.88,d*.25,w*.98,3,d*.46,lid);
   for(const sx of [-1,1]){
    b(sx*w*.48,H*.46,0,2.4,H*.75,d,steel);
    b(sx*w*.35,2,0,4,4,4,ink);
   }
   b(0,H*.40,d*.49,w*.72,1.6,1,light,false);
   return true;
 }
 case 'shipping-container':{
   const shippingPaint=ctx.solid(0xa77762,.89,fixtureComponentSurface('shipping-container','body'));
   b(0,H*.5,0,w,H,d*.95,shippingPaint);
   for(const sx of [-1,1])
    b(sx*w*.495,H*.50,0,2.5,H,d,metal);
   for(const sz of [-1,1]){
    for(let n=-7;n<=7;n++)
     b(n*w/16,H*.50,sz*d*.49,2.3,H*.82,1.3,steel,false);
   }
   for(const sx of [-.25,.25]){
    b(w*.50,H*.50,sx*d,1.5,H*.90,2,ink,false);
    b(w*.51,H*.45,sx*d,2.5,H*.65,1,metal,false);
   }
   b(0,H*.97,0,w,2.6,d,steel);
   return true;
 }
 case 'trash-bag':{
   // Bulged asymmetric body and gathered knot distinguish it from a crate.
   b(0,H*.35,0,w*.84,H*.65,d*.91,ink);
   b(w*.10,H*.68,-d*.1,w*.67,H*.33,d*.72,ink);
   b(0,H*.90,0,w*.24,H*.19,d*.24,ink);
   b(w*.13,H*.99,0,w*.12,H*.13,d*.12,light,false);
   return true;
 }
 case 'recycling-bin':{
   b(0,H*.48,0,w*.86,H*.91,d*.88,green);
   b(0,H*.96,-d*.04,w,2.2,d,ink);
   b(0,H*.55,d*.45,w*.38,H*.31,.9,light,false);
   b(0,H*.57,d*.51,w*.16,H*.14,.6,green,false);
   return true;
 }
 case 'tipped-trash-bin':{
   b(0,H*.52,0,w*.92,H*.75,d*.82,steel);
   b(0,H*.53,d*.42,w,2.3,3,ink);
   b(-w*.24,H*.81,-d*.13,w*.27,3,d*.34,ink,false);
   for(const sx of [-.24,.16])b(sx*w,2,d*.46,w*.21,2.2,d*.23,paper,false);
   return true;
 }
 case 'mop-bucket':{
   b(0,H*.39,0,w*.8,H*.61,d*.78,red);
   b(0,H*.74,0,w*.9,2.2,d*.85,steel,false);
   for(const sign of [-1,1])
    b(sign*w*.32,2.2,d*.33,4.5,4.3,4.5,ink);
   b(-w*.24,H+9,-d*.14,1.7,25,1.7,wood);
   b(-w*.24,H+21,-d*.14,6,1.7,2.5,light,false);
   return true;
 }
 case 'step-ladder':{
   // Two folding frames and three steps; silhouette remains unmistakable.
   for(const sx of [-1,1]){
    b(sx*w*.37,H*.47,-d*.22,2.8,H*.91,3,steel);
    b(sx*w*.37,H*.45,d*.28,2.8,H*.87,3,steel);
   }
   for(const level of [.24,.44,.64])
    b(0,H*level,-d*.16,w*.72,2.4,d*.44,light,false);
   b(0,H*.94,0,w*.84,2.7,d*.45,olive,false);
   return true;
 }
 case 'fire-extinguisher':{
   b(0,H*.45,0,w*.65,H*.79,d*.65,red);
   b(0,H*.85,0,w*.48,2,d*.55,ink,false);
   b(0,H*.96,0,w*.25,H*.15,d*.22,steel,false);
   b(w*.35,H*.91,0,w*.47,1.3,1.5,ink,false);
   b(0,H*.48,d*.36,w*.49,H*.29,.6,light,false);
   return true;
 }
 case 'supply-cart':{
   for(const level of [H*.18,H*.53,H*.83])
    b(0,level,0,w*.95,2.4,d*.92,light,false);
   for(const sx of [-1,1])for(const sz of [-1,1]){
    b(sx*w*.43,H*.49,sz*d*.40,2.4,H*.85,2.4,steel);
    b(sx*w*.43,2,sz*d*.40,4,4,4,ink);
   }
   b(0,H*.99,-d*.42,w*.83,2.5,2,metal,false);
   b(-w*.21,H*.66,0,w*.33,3,d*.52,olive,false);
   return true;
 }
 case 'storage-tote':{
   b(0,H*.47,0,w*.9,H*.78,d*.92,olive);
   b(0,H*.86,0,w,2.1,d,steel,false);
   b(0,H*.97,0,w*.93,1.7,d*.95,light,false);
   for(const sx of [-1,1])
    b(sx*w*.49,H*.60,0,1.6,H*.18,d*.32,ink,false);
   return true;
 }
 case 'ice-machine':{
  b(0,H*.47,0,w*.96,H*.91,d*.94,light);
  b(0,H*.73,d*.49,w*.74,H*.3,1.4,steel,false);
  b(0,H*.78,d*.56,w*.6,H*.14,.8,ink,false);
  b(0,H*.48,d*.57,w*.5,3,1.2,metal,false);
  b(0,H*.98,0,w,2.5,d,metal,false);
  return true;
 }
 case 'chest-freezer':{
  b(0,H*.44,0,w,H*.84,d,light);
  b(0,H*.9,0,w+1,3,d+1,steel,false);
  b(0,H*.96,-d*.13,w*.96,2,d*.66,light,false);
  b(0,H*.74,d*.51,w*.45,2,1.4,ink,false);
  for(const sx of [-.38,.38])b(sx*w,2,-d*.35,3.5,4,3.5,ink);
  return true;
 }
 case 'upright-freezer':{
  b(0,H*.5,0,w,H,d,steel);
  b(0,H*.48,d*.505,w*.9,H*.91,1.1,light,false);
  b(w*.38,H*.5,d*.56,2,H*.36,1.3,ink,false);
  b(0,H*.84,d*.56,w*.63,2,1.3,olive,false);
  b(0,1.5,0,w,3,d,ink,false);
  return true;
 }
 case 'refrigerated-display':{
  const pane=ctx.solid(0x82a0aa,.38);
  b(0,H*.5,0,w,H,d,steel);
  b(0,H*.49,d*.51,w*.86,H*.83,1.2,pane,false);
  for(const level of [.28,.53,.77]){
   b(0,H*level,d*.4,w*.77,2,d*.75,light,false);
   for(const sx of [-.32,0,.32])b(sx*w,H*level+3,d*.29,w*.15,5,d*.22,red,false);
  }
  b(w*.45,H*.5,d*.57,2,H*.61,1.4,ink,false);
  return true;
 }
 case 'dish-rack':{
  b(0,H*.21,0,w*.9,3,d*.86,steel);
  for(const sx of [-1,1])for(const sz of [-1,1])
   b(sx*w*.43,H*.47,sz*d*.42,2,H*.9,2,steel);
  for(let n=-3;n<=3;n++)b(n*w*.11,H*.58,0,1.3,H*.44,d*.72,light,false);
  b(0,H*.89,0,w*.93,2,d*.88,metal,false);
  return true;
 }
 case 'utility-sink':{
  b(0,H*.72,0,w*.93,H*.4,d*.88,light);
  b(0,H*.92,0,w*.83,1.3,d*.74,steel,false);
  b(0,H*.94,0,w*.59,.9,d*.54,ink,false);
  for(const sx of [-1,1])b(sx*w*.36,H*.27,0,2.7,H*.52,2.7,steel);
  b(0,H+5,-d*.34,2.2,10,2.4,metal,false);
  b(0,H+10,-d*.28,10,1.5,2.4,metal,false);
  return true;
 }
 case 'tool-rack':{
  b(0,H*.5,-d*.4,w,H,3.2,steel);
  for(const level of [.18,.47,.8])b(0,H*level,0,w*.96,2.7,d*.93,metal,false);
  for(let n=-3;n<=3;n++)b(n*w*.12,H*.65,d*.47,1.4,H*.28,1.7,ink,false);
  for(const sx of [-.3,.25])b(sx*w,H*.25,d*.19,w*.2,H*.18,d*.46,red,false);
  return true;
 }
 case 'linen-cart':{
  b(0,H*.28,0,w*.9,H*.49,d*.86,steel);
  b(0,H*.55,0,w*.94,2.2,d*.9,metal,false);
  for(const sx of [-1,1])for(const sz of [-1,1]){
   b(sx*w*.43,H*.39,sz*d*.39,2.2,H*.75,2.2,steel);
   b(sx*w*.43,2,sz*d*.39,4.5,4,4.5,ink,false);
  }
  for(const sx of [-.25,.25])b(sx*w,H*.65,-d*.06,w*.35,7,d*.57,light,false);
  b(w*.45,H*.74,0,3.5,3.5,d*.84,metal,false);
  return true;
 }
 case 'books':{
   for(const [n,color] of [wood,red,green].entries())
    b((n-1)*w*.27,3.1+n*.45,0,w*.23,6+n*.9,d*.88,color);
   return true;
 }
 case 'papers':{
   for(let n=0;n<4;n++)
    b((n-1.5)*.48,.26+n*.12,(n%2)*.36,w*.86,.15,d*.85,paper,false);
   return true;
 }
 case 'mug':{
   const cup=new THREE.Mesh(new THREE.CylinderGeometry(
     w*.36,w*.30,H*.80,9),light);
   cup.position.set(c.x,H*.42,c.y);cup.castShadow=true;group.add(cup);
   const handle=new THREE.Mesh(new THREE.TorusGeometry(
     w*.20,.58,5,9,Math.PI*1.7),steel);
   handle.position.set(c.x+w*.40,H*.51,c.y);group.add(handle);
   return true;
 }
 case 'tools':{
   for(const dx of [-.27,0,.27]){
    b(dx*w,1.2,0,1.4,2.4,d*.78,wood);
    b(dx*w,3.2,-d*.20,w*.19,1.5,3.1,metal);
   }
   return true;
 }
 case 'trash':{
   b(0,H*.49,0,w*.82,H*.90,d*.82,steel);
   b(0,H*.96,0,w,1.6,d,ink);
   for(const dx of [-.22,.18])b(dx*w,H*.94,0,w*.30,1,d*.37,paper,false);
   return true;
 }
 case 'picture-frame':{
   b(0,H*.50,0,w,H,d*.80,wood);
   b(0,H*.50,d*.44,w*.81,H*.83,.5,red,false);
   b(-w*.16,H*.61,d*.48,w*.22,H*.24,.3,light,false);
   b(w*.22,H*.37,d*.48,w*.28,H*.32,.3,olive,false);
   return true;
 }
 default:return false;
 }
}
