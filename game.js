'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const ui = {
  lie: document.getElementById('lie'), distance: document.getElementById('distance'), wind: document.getElementById('wind'),
  stroke: document.getElementById('stroke'), score: document.getElementById('score'), instruction: document.getElementById('instruction'),
  shotPanel: document.getElementById('shotPanel'), club: document.getElementById('clubButton'), overview: document.getElementById('overviewButton'),
  reset: document.getElementById('resetButton'), swingZone: document.getElementById('swingZone'), thumb: document.getElementById('swingThumb'),
  load: document.getElementById('load'), tempo: document.getElementById('tempo'), feedback: document.getElementById('feedback'),
  start: document.getElementById('startScreen'), startButton: document.getElementById('startButton'), finish: document.getElementById('finishScreen'),
  finishTitle: document.getElementById('finishTitle'), finishText: document.getElementById('finishText'), finishStrokes: document.getElementById('finishStrokes'),
  finishGir: document.getElementById('finishGir'), finishPutts: document.getElementById('finishPutts'), again: document.getElementById('againButton')
};

let width = 0, height = 0, pixelRatio = 1;
const pin = { x: 4, z: -168 };
const clubs = [
  { name:'4I', distance:205, loft:24 }, { name:'5I', distance:190, loft:27 }, { name:'6I', distance:180, loft:30 },
  { name:'7I', distance:172, loft:34 }, { name:'8I', distance:158, loft:38 }, { name:'9I', distance:143, loft:42 },
  { name:'PW', distance:126, loft:47 }, { name:'GW', distance:108, loft:52 }, { name:'SW', distance:86, loft:58 },
  { name:'P', distance:35, loft:3 }
];

const game = {
  started:false, shot:1, score:0, putts:0, gir:false, club:3, shape:'straight', flight:'normal',
  ball:{x:0,z:0}, aim:{x:4,z:-168}, lie:'tee', factor:1, control:1,
  view:'address', camera:{x:0,z:0,follow:0}, dragAim:false, swing:null, flying:false,
  landing:null, trace:null, lastShot:null, wind:{speed:6, x:0.42, z:-0.14}, greenBreak:1.8
};

function clamp(n,min,max){ return Math.max(min,Math.min(max,n)); }
function lerp(a,b,t){ return a+(b-a)*t; }
function ease(t){ return 1-Math.pow(1-t,3); }
function distance(a,b){ return Math.hypot(a.x-b.x,a.z-b.z); }
function ordinal(n){ return n+(n===1?'ST':n===2?'ND':n===3?'RD':'TH'); }

function resize(){
  pixelRatio = Math.min(2, window.devicePixelRatio || 1);
  width = canvas.clientWidth; height = canvas.clientHeight;
  canvas.width = Math.round(width*pixelRatio); canvas.height = Math.round(height*pixelRatio);
  ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
  render();
}
window.addEventListener('resize',resize);

function terrainAt(p){
  const gx=p.x-pin.x, gz=p.z-pin.z;
  if((gx*gx)/430+(gz*gz)/240 < 1) return {name:'green',factor:1,control:1};
  if(Math.abs(p.x+16)<11 && Math.abs(p.z+156)<9) return {name:'bunker',factor:.72,control:.55};
  if(Math.abs(p.x-22)<10 && Math.abs(p.z+177)<8) return {name:'bunker',factor:.72,control:.55};
  if(Math.abs(p.x-34)<17 && Math.abs(p.z+116)<36) return {name:'water',factor:0,control:0};
  const t=clamp((-p.z-10)/145,0,1), center=Math.sin(t*2.65)*5, half=10+t*19;
  if(p.z<-8 && p.z>-158 && Math.abs(p.x-center)<half) return {name:'fairway',factor:1,control:.96};
  if(p.z>-8) return {name:'tee',factor:1,control:1};
  return {name:'rough',factor:.82,control:.68};
}

function cameraState(){
  if(game.view==='overview') return {mode:'overview',x:0,z:-84,zoom:1};
  if(game.view==='putt') return {mode:'putt',x:game.ball.x,z:game.ball.z,zoom:1};
  if(game.view==='flight') return {mode:'flight',x:game.camera.x,z:game.camera.z,zoom:1};
  return {mode:'address',x:game.ball.x,z:game.ball.z,zoom:1};
}

