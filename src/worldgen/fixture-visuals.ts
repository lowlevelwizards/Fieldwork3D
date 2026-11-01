/** MAP 04: shared geometry builder for real world fixtures.
 * One model path for game and Asset Lab; the scene retains collision/intel
 * and lifecycle authority. Extracted from breach-3d without shape changes.
 */
import * as THREE from 'three';
import {type Obstacle} from '../breach-core.ts';
import {propDefinition} from './asset-catalog.ts';
import {fixturePixelSurface} from './pixel-surface-selection.ts';
import type {PixelSurface} from '../rendering/pixel-recipes.ts';
import {renderDetailedFixture} from './detailed-fixture-visuals.ts';
import {renderCharacterFixture} from './asset-character-visuals.ts';
export type FixtureVisualContext={
 box:(parent:THREE.Object3D,x:number,y:number,z:number,
   w:number,h:number,d:number,material:THREE.Material,cast?:boolean)=>THREE.Mesh;
 solid:(hex:number,roughness?:number,surface?:PixelSurface)=>THREE.MeshStandardMaterial;
};
export function renderFixtureVisual(group:THREE.Group,c:Obstacle,i:number,
 ctx:FixtureVisualContext,wood:THREE.Material,steel:THREE.Material,
 olive:THREE.Material,metal:THREE.Material):void{
      const fixture=c.fixture??'crate';
      const asset=propDefinition(fixture);
      const material=ctx.solid(i%3===0?0x87735e:i%3===1?0x677a76:0x787b65,
        .87,fixturePixelSurface(fixture));
      const w=c.w,d=c.h;
      // First choice: silhouette-first shared models. Existing asset types
      // keep the same tactical footprint, clearance and cover rules.
      if(renderCharacterFixture(group,c,fixture,c.artVariant??i,ctx,wood,steel,olive,metal))
        return;
      if(['bed','exam-bed','guest'].includes(fixture)){
        const height=asset?.height??19;
        ctx.box(group,c.x,height*.33,c.y,w,height*.66,d,material);
        ctx.box(group,c.x,height*.75,c.y,w-3,height*.20,d-3,olive,false);
        ctx.box(group,c.x-w*.32,height*.92,c.y,w*.22,2,d*.7,steel,false);
      }else if(['table','desk','counter','workbench','cart','dining-table','coffee-table','meeting-table'].includes(fixture)){
        const top=asset?.height??19;
        ctx.box(group,c.x,top,c.y,w,3,d,material);
        for(const sx of [-1,1])for(const sz of [-1,1])
          ctx.box(group,c.x+sx*(w/2-3),top/2,c.y+sz*(d/2-3),
            3,top,3,steel);
        if(fixture==='counter')ctx.box(group,c.x,top*.42,c.y,w-5,top*.76,d-5,wood);
        if(fixture==='cart'){
          ctx.box(group,c.x,4,c.y,w*.83,1.8,d*.84,olive);
          for(const sx of [-1,1])for(const sz of [-1,1])
            ctx.box(group,c.x+sx*w*.38,2,c.y+sz*d*.34,4,4,4,metal);
        }
      }else if(['fridge','cooler','wardrobe','locker','filing-cabinet'].includes(fixture)){
        const height=asset?.height??32;
        const body=ctx.solid(fixture==='cooler'?0x8da7a1:0xadb5b0,.82,
          fixture==='cooler'?'plastic':'metal');
        ctx.box(group,c.x,height/2,c.y,w,height,d,body);
        ctx.box(group,c.x+w*.42,height*.55,c.y+d/2+.7,2,height*.35,2,steel,false);
        if(fixture==='fridge'||fixture==='cooler')
          ctx.box(group,c.x,Math.min(20,height*.55),c.y+d/2+1,w-4,1.4,2,steel,false);
      }else if(['stove','microwave','kitchen-island','sink','checkout'].includes(fixture)){
        const height=asset?.height??23;
        ctx.box(group,c.x,height/2,c.y,w,height,d,material);
        if(fixture==='stove'){
          const burner=ctx.solid(0x222b2c);
          for(const dx of [-1,1])for(const dz of [-1,1]){
            const ring=new THREE.Mesh(new THREE.TorusGeometry(
              Math.max(2,Math.min(w,d)*.13),1.2,5,12),burner);
            ring.rotation.x=Math.PI/2;
            ring.position.set(c.x+dx*w*.23,height+.6,c.y+dz*d*.2);
            group.add(ring);
          }
        }else if(fixture==='sink'){
          ctx.box(group,c.x,height+.6,c.y,w*.66,1.2,d*.65,steel,false);
          ctx.box(group,c.x+w*.27,height+6,c.y,2,10,2,steel,false);
        }else if(fixture==='checkout'){
          ctx.box(group,c.x,height+4,c.y+d*.28,w*.4,8,d*.27,steel,false);
        }
      }else if(fixture==='toilet'||fixture==='bathtub'){
        const porcelain=ctx.solid(0xd9dfd5,.94,'porcelain');
        if(fixture==='toilet'){
          const top=asset?.height??19;
          ctx.box(group,c.x,top*.34,c.y+d*.17,w*.63,top*.67,d*.6,porcelain);
          ctx.box(group,c.x,top*.50,c.y-d*.34,w*.75,top,d*.25,porcelain);
          ctx.box(group,c.x,top*.61,c.y+d*.15,w*.7,2,d*.58,steel,false);
          ctx.box(group,c.x,top*.74,c.y+d*.17,w*.72,1.7,d*.59,porcelain,false); // rim
          ctx.box(group,c.x+w*.25,top*.50,c.y-d*.47,2,3,2,steel,false);
        }else{
          ctx.box(group,c.x,11,c.y,w,21,d,porcelain);
          ctx.box(group,c.x,15,c.y,w*.75,3,d*.68,steel,false);
          ctx.box(group,c.x,16.8,c.y,w*.67,1,d*.61,porcelain,false); // bath lip
          ctx.box(group,c.x-w*.39,22,c.y-d*.30,2,9,2,steel,false); // tap riser
          ctx.box(group,c.x-w*.36,25,c.y-d*.22,5,1.5,2,steel,false);
        }
      }else if(['shelf','gondola-shelf','wall-shelf','bookcase','rack'].includes(fixture)){
        // Stock and shelving fill the silhouette, matching the authoritative
        // obstacle/visibility envelope instead of suggesting a passable void.
        const tall=Math.max(27,asset?.height??27);
        const shelfWood=ctx.solid(fixture==='bookcase'?0x715d4a:0x6b6b60,.88,
          fixture==='bookcase'?'wood':'metal');
        ctx.box(group,c.x,tall/2,c.y,w,tall,d*.88,shelfWood);
        for(const level of [tall*.22,tall*.49,tall*.77]){
          ctx.box(group,c.x,level,c.y+d*.46,w,2,d*.2,steel,false);
          if(fixture==='gondola-shelf'||fixture==='rack'){
            for(const sx of [-1,1])
              ctx.box(group,c.x+sx*w*.26,level+4,c.y+d*.48,
                Math.max(5,w*.2),7,Math.max(4,d*.14),material,false);
          }
        }
      }else if(['cabinet','dresser','machine','laundry-machine','generator','control-panel','tool-chest'].includes(fixture)){
        const tall=asset?.height??27;
        ctx.box(group,c.x,tall/2,c.y,w,tall,d,material);
        for(const level of [tall*.32,tall*.65])
          ctx.box(group,c.x,level,c.y+d/2+1,w-4,1.5,2,steel,false);
        if(fixture==='generator'||fixture==='control-panel')
          for(const sx of [-1,0,1])
            ctx.box(group,c.x+sx*w*.27,tall*.8,c.y+d/2+1,
              3,3,2,ctx.solid(0xc6b182),false);
      }else if(['vehicle','sedan','pickup','van','suv'].includes(fixture)){
        // Purpose-shaped low-poly bodies, not a generic block on four sticks.
        // X is vehicle length and Z is width; collision uses the same footprint.
        const model=fixture==='vehicle'?'sedan':fixture;
        const paint=ctx.solid([0x647b72,0x9c8e74,0x71838c,0x99745d][i%4],.76,'metal');
        const glass=ctx.solid(0x557579,.25);
        const rubber=ctx.solid(0x252b2b,.94,'rubber');
        const chrome=ctx.solid(0x9ea7a0,.48,'metal');
        const radius=Math.max(2.2,Math.min(w*.085,d*.23));
        ctx.box(group,c.x,10,c.y,w,11,d*.91,paint);
        ctx.box(group,c.x,5,c.y,w*.9,4,d*.72,steel);
        for(const sx of [-1,1])for(const sz of [-1,1]){
          const tire=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,3,10),rubber);
          tire.rotation.x=Math.PI/2;
          tire.position.set(c.x+sx*w*.31,radius*.83,c.y+sz*d*.43);
          tire.castShadow=true;group.add(tire);
          const hub=new THREE.Mesh(new THREE.CylinderGeometry(radius*.42,radius*.42,3.3,10),chrome);
          hub.rotation.x=Math.PI/2;hub.position.copy(tire.position);
          group.add(hub);
        }
        if(model==='van'){
          const roof=asset?.height??42;
          ctx.box(group,c.x,(15+roof)/2,c.y,w*.78,roof-15,d*.86,paint);
          ctx.box(group,c.x-w*.32,(16+roof)/2,c.y-d*.44,
            w*.21,(roof-16)*.65,1,glass,false);
          ctx.box(group,c.x+w*.27,(16+roof)/2,c.y,2,(roof-16)*.62,d*.7,glass,false);
        }else{
          const truck=model==='pickup',high=model==='suv';
          const cabWidth=truck?w*.37:high?w*.63:w*.52;
          const cabCenter=truck?c.x-w*.20:c.x-w*.035;
          const cabHeight=Math.max(12,(asset?.height??32)-15);
          ctx.box(group,cabCenter,15+cabHeight*.5,c.y,
            cabWidth,cabHeight,d*.79,paint);
          const windshield=ctx.box(group,cabCenter+cabWidth*.40,
            16+cabHeight*.40,c.y,1.6,cabHeight*.65,d*.70,glass,false);
          windshield.rotation.z=-.15;
          const rearGlass=ctx.box(group,cabCenter-cabWidth*.43,
            16+cabHeight*.40,c.y,1.4,cabHeight*.59,d*.67,glass,false);
          rearGlass.rotation.z=.12;
          if(truck){
            const bedX=c.x+w*.27,bedW=w*.40;
            ctx.box(group,bedX,14,c.y,bedW,3,d*.82,paint);
            for(const sz of [-1,1])
              ctx.box(group,bedX,17,c.y+sz*d*.41,bedW,6,2,paint);
            ctx.box(group,c.x+w*.46,16,c.y,3,6,d*.85,paint);
          }else if(model==='sedan'){
            ctx.box(group,c.x+w*.36,12,c.y,w*.25,4,d*.85,paint);
            ctx.box(group,c.x-w*.38,12,c.y,w*.21,4,d*.85,paint);
          }
        }
        for(const sx of [-1,1]){
          ctx.box(group,c.x+sx*w*.51,8,c.y,w*.025,3,d*.84,chrome,false);
          const lamp=ctx.solid(sx>0?0xd8ca9e:0x954d48,.62);
          ctx.box(group,c.x+sx*w*.515,12,c.y-d*.26,1.2,4,d*.17,lamp,false);
          ctx.box(group,c.x+sx*w*.515,12,c.y+d*.26,1.2,4,d*.17,lamp,false);
        }
      }else if(fixture==='chair'||fixture==='bench'){
        const seat=10.4;
        ctx.box(group,c.x,seat,c.y,w*.88,3,d*.87,wood);
        const chairHeight=asset?.height??25;
        ctx.box(group,c.x,(chairHeight+10)/2,c.y-d*.43,
          w*.87,chairHeight-10,3,material);
        for(const sx of [-1,1])for(const sz of [-1,1])
          ctx.box(group,c.x+sx*w*.35,seat*.48,c.y+sz*d*.34,
            2.8,seat,2.8,steel);
        ctx.box(group,c.x,seat+2,c.y,w*.68,.9,d*.66,olive,false);
      }else if(fixture==='sofa'||fixture==='armchair'){
        const back=asset?.height??24;
        ctx.box(group,c.x,6,c.y,w,9,d,material);
        ctx.box(group,c.x,back/2,c.y-d*.38,w,back,d*.24,material);
        for(const sx of [-1,1])ctx.box(group,c.x+sx*(w/2-3),8,c.y,5,13,d,steel);
        const count=fixture==='armchair'?1:2;
        for(let n=0;n<count;n++)ctx.box(group,c.x+(n-(count-1)/2)*w/count,
          11,c.y+2,Math.max(4,w/count-3),3,d*.63,olive,false);
      }else if(fixture==='tv-stand'){
        const height=asset?.height??21;
        ctx.box(group,c.x,height*.28,c.y,w,height*.56,d,wood);
        ctx.box(group,c.x,height*.74,c.y-d*.15,w*.78,height*.50,2,steel,false);
        ctx.box(group,c.x,height*.74,c.y-d*.15+1.1,
          w*.70,height*.42,.4,ctx.solid(0x667f80,.33),false);
      }else if(fixture==='barrel'||fixture==='tank'||fixture==='tire-stack'){
        const top=asset?.height??22,radius=Math.min(w,d)*.43;
        const cylinder=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,top,12),steel);
        cylinder.position.set(c.x,top/2,c.y);cylinder.castShadow=true;group.add(cylinder);
        if(fixture==='tire-stack')for(const level of [4,11,18]){
          const ring=new THREE.Mesh(new THREE.TorusGeometry(Math.max(2,radius-2),3,5,12),wood);
          ring.rotation.x=Math.PI/2;ring.position.set(c.x,level,c.y);
          ring.castShadow=true;group.add(ring);
        }
      }else if(fixture==='vehicle-lift'){
        ctx.box(group,c.x,2,c.y,w,4,d,steel);
        for(const sx of [-1,1])ctx.box(group,c.x+sx*(w*.43),
          (asset?.height??37)/2,c.y,5,asset?.height??37,6,metal);
        ctx.box(group,c.x,9,c.y,w*.8,4,d*.55,wood);
      }else if(['hedge','bush','tree','plant','tree-broadleaf',
        'tree-conifer','tree-scrub','shrub-round','shrub-tall'].includes(fixture)){
        const leaves=ctx.solid(fixture==='tree-conifer'?0x425b4d:
          fixture==='tree-scrub'?0x6b7955:
          fixture==='shrub-tall'?0x596a50:0x526e51,.9,'foliage');
        const bark=ctx.solid(0x645846,.94,'wood');
        const isTree=fixture==='tree'||fixture.startsWith('tree-');
        const tall=asset?.height??(isTree?72:22);
        const blob=(x:number,y:number,z:number,r:number)=>{
          const b=new THREE.Mesh(new THREE.IcosahedronGeometry(Math.max(3,r),0),leaves);
          b.position.set(x,y,z);b.castShadow=true;group.add(b);
        };
        if(isTree){
          const trunkHeight=fixture==='tree-scrub'?tall*.55:tall*.63;
          ctx.box(group,c.x,trunkHeight*.5,c.y,Math.min(8,w*.18),
            trunkHeight,Math.min(8,d*.18),bark);
          if(fixture==='tree-conifer'){
            for(let level=0;level<3;level++){
              const r=Math.min(w,d)*(.51-level*.12);
              const cone=new THREE.Mesh(new THREE.ConeGeometry(r,tall*.38,7),leaves);
              cone.position.set(c.x,tall*(.49+level*.17),c.y);
              cone.castShadow=true;group.add(cone);
            }
          }else{
            const spread=fixture==='tree-scrub'?.25:.31;
            blob(c.x,tall*.77,c.y,Math.min(w,d)*.39);
            blob(c.x-w*spread,tall*.68,c.y+d*.11,Math.min(w,d)*.31);
            blob(c.x+w*spread,tall*.69,c.y-d*.13,Math.min(w,d)*.33);
            if(fixture==='tree-broadleaf')blob(c.x,tall*.94,c.y,
              Math.min(w,d)*.27);
          }
        }else if(fixture==='hedge'){
          ctx.box(group,c.x,tall*.38,c.y,w*.96,tall*.55,d*.65,leaves);
          for(const sx of [-.34,0,.34])
            blob(c.x+w*sx,tall*.70,c.y,Math.min(w*.18,d*.40));
        }else if(fixture==='plant'){
          const pot=ctx.solid(0x927665);
          ctx.box(group,c.x,5,c.y,w*.45,10,d*.48,pot);
          for(const sx of [-.19,.18])
            blob(c.x+w*sx,15,c.y+d*sx,Math.min(w,d)*.23);
        }else{
          const round=fixture==='shrub-round';
          const height=round?Math.min(19,tall):tall;
          for(const sx of [-.24,.05,.29]){
            blob(c.x+w*sx,height*(round?.60:.70),
              c.y+d*(sx*.60),Math.min(w,d)*(round?.34:.28));
          }
          if(!round)blob(c.x,height*.91,c.y,Math.min(w,d)*.24);
        }
      }else if(['mailbox','trash-bin','bollard','hydrant','utility-cabinet',
        'parking-block','parking-sign','street-lamp','bike-rack'].includes(fixture)){
        const enamel=ctx.solid(0x777f79,.72,'metal');
        const dark=ctx.solid(0x343c3b,.86);
        const safety=ctx.solid(0xae8e52,.78);
        const signal=ctx.solid(0xb37c5a,.75);
        if(fixture==='mailbox'){
          ctx.box(group,c.x,9,c.y,3,18,3,dark);
          ctx.box(group,c.x,(asset?.height??27)-5,c.y,w,10,d,enamel);
          ctx.box(group,c.x+w*.43,25,c.y,2,8,2,signal,false);
        }else if(fixture==='trash-bin'){
          ctx.box(group,c.x,(asset?.height??23)*.45,c.y,
            w*.86,(asset?.height??23)*.9,d*.86,dark);
          ctx.box(group,c.x,(asset?.height??23)-1.5,c.y,w,3,d,enamel);
          ctx.box(group,c.x,22.7,c.y-d*.20,w*.6,1,d*.15,dark,false);
        }else if(fixture==='bollard'){
          ctx.box(group,c.x,11,c.y,5,22,5,safety);
          ctx.box(group,c.x,20,c.y,5.8,3,5.8,dark,false);
          ctx.box(group,c.x,1.6,c.y,8,3.2,8,enamel);
        }else if(fixture==='hydrant'){
          ctx.box(group,c.x,8,c.y,7,16,7,signal);
          ctx.box(group,c.x,17,c.y,9,5,9,signal);
          ctx.box(group,c.x,10,c.y,16,4,5,enamel,false);
          ctx.box(group,c.x,2,c.y,11,4,11,enamel);
        }else if(fixture==='utility-cabinet'){
          const height=asset?.height??37;
          ctx.box(group,c.x,height/2,c.y,w,height,d,enamel);
          ctx.box(group,c.x,height/2,c.y+d*.51,w*.84,height*.90,1,dark,false);
          ctx.box(group,c.x+w*.27,18,c.y+d*.56,2,7,1,safety,false);
          for(const yy of [8,13,18])ctx.box(group,c.x-w*.21,yy,c.y+d*.56,
            7,1,1,safety,false);
        }else if(fixture==='parking-block'){
          ctx.box(group,c.x,3,c.y,w,6,d*.85,enamel);
          for(const sx of [-.31,.31])ctx.box(group,c.x+w*sx,6.3,c.y,
            w*.2,.8,d*.74,safety,false);
        }else if(fixture==='parking-sign'){
          const height=asset?.height??44;
          ctx.box(group,c.x,height*.5,c.y,2,height,2,dark);
          ctx.box(group,c.x,height*.79,c.y,w*.9,13,1,enamel,false);
          ctx.box(group,c.x,height*.79,c.y+.9,w*.55,1.8,.7,safety,false);
        }else if(fixture==='street-lamp'){
          const height=asset?.height??82;
          ctx.box(group,c.x,height*.49,c.y,3,height*.98,3,dark);
          ctx.box(group,c.x,height*.95,c.y-d*.22,14,3,4,dark,false);
          ctx.box(group,c.x+5,height*.93,c.y-d*.22,9,2,4,safety,false);
          ctx.box(group,c.x,2,c.y,7,4,7,enamel);
        }else if(fixture==='bike-rack'){
          // Three continuous upright hoops in the YZ plane. The old
          // X rotation laid open semicircles horizontally like C glyphs.
          const height=asset?.height??24;
          const r=Math.min(7.4,d*.33);
          for(const sx of [-.31,0,.31]){
            const x=c.x+w*sx,top=height-r;
            const hoop=new THREE.Mesh(new THREE.TorusGeometry(r,1.45,6,12,Math.PI),enamel);
            hoop.rotation.y=Math.PI/2;
            hoop.position.set(x,top,c.y);hoop.castShadow=true;group.add(hoop);
            for(const sign of [-1,1]){
              ctx.box(group,x,top*.5,c.y+sign*r,2.9,top,2.9,enamel);
              ctx.box(group,x,1,c.y+sign*r,5.7,2,5.7,dark,false);
            }
          }
        }
      }else if(fixture==='window-boards'){
        const timber=ctx.solid(0x7d6b54,.9,'wood'),nails=ctx.solid(0x4d514e,.8,'metal');
        const across=w>=d;
        for(const height of [3.5,10.5,17.5,24.5,31.5]){
          ctx.box(group,c.x,height,c.y,
            across?w:8,6.9,across?8:d,timber);
          for(const end of [-.38,.38])
            ctx.box(group,c.x+(across?end*w:0),height,c.y+(across?0:end*d),
              2.3,2.3,across?8.5:8.5,nails,false);
        }
      }else if(fixture==='fence'){
        const height=asset?.height??24;
        for(const sx of [-1,1])ctx.box(group,c.x+sx*w*.47,height/2,c.y,
          3,height,3,wood);
        for(const h of [height*.35,height*.75])
          ctx.box(group,c.x,h,c.y,w,2,3,steel,false);
      }else if(renderDetailedFixture(group,c,fixture,ctx,wood,steel,olive,metal)){
        // Fully modeled specialty prop; same path in the lab and live maps.
      }else{
        const tall=asset?.height??(c.low?12:27);
        ctx.box(group,c.x,tall/2,c.y,w,tall,d,material);
        if(fixture==='pallet')
          for(const h of [2,7,12])ctx.box(group,c.x,h,c.y,w+2,2,d+2,wood,false);
      }

}
