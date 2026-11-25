/** V12 real renderer attachment witness. Controlled authored training
 * scenario, not a gameplay encounter or subjective visual acceptance. */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const dir='artifacts/vfx-v12-surfaces',origin='http://127.0.0.1:4474';
mkdirSync(dir,{recursive:true});
const server=spawn(process.execPath,[resolve('node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4474','--strictPort'],{stdio:'ignore'});
let browser;
try{
 let ready=false;
 for(let i=0;i<120;i++){try{if((await fetch(origin+'/index.html')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,150));}
 assert.ok(ready,'Vite unavailable');
 browser=await chromium.launch({headless:true,...(process.env.FIELDWORK_CI_CHROME==='1'?{channel:'chrome'}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|Shader Error|INVALID_OPERATION|compile|linker/i.test(m.text()))errors.push(m.text());});
  try{
   await page.route('**/v12-probe',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
   await page.goto(origin+'/v12-probe');
   const result=await page.evaluate(async viewport=>{
    const {TacticalScene3D}=await import('/src/breach-3d.ts');
    const {newSession}=await import('/src/breach-game.ts');
    const {activateSite,doorLeafSegment}=await import('/src/breach-core.ts');
    const {buildTrainingSite}=await import('/src/training/training-site-builder.ts');
    const {DEFAULT_TRAINING_CONFIG}=await import('/src/training/training-courses.ts');
    const {segmentAttachment,coverAttachment,wallMarkPose,doorMarkLocalPose,coverMarkLocalPose}=await import('/src/breach-impact-surface.ts');
    const {snapshot,applyReplayFrame}=await import('/src/breach-replay.ts');
    const site=buildTrainingSite({...DEFAULT_TRAINING_CONFIG});activateSite(site);
    const s=newSession(0,site.seed,'full-view','standard',undefined,site);
    const scene=new TacticalScene3D();scene.resize(viewport.width,viewport.height);scene.applySite(site);
    const draw=()=>scene.update(s,'',1/60,null,true);
    const frame=(p,nx,nz)=>{scene.view.focus={...p};scene.setYaw(Math.atan2(nx,nz));draw();};
    const read=()=>{const mesh=scene.impactDecalMesh;if(mesh?.count!==1)return null;
     const a=mesh.instanceMatrix.array;return {x:a[12],y:a[13],z:a[14],nx:a[8]/Math.hypot(a[8],a[9],a[10]),ny:a[9]/Math.hypot(a[8],a[9],a[10]),nz:a[10]/Math.hypot(a[8],a[9],a[10])};};
    const near=(a,b,eps=.01)=>Math.abs(a-b)<eps;
    const aligned=(m,p)=>m&&['x','y','z','nx','ny','nz'].every(k=>near(m[k],p[k]));
    const marks=(p,ref,id=1)=>[{id,shotId:id,surface:'stone',p,height:ref.localY,age:0,surfaceRef:ref}];
    const attach=(kind,index,id,seg)=>{const dx=seg.b.x-seg.a.x,dz=seg.b.y-seg.a.y,len=Math.hypot(dx,dz),p={x:(seg.a.x+seg.b.x)/2,y:(seg.a.y+seg.b.y)/2},nx=-dz/len,nz=dx/len;
      const from={x:p.x+nx*12,y:p.y+nz*12},to={x:p.x-nx*12,y:p.y-nz*12};
      return {p,ref:segmentAttachment(kind,index,id,seg,from,to,.5,30,kind==='door'?s.doors[index]:undefined)};};
    const captures={},witness={};
    // Look at each physical wall face with the default tactical zoom. Keep
    // the first one that is actually submitted after camera occlusion.
    for(let i=0;i<site.walls.length;i++){
     const {p,ref}=attach('wall',i,undefined,site.walls[i]);
     if(!ref)continue;const expected=wallMarkPose(ref,site.walls[i]);if(!expected)continue;
     s.impactMarks=marks(p,ref);frame(p,ref.nx,ref.nz);const m=read();
     if(aligned(m,expected)){witness.wall=m;captures.wall=scene.renderer.domElement.toDataURL('image/png');break;}
    }
    if(!witness.wall)throw Error('No surface-aligned wall decal submitted');
    // Test a solid door on both the closed and changed actual leaf pose.
    for(let i=0;i<s.doors.length;i++){
     const door=s.doors[i];if(door.kind!=='hinged'||door.style!=='wood')continue;
     door.open=false;door.openFraction=0;
     const {p,ref}=attach('door',i,door.id,doorLeafSegment(door));
     if(!ref||!doorMarkLocalPose(ref,door))continue;
     s.impactMarks=marks(p,ref);frame(p,ref.nx,ref.nz);const before=read();
     if(!before||!near(before.ny,0))continue;
     const original=snapshot(s);
     door.open=true;door.openFraction=.35;s.objectRevision++;
     draw();const after=read();
     if(after&&Math.hypot(after.x-before.x,after.z-before.z)>1&&Math.hypot(after.nx-before.nx,after.nz-before.nz)>.1){
      witness.door={before,after};captures.door=scene.renderer.domElement.toDataURL('image/png');
      applyReplayFrame(s,original);draw();const rewind=read();
      if(!rewind||!near(rewind.x,before.x)||!near(rewind.z,before.z))throw Error('Door rewind lost attachment');
      break;
     }
     applyReplayFrame(s,original);
    }
    if(!witness.door)throw Error('No moving solid door attachment witness');
    // Target fixture artwork is narrower than the collider; the mark must
    // attach to the shared board recipe, follow a translated owner, then
    // disappear on destruction. Do not mutate scoring or firing outcomes.
    for(let i=0;i<site.cover.length;i++){
     const c=site.cover[i],current=s.coverState[i];
     if(c.fixture!=='target-plate')continue;
     const p={x:c.x,y:c.y+c.h/2};
     const ref=coverAttachment(i,current,{x:c.x,y:c.y+c.h},{x:c.x,y:c.y-c.h},.25,30);
     if(!ref)continue;const local=coverMarkLocalPose(ref,c,current);if(!local)continue;
     s.impactMarks=marks(p,ref);frame({x:c.x,y:c.y},0,1);const before=read();
     if(!before||!near(before.z,c.y+local.z)||!near(before.y,local.y))continue;
     const original=snapshot(s);
     current.x+=5;s.objectRevision++;draw();const after=read();
     if(!after||!near(after.x,before.x+5)||!near(after.z,before.z)){applyReplayFrame(s,original);continue;}
     witness.target={before,after};captures.target=scene.renderer.domElement.toDataURL('image/png');
     current.destroyed=true;s.objectRevision++;draw();
     if(scene.impactDecalMesh.count!==0)throw Error('Destroyed target retains floating mark');
     applyReplayFrame(s,original);draw();
     if(!read())throw Error('Target rewind did not restore mark');
     break;
    }
    if(!witness.target)throw Error('No training target attachment witness');
    s.impactMarks=[{id:99,p:{x:300,y:300},surface:'stone',height:20,age:0}];draw();
    if(scene.impactDecalMesh.count!==0)throw Error('Unowned raised legacy decal rendered');
    scene.applySite(null);
    if(scene.impactDecalMesh?.count)throw Error('Site reset retained decals');
    scene.renderer.dispose();scene.renderer.forceContextLoss();
    return {viewport,witness,captures};
   },viewport);
   assert.deepEqual(errors,[],'Shader/runtime errors');
   const {captures,...record}=result;
   for(const [name,data] of Object.entries(captures))writeFileSync(dir+'/'+viewport.width+'-'+name+'.png',Buffer.from(data.split(',')[1],'base64'));
   writeFileSync(dir+'/'+viewport.width+'.json',JSON.stringify(record,null,2));
   console.log('VFX_V12_SURFACE_BROWSER '+JSON.stringify(record));
  }finally{await page.close();}
 }
}finally{await browser?.close();server.kill();}
