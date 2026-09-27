import { createWorld, stepWorld, snapshot } from './simulation.js';
let world=createWorld(), running=false, timer=null, speed=1;
const el=id=>document.getElementById(id);
const fa=n=>new Intl.NumberFormat('fa-IR').format(n);
function render(){
 const s=snapshot(world);
 const cards=[['گام شبیه‌سازی',fa(s.tick)],['سطح خورشید',fa(s.level)],['دانش نمادین',fa(s.knowledge)],['انرژی خورشید',fa(s.energy)+'٪'],['جمعیت حاضر',fa(s.total)],['توازن اکوسیستم',fa(s.balance)+'٪']];
 el('stats').innerHTML=cards.map(x=>'<div class="stat"><span>'+x[0]+'</span><strong>'+x[1]+'</strong></div>').join('');
 const phases=[['تولد','birth'],['رشد','growth'],['بلوغ','maturity'],['افول','decline'],['بازگشت','return']];
 el('population').innerHTML=phases.map(x=>'<div class="phase"><span>'+x[0]+'</span><strong>'+fa(s[x[1]])+'</strong></div>').join('');
 el('events').innerHTML=world.events.slice(0,14).map(e=>'<li>گام '+fa(e.tick)+': '+e.message+'</li>').join('')||'<li>هنوز رویدادی ثبت نشده است.</li>';
}
function step(){stepWorld(world);render()}
function stop(){running=false;clearInterval(timer);timer=null;el('toggle').textContent='▶ شروع'}
function start(){if(running)return;running=true;el('toggle').textContent='Ⅱ توقف';timer=setInterval(()=>{for(let i=0;i<speed;i++)step()},700)}
el('toggle').addEventListener('click',()=>running?stop():start());
el('step').addEventListener('click',()=>{stop();step()});
el('reset').addEventListener('click',()=>{stop();world=createWorld();render()});
el('speed').addEventListener('input',e=>{speed=Number(e.target.value);el('speedVal').textContent=fa(speed)+'×';if(running){stop();start()}});
render();
