/** V13 actual firing commit and fixed-tick wound lifecycle witness.
 * Controlled training setup, not natural AI encounter or subjective art approval. */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const dir='artifacts/vfx-v13-blood',origin='http://127.0.0.1:4475';
mkdirSync(dir,{recursive:true});
const server=spawn(process.execPath,[resolve('node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4475','--strictPort'],{stdio:'ignore'});
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
   await page.route('**/v13-probe',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
   await page.goto(origin+'/v13-probe');
   const result=await page.evaluate(async viewport=>{
    const {TacticalScene3D}=await import('/src/breach-3d.ts');
    const {newSession,team,enemies,stepSession}=await import('/src/breach-game.ts');
    const {activateSite}=await import('/src/breach-core.ts');
    const {buildTrainingSite}=await import('/src/training/training-site-builder.ts');
    const {DEFAULT_TRAINING_CONFIG}=await import('/src/training/training-courses.ts');
    const {createCombatFiringPipeline}=await import('/src/breach-firing-pipeline.ts');
    const {initialEquipmentLoadout}=await import('/src/equipment-loadouts.ts');
    const {registerWound,stabilizeWound}=await import('/src/breach-medical-wounds.ts');
    const {snapshot,applyReplayFrame}=await import('/src/breach-replay.ts');
    const {bloodMarkRadius}=await import('/src/breach-blood-evidence.ts');
    const legacy=newSession(),target=enemies(legacy)[0];
    if(!target)throw Error('Legacy hostile fixture missing');
    const site=buildTrainingSite({...DEFAULT_TRAINING_CONFIG,squadSize:1});
    activateSite(site);
    const s=newSession(0,site.seed,'full-view','small','hold',site),a=team(s)[0];
    const scene=new TacticalScene3D();scene.resize(viewport.width,viewport.height);scene.applySite(site);
    a.p={x:200,y:655};target.p={x:260,y:655};
    for(const actor of [a,target]){
     actor.priorP={...actor.p};actor.plan=[];actor.nav=[];actor.path=[];actor.velocity=0;
     actor.pace='walk';actor.posture='stand';actor.health=4;actor.injuryStage=0;
     actor.heading=0;actor.weaponYaw=0;actor.aim=.98;actor.stability=1;actor.recoil=0;
     actor.fireCd=0;actor.lastHitAt=-100;actor.flashUntil=-100;
    }
    target.armorIntegrity=0;target.helmetIntegrity=0;
    a.equipment=initialEquipmentLoadout(a.weapon);a.firePolicy='engage';
    s.operators=[a,target];s.civilians=[];s.phase='running';
    scene.view.focus={x:245,y:655};scene.setYaw(0);
    const draw=()=>scene.update(s,a.id,0,null,true);
    const captures={},witness={zoom:scene.view.zoom};
    const canvas=scene.renderer.domElement;
    const capture=name=>{captures[name]=canvas.toDataURL('image/png');};
    const poolMatrix=(x,z)=>{const mesh=scene.impactDecalMesh;if(!mesh)return null;
     const m=mesh.instanceMatrix.array,styles=mesh.geometry.attributes.stainStyle;
     for(let i=0;i<mesh.count;i++){
      const j=i*16;if(Math.abs(m[j+12]-x)<.02&&Math.abs(m[j+14]-z)<.02&&styles.getX(i)>=4)
       return {x:m[j+12],y:m[j+13],z:m[j+14],radius:Math.hypot(m[j],m[j+1],m[j+2]),style:styles.getX(i)};
     }
     return null;
    };
    // Controlled target acquisition but actual primary firing, ammunition,
    // ray, armor and damage commit. Never inject a shot or impact record.
    const run=createCombatFiringPipeline({team,enemies,inSight:(observer,enemy)=>observer===a&&enemy===target&&target.health>0,
     isSeen:()=>true,liveVisibility:()=>true,unobstructed:()=>true,beginReload(){},advanceReload(){},notify(){},hear(){},battleEvent(){}});
    const initialAmmo=a.magazine;
    for(let i=0;i<240;i++){
     a.fireCd=Math.max(0,a.fireCd-1/60);
     run.fire(s,a,1/60);
     if(s.shots.some(q=>q.surface==='blood'&&q.hit&&q.shooterId===a.id))break;
     s.seconds+=1/60;
    }
    const shot=s.shots.find(q=>q.surface==='blood'&&q.hit&&q.shooterId===a.id);
    if(!shot||a.magazine>=initialAmmo||!s.impactMarks.some(m=>m.surface==='blood'&&m.shotId===shot.id))throw Error('No genuine committed blood impact');
    // Isolate that actual committed shot from prior misses, without
    // manufacturing or changing its hit outcome or age.
    s.shots=s.shots.filter(q=>q.id===shot.id);draw();
    const particle=scene.dropletPreview?.mesh,pulse=scene.impactPulseBatch?.mesh;
    if(particle?.count!==4||pulse?.count!==1)throw Error('Blood burst was not submitted');
    const pm=particle.instanceMatrix.array;
    const width=Math.hypot(pm[0],pm[1],pm[2]);
    if(width<2.5)throw Error('Blood particles not enlarged');
    witness.hit={shotId:shot.id,healthBefore:shot.healthBefore,healthAfter:shot.healthAfter,particles:particle.count,width,pulse:pulse.count,ammoSpent:initialAmmo-a.magazine};
    capture('committed-hit');
    // Isolate the medical lifecycle on a friendly in an open authored
    // training area. The initial injury is a controlled fixture; all
    // subsequent pool production uses normal authoritative stepSession.
    s.operators=[a];a.firePolicy='hold';a.aim=0;a.medical.wounds=[];a.medical.bloodLoss=0;
    a.p={x:200,y:655};a.priorP={...a.p};s.impactMarks=[];s.shots=[];s.seconds=0;
    registerWound(a.medical,7001,'torso',2,0);
    scene.view.focus={...a.p};draw();
    const tick=n=>{for(let i=0;i<n;i++)stepSession(s,1/60);};
    tick(30);draw();
    const first=poolMatrix(a.p.x,a.p.y);
    if(!first)throw Error('First pool missing under visible actor');
    capture('initial-pool');const early=snapshot(s);
    tick(540);draw();
    const late=poolMatrix(a.p.x,a.p.y);
    if(!late||late.radius<first.radius+5||late.y<.8||late.y>1)throw Error('Pool did not grow on the floor');
    capture('grown-pool');
    const full=snapshot(s),origin={...a.p};
    const stats=scene.performanceStats();
    const version=scene.impactDecalMesh.instanceMatrix.version;draw();
    if(scene.impactDecalMesh.instanceMatrix.version!==version)throw Error('Paused pool matrix was uploaded');
    const pixels=()=>{const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;const ctx=c.getContext('2d');ctx.drawImage(canvas,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};
    const stained=pixels(),saved=s.impactMarks;s.impactMarks=[];draw();const clean=pixels();s.impactMarks=saved;draw();
    let visibleRedPixels=0;
    for(let i=0;i<clean.length;i+=4){
     const redContrast=(stained[i]-stained[i+1])-(clean[i]-clean[i+1]);
     if(redContrast>18&&stained[i]>stained[i+1]+15)visibleRedPixels++;
    }
    if(visibleRedPixels<4)throw Error('Pool failed visible pixel comparison: '+visibleRedPixels);
    // Move the wounded actor without editing evidence. Existing marks
    // remain in place; normal ticks deposit a new pool at the new position.
    a.p={x:origin.x+35,y:origin.y};a.priorP={...a.p};tick(60);draw();
    if(!poolMatrix(origin.x,origin.y)||!poolMatrix(a.p.x,a.p.y))throw Error('Moving wound did not leave ground evidence');
    capture('moved-pool');
    const amount=()=>s.impactMarks.filter(m=>m.surface==='blood').reduce((sum,m)=>sum+(m.bloodAmount??1),0);
    stabilizeWound(a.medical,7001);const treated=amount();tick(1800);draw();
    if(amount()!==treated||!poolMatrix(origin.x,origin.y))throw Error('Treatment or persistence failed');
    capture('stabilized-persistent');
    applyReplayFrame(s,early);draw();
    const rewind=poolMatrix(origin.x,origin.y);
    if(!rewind||Math.abs(rewind.radius-first.radius)>.02)throw Error('Replay did not restore early pool');
    applyReplayFrame(s,full);draw();
    if(Math.abs(poolMatrix(origin.x,origin.y)?.radius-late.radius)>.02)throw Error('Replay did not restore full pool');
    witness.pool={first,late,rewind,visibleRedPixels,treatedAmount:treated,simulationSeconds:s.seconds,drawCalls:stats.calls,triangles:stats.triangles,textures:stats.textureCount};
    scene.applySite(null);if(scene.impactDecalMesh?.count||scene.dropletPreview?.mesh.count)throw Error('Site reset retained blood');
    scene.renderer.dispose();scene.renderer.forceContextLoss();
    return {viewport,witness,captures};
   },viewport);
   assert.deepEqual(errors,[],'Shader/runtime errors');
   const {captures,...record}=result;
   for(const [name,data] of Object.entries(captures))writeFileSync(dir+'/'+viewport.width+'-'+name+'.png',Buffer.from(data.split(',')[1],'base64'));
   writeFileSync(dir+'/'+viewport.width+'.json',JSON.stringify(record,null,2));
   console.log('VFX_V13_BLOOD_BROWSER '+JSON.stringify(record));
  }finally{await page.close();}
 }
}finally{await browser?.close();server.kill();}
