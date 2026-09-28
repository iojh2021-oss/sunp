import readline from "node:readline";
import {createWorld,step,getSunObservation,SUN_POLICIES} from "../src/simulation.js";
let world=null,steps=0,maxSteps=600;
const rl=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
function reply(x){process.stdout.write(JSON.stringify(x)+"\n");}
for await (const line of rl){
 try{
  const m=JSON.parse(line);
  if(m.type==="reset"){
   world=createWorld(Number(m.seed)||1);steps=0;maxSteps=Number(m.maxSteps)||600;
   reply({observation:getSunObservation(world),tick:world.tick});continue;
  }
  if(m.type==="step"){
   if(!world)throw new Error("reset required");
   const action=Math.max(0,Math.min(SUN_POLICIES.length-1,Number(m.action)||0));
   step(world,{policyOverride:SUN_POLICIES[action],learn:false});steps++;
   reply({observation:getSunObservation(world),reward:Number(world.lastReward)||0,terminated:world.population.length===0, truncated:steps>=maxSteps,health:world.healthIndex,population:world.population.length,richness:new Set(world.population.map(e=>e.species)).size});
  }
 }catch(e){reply({error:String(e)});}
}
