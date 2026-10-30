import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateSite} from '../src/breach-site.ts';
import {activateSite,activeSite,WALLS,COVER,route,passable} from '../src/breach-core.ts';
import {newSession,team,enemies,planStack,planStackTeam,
  planSquadEntry,planMove,toggling,stepSession} from '../src/breach-game.ts';

test('086: 160 seeds generate deterministic connected 3–6-room sites',()=>{
  const counts=new Set(),layouts=new Set();
  for(let seed=1;seed<=160;seed++){
    const site=generateSite(seed*1217);
    const repeat=generateSite(seed*1217);
    assert.deepEqual(site,repeat,'seed must replay the same site');
    counts.add(site.roomCount);
    layouts.add(site.walls.map(w=>w.a.x+','+w.a.y).join(';'));
    assert.ok(site.roomCount>=3&&site.roomCount<=6);
    assert.equal(site.spawn.length,4);
    assert.ok(site.enemies.length>=2&&site.enemies.length<=7);
    assert.ok(site.doors.length>=site.rooms.length-1,
      'door spanning tree connects rooms');
    activateSite(site);
    assert.equal(WALLS.length,site.walls.length);
    assert.equal(COVER.length,site.cover.length);
    for(const p of [...site.spawn,...site.enemies,site.objective,site.extract])
      assert.ok(passable(p),'spawn/objective must be free: '+JSON.stringify(p));
    for(const a of site.spawn)
      assert.ok(route(a,site.objective).length,
        'all operators can route through the building: seed='+seed);
    for(const p of site.enemies)
      assert.ok(route(site.spawn[0],p).length,
        'all enemy spawns must be reachable: seed='+seed);
  }
  assert.deepEqual([...counts].sort(),[3,4,5,6]);
  assert.ok(layouts.size>100,'site geometry must genuinely change each seed');
  activateSite(null);
});
test('083: generated sessions have four independently orderable friendlies',()=>{
  const session=newSession(0,1532);
  assert.equal(team(session).length,4);
  assert.deepEqual(team(session).map(a=>a.id),['rook','moss','ash','vale']);
  const names=new Set(team(session).map(a=>a.name));
  assert.equal(names.size,4);
  assert.ok(enemies(session).length>=2);
  for(const a of team(session)){
    assert.ok(planMove(session,a.id,session.scenario.objective));
    assert.equal(a.plan.length,1);
  }
  assert.equal(new Set(team(session).map(a=>a.plan[0].id)).size,4);
  assert.equal(activeSite()?.seed,1532);
  activateSite(null);
});
test('084: four-person stacks reserve distinct positions at the same door',()=>{
  const s=newSession(0,33717);
  assert.equal(team(s).length,4);
  assert.ok(planStackTeam(s,'FRONT'));
  const nodes=team(s).map(a=>a.plan.find(n=>n.stackDoorId==='FRONT'));
  assert.equal(nodes.filter(Boolean).length,4);
  for(let i=0;i<4;i++)for(let j=0;j<i;j++){
    const a=nodes[i].p,b=nodes[j].p;
    assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>22,'slots are separated');
  }
  assert.ok(planSquadEntry(s,'FRONT'));
  assert.ok(team(s).every(a=>a.plan.some(n=>n.kind==='sync')),
    'all four receive shared synchronized GO code');
  assert.ok(team(s)[0].plan.some(n=>n.kind==='door'),
    'lead handles the door rather than clipping through a closed door');
  activateSite(null);
});
test('083–088: main page and dedicated Breach both offer four-person controls',()=>{
  const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const breach=readFileSync(new URL('../breach.html',import.meta.url),'utf8');
  const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
  const three=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
  for(const html of [index,breach])for(const id of ['rook','moss','ash','vale']){
    assert.ok(html.includes('id="'+id+'"'));
    assert.ok(html.includes('id="'+id+'Hp"'));
  }
  assert.match(main,/newSession\(0,legacyStudy\?undefined:randomSiteSeed\(\)\)/);
  assert.match(main,/stage\?\.applySite\(state\.site\?\?null\)/);
  assert.doesNotMatch(main,/ctxStackAll/);
  assert.doesNotMatch(main,/ctxEntry/); // Manual stacking is intentional.
  assert.match(three,/private buildGenerated\(site:Site\)/);
});