function project(p, elevation=0){
  const cam=cameraState();
  if(cam.mode==='overview') return {x:width/2+(p.x-cam.x)*2.25,y:height*.11+(-p.z)*2.62-elevation*.18,scale:.85};
  if(cam.mode==='putt'){
    const dz=cam.z-p.z, dx=p.x-cam.x;
    return {x:width/2+dx*15.5,y:height*.69-dz*13.2-elevation*2,scale:clamp(1-dz/110,.55,1.05)};
  }
  const dz=Math.max(-8,cam.z-p.z), depth=Math.max(5,dz+18), scale=1/(1+depth/92);
  const base=height*(cam.mode==='flight'?.72:.78);
  return {x:width/2+(p.x-cam.x)*4.65*scale,y:base-dz*2.34*scale-elevation*1.2,scale};
}

function drawSky(){
  const grad=ctx.createLinearGradient(0,0,0,height*.58); grad.addColorStop(0,'#5aa7dd'); grad.addColorStop(.55,'#a7d8ed'); grad.addColorStop(1,'#d6edf5');
  ctx.fillStyle=grad; ctx.fillRect(0,0,width,height);
  ctx.fillStyle='rgba(255,245,198,.7)'; ctx.beginPath(); ctx.arc(width*.78,height*.13,32,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.55)';
  [[.12,.16,55],[.36,.1,38],[.62,.22,48]].forEach(([x,y,s])=>{ctx.beginPath();ctx.ellipse(width*x,height*y,s,s*.28,0,0,Math.PI*2);ctx.fill();});
}

function drawGround(){
  if(game.view==='overview'){
    ctx.fillStyle='#2f7338'; ctx.fillRect(width*.035,height*.04,width*.93,height*.92);
    drawFairwayOverview();
    return;
  }
  const horizon=height*(game.view==='flight'?.47:.43);
  ctx.fillStyle='#2e7036'; ctx.fillRect(0,horizon,width,height-horizon);
  ctx.fillStyle='#255e2e'; ctx.beginPath(); ctx.moveTo(0,horizon+18); ctx.quadraticCurveTo(width*.22,horizon-28,width*.43,horizon+14); ctx.quadraticCurveTo(width*.69,horizon-24,width,horizon+20); ctx.lineTo(width,height);ctx.lineTo(0,height);ctx.closePath();ctx.fill();
  drawFairwayPerspective();
}

function fairwayEdges(z){
  const t=clamp((-z-10)/148,0,1), center=Math.sin(t*2.65)*5, half=10+t*19;
  return {left:center-half,right:center+half};
}

function drawFairwayPerspective(){
  const pointsL=[],pointsR=[];
  for(let i=0;i<=30;i++){const z=-5-i*5.2,e=fairwayEdges(z);pointsL.push(project({x:e.left,z}));pointsR.push(project({x:e.right,z}));}
  ctx.fillStyle='#55a848';ctx.beginPath();pointsL.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));pointsR.reverse().forEach(p=>ctx.lineTo(p.x,p.y));ctx.closePath();ctx.fill();
  for(let band=0;band<10;band++){
    const z1=-8-band*16,z2=z1-8,e1=fairwayEdges(z1),e2=fairwayEdges(z2),a=project({x:e1.left,z:z1}),b=project({x:e1.right,z:z1}),c=project({x:e2.right,z:z2}),d=project({x:e2.left,z:z2});
    ctx.fillStyle=band%2?'rgba(28,110,48,.13)':'rgba(255,255,255,.045)';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.closePath();ctx.fill();
  }
}

function drawFairwayOverview(){
  const L=[],R=[];for(let i=0;i<=34;i++){const z=-i*5,e=fairwayEdges(z);L.push(project({x:e.left,z}));R.push(project({x:e.right,z}));}
  ctx.fillStyle='#58ad4a';ctx.beginPath();L.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));R.reverse().forEach(p=>ctx.lineTo(p.x,p.y));ctx.closePath();ctx.fill();
  for(let i=0;i<10;i++){const z=-8-i*16,a=project({x:-30,z}),b=project({x:30,z});ctx.strokeStyle=i%2?'rgba(0,0,0,.06)':'rgba(255,255,255,.05)';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
}

