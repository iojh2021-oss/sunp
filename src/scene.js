import { SPECIES } from "./simulation.js";
const ctx2d = canvas => canvas.getContext("2d");
const palette = Object.fromEntries(SPECIES.map(s=>[s.key,s.color]));
const glyph = {tree:"♣",flower:"✿",herbivore:"♞",pollinator:"✦",predator:"♌",fungus:"❋",aquatic:"≈"};
const zodiac=["حمل","ثور","جوزا","سرطان","اسد","سنبله","میزان","عقرب","قوس","جدی","دلو","حوت"];
const rand=(n)=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function attachScene(canvas, getWorld, getSelected, setSelected){
 const ctx=ctx2d(canvas);let w=0,h=0,dpr=1,raf=0,alive=true,start=performance.now();
 function resize(){const r=canvas.getBoundingClientRect();w=Math.max(320,r.width);h=Math.max(300,r.height);dpr=Math.min(devicePixelRatio||1,2);canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}
 function path(points){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]))}
 function glow(x,y,r,color){ctx.save();ctx.shadowColor=color;ctx.shadowBlur=r;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r*.25,0,Math.PI*2);ctx.fill();ctx.restore()}
 function drawSun(cx,cy,rad,t,world){
  const energy=clamp(world.sun.energy/100,.1,1);
  ctx.save();ctx.translate(cx,cy);
  for(let i=0;i<32;i++){const a=i*Math.PI/16+t*.03;ctx.strokeStyle=i%2?"#ffdf5570":"#ffb52d90";ctx.lineWidth=i%4===0?2:1;ctx.beginPath();ctx.moveTo(Math.cos(a)*(rad+5),Math.sin(a)*(rad+5));ctx.lineTo(Math.cos(a)*(rad+13+energy*9),Math.sin(a)*(rad+13+energy*9));ctx.stroke()}
  const g=ctx.createRadialGradient(-rad*.3,-rad*.35,2,0,0,rad*1.25);g.addColorStop(0,"#fff9b1");g.addColorStop(.35,"#ffd72e");g.addColorStop(.75,"#ff8b19");g.addColorStop(1,"#df3d11");
  ctx.fillStyle=g;ctx.shadowColor="#ffb52d";ctx.shadowBlur=30;ctx.beginPath();ctx.arc(0,0,rad,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  ctx.strokeStyle="#fff0a0";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,rad*.78,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle="#7e320b";ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="bold "+Math.max(11,rad*.9)+"px sans-serif";ctx.fillText("☼",0,1);
  ctx.restore();
 }
 function draw(t){
  const world=getWorld(),env=world.environment;ctx.clearRect(0,0,w,h);
  const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,"#050d2a");sky.addColorStop(.48,"#102b68");sky.addColorStop(1,"#062044");ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
  for(let i=0;i<95;i++){const x=rand(i+1)*w,y=rand(i+99)*h*.62;ctx.fillStyle="rgba(255,255,210,"+(.25+rand(i+4)*.65)+")";ctx.beginPath();ctx.arc(x,y,rand(i+9)*1.35+.35,0,Math.PI*2);ctx.fill()}
  const cx=w*.5,cy=h*.25,R=Math.min(w*.25,Math.max(76,h*.22)),sunR=Math.max(23,R*.24);
  // orbital rings and zodiac sectors
  for(let ring=0;ring<3;ring++){ctx.strokeStyle=["#f4bd4380","#54ddff65","#c0a6ff40"][ring];ctx.lineWidth=ring===0?2:1;ctx.beginPath();ctx.ellipse(cx,cy,R*(1+ring*.18),R*(.65+ring*.13),0,0,Math.PI*2);ctx.stroke()}
  for(let i=0;i<12;i++){const a=-Math.PI/2+i*Math.PI/6,rr=R*1.02;const x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr*.65;
   ctx.fillStyle="#101d4b";ctx.strokeStyle="#ffcf4e";ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,Math.max(12,R*.105),0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.fillStyle="#fff2b4";ctx.font="bold "+Math.max(9,R*.08)+"px Vazirmatn,Tahoma,sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(zodiac[i],x,y);
  }
  // energy paths from sun to world and return stream
  for(let k=0;k<5;k++){ctx.beginPath();ctx.strokeStyle=k%2?"#54eaff80":"#ffda5780";ctx.lineWidth=1.2;ctx.moveTo(cx+(k-2)*sunR*.3,cy+sunR);ctx.bezierCurveTo(cx+(k-2)*R*.4,cy+R*.8,cx+(k-2)*R*.7,h*.58,w*(.22+k*.14),h*.78);ctx.stroke()}
  drawSun(cx,cy,sunR,t,world);
  // floating horizon and distant mountains
  ctx.fillStyle="#172f62";ctx.beginPath();ctx.moveTo(0,h*.67);for(let i=0;i<=12;i++){const x=i*w/12;ctx.lineTo(x,h*(.62+rand(i+23)*.12))}ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();
  // floating island body
  const groundY=h*.72;
  ctx.fillStyle="#214d68";ctx.beginPath();ctx.moveTo(w*.08,groundY);ctx.quadraticCurveTo(w*.5,groundY-h*.13,w*.92,groundY);ctx.lineTo(w*.78,h*.9);ctx.lineTo(w*.28,h*.91);ctx.closePath();ctx.fill();
  const grass=ctx.createLinearGradient(0,groundY-h*.13,0,h*.87);grass.addColorStop(0,"#8bd94c");grass.addColorStop(.45,"#358b43");grass.addColorStop(1,"#174d46");
  ctx.fillStyle=grass;ctx.beginPath();ctx.ellipse(cx,groundY,w*.43,h*.12,0,0,Math.PI*2);ctx.fill();
  // stream
  ctx.strokeStyle="#42dfff";ctx.lineWidth=Math.max(7,h*.025);ctx.beginPath();ctx.moveTo(w*.08,h*.82);ctx.bezierCurveTo(w*.32,h*.75,w*.6,h*.9,w*.92,h*.8);ctx.stroke();
  ctx.strokeStyle="#c2ffff";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(w*.1,h*.82);ctx.bezierCurveTo(w*.32,h*.76,w*.6,h*.89,w*.9,h*.8);ctx.stroke();
  // central life tree with glowing energy trunk and branches
  const treeX=cx,treeBase=h*.75,treeTop=h*.39,treeW=Math.min(w*.19,90);
  ctx.lineCap="round";ctx.strokeStyle="#a86a31";ctx.lineWidth=Math.max(7,treeW*.13);ctx.beginPath();ctx.moveTo(treeX,treeBase);ctx.bezierCurveTo(treeX-treeW*.15,treeBase-h*.1,treeX+treeW*.1,treeTop+h*.16,treeX,treeTop);ctx.stroke();
  ctx.strokeStyle="#ffe56b";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(treeX,treeBase);ctx.bezierCurveTo(treeX-treeW*.15,treeBase-h*.1,treeX+treeW*.1,treeTop+h*.16,treeX,treeTop);ctx.stroke();
  const branches=[[-1,-.8],[-1.15,-.4],[-.8,-.15],[1,-.75],[1.2,-.42],[.8,-.12],[-.45,-1.05],[.45,-1.08]];
  branches.forEach((b,i)=>{const x=treeX+b[0]*treeW,y=treeTop+Math.abs(b[0])*.07*h;ctx.strokeStyle="#b87937";ctx.lineWidth=treeW*.07;ctx.beginPath();ctx.moveTo(treeX,treeTop+h*.2);ctx.quadraticCurveTo(treeX+b[0]*treeW*.3,treeTop+h*.05,x,y);ctx.stroke();ctx.fillStyle=i%2?"#57c85c":"#91e95c";ctx.beginPath();ctx.ellipse(x,y,treeW*.2,treeW*.14,b[0],0,Math.PI*2);ctx.fill();glow(x,y,12,"#79ff7c")});
  // symbolic three pillars / life channels
  const pillarY=h*.69;[-1,0,1].forEach((v,i)=>{const x=cx+v*treeW*.85;ctx.fillStyle=["#e6a52f","#43cfe9","#e64d50"][i];ctx.globalAlpha=.85;ctx.fillRect(x-7,pillarY,14,h*.12);ctx.globalAlpha=1;ctx.strokeStyle="#fff0a0";ctx.strokeRect(x-7,pillarY,14,h*.12);glow(x,pillarY,13,["#ffca4c","#52eaff","#ff6666"][i])});
  // living entities: location, growth size and phase determine rendering
  const entities=world.entities.filter(e=>e.stage!=="return");
  for(const e of entities){
   const x=w*(.16+e.x*.68),y=h*(.62+e.y*.2),pulse=1+Math.sin(t/250+e.id)*.08;
   const size=(e.key==="tree"?10:e.key==="predator"?9:7)*(0.45+e.growth*.75)*pulse;
   const color=palette[e.key]||"#fff";ctx.save();ctx.translate(x,y);
   if(e.stage==="seed"){ctx.fillStyle="#ffdf69";ctx.beginPath();ctx.ellipse(0,0,size*.55,size,0,0,Math.PI*2);ctx.fill()}
   else if(e.key==="tree"){ctx.fillStyle="#6d4827";ctx.fillRect(-size*.18,0,size*.36,size*1.5);ctx.fillStyle=color;ctx.beginPath();ctx.arc(0,-size*.35,size,0,Math.PI*2);ctx.fill()}
   else if(e.key==="flower"){ctx.fillStyle="#5fd36d";ctx.fillRect(-1,0,2,size*1.4);ctx.fillStyle=color;for(let p=0;p<5;p++){const a=p*Math.PI*2/5;ctx.beginPath();ctx.arc(Math.cos(a)*size*.55,-size*.3+Math.sin(a)*size*.55,size*.42,0,Math.PI*2);ctx.fill()}ctx.fillStyle="#ffd95c";ctx.beginPath();ctx.arc(0,-size*.3,size*.25,0,Math.PI*2);ctx.fill()}
   else {ctx.fillStyle=color;ctx.font="bold "+(size*2.2)+"px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(glyph[e.key]||"•",0,0)}
   if(e.stage==="aging"){ctx.strokeStyle="#d8d8e5";ctx.setLineDash([2,2]);ctx.beginPath();ctx.arc(0,0,size*1.6,0,Math.PI*2);ctx.stroke()}
   if(getSelected()===e.id){ctx.strokeStyle="#fff";ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,size*2.1,0,Math.PI*2);ctx.stroke()}
   ctx.restore();
  }
  // returns rise to solar core
  const returns=world.entities.filter(e=>e.stage==="return");
  returns.slice(0,12).forEach((e,i)=>{const p=(t/1400+i*.17)%1,x=w*(.2+e.x*.6),y=h*(.72-p*.5);ctx.fillStyle="#fff2a0";ctx.beginPath();ctx.arc(x+Math.sin(t/300+i)*10,y,2.5,0,Math.PI*2);ctx.fill()});
  // overlays
  ctx.fillStyle="#06142ccc";ctx.strokeStyle="#4e80b7";ctx.lineWidth=1;roundRect(ctx,12,12,Math.min(210,w*.42),56,10);ctx.fill();ctx.stroke();
  ctx.fillStyle="#e9f3ff";ctx.textAlign="right";ctx.textBaseline="middle";ctx.font="bold 12px Vazirmatn,Tahoma,sans-serif";ctx.fillText("فصل "+["بهار","تابستان","پاییز","زمستان"][env.season],Math.min(210,w*.42),31);
  ctx.font="11px Vazirmatn,Tahoma,sans-serif";ctx.fillStyle="#9deeff";ctx.fillText("نور "+Math.round(env.light*100)+"٪ · آب "+Math.round(env.water)+"٪",Math.min(210,w*.42),51);
 }
 function roundRect(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r)}
 function loop(now){if(!alive)return;draw(now-start);raf=requestAnimationFrame(loop)}
 const observer=new ResizeObserver(resize);observer.observe(canvas);resize();raf=requestAnimationFrame(loop);
 canvas.addEventListener("click",e=>{const rect=canvas.getBoundingClientRect(),px=(e.clientX-rect.left)/rect.width,py=(e.clientY-rect.top)/rect.height;const list=getWorld().entities.filter(x=>x.stage!=="return");let best=null,dist=.03;for(const item of list){const dx=px-(.16+item.x*.68),dy=py-(.62+item.y*.2),d=dx*dx+dy*dy;if(d<dist){dist=d;best=item}}setSelected(best?best.id:null)});
 return ()=>{alive=false;cancelAnimationFrame(raf);observer.disconnect()};
}
