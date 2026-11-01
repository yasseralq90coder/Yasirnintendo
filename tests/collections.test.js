import test from 'node:test';
import assert from 'node:assert/strict';
import {collectionParent,collectionChildren,collectionSources,isCollectionGame} from '../legacy-library.js';
const fixture=()=>({games:[
 {id:'pack',legacyId:'legacy-pack',title:'Crash Bandicoot N. Sane Trilogy',platform:'Switch'},
 {id:'official',title:'Crash Bandicoot™ N. Sane Trilogy',platform:'Switch',nintendoKey:'account|title|HAC'},
 {id:'child',title:'Crash Bandicoot',platform:'Switch',parentLegacyId:'legacy-pack',completionHistory:[{id:'finish',count:2,minutes:120}]},
 {id:'other-edition',title:'Crash Bandicoot',platform:'Switch 2',parentLegacyId:'legacy-pack'}
]});
test('backup parent resolves even when shell flag was false',()=>{const s=fixture();assert.equal(collectionParent(s,s.games[2]).id,'pack');assert.ok(isCollectionGame(s,s.games[0]));});
test('official collection exposes backup children without copying playtime or completions',()=>{const s=fixture(),before=JSON.stringify(s);assert.deepEqual(collectionChildren(s,s.games[1]).map(g=>g.id),['child']);assert.deepEqual(collectionSources(s,s.games[0]).map(g=>g.id),['official']);assert.equal(JSON.stringify(s),before);assert.equal(s.games[2].nintendoKey,undefined);});
test('edition mismatch and ambiguous backup IDs are never guessed',()=>{const s=fixture();assert.equal(collectionParent(s,s.games[3]),null);s.games.push({...s.games[0],id:'duplicate'});assert.equal(collectionParent(s,s.games[2]),null);});
test('Sonic collection alias is exact and does not match Sonic standalone titles',()=>{const s={games:[{id:'p',legacyId:'p',title:'Sonic shadow generations',platform:'Switch 2'},{id:'o',title:'SONIC X SHADOW GENERATIONS',platform:'Switch 2'},{id:'c',title:'Sonic generations',parentLegacyId:'p',platform:'Switch 2'},{id:'s',title:'Sonic Superstars',platform:'Switch 2'}]};assert.equal(collectionChildren(s,s.games[1])[0].id,'c');assert.equal(collectionChildren(s,s.games[3]).length,0);});
test('Metal Gear Solid standalone is distinct from original Metal Gear',()=>{const s={games:[{id:'p',legacyId:'p',title:'Metal Gear Solid: Master Collection Vol. 1',platform:'Switch'},{id:'mg',title:'Metal Gear',parentLegacyId:'p',platform:'Switch'},{id:'mgs',title:'Metal Gear Solid',parentLegacyId:'p',platform:'Switch'}]};assert.equal(collectionChildren(s,s.games[0]).length,2);assert.equal(isCollectionGame(s,s.games[1]),false);assert.equal(isCollectionGame(s,s.games[2]),false);});