function drawFeatureEllipse(world,rx,rz,color,rotation=0){
  const p=project(world), sx=game.view==='overview'?rx*2.25:rx*3.2*p.scale, sy=game.view==='overview'?rz*2.62:Math.max(4,rz*.95*p.scale);
  ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(p.x,p.y,sx,sy,rotation,0,Math.PI*2);ctx.fill();
}

function drawCourseFeatures(){
  drawFeatureEllipse(pin,21,15,'#79c95f');
  drawFeatureEllipse({x:-16,z:-156},11,8,'#e7d28c',-.15);
  drawFeatureEllipse({x:22,z:-177},10,7,'#e7d28c',.25);
  drawFeatureEllipse({x:34,z:-116},17,35,'#287eb5',-.08);
  const wp=project({x:34,z:-116});ctx.strokeStyle='rgba(255,255,255,.22)';ctx.lineWidth=1;for(let i=-2;i<=2;i++){ctx.beginPath();ctx.ellipse(wp.x,wp.y+i*4,game.view==='overview'?29:38,game.view==='overview'?72:9,0,0,Math.PI*2);ctx.stroke();}
  for(let i=0;i<13;i++){drawTree({x:-39-(i%2)*8,z:-18-i*12},12-i*.35);drawTree({x:47+(i%2)*7,z:-16-i*12},12-i*.35);}
  drawFlag();
}

function drawTree(pos,size){
  const p=project(pos), s=game.view==='overview'?5:Math.max(4,size*p.scale*1.65);
  ctx.fillStyle='#6e4b2c';ctx.fillRect(p.x-s*.1,p.y-s*.1,s*.2,s*.65);
  ctx.fillStyle='#1e5a2c';ctx.beginPath();ctx.arc(p.x,p.y-s*.35,s*.6,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#2f7a38';ctx.beginPath();ctx.arc(p.x-s*.3,p.y-s*.28,s*.38,0,Math.PI*2);ctx.fill();
}

function drawFlag(){
  const p=project(pin), h=game.view==='overview'?20:52*p.scale;
  ctx.strokeStyle='#f7f7f7';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y-h);ctx.stroke();
  ctx.fillStyle='#e83e3e';ctx.beginPath();ctx.moveTo(p.x,p.y-h);ctx.lineTo(p.x+26*p.scale,p.y-h+8*p.scale);ctx.lineTo(p.x,p.y-h+16*p.scale);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(18,61,28,.28)';ctx.beginPath();ctx.ellipse(p.x,p.y,7*p.scale,2.3*p.scale,0,0,Math.PI*2);ctx.fill();
}

function predictedPath(power=1,path=0,face=0){
  if(game.lie==='green') return puttPath(power,path);
  const dx=game.aim.x-game.ball.x,dz=game.aim.z-game.ball.z,len=Math.hypot(dx,dz)||1,ux=dx/len,uz=dz/len,rx=-uz,rz=ux;
  const club=clubs[game.club], flightMult=game.flight==='high'?.93:game.flight==='low'?1.05:1;
  const carry=club.distance*game.factor*power*flightMult, shape=game.shape==='draw'?-1:game.shape==='fade'?1:0;
  const windSide=(game.wind.x*game.wind.speed/6)*3.2;
  const points=[];
  for(let i=0;i<=60;i++){
    const t=i/60,forward=carry*t,planned=shape*5.8*Math.sin(Math.PI*t),miss=(path*10+face*12)*t*t,wind=windSide*t*t;
    const high=(game.flight==='high'?54:game.flight==='low'?25:39)*Math.sin(Math.PI*t)*power;
    points.push({x:game.ball.x+ux*forward+rx*(planned+miss+wind),z:game.ball.z+uz*forward+rz*(planned+miss+wind),h:high});
  }
  return points;
}

