import test from 'node:test';import assert from 'node:assert/strict';
import {AI_GROUP_KINDS,AI_GROUP_PROFILES,AI_COMPETENCE} from '../src/breach-ai-group-profiles.ts';
import {npcIdentity,npcGroupKind} from '../src/breach-ai-identity.ts';
import {doctrineForGroup} from '../src/breach-ai-doctrine.ts';
test('EB1 catalog exhaustively defines all identities and valid competence distributions',()=>{
 assert.equal(AI_GROUP_KINDS.length,7);assert.equal(AI_COMPETENCE.length,4);
 for(const kind of AI_GROUP_KINDS){
  const p=AI_GROUP_PROFILES[kind];assert.ok(p.label&&p.motivation);
  const [a,b,c]=p.competenceCutoffs;assert.ok(0<=a&&a<=b&&b<=c&&c<=1);
  assert.equal(doctrineForGroup(kind),p.doctrine);
  const identity=npcIdentity(41,'actor','occupants','occupant','routine',kind);
  assert.deepEqual(identity,npcIdentity(41,'actor','occupants','occupant','routine',kind));
  assert.equal(identity.groupKind,kind);assert.equal(identity.motivation,p.motivation);
  for(const tier of AI_COMPETENCE)assert.equal(npcIdentity(41,'actor',undefined,undefined,undefined,kind,tier).competence,tier);
  assert.equal(npcIdentity(41,'actor','occupants','target','routine',kind).motivation,'avoid-capture');
 }
 assert.equal(npcGroupKind('organised','defensive'),'armed-irregulars');
 assert.equal(doctrineForGroup('regular-force'),'organised');
});
