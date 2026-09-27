// SunP: deterministic ecological simulation with a contextual adaptive controller.
// Values are abstract simulation units, not physical measurements.
export const STAGES=["seed","sprout","juvenile","adult","aging","return"];
export const SPECIES=[
 {key:"tree",name:"درخت",role:"producer",diet:[],need:.28,life:150,cost:7,rate:.18,capacity:1.2,color:"#65d66e"},
 {key:"flower",name:"گل",role:"producer",diet:[],need:.2,life:75,cost:3,rate:.28,capacity:.8,color:"#f28bd6"},
 {key:"herbivore",name:"گیاه‌خوار",role:"consumer",diet:["tree","flower"],need:.7,life:92,cost:6,rate:.1,capacity:1,color:"#e8c56a"},
 {key:"pollinator",name:"گرده‌افشان",role:"consumer",diet:["flower"],need:.38,life:60,cost:3,rate:.15,capacity:.7,color:"#ffd34e"},
 {key:"predator",name:"شکارچی",role:"consumer",diet:["herbivore","pollinator","aquatic"],need:.9,life:115,cost:10,rate:.06,capacity:.85,color:"#ed785d"},
 {key:"fungus",name:"قارچ",role:"decomposer",diet:["detritus"],need:.22,life:80,cost:2,rate:.2,capacity:1.1,color:"#bda8f3"},
 {key:"aquatic",name:"آبزی",role:"consumer",diet:["algae","detritus"],need:.52,life:80,cost:5,rate:.12,capacity:.9,color:"#62d8ef"}
];
const POLICIES=["restore","conserve","balanced","diversify"];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const getSpec=k=>SPECIES.find(s=>s.key===k)||SPECIES[0];
const live=w=>w.entities.filter(e=>e.stage!=="return");
function rnd(w){w.seed=(Math.imul(w.seed,1664525)+1013904223)>>>0;return w.seed/4294967296}
function pick(w,a){return a.length?a[Math.floor(rnd(w)*a.length)]:null}
function log(w,text){w.events.unshift({tick:w.tick,text});if(w.events.length>80)w.events.pop()}
function addEntity(w,key,source="sun",parent=null){
 const sp=getSpec(key);if(w.sun.energy<sp.cost||live(w).length>=w.settings.populationCap)return false;
 const id=w.nextId++;w.sun.energy-=sp.cost;
 const e={id,key,name:sp.name,role:sp.role,stage:"seed",age:0,energy:sp.cost+2+rnd(w)*3,health:75+rnd(w)*25,growth:0,life:sp.life*(.85+rnd(w)*.3),x:rnd(w),y:rnd(w),parent,source,children:0,stress:0,biomass:sp.capacity*.25,foodNeed:sp.need};
 w.entities.push(e);if(parent){const p=w.entities.find(x=>x.id===parent);if(p)p.children++}
 w.stats.births++;log(w,sp.name+" شماره "+id+" متولد شد.");return true;
}
export function createWorld(seed=2026){
 const w={tick:0,seed:seed>>>0,nextId:1,settings:{populationCap:160,seasonLength:48},sun:{level:1,energy:100,knowledge:0,health:100,policy:"balanced",memory:[],q:{},lastPolicy:null,lastScore:null,confidence:0},environment:{season:0,temperature:22,light:.8,water:72,soil:70,nutrients:65,biomass:18,detritus:8,oxygen:70,biodiversity:0,stability:60},entities:[],events:[],history:[],stats:{births:0,deaths:0,returns:0,extinctions:0}};
 ["tree","tree","flower","flower","herbivore","pollinator","predator","fungus","aquatic"].forEach(k=>addEntity(w,k,"origin"));w.sun.energy=72;return w;
}
function measure(w){
 const a=live(w),env=w.environment,counts={};for(const sp of SPECIES)counts[sp.key]=a.filter(e=>e.key===sp.key).length;
 const producers=counts.tree+counts.flower,consumers=counts.herbivore+counts.pollinator+counts.predator+counts.aquatic;
 const richness=Object.values(counts).filter(n=>n>0).length;
 const health=mean(a.map(e=>e.health)),resource=mean([env.water,env.soil,env.nutrients,env.biomass]);
 const foodRatio=producers?clamp((producers+env.biomass*.12)/(consumers+1),0,1):0;
 const populationHealth=a.length?clamp(health,0,100):0;
 const balance=clamp(100-Math.abs(producers*1.15-consumers*.9-3)*4-Math.abs(env.water-62)*.22-Math.abs(env.soil-65)*.2,0,100);
 const score=clamp(balance*.28+populationHealth*.25+resource*.2+foodRatio*100*.17+(richness/7)*100*.1,0,100);
 return {living:a.length,counts,producers,consumers,richness,health:populationHealth,resource,foodRatio,balance,score};
}
function context(w,m){const e=w.environment;return {water:e.water,soil:e.soil,energy:w.sun.energy,richness:m.richness,score:m.score,food:m.foodRatio,pop:m.living,stress:mean(live(w).map(x=>x.stress))}}
function policyEffect(p,c){switch(p){case"restore":return (Math.max(0,58-c.water)*.34+Math.max(0,55-c.soil)*.28+Math.max(0,45-c.food)*.18)-Math.max(0,c.energy-75)*.05;case"conserve":return Math.max(0,45-c.energy)*.45+Math.max(0,35-c.water)*.12;case"diversify":return Math.max(0,5-c.richness)*5+Math.max(0,4-c.pop/22)*1.5;default:return 5-Math.abs(c.score-72)*.04}}
function choosePolicy(w,m){
 const c=context(w,m),sun=w.sun;
 // Credit the previous decision only after the ecosystem has had time to respond.
 if(sun.lastPolicy&&sun.lastScore!==null){
  const reward=clamp((m.score-sun.lastScore)*.8+policyEffect(sun.lastPolicy,c),-20,20);
  const q=sun.q[sun.lastPolicy]||(sun.q[sun.lastPolicy]={value:0,n:0});
  q.n++;q.value+= (reward-q.value)/q.n;
 }
 let selected="balanced",best=-Infinity;
 for(const p of POLICIES){
  const q=sun.q[p]||{value:0,n:0};
  const explore=9/Math.sqrt(q.n+1);
  const value=q.value+explore+policyEffect(p,c)*.35+(rnd(w)-.5)*.4;
  if(value>best){best=value;selected=p}
 }
 sun.lastPolicy=selected;sun.lastScore=m.score;sun.policy=selected;
 return selected;
}
function climate(w){
 const e=w.environment,s=Math.floor(w.tick/w.settings.seasonLength)%4;e.season=s;
 const seasonal=[0,5,1,-6][s];
 e.temperature=clamp(20+Math.sin(w.tick/21)*4+seasonal,-8,43);
 e.light=clamp(.68+Math.sin(w.tick/27)*.15+[.1,.03,-.12,-.08][s],.12,1);
 const rain=[.55,-.15,.05,.4][s];
 e.water=clamp(e.water+rain+(rnd(w)-.5)*1.2,0,100);
 e.soil=clamp(e.soil+.04,0,100);
 e.nutrients=clamp(e.nutrients+.025,0,100);
 e.oxygen=clamp(e.oxygen+.04,0,100);
}
function applySunPolicy(w,p){
 const e=w.environment,s=w.sun;
 if(p==="restore"){e.water=clamp(e.water+.55,0,100);e.soil=clamp(e.soil+.4,0,100);e.nutrients=clamp(e.nutrients+.25,0,100);s.energy-=.65}
 else if(p==="conserve"){s.energy=clamp(s.energy+1.9,0,100);e.light=clamp(e.light-.018,.12,1)}
 else if(p==="diversify"){e.nutrients=clamp(e.nutrients+.3,0,100);s.energy=clamp(s.energy+.7,0,100)}
 else s.energy=clamp(s.energy+1.2,0,100);
}
function photosynthesis(w){
 const e=w.environment,plants=live(w).filter(x=>x.role==="producer");
 let total=0;
 for(const p of plants){
  const sp=getSpec(p.key),water=clamp(e.water/65,0,1.25),soil=clamp(e.soil/60,0,1.25),temp=clamp(1-Math.abs(e.temperature-22)/35,.15,1);
  const produced=sp.rate*e.light*water*soil*temp*(.25+p.growth);
  p.energy=clamp(p.energy+produced,0,100);p.biomass=clamp(p.biomass+produced*.7,0,sp.capacity*4);p.health=clamp(p.health+(produced>.08?.09:-.3),0,100);
  total+=produced;e.soil=clamp(e.soil-.025,0,100);e.water=clamp(e.water-.018,0,100);
 }
 e.biomass=clamp(e.biomass+total*.65,0,100);
}
function feedAndPredate(w){
 const a=live(w),e=w.environment;
 const producers=a.filter(x=>x.role==="producer"),decomposers=a.filter(x=>x.role==="decomposer");
 const consumers=a.filter(x=>x.role==="consumer");
 // Consumers feed according to their explicit trophic links; food is depleted from local biomass.
 for(const c of consumers){
  const sp=getSpec(c.key),food=sp.diet.map(k=>a.filter(x=>x.key===k&&x.stage!=="seed")).flat();
  let intake=0;
  if(food.length){
   const target=pick(w,food);
   if(target){const amount=Math.min(.22,target.biomass||.05);target.biomass=Math.max(0,target.biomass-amount);target.health=clamp(target.health-(c.key==="herbivore"?.45:.2),0,100);intake=amount*1.5}
  }else if(sp.diet.includes("algae"))intake=Math.min(.08,e.biomass*.008);
  else if(sp.diet.includes("detritus"))intake=Math.min(.1,e.detritus*.012);
  c.energy+=intake-sp.need*.12;c.health=clamp(c.health+(intake>=sp.need*.12?.12:-.42),0,100);
  if(c.energy<3)c.stress++;else c.stress=Math.max(0,c.stress-1);
 }
 // Decomposition returns dead organic matter to soil/nutrients.
 for(const f of decomposers){
  const intake=Math.min(.18,e.detritus*.02);e.detritus=Math.max(0,e.detritus-intake);
  f.energy+=intake*.7-.025;e.nutrients=clamp(e.nutrients+intake*.35,0,100);e.soil=clamp(e.soil+intake*.2,0,100);
 }
 e.biomass=clamp(e.biomass-producers.reduce((s,p)=>s+.012,0),0,100);
}
function lifecycle(w){
 for(const e of w.entities){
  if(e.stage==="return")continue;
  e.age++;e.energy-=getSpec(e.key).need*.08;
  e.growth=clamp(Math.max(e.growth,e.age/Math.max(1,e.life)),0,1);
  e.x=clamp(e.x+Math.sin((w.tick+e.id)*.13)*.0015,.04,.96);
  e.y=clamp(e.y+Math.cos((w.tick+e.id)*.11)*.0012,.04,.96);
  if(e.health<32)e.stress++;else e.stress=Math.max(0,e.stress-1);
  if(e.stage==="seed"&&e.age>=2)e.stage="sprout";
  else if(e.stage==="sprout"&&e.growth>=.12)e.stage="juvenile";
  else if(e.stage==="juvenile"&&e.age>=Math.max(7,e.life*.12))e.stage="adult";
  else if(e.stage==="adult"&&e.age>=e.life*.68)e.stage="aging";
  if(e.energy<2||e.health<=0||e.age>=e.life){
   e.stage="return";e.health=0;w.stats.deaths++;w.stats.returns++;
   w.sun.energy=clamp(w.sun.energy+Math.max(0,e.energy)*.12,0,100);
   w.environment.detritus=clamp(w.environment.detritus+Math.max(.1,e.biomass),0,100);
   w.environment.nutrients=clamp(w.environment.nutrients+.6,0,100);
   log(w,e.name+" شماره "+e.id+" از چرخه زیستی خارج شد؛ زیست‌توده به مواد مغذی بازگشت.");
  }
 }
 w.entities=w.entities.filter(e=>e.stage!=="return"||e.age<e.life+10);
}
function reproduce(w,policy){
 const a=live(w);if(a.length>=w.settings.populationCap||w.tick% (policy==="diversify"?7:policy==="conserve"?15:11)!==0)return;
 const adults=a.filter(e=>e.stage==="adult"&&e.health>55&&e.energy>getSpec(e.key).cost*1.8);
 if(!adults.length)return;
 const producers=adults.filter(e=>e.role==="producer"),consumers=adults.filter(e=>e.role==="consumer");
 if(producers.length&&w.environment.water>25&&w.environment.soil>25&&w.environment.nutrients>20){
  const p=pick(w,producers);if(p&&rnd(w)<.55&&addEntity(w,p.key,"offspring",p.id)){p.energy-=1.5;w.environment.nutrients=clamp(w.environment.nutrients-.3,0,100)}
 }
 if(consumers.length&&w.environment.biomass>18&&rnd(w)<.22){
  const p=pick(w,consumers);if(p&&addEntity(w,p.key,"offspring",p.id))p.energy-=2;
 }
}
export function stepWorld(w){
 w.tick++;climate(w);const before=measure(w),policy=choosePolicy(w,before);
 applySunPolicy(w,policy);photosynthesis(w);feedAndPredate(w);lifecycle(w);reproduce(w,policy);
 const m=measure(w);w.environment.biodiversity=m.richness;w.environment.stability=m.score;
 w.sun.knowledge+=.025+m.richness*.004+w.stats.returns*.0005;w.sun.level=1+Math.floor(w.sun.knowledge/6);
 w.sun.health=clamp(100-Math.max(0,45-m.score)*.6,15,100);
 w.sun.confidence=clamp(mean(POLICIES.map(p=>Math.min(1,(w.sun.q[p]?.n||0)/12)))*100,0,100);
 w.sun.memory.push({tick:w.tick,policy,score:Math.round(m.score),living:m.living,richness:m.richness});if(w.sun.memory.length>160)w.sun.memory.shift();
 w.history.push({tick:w.tick,score:Math.round(m.score),living:m.living,water:Math.round(w.environment.water),soil:Math.round(w.environment.soil),energy:Math.round(w.sun.energy)});if(w.history.length>220)w.history.shift();
 if(w.tick%12===0)log(w,"خورشید سیاست «"+policy+"» را برگزید؛ پایداری "+Math.round(m.score)+"٪.");
 if(!live(w).length&&w.sun.energy>18){addEntity(w,"tree","recovery");log(w,"احیای اکوسیستم: خورشید درخت بنیان‌گذار پدید آورد.")}
 return w;
}
export function snapshot(w){
 const m=measure(w),count=s=>w.entities.filter(e=>e.stage===s).length,speciesCounts={};
 for(const sp of SPECIES)speciesCounts[sp.key]=live(w).filter(e=>e.key===sp.key).length;
 return {tick:w.tick,energy:Math.round(w.sun.energy),level:w.sun.level,knowledge:+w.sun.knowledge.toFixed(1),birth:count("seed"),growth:count("sprout")+count("juvenile"),maturity:count("adult"),decline:count("aging"),returning:count("return"),total:m.living,balance:Math.round(m.score),water:Math.round(w.environment.water),soil:Math.round(w.environment.soil),nutrients:Math.round(w.environment.nutrients),biomass:Math.round(w.environment.biomass),temperature:Math.round(w.environment.temperature),season:["بهار","تابستان","پاییز","زمستان"][w.environment.season],policy:w.sun.policy,richness:m.richness,speciesCounts};
}
export function diagnostics(w){
 const m=measure(w),a=live(w);
 return {tick:w.tick,population:m.living,speciesRichness:m.richness,ecosystemScore:+m.score.toFixed(2),meanHealth:+m.health.toFixed(2),foodAvailability:+m.foodRatio.toFixed(2),sunPolicy:w.sun.policy,policyValues:Object.fromEntries(POLICIES.map(p=>[p,{...w.sun.q[p]}])),resourceState:{...w.environment},species:Object.fromEntries(SPECIES.map(s=>[s.key,a.filter(e=>e.key===s.key).length]))};
}