function puttPath(power=1,path=0){
  const dx=pin.x-game.ball.x,dz=pin.z-game.ball.z,len=Math.hypot(dx,dz)||1,ux=dx/len,uz=dz/len,rx=-uz,rz=ux;
  const travel=38*power*.44, points=[];
  for(let i=0;i<=48;i++){const t=i/48,breakSide=game.greenBreak*Math.pow(t,1.7),miss=path*2.3*t;points.push({x:game.ball.x+ux*travel*t+rx*(breakSide+miss),z:game.ball.z+uz*travel*t+rz*(breakSide+miss),h:0});}
  return points;
}

function drawPrediction(){
  if(game.flying || game.view==='flight') return;
  const power=game.lie==='green'?clamp(distance(game.ball,pin)*3/25+.2,.18,1):1;
  const pts=predictedPath(power,0,0);
  ctx.save();ctx.strokeStyle='rgba(255,239,112,.9)';ctx.lineWidth=2;ctx.setLineDash([7,6]);ctx.beginPath();
  pts.forEach((p,i)=>{const s=project(p,p.h);i?ctx.lineTo(s.x,s.y):ctx.moveTo(s.x,s.y);});ctx.stroke();ctx.restore();
  if(game.lie!=='green') drawAimTarget(); else drawGreenRead();
}

