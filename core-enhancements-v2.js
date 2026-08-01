(function(){
'use strict';
let installed=false;
function waitForGame(){
  if(typeof S==='undefined'||typeof CLUBS==='undefined'||typeof THREE==='undefined'||typeof camera==='undefined'){
    setTimeout(waitForGame,60);
    return;
  }
  if(installed)return;
  installed=true;
  install();
}
function install(){
  document.title='Fairway Golf Core — Enhanced';
  const style=document.createElement('style');
  style.textContent=`
    #fgFx{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:6}
    #fgLive{position:fixed;top:calc(120px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:11;display:none;gap:10px;padding:7px 11px;border:1px solid rgba(255,255,255,.28);border-radius:10px;background:rgba(7,24,14,.76);backdrop-filter:blur(5px);font:700 11px system-ui;color:#fff;white-space:nowrap;pointer-events:none}
    #fgLive b{color:#7ef3ff;font-size:13px}
    #fgResult{position:fixed;top:20%;left:50%;transform:translate(-50%,-10px);z-index:12;min-width:270px;max-width:88vw;padding:12px 14px;border:1px solid rgba(255,255,255,.34);border-radius:13px;background:rgba(5,22,13,.88);box-shadow:0 12px 34px rgba(0,0,0,.38);color:#fff;opacity:0;pointer-events:none;transition:.22s;font-family:system-ui;text-align:center}
    #fgResult.show{opacity:1;transform:translate(-50%,0)}
    #fgResult strong{display:block;color:#7ef3ff;font-size:16px;letter-spacing:.08em}
    #fgResult .row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px}
    #fgResult span{font-size:9px;opacity:.72}#fgResult b{display:block;font-size:14px;opacity:1}
    #fgTypes{position:fixed;left:50%;bottom:calc(10px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:12;display:flex;gap:5px;padding:6px;border:1px solid rgba(255,255,255,.28);border-radius:12px;background:rgba(6,24,14,.82);backdrop-filter:blur(6px);max-width:94vw;overflow-x:auto;scrollbar-width:none}
    #fgTypes::-webkit-scrollbar{display:none}#fgTypes button{border:1px solid rgba(255,255,255,.22);border-radius:8px;background:rgba(255,255,255,.09);color:#fff;padding:7px 10px;font:800 10px system-ui;white-space:nowrap}
    #fgTypes button.on{background:#d4a93b;color:#132213;border-color:#ffe69a}
    #fgRead{position:fixed;top:calc(126px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:12;display:none;padding:7px 12px;border-radius:10px;background:rgba(4,19,12,.86);border:1px solid rgba(126,243,255,.7);color:#fff;font:800 12px system-ui;pointer-events:none;text-align:center}
    #fgRead small{display:block;margin-top:2px;font-size:9px;opacity:.78;font-weight:600}
    @media(max-width:820px),(pointer:coarse){#fgTypes{left:8px;right:8px;transform:none;padding-right:80px}#fgTypes button{padding:7px 9px}#fgLive{top:calc(108px + env(safe-area-inset-top))}}
  `;
  document.head.appendChild(style);

  const canvas=document.createElement('canvas');
  canvas.id='fgFx';
  document.body.appendChild(canvas);
  const ctx=canvas.getContext('2d');
  let dpr=1;
  function resize(){
    dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(innerWidth*dpr);
    canvas.height=Math.round(innerHeight*dpr);
    canvas.style.width=innerWidth+'px';
    canvas.style.height=innerHeight+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  resize();
  addEventListener('resize',resize);

  const live=document.createElement('div');
  live.id='fgLive';
  live.innerHTML='<span>SPEED <b id="fgSpeed">—</b></span><span>CARRY <b id="fgCarry">—</b></span><span>APEX <b id="fgApex">—</b></span>';
  document.body.appendChild(live);

  const result=document.createElement('div');
  result.id='fgResult';
  result.innerHTML='<strong id="fgResultTitle">SHOT COMPLETE</strong><div class="row"><span>CARRY<b id="fgRC">—</b></span><span>TOTAL<b id="fgRT">—</b></span><span>APEX<b id="fgRA">—</b></span><span>LAUNCH<b id="fgRL">—</b></span></div>';
  document.body.appendChild(result);

  const read=document.createElement('div');
  read.id='fgRead';
  read.innerHTML='<span id="fgReadMain">PUTT READ</span><small id="fgReadSub">Animated beads show expected break</small>';
  document.body.appendChild(read);

  const types=[['normal','Normal'],['punch','Punch'],['knockdown','Knockdown'],['chip','Chip'],['pitch','Pitch'],['flop','Flop'],['splash','Splash']];
  const typeBar=document.createElement('div');
  typeBar.id='fgTypes';
  typeBar.innerHTML=types.map(x=>'<button type="button" data-fgtype="'+x[0]+'">'+x[1]+'</button>').join('');
  document.body.appendChild(typeBar);
  S.fgShotType=S.fgShotType||'normal';
  function selectType(type){
    S.fgShotType=type;
    typeBar.querySelectorAll('button').forEach(button=>button.classList.toggle('on',button.dataset.fgtype===type));
  }
  typeBar.addEventListener('click',event=>{
    const button=event.target.closest('[data-fgtype]');
    if(!button)return;
    event.preventDefault();
    event.stopPropagation();
    selectType(button.dataset.fgtype);
  });
  selectType(S.fgShotType);

  const originalCompute=typeof computeStrike==='function'?computeStrike:null;
  if(originalCompute){
    computeStrike=function(powerPct){
      let lie='';
      try{lie=String(currentLie()).toLowerCase();}catch(error){}
      const clean=['tee','fairway','first cut','firstcut','fringe','green'].includes(lie);
      const originalRandom=Math.random;
      let strike;
      if(clean){
        Math.random=()=>0.5;
        try{strike=originalCompute(powerPct);}finally{Math.random=originalRandom;}
      }else{
        strike=originalCompute(powerPct);
      }
      if(!strike||strike.putter)return strike;
      const type=S.fgShotType||'normal';
      if(type==='punch'){
        strike.loft=Math.max(4,strike.loft-10);strike.v*=.96;strike.bs*=.48;strike.windLift=(strike.windLift||1)*.58;strike.rollBias=(strike.rollBias||1)*1.55;
      }else if(type==='knockdown'){
        strike.loft=Math.max(6,strike.loft-6);strike.v*=.92;strike.bs*=.72;strike.windLift=(strike.windLift||1)*.62;strike.rollBias=(strike.rollBias||1)*1.22;
      }else if(type==='chip'){
        strike.loft=Math.max(10,Math.min(31,strike.loft-7));strike.v*=.54;strike.bs*=.52;strike.rollBias=(strike.rollBias||1)*1.72;
      }else if(type==='pitch'){
        strike.loft=Math.min(58,strike.loft+5);strike.v*=.73;strike.bs*=.92;strike.rollBias=(strike.rollBias||1)*.78;
      }else if(type==='flop'){
        strike.loft=Math.min(69,strike.loft+17);strike.v*=.69;strike.bs*=1.25;strike.rollBias=(strike.rollBias||1)*.42;
      }else if(type==='splash'){
        strike.loft=Math.min(72,strike.loft+20);strike.v*=.61;strike.bs*=.58;strike.rollBias=(strike.rollBias||1)*.34;
      }
      return strike;
    };
  }

  const byId=id=>document.getElementById(id);
  const yardFactor=()=>typeof YDS==='number'?YDS:1.09361;
  const toYards=units=>Math.max(0,units*yardFactor());
  function groundAt(position){
    try{return surfaceWorldY(H(),position.x,position.z);}catch(error){return position.y;}
  }
  function worldToScreen(vector){
    const projected=vector.clone().project(camera);
    return {x:(projected.x*.5+.5)*innerWidth,y:(-.5*projected.y+.5)*innerHeight,z:projected.z};
  }

  let previousState='';
  let shot=null;
  let trail=[];
  let trailFade=0;
  let resultTimer=0;
  function beginShot(){
    const start=S.lastShot&&S.lastShot.clone?S.lastShot.clone():S.pos.clone();
    const launch=S.vel&&S.vel.clone?S.vel.clone():new THREE.Vector3();
    shot={start,launch,maxY:S.pos.y,startGround:groundAt(start)};
    trail=[];
    trailFade=1;
    live.style.display='flex';
    result.classList.remove('show');
  }
  function updateShot(){
    if(!shot)return;
    shot.maxY=Math.max(shot.maxY,S.pos.y);
    const point=worldToScreen(S.pos);
    if(point.z>-1&&point.z<1&&Number.isFinite(point.x)&&Number.isFinite(point.y)){
      const last=trail[trail.length-1];
      if(!last||Math.hypot(last.x-point.x,last.y-point.y)>2)trail.push(point);
      if(trail.length>190)trail.shift();
    }
    const total=toYards(Math.hypot(S.pos.x-shot.start.x,S.pos.z-shot.start.z));
    const carry=typeof S.maxCarry==='number'&&S.maxCarry>0?toYards(S.maxCarry):total;
    const apex=Math.max(0,(shot.maxY-shot.startGround)*yardFactor()*3);
    byId('fgSpeed').textContent=Math.round(S.vel.length()*2.23694)+' mph';
    byId('fgCarry').textContent=Math.round(carry)+'y';
    byId('fgApex').textContent=Math.round(apex)+'ft';
  }
  function endShot(){
    if(!shot)return;
    const total=toYards(Math.hypot(S.pos.x-shot.start.x,S.pos.z-shot.start.z));
    const carry=typeof S.maxCarry==='number'&&S.maxCarry>0?toYards(S.maxCarry):total;
    const apex=Math.max(0,(shot.maxY-shot.startGround)*yardFactor()*3);
    const horizontal=Math.hypot(shot.launch.x,shot.launch.z);
    const launch=Math.atan2(shot.launch.y,Math.max(.001,horizontal))*180/Math.PI;
    let lie='Shot Complete';
    try{lie=String(currentLie()).replace(/\b\w/g,char=>char.toUpperCase());}catch(error){}
    byId('fgResultTitle').textContent=lie;
    byId('fgRC').textContent=Math.round(carry)+'y';
    byId('fgRT').textContent=Math.round(total)+'y';
    byId('fgRA').textContent=Math.round(apex)+'ft';
    byId('fgRL').textContent=Math.round(launch)+'°';
    live.style.display='none';
    result.classList.add('show');
    clearTimeout(resultTimer);
    resultTimer=setTimeout(()=>result.classList.remove('show'),3300);
    shot=null;
    trailFade=1;
  }
  function drawTrail(){
    if(trail.length<2||trailFade<=.02)return;
    ctx.save();
    ctx.globalAlpha=trailFade;
    ctx.lineCap='round';
    ctx.lineJoin='round';
    ctx.shadowColor='#5de7ff';
    ctx.shadowBlur=14;
    ctx.strokeStyle='#fff';
    ctx.lineWidth=5;
    ctx.beginPath();
    ctx.moveTo(trail[0].x,trail[0].y);
    for(let i=1;i<trail.length;i++)ctx.lineTo(trail[i].x,trail[i].y);
    ctx.stroke();
    ctx.shadowBlur=7;
    ctx.strokeStyle='#56dfff';
    ctx.lineWidth=2;
    ctx.stroke();
    const point=trail[trail.length-1];
    ctx.shadowBlur=18;
    ctx.fillStyle='#fff';
    ctx.beginPath();
    ctx.arc(point.x,point.y,5.5,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function puttingData(){
    try{
      if(!CLUBS[S.club]||CLUBS[S.club].loft!==0||!['aiming','charging'].includes(S.state))return null;
      const lie=String(currentLie()).toLowerCase();
      if(lie!=='green'&&lie!=='fringe')return null;
      const hole=H();
      const pin=new THREE.Vector3(hole.pin.x,surfaceWorldY(hole,hole.pin.x,hole.pin.z)+.1,hole.pin.z);
      const ball=S.pos.clone();
      ball.y=surfaceWorldY(hole,ball.x,ball.z)+.1;
      const a=worldToScreen(ball);
      const b=worldToScreen(pin);
      if(a.z<-1||a.z>1||b.z<-1||b.z>1)return null;
      const dx=hole.pin.x-S.pos.x;
      const dz=hole.pin.z-S.pos.z;
      const length=Math.hypot(dx,dz)||1;
      const direction={x:dx/length,z:dz/length};
      let sx=0,sz=0;
      if(typeof greenSlopeAt==='function'){
        const slope=greenSlopeAt(hole,S.pos.x,S.pos.z)||{};
        sx=slope.gx||slope.x||0;
        sz=slope.gz||slope.z||0;
      }else if(hole.slope){
        sx=hole.slope.x||0;
        sz=hole.slope.z||0;
      }
      const perpendicular=sx*direction.z-sz*direction.x;
      const along=sx*direction.x+sz*direction.z;
      return {
        a,b,perpendicular,
        distanceFeet:Math.max(1,Math.round(toYards(length)*3)),
        breakInches:Math.max(0,Math.round(Math.abs(perpendicular)*length*28)),
        elevationInches:Math.round(along*length*7)
      };
    }catch(error){return null;}
  }
  function bezier(a,control,b,t){
    const u=1-t;
    return {x:u*u*a.x+2*u*t*control.x+t*t*b.x,y:u*u*a.y+2*u*t*control.y+t*t*b.y};
  }
  function drawPutting(now){
    const data=puttingData();
    if(!data){read.style.display='none';return;}
    read.style.display='block';
    byId('fgReadMain').textContent=data.breakInches<1?'STRAIGHT PUTT':'BREAKS '+(data.perpendicular>0?'LEFT ':'RIGHT ')+data.breakInches+' in';
    const elevation=data.elevationInches>1?data.elevationInches+' in downhill':data.elevationInches<-1?Math.abs(data.elevationInches)+' in uphill':'level';
    byId('fgReadSub').textContent=data.distanceFeet+' ft · '+elevation+' · swipe controls pace';
    const vx=data.b.x-data.a.x;
    const vy=data.b.y-data.a.y;
    const length=Math.hypot(vx,vy)||1;
    const px=-vy/length;
    const py=vx/length;
    const bend=Math.max(-92,Math.min(92,data.perpendicular*length*9));
    const control={x:(data.a.x+data.b.x)/2+px*bend,y:(data.a.y+data.b.y)/2+py*bend};
    ctx.save();
    ctx.lineCap='round';
    ctx.setLineDash([7,8]);
    ctx.strokeStyle='rgba(255,255,255,.82)';
    ctx.lineWidth=3;
    ctx.shadowColor='#001';
    ctx.shadowBlur=4;
    ctx.beginPath();
    ctx.moveTo(data.a.x,data.a.y);
    for(let i=1;i<=32;i++){
      const point=bezier(data.a,control,data.b,i/32);
      ctx.lineTo(point.x,point.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    for(let i=0;i<11;i++){
      const t=(i/11+(now*.00022))%1;
      const point=bezier(data.a,control,data.b,t);
      ctx.shadowColor='#00efff';
      ctx.shadowBlur=13;
      ctx.fillStyle='#00efff';
      ctx.strokeStyle='#051b20';
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.arc(point.x,point.y,5.5,0,Math.PI*2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function enhanceObject(object,color,opacity,scale){
    if(!object)return;
    object.visible=true;
    object.renderOrder=999;
    if(object.scale&&!object.userData.fgScaled){object.scale.multiplyScalar(scale);object.userData.fgScaled=true;}
    const materials=object.material?(Array.isArray(object.material)?object.material:[object.material]):[];
    materials.forEach(material=>{
      if(material.color)material.color.setHex(color);
      material.transparent=true;
      material.opacity=opacity;
      material.needsUpdate=true;
    });
  }
  function enhanceAimObjects(){
    if(S.state!=='aiming')return;
    try{
      enhanceObject(marker,0xffffff,1,1.25);
      enhanceObject(rolloutMarker,0xffd34f,1,1.3);
      enhanceObject(landingArea,0xffffff,.24,1);
      if(arcLine&&arcLine.material){
        arcLine.material.transparent=true;
        arcLine.material.opacity=.92;
        if(arcLine.material.color)arcLine.material.color.setHex(0xffffff);
      }
    }catch(error){}
  }

  function loop(now){
    ctx.clearRect(0,0,innerWidth,innerHeight);
    const state=S.state;
    if(state==='flying'&&previousState!=='flying')beginShot();
    if(state==='flying'){
      updateShot();
      trailFade=1;
    }else if(previousState==='flying'){
      endShot();
    }else if(trailFade>0){
      trailFade-=.014;
    }
    drawTrail();
    drawPutting(now);
    enhanceAimObjects();
    const putter=CLUBS[S.club]&&CLUBS[S.club].loft===0;
    typeBar.style.display=(putter||!['aiming','charging'].includes(state))?'none':'flex';
    previousState=state;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  console.info('Fairway Golf Core safe enhancements installed');
}
if(document.readyState==='complete')waitForGame();
else window.addEventListener('load',waitForGame,{once:true});
})();
