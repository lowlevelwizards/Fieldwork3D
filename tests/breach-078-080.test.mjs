import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession,team,enemies,toggling,stepSession,liveVisibility} from '../src/breach-game.ts';
import {shotVisibility,doorVisibility,corpseVisible,contactFade,
  combatCue} from '../src/breach-presentation.ts';

const step=(s,n)=>{for(let i=0;i<n;i++)stepSession(s,1/60);};

test('079: every simulation shot names the shooter, target, and true damage transition',()=>{
  const s=newSession();
  const shooter=team(s)[0],target=enemies(s)[0];
  for(const a of s.operators){
    if(a.id!==shooter.id&&a.id!==target.id)a.health=0;
  }
  shooter.p={x:300,y:616};shooter.heading=-Math.PI/2;
  target.p={x:300,y:570};target.heading=Math.PI/2;
  target.health=2;target.magazine=0;target.reserve=0;
  toggling(s);
  const observed=[];
  for(let i=0;i<240&&target.health>0;i++){
    step(s,1);
    for(const shot of s.shots)
      if(!observed.some(x=>x.id===shot.id))observed.push({...shot});
  }
  assert.ok(observed.length>0,'battle produces a visible authoritative shot');
  assert.ok(observed.every(e=>e.shooterId===shooter.id));
  assert.ok(observed.every(e=>e.targetId===target.id));
  assert.equal(new Set(observed.map(e=>e.id)).size,observed.length);
  for(const e of observed){
    assert.equal(e.healthAfter,e.hit?Math.max(0,e.healthBefore-1):
      e.healthBefore,'damage comes only from simulation hit outcome');
    assert.equal(e.down,e.hit&&e.healthAfter<=0);
    assert.ok(['hit','miss','down'].includes(combatCue(e)));
  }
  assert.ok(observed.some(e=>e.hit),'at least one shot hit');
  if(target.health<=0){
    assert.ok(target.lastDownAt>=0);
    assert.equal(observed.some(e=>e.down),true);
  }
});
test('079: firing from behind fog never exposes a hidden shooter or trajectory',()=>{
  const s=newSession(),observer=team(s)[0];
  const near={x:observer.p.x+25*Math.cos(observer.heading),
    y:observer.p.y+25*Math.sin(observer.heading)};
  assert.ok(liveVisibility(s,near),'chosen impact is in friendly line of sight');
  const shot={id:1,shooterId:'hidden',targetId:'rook',
    start:{x:625,y:15},end:near,side:'red',hit:true,
    age:0,healthBefore:2,healthAfter:1,down:false};
  const visibility=shotVisibility(s,shot);
  assert.equal(visibility.flash,false,'no muzzle at true hidden origin');
  assert.equal(visibility.trace,false,'no bullet line to hidden origin');
  assert.equal(visibility.impact,true,'visible impact is still communicated');
});
test('080: door state metadata does not disclose unseen door changes',()=>{
  const s=newSession();
  for(const door of s.doors){
    const status=doorVisibility(s,door);
    assert.equal(typeof status.known,'boolean');
    assert.equal(typeof status.live,'boolean');
    assert.ok(!status.live||status.known);
  }
  assert.equal(corpseVisible(s,{x:625,y:30},'red'),false);
  assert.equal(corpseVisible(s,team(s)[0].p,'blue'),true);
});
test('079: hit flashes decay within a bounded lifetime',()=>{
  assert.equal(contactFade(-10,.4),1);
  assert.equal(contactFade(0,.4),1);
  assert.equal(contactFade(.2,.4),.5);
  assert.equal(contactFade(.4,.4),0);
  assert.equal(contactFade(1,.4),0);
});
test('078-080: 3D uses readable fog and per-shot effects, 2D shares cues',()=>{
  const stage=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
  const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
  assert.match(stage,/scene\.fog=null/);
  // A previous version used an opaque fog ceiling that made the station a
  // featureless black diamond in ISO. Keep architecture readable by contract.
  const unknown=stage.match(/const unknownMat=new THREE.MeshBasicMaterial\\(\\{[\\s\\S]*?opacity:(\\.\\d+)/);
  assert.ok(unknown&&Number(unknown[1])<.65,
    'unknown geometry mask cannot be a completely opaque roof');
  assert.match(stage,/temp\.position\.set\(p\.x,36,p\.y\)/);
  assert.match(stage,/effectCache/);
  assert.match(stage,/shot\.shooterId===actor\.id/);
  assert.match(stage,/lastDownAt/);
  assert.match(stage,/observedDoorOpen/);
  assert.match(main,/doorVisibility\(state,door\)/);
  assert.match(main,/shotVisibility\(state,shot\)/);
  assert.match(main,/shot\.down\?'DOWN':'HIT'/);
});

test('079: the presentation lab ships independently of tactical battle',()=>{
  const html=readFileSync(new URL('../breach-visual-lab.html',import.meta.url),'utf8');
  const config=readFileSync(new URL('../vite.config.ts',import.meta.url),'utf8');
  assert.ok(html.includes('FIELDWORK / VISUAL LAB'));
  assert.ok(html.includes('src/breach-visual-lab.ts'));
  for(const id of ['miss','hit','down','reset','iso','top'])
    assert.ok(html.includes('id="'+id+'"'));
  assert.match(config,/breachVisualLab:/);
});
