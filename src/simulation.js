// SunP ecosystem simulation: deterministic, inspectable symbolic model.
export const STAGES = ["seed","sprout","juvenile","adult","aging","return"];
export const SPECIES = [
 {key:"tree",name:"درخت",role:"producer",need:.5,lifespan:90,birthCost:8,color:"#65d66e"},
 {key:"flower",name:"گل",role:"producer",need:.35,lifespan:42,birthCost:4,color:"#f28bd6"},
 {key:"herbivore",name:"گیاه‌خوار",role:"consumer",need:1.1,lifespan:55,birthCost:7,color:"#e8c56a"},
 {key:"pollinator",name:"گرده‌افشان",role:"consumer",need:.65,lifespan:34,birthCost:4,color:"#ffd34e"},
 {key:"predator",name:"شکارچی",role:"consumer",need:1.5,lifespan:68,birthCost:12,color:"#ed785d"},
 {key:"fungus",name:"قارچ",role:"decomposer",need:.4,lifespan:48,birthCost:3,color:"#bda8f3"},
 {key:"aquatic",name:"آبزی",role:"consumer",need:.8,lifespan:46,birthCost:5,color:"#62d8ef"}
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function random(w){w.seed=(Math.imul(w.seed,1664525)+1013904223)>>>0;return w.seed/4294967296}
const pick=(w,a)=>a[Math.floor(random(w)*a.length)];
const spec=k=>SPECIES.find(s=>s.key===k)||SPECIES[0];
const alive=w=>w.entities.filter(e=>e.stage!=="return");
function log(w,text){w.events.unshift({tick:w.tick,text});if(w.events.length>70)w.events.pop()}
function addLife(w,key,source="sun",parent=null){
 const s=spec(key);if(w.sun.energy<s.birthCost||w.entities.length>=w.settings.populationCap)return false;
 const id=w.nextId++;
 w.sun.energy-=s.birthCost;
 w.entities.push({id,key,name:s.name,role:s.role,stage:"seed",age:0,energy:s.birthCost+2+random(w)*3,growth:0,health:65+random(w)*30,life:s.lifespan*(.8+random(w)*.5),x:random(w),y:random(w),parent,source,children:0,stress:0});
 if(parent){const p=w.entities.find(e=>e.id===parent);if(p)p.children++}
 w.stats.births++;log(w,s.name+" شماره "+id+" متولد شد.");return true;
}
export function createWorld(seed=2026){
 const w={tick:0,seed:seed>>>0,nextId:1,settings:{populationCap:120,seasonLength:40},sun:{level:1,energy:100,knowledge:0,health:100,policy:"balanced",memory:[],q:{},lastPolicy:null},environment:{season:0,temperature:22,light:.8,water:72,soil:70,nutrients:65,biomass:10,biodiversity:0,stability:60},entities:[],events:[],history:[],stats:{births:0,deaths:0,returns:0,extinctions:0}};
 ["tree","tree","flower","flower","herbivore","pollinator","predator","fungus","aquatic"].forEach(k=>addLife(w,k,"initial"));w.sun.energy=75;return w;
}
function evaluate(w){
 const l=alive(w),env=w.environment,plants=l.filter(e=>e.role==="producer").length,consumers=l.filter(e=>e.role==="consumer").length;
 const richness=new Set(l.map(e=>e.key)).size;
 const balance=clamp(100-Math.abs(plants*1.3-consumers*.9-5)*3-Math.abs(env.water-65)*.25-Math.abs(env.soil-65)*.2,0,100);
 const survival=l.length?l.filter(e=>e.health>25).length/l.length*100:0;
 return {living:l.length,plants,consumers,richness,balance,survival,score:balance*.45+survival*.3+richness/7*25};
}
function choosePolicy(w,m){
 const sun=w.sun,policies=["restore","conserve","balanced","diversify"];
 if(sun.lastPolicy){const q=sun.q[sun.lastPolicy]||{value:50,n:0};q.value+=(m.score-q.value)/(q.n+1);q.n++;sun.q[sun.lastPolicy]=q}
 let selected="balanced",best=-Infinity;
 for(const p of policies){
  const q=sun.q[p]||{value:50,n:0};
  const context=p==="restore"?(w.environment.soil<48||w.environment.water<42?15:0):p==="conserve"?(sun.energy<28?16:0):p==="diversify"?(m.richness<4?14:0):5;
  const value=q.value+8/Math.sqrt(q.n+1)+context+(random(w)-.5)*2;
  if(value>best){best=value;selected=p}
 }
 sun.lastPolicy=selected;sun.policy=selected;return selected;
}
function climate(w){
 const e=w.environment,s=Math.floor(w.tick/w.settings.seasonLength)%4;e.season=s;
 e.temperature=clamp(22+Math.sin(w.tick/18)*4+[0,5,1,-6][s],-5,45);
 e.light=clamp(.68+Math.sin(w.tick/24)*.18+[.1,.04,-.12,-.06][s],.15,1);
 e.water=clamp(e.water+[.15,.05,-.12,-.04][s]+(random(w)-.48)*1.6,0,100);
 e.soil=clamp(e.soil+.12,0,100);e.nutrients=clamp(e.nutrients+.08,0,100);
}
function interact(w){
 const l=alive(w),e=w.environment,plants=l.filter(x=>x.role==="producer"),herb=l.filter(x=>x.key==="herbivore"||x.key==="pollinator"),pred=l.filter(x=>x.key==="predator"),fungi=l.filter(x=>x.role==="decomposer");
 e.biomass=clamp(e.biomass+plants.length*.12-herb.length*.07,0,100);
 for(const p of plants){const gain=.22*e.light*(e.water/70)*(e.soil/70);p.energy=clamp(p.energy+gain,0,100);p.health=clamp(p.health+(gain>.12?.08:-.25),0,100);e.soil=clamp(e.soil-.035,0,100);e.water=clamp(e.water-.025,0,100)}
 for(const c of herb){const food=plants.length?.2:0,pressure=pred.length?.04:.12;c.energy+=food-pressure;c.health+=food>pressure?.1:-.25;if(plants.length&&random(w)<.012){const t=pick(w,plants);t.health-=2;t.energy-=.4}}
 for(const p of pred){const prey=herb.filter(x=>x.stage!=="return");p.energy+=prey.length?.18:-.16;p.health+=prey.length?.08:-.35;if(prey.length&&random(w)<.018){const t=pick(w,prey);t.health-=5;t.energy-=1}}
 for(const f of fungi){f.energy+=.08;e.nutrients=clamp(e.nutrients+.1,0,100);e.soil=clamp(e.soil+.06,0,100)}
}
function lifecycle(w){
 for(const e of w.entities){if(e.stage==="return")continue;e.age++;e.energy-=spec(e.key).need*.12;
  if(e.health<35)e.stress++;else e.stress=Math.max(0,e.stress-1);
  if(e.stage==="seed"&&e.age>=2)e.stage="sprout";
  else if(e.stage==="sprout"){e.growth=clamp(e.growth+.08,0,1);if(e.growth>=1)e.stage="juvenile"}
  else if(e.stage==="juvenile"&&e.age>=8)e.stage="adult";
  else if(e.stage==="adult"&&e.age>=e.life*.68)e.stage="aging";
  if(e.stage==="aging"&&(e.age>=e.life||e.health<=0||e.energy<=0)){e.stage="return";e.health=0;w.stats.deaths++;w.stats.returns++;w.sun.energy=clamp(w.sun.energy+Math.max(0,e.energy)*.25,0,100);w.environment.nutrients=clamp(w.environment.nutrients+2,0,100);log(w,e.name+" شماره "+e.id+"؛ بخشی از انرژی به خورشید و مواد به خاک بازگشت.")}
  if(e.energy<5)e.health-=.6;
 }
 w.entities=w.entities.filter(e=>e.stage!=="return"||e.age<e.life+8);
}
function reproduce(w,policy){
 const l=alive(w),plants=l.filter(e=>e.role==="producer"&&e.stage==="adult"),consumers=l.filter(e=>e.role==="consumer"&&e.stage==="adult");
 const interval=policy==="diversify"?6:policy==="conserve"?14:10;
 if(w.tick%interval||l.length>=w.settings.populationCap)return;
 if(plants.length&&w.environment.water>25&&w.environment.soil>25){const p=pick(w,plants);if(p.energy>10&&addLife(w,p.key,"offspring",p.id))p.energy-=2}
 if(consumers.length&&w.environment.biomass>25&&random(w)<.35){const p=pick(w,consumers);if(p.energy>14&&addLife(w,p.key,"offspring",p.id))p.energy-=3}
}
function solarPolicy(w,policy,m){
 const s=w.sun,e=w.environment;
 if(policy==="restore"){e.water=clamp(e.water+.65,0,100);e.soil=clamp(e.soil+.5,0,100);s.energy-=.8}
 else if(policy==="conserve"){s.energy=clamp(s.energy+2.4,0,100);e.light=clamp(e.light-.025,.15,1)}
 else if(policy==="diversify"){s.energy=clamp(s.energy+1.1,0,100);e.nutrients=clamp(e.nutrients+.25,0,100)}
 else s.energy=clamp(s.energy+1.5,0,100);
 s.knowledge+=.03+w.stats.returns*.001+m.richness*.005;s.level=1+Math.floor(s.knowledge/5);
 s.health=clamp(100-Math.max(0,30-m.score)*.35,20,100);
}
export function stepWorld(w){
 w.tick++;climate(w);const before=evaluate(w),policy=choosePolicy(w,before);
 solarPolicy(w,policy,before);interact(w);lifecycle(w);reproduce(w,policy);
 const m=evaluate(w);w.environment.biodiversity=m.richness;w.environment.stability=m.score;
 w.sun.memory.push({tick:w.tick,policy,score:Math.round(m.score),living:m.living,richness:m.richness});if(w.sun.memory.length>120)w.sun.memory.shift();
 w.history.push({tick:w.tick,score:Math.round(m.score),living:m.living,water:Math.round(w.environment.water),soil:Math.round(w.environment.soil),energy:Math.round(w.sun.energy)});if(w.history.length>180)w.history.shift();
 if(w.tick%12===0)log(w,"خورشید سیاست «"+policy+"» را برگزید؛ امتیاز پایداری "+Math.round(m.score)+" از ۱۰۰.");
 if(!alive(w).length&&w.sun.energy>20){addLife(w,"tree","recovery");log(w,"احیا: خورشید درخت بنیان‌گذار پدید آورد.")}
 return w;
}
export function snapshot(w){
 const m=evaluate(w),count=s=>w.entities.filter(e=>e.stage===s).length,speciesCounts={};
 for(const s of SPECIES)speciesCounts[s.key]=alive(w).filter(e=>e.key===s.key).length;
 return {tick:w.tick,energy:Math.round(w.sun.energy),level:w.sun.level,knowledge:+w.sun.knowledge.toFixed(1),birth:count("seed"),growth:count("sprout")+count("juvenile"),maturity:count("adult"),decline:count("aging"),returning:count("return"),total:m.living,balance:Math.round(m.score),water:Math.round(w.environment.water),soil:Math.round(w.environment.soil),nutrients:Math.round(w.environment.nutrients),biomass:Math.round(w.environment.biomass),temperature:Math.round(w.environment.temperature),season:["بهار","تابستان","پاییز","زمستان"][w.environment.season],policy:w.sun.policy,richness:m.richness,speciesCounts};
}
