import { createWorld, stepWorld, snapshot, SPECIES } from './simulation.js';
import { attachScene } from './scene.js';
let world=createWorld(),running=false,timer=null,speed=1,selectedId=null;
const el=id=>document.getElementById(id),fa=n=>new Intl.NumberFormat('fa-IR').format(n);
attachScene(el('world'),()=>world,()=>selectedId,id=>{selectedId=id;renderDetail()});
function renderDetail(){
 const target=world.entities.find(e=>e.id===selectedId),box=el('entityDetail');
 if(!target){box.textContent='برای مشاهده جزئیات، روی یکی از موجودات کلیک کن.';return}
 const stages={seed:'تولد',sprout:'جوانه',juvenile:'نابالغ',adult:'بالغ',aging:'پیری',return:'بازگشت'};
 box.innerHTML='<strong>'+target.name+' شماره '+fa(target.id)+'</strong><span>مرحله: '+stages[target.stage]+'</span><span>سن: '+fa(target.age)+'</span><span>انرژی: '+fa(Math.round(target.energy))+'</span><span>سلامت: '+fa(Math.round(target.health))+'٪</span><span>رشد: '+fa(Math.round(target.growth*100))+'٪</span><span>فرزندان: '+fa(target.children)+'</span>';
}
function render(){
 const s=snapshot(world);
 const cards=[['گام',fa(s.tick)],['سطح خورشید',fa(s.level)],['دانش خورشید',fa(s.knowledge)],['انرژی خورشید',fa(s.energy)+'٪'],['جمعیت زنده',fa(s.total)],['پایداری',fa(s.balance)+'٪'],['آب',fa(s.water)+'٪'],['خاک',fa(s.soil)+'٪'],['تنوع گونه‌ای',fa(s.richness)+'/۷'],['فصل',s.season]];
 el('stats').innerHTML=cards.map(x=>'<div class="stat"><span>'+x[0]+'</span><strong>'+x[1]+'</strong></div>').join('');
 const stages=[['تولد','birth'],['رشد','growth'],['بلوغ','maturity'],['افول','decline'],['بازگشت','returning']];
 el('population').innerHTML=stages.map(x=>'<div class="phase"><span>'+x[0]+'</span><strong>'+fa(s[x[1]])+'</strong></div>').join('');
 el('species').innerHTML=SPECIES.map(sp=>'<div class="species"><i style="background:'+sp.color+'"></i><span>'+sp.name+'</span><b>'+fa(s.speciesCounts[sp.key])+'</b></div>').join('');
 el('policy').textContent=({restore:'ترمیم محیط',conserve:'صرفه‌جویی انرژی',balanced:'تعادل',diversify:'تنوع زیستی'})[s.policy]||s.policy;
 el('events').innerHTML=world.events.slice(0,14).map(e=>'<li>گام '+fa(e.tick)+': '+e.text+'</li>').join('')||'<li>هنوز رویدادی ثبت نشده است.</li>';
 el('history').innerHTML=world.history.slice(-50).map(h=>'<div class="bar" title="گام '+h.tick+' · پایداری '+h.score+'%" style="height:'+Math.max(3,h.score)+'%"></div>').join('');
 renderDetail();
}
function step(){stepWorld(world);render()}
function stop(){running=false;clearInterval(timer);timer=null;el('toggle').textContent='▶ شروع'}
function start(){if(running)return;running=true;el('toggle').textContent='Ⅱ توقف';timer=setInterval(()=>{for(let i=0;i<speed;i++)step()},700)}
el('toggle').addEventListener('click',()=>running?stop():start());
el('step').addEventListener('click',()=>{stop();step()});
el('reset').addEventListener('click',()=>{stop();world=createWorld();selectedId=null;render()});
el('speed').addEventListener('input',e=>{speed=Number(e.target.value);el('speedVal').textContent=fa(speed)+'×';if(running){stop();start()}});
render();
