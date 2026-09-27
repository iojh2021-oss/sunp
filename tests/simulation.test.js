import test from "node:test";
import assert from "node:assert/strict";
import { createWorld, stepWorld, snapshot, diagnostics, SPECIES, STAGES } from "../src/simulation.js";

test("world initializes all trophic roles and bounded resources",()=>{
 const w=createWorld(42),s=snapshot(w);
 assert.equal(SPECIES.length,7);
 assert.ok(s.total>=7);
 for(const key of ["water","soil","nutrients","biomass","energy"])assert.ok(s[key]>=0&&s[key]<=100);
});
test("same seed produces deterministic states",()=>{
 const a=createWorld(101),b=createWorld(101);
 for(let i=0;i<80;i++){stepWorld(a);stepWorld(b)}
 assert.deepEqual(snapshot(a),snapshot(b));
 assert.deepEqual(a.sun.q,b.sun.q);
});
test("long run keeps state finite and bounded",()=>{
 const w=createWorld(77);
 for(let i=0;i<1500;i++){
  stepWorld(w);
  assert.ok(Number.isFinite(w.sun.energy));
  assert.ok(w.sun.energy>=0&&w.sun.energy<=100);
  for(const k of ["water","soil","nutrients","biomass","detritus","oxygen"])
   assert.ok(Number.isFinite(w.environment[k])&&w.environment[k]>=0&&w.environment[k]<=100, k+" at tick "+w.tick);
  for(const e of w.entities){
   assert.ok(STAGES.includes(e.stage));
   assert.ok(Number.isFinite(e.health)&&e.health>=0&&e.health<=100);
   assert.ok(Number.isFinite(e.energy));
  }
 }
 const d=diagnostics(w);
 assert.ok(d.tick===1500);
 assert.ok(d.ecosystemScore>=0&&d.ecosystemScore<=100);
});
test("policy controller learns from scored outcomes",()=>{
 const w=createWorld(8);
 for(let i=0;i<100;i++)stepWorld(w);
 assert.ok(Object.keys(w.sun.q).length>0);
 assert.ok(["restore","conserve","balanced","diversify"].includes(w.sun.policy));
 assert.ok(w.sun.knowledge>0&&w.sun.level>=1);
});