function drawAimTarget(){
  const p=project(game.aim), ring=game.view==='overview'?13:20;
  ctx.strokeStyle='#ffdf57';ctx.lineWidth=4;ctx.beginPath();ctx.arc(p.x,p.y,ring,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='rgba(255,223,87,.16)';ctx.beginPath();ctx.ellipse(p.x,p.y,ring*2.1,ring*.9,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff8be';ctx.font='900 10px system-ui';ctx.textAlign='center';ctx.fillText(Math.round(distance(game.ball,game.aim))+' YDS',p.x,p.y-ring-8);
}

function drawGreenRead(){
  const cup=project(pin);ctx.strokeStyle='rgba(255,244,130,.78)';ctx.lineWidth=1.5;
  for(let r=20;r<=80;r+=20){ctx.beginPath();ctx.arc(cup.x,cup.y,r,0,Math.PI*2);ctx.stroke();}
  for(let i=-2;i<=2;i++){const y=cup.y+i*18,phase=(performance.now()/350+i*.6)%1;ctx.fillStyle='rgba(255,235,101,.9)';ctx.beginPath();ctx.arc(cup.x-45+phase*90,y,3,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='rgba(255,255,255,.88)';ctx.font='900 10px system-ui';ctx.textAlign='center';ctx.fillText('BREAKS RIGHT',cup.x,cup.y-90);
}

function drawGolfer(){
  if(game.view==='overview'||game.view==='flight'||game.lie==='green') return;
  const b=project(game.ball), s=1.05;
  ctx.strokeStyle='#142d20';ctx.lineCap='round';ctx.lineWidth=8*s;ctx.beginPath();ctx.moveTo(b.x-18,b.y-58);ctx.lineTo(b.x-14,b.y-27);ctx.moveTo(b.x-17,b.y-42);ctx.lineTo(b.x+4,b.y-24);ctx.moveTo(b.x-14,b.y-27);ctx.lineTo(b.x-23,b.y+3);ctx.moveTo(b.x-14,b.y-27);ctx.lineTo(b.x+2,b.y+3);ctx.stroke();
  ctx.fillStyle='#d29a72';ctx.beginPath();ctx.arc(b.x-18,b.y-69,9,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#d9dde0';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.x+4,b.y-24);ctx.lineTo(b.x+23,b.y-2);ctx.stroke();
}

function drawBall(p=game.ball,h=0){
  const s=project(p,h);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s.x,s.y,game.view==='overview'?3:5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(0,0,0,.22)';ctx.stroke();
}

function render(animatedBall=null){
  if(!width) return;
  drawSky();drawGround();drawCourseFeatures();drawPrediction();drawGolfer();
  if(animatedBall) drawBall(animatedBall,animatedBall.h||0); else drawBall();
}

function updateUI(){
  const d=distance(game.ball,pin), labels={tee:'TEE',fairway:'FAIRWAY',rough:'ROUGH',bunker:'BUNKER',green:'GREEN'};
  ui.lie.textContent=`${labels[game.lie]} · ${Math.round(game.factor*100)}%`;
  ui.distance.textContent=game.lie==='green'?`${Math.round(d*3)} FT TO CUP`:`${Math.round(d)} YDS TO PIN`;
  ui.stroke.textContent=`${ordinal(game.shot)} SHOT`;
  ui.score.textContent=game.score===0?'EVEN':game.score>0?`+${game.score}`:String(game.score);
  const club=clubs[game.club];ui.club.innerHTML=`${club.name}<small>${game.lie==='green'?'PUTT':Math.round(club.distance*game.factor)+' YDS'}</small>`;
  ui.instruction.textContent=game.lie==='green'?'READ THE MOVING BEADS · GREEN BREAKS RIGHT':'DRAG THE BRIGHT TARGET TO AIM';
  ui.shotPanel.classList.toggle('hidden',game.lie==='green');
  ui.overview.textContent=game.view==='overview'?'BACK':'MAP';
  render();
}

function showFeedback(title,detail='',duration=1250){
  ui.feedback.querySelector('strong').textContent=title;ui.feedback.querySelector('span').textContent=detail;ui.feedback.classList.add('show');
  clearTimeout(showFeedback.timer);showFeedback.timer=setTimeout(()=>ui.feedback.classList.remove('show'),duration);
}

function chooseClub(){
  const target=distance(game.ball,pin)/Math.max(.1,game.factor);let best=0,bestError=Infinity;
  clubs.slice(0,-1).forEach((club,i)=>{const error=Math.abs(club.distance-target);if(error<bestError){bestError=error;best=i;}});game.club=best;game.aim={...pin};
}

function classifySwing(power,tempo,path,face){
  const tempoError=Math.abs(tempo-.46),pathError=Math.abs(path),faceError=Math.abs(face);
  if(power>.9&&tempoError<.09&&pathError<.12&&faceError<.12) return ['PURE','Centered strike · balanced tempo'];
  if(tempoError<.16&&pathError<.28&&faceError<.28) return ['SOLID','Playable strike'];
  if(pathError>.55) return [path>0?'PUSH':'PULL','Swing path created the miss'];
  if(faceError>.48) return [face>0?'OPEN FACE':'CLOSED FACE','Face angle moved the start line'];
  return [tempo<.28?'RUSHED':'SLOW','Tempo reduced distance and control'];
}

function hitShot(power,tempo,path,face){
  if(game.flying) return;
  const [title,detail]=classifySwing(power,tempo,path,face);showFeedback(title,`${detail} · ${Math.round(power*100)}% power`,950);
  const tempoQuality=clamp(1-Math.abs(tempo-.46)*1.8,.58,1),effectivePower=power*tempoQuality;
  const points=predictedPath(effectivePower,path*(1.9-game.control),face*(1.9-game.control));
  game.lastShot={power,tempo,path,face};animateShot(points,game.lie==='green');
}

function animateShot(points,isPutt){
  game.flying=true;game.view='flight';ui.swingZone.style.opacity='.35';ui.swingZone.style.pointerEvents='none';
  const startTime=performance.now(),duration=isPutt?1250:2150,start={...game.ball};
  function frame(now){
    const t=clamp((now-startTime)/duration,0,1),smooth=ease(t),idx=smooth*(points.length-1),i=Math.floor(idx),a=points[i],b=points[Math.min(i+1,points.length-1)],f=idx-i;
    const ball={x:lerp(a.x,b.x,f),z:lerp(a.z,b.z,f),h:lerp(a.h||0,b.h||0,f)};
    game.camera.x=lerp(start.x,ball.x,clamp(t*1.15,0,1));game.camera.z=lerp(start.z,ball.z+18,clamp(t*1.08,0,1));
    render(ball);
    if(t<1) requestAnimationFrame(frame); else settleShot(points[points.length-1],isPutt,start);
  }
  requestAnimationFrame(frame);
}

function settleShot(end,isPutt,start){
  game.flying=false;ui.swingZone.style.opacity='1';ui.swingZone.style.pointerEvents='auto';game.ball={x:end.x,z:end.z};game.shot++;
  if(isPutt){
    game.putts++;const d=distance(game.ball,pin);
    if(d<.65){game.ball={...pin};finishHole();return;}
    game.view='putt';game.lie='green';game.factor=1;game.control=1;showFeedback(d<2?'BURNED THE EDGE':'PUTT MISSED',`${Math.round(d*3)} feet remains`,1500);updateUI();return;
  }
  let terrain=terrainAt(game.ball);
  if(terrain.name==='water'){
    game.shot++;game.ball={x:lerp(start.x,end.x,.68),z:lerp(start.z,end.z,.68)};terrain=terrainAt(game.ball);if(terrain.name==='water') terrain={name:'rough',factor:.82,control:.68};
    showFeedback('WATER · PENALTY STROKE','Dropped near the crossing point',1800);
  }else if(terrain.name==='green'){
    if(game.shot-1<=1) game.gir=true;showFeedback('GREEN',distance(game.ball,pin)<10?'Inside 30 feet':'Long putt ahead',1500);
  }else if(terrain.name==='rough') showFeedback('ROUGH','82% distance · wider dispersion',1500);
  else if(terrain.name==='bunker') showFeedback('BUNKER','72% distance · reduced control',1500);
  else showFeedback('FAIRWAY',`${Math.round(distance(game.ball,pin))} yards remains`,1400);
  game.lie=terrain.name;game.factor=terrain.factor;game.control=terrain.control;
  if(game.lie==='green'){game.club=9;game.aim={...pin};game.view='putt';}
  else{chooseClub();game.view='address';}
  game.camera={x:game.ball.x,z:game.ball.z,follow:0};updateUI();
}

function finishHole(){
  const strokes=game.shot-1;game.score=strokes-3;const names={'-2':'EAGLE','-1':'BIRDIE','0':'PAR','1':'BOGEY','2':'DOUBLE BOGEY'};
  ui.finishTitle.textContent=names[String(game.score)]||`+${game.score}`;
  ui.finishText.textContent=game.score<=0?'The shot sequence held together.':'The hole punished the miss, which is what we want.';
  ui.finishStrokes.textContent=String(strokes);ui.finishGir.textContent=game.gir?'YES':'NO';ui.finishPutts.textContent=String(game.putts);ui.finish.style.display='flex';
}

function resetHole(){
  Object.assign(game,{shot:1,score:0,putts:0,gir:false,club:3,shape:'straight',flight:'normal',ball:{x:0,z:0},aim:{x:4,z:-168},lie:'tee',factor:1,control:1,view:'address',camera:{x:0,z:0,follow:0},dragAim:false,swing:null,flying:false,lastShot:null});
  document.querySelectorAll('[data-shape]').forEach(b=>b.classList.toggle('selected',b.dataset.shape==='straight'));
  document.querySelectorAll('[data-flight]').forEach(b=>b.classList.toggle('selected',b.dataset.flight==='normal'));
  ui.finish.style.display='none';updateUI();showFeedback('PAR 3 · 168 YARDS','Water guards the right side',1600);
}

function aimFromPointer(event){
  const rect=canvas.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;
  if(game.view==='overview') game.aim={x:(x-width/2)/2.25,z:-(y-height*.11)/2.62};
  else{
    const dz=clamp((height*.78-y)/1.65,18,220),scale=1+dz/92;
    game.aim={x:game.ball.x+(x-width/2)/(4.65/scale),z:game.ball.z-dz};
  }
  const dx=game.aim.x-game.ball.x,dz=game.aim.z-game.ball.z,len=Math.hypot(dx,dz)||1,max=clubs[game.club].distance*game.factor*1.08;
  if(len>max){game.aim.x=game.ball.x+dx/len*max;game.aim.z=game.ball.z+dz/len*max;}
  render();
}

canvas.addEventListener('pointerdown',event=>{
  if(!game.started||game.flying||game.lie==='green') return;
  const rect=canvas.getBoundingClientRect(),p=project(game.aim),x=event.clientX-rect.left,y=event.clientY-rect.top;
  if(Math.hypot(x-p.x,y-p.y)>52 && game.view!=='overview') return;
  game.dragAim=true;canvas.setPointerCapture(event.pointerId);aimFromPointer(event);
});
canvas.addEventListener('pointermove',event=>{if(game.dragAim) aimFromPointer(event);});
canvas.addEventListener('pointerup',()=>game.dragAim=false);
canvas.addEventListener('pointercancel',()=>game.dragAim=false);

let swingPointer=null;
ui.swingZone.addEventListener('pointerdown',event=>{
  if(!game.started||game.flying) return;
  const r=ui.swingZone.getBoundingClientRect();swingPointer=event.pointerId;ui.swingZone.setPointerCapture(event.pointerId);
  game.swing={startX:event.clientX-r.left,startY:event.clientY-r.top,lastX:event.clientX-r.left,lastY:event.clientY-r.top,maxDown:0,phase:'back',turnTime:0,impactX:0};
});
ui.swingZone.addEventListener('pointermove',event=>{
  if(event.pointerId!==swingPointer||!game.swing) return;
  const r=ui.swingZone.getBoundingClientRect(),x=event.clientX-r.left,y=event.clientY-r.top,s=game.swing,dy=y-s.startY;
  s.maxDown=Math.max(s.maxDown,dy);
  if(s.phase==='back'&&s.maxDown>21&&y<s.lastY-2){s.phase='forward';s.turnTime=performance.now();}
  if(s.phase==='forward'&&y<r.height*.53) s.impactX=x-r.width/2;
  s.lastX=x;s.lastY=y;
  ui.thumb.style.top=`calc(50% + ${clamp(dy,-41,41)}px)`;ui.thumb.style.left=`calc(50% + ${clamp(x-s.startX,-34,34)}px)`;
  ui.load.textContent=`${Math.round(clamp(s.maxDown/42,0,1)*100)}%`;ui.tempo.textContent=s.phase==='forward'?'TEMPO NOW':'TEMPO —';
});
function endSwing(event){
  if(event.pointerId!==swingPointer||!game.swing) return;
  const r=ui.swingZone.getBoundingClientRect(),x=event.clientX-r.left,y=event.clientY-r.top,s=game.swing;
  const power=clamp(s.maxDown/42,0,1),forward=s.maxDown-(y-s.startY),complete=s.phase==='forward'&&forward>39;
  const tempo=complete?(performance.now()-s.turnTime)/1000:2;
  const path=clamp((x-s.startX)/40,-1,1),face=clamp(s.impactX/34,-1,1);
  game.swing=null;swingPointer=null;ui.thumb.style.top='50%';ui.thumb.style.left='50%';ui.load.textContent='0%';ui.tempo.textContent='TEMPO —';
  if(complete&&power>.22) hitShot(power,tempo,path,face); else showFeedback('INCOMPLETE SWING','Pull down farther, then drive through impact',1200);
}
ui.swingZone.addEventListener('pointerup',endSwing);ui.swingZone.addEventListener('pointercancel',endSwing);

document.querySelectorAll('[data-shape]').forEach(button=>button.addEventListener('click',()=>{
  game.shape=button.dataset.shape;document.querySelectorAll('[data-shape]').forEach(b=>b.classList.toggle('selected',b===button));render();
}));
document.querySelectorAll('[data-flight]').forEach(button=>button.addEventListener('click',()=>{
  game.flight=button.dataset.flight;document.querySelectorAll('[data-flight]').forEach(b=>b.classList.toggle('selected',b===button));render();
}));
ui.club.addEventListener('click',()=>{
  if(game.lie==='green'){showFeedback('PUTTER SELECTED','Use the moving beads to read break');return;}
  game.club=(game.club+1)%9;const dx=game.aim.x-game.ball.x,dz=game.aim.z-game.ball.z,len=Math.hypot(dx,dz)||1,target=clubs[game.club].distance*game.factor;
  game.aim={x:game.ball.x+dx/len*target,z:game.ball.z+dz/len*target};updateUI();
});
ui.overview.addEventListener('click',()=>{
  if(game.flying) return;game.view=game.view==='overview'?(game.lie==='green'?'putt':'address'):'overview';updateUI();
});
ui.reset.addEventListener('click',resetHole);
ui.startButton.addEventListener('click',()=>{game.started=true;ui.start.classList.add('hidden');resetHole();});
ui.again.addEventListener('click',resetHole);

resize();
