(function(){
'use strict';
let installed=false;
function ready(){
  return typeof S!=='undefined'&&typeof CLUBS!=='undefined'&&typeof THREE!=='undefined'&&typeof camera!=='undefined';
}
function wait(){
  if(!ready()){setTimeout(wait,60);return;}
  if(installed)return;
  installed=true;
  install();
}
function install(){
  document.title='Fairway Golf Core';
  const byId=id=>document.getElementById(id);
  const clampValue=(v,a,b)=>Math.max(a,Math.min(b,v));
  const normalizeLie=value=>String(value||'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/_/g,' ').trim().toLowerCase();
  const titleCase=value=>String(value||'').replace(/\b\w/g,c=>c.toUpperCase());
  const getClub=()=>CLUBS&&CLUBS[S.club]?CLUBS[S.club]:null;
  const isPutter=()=>{const c=getClub();return !!(c&&Number(c.loft)===0);};
  const getLie=()=>{try{return normalizeLie(currentLie());}catch(e){return'';}};
  const getDistanceYards=()=>{try{return Math.max(0,Number(distToPin())*(typeof YDS==='number'?YDS:1));}catch(e){return 0;}};
  const getHole=()=>{try{return H();}catch(e){return null;}};
  const groundY=(hole,x,z)=>{try{return surfaceWorldY(hole,x,z);}catch(e){return S.pos&&S.pos.y||0;}};

  const style=document.createElement('style');
  style.textContent=`
    #fgFx{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:6}
    #fgPlan{margin-top:5px;padding-top:5px;border-top:1px solid rgba(255,255,255,.18);font-size:10px;line-height:1.35;white-space:nowrap}
    #fgPlan b{color:#fff;font-size:11px}#fgPlan span{opacity:.82}
    #fgShotDock{position:relative;order:-10;margin-bottom:3px}
    #fgShotButton{width:100%;border:1px solid rgba(255,255,255,.34);border-radius:8px;background:rgba(255,255,255,.12);color:#fff;padding:6px 7px;font:800 10px system-ui;text-align:left;cursor:pointer}
    #fgShotButton::after{content:'▾';float:right;opacity:.75}
    #fgShotMenu{position:fixed;z-index:30;display:none;min-width:132px;padding:5px;border:1px solid rgba(255,255,255,.28);border-radius:10px;background:rgba(7,25,14,.96);box-shadow:0 10px 30px rgba(0,0,0,.42);backdrop-filter:blur(8px)}
    #fgShotMenu.open{display:grid;gap:4px}
    #fgShotMenu button{border:1px solid rgba(255,255,255,.18);border-radius:7px;background:rgba(255,255,255,.08);color:#fff;padding:7px 9px;font:700 11px system-ui;text-align:left}
    #fgShotMenu button.on{background:#d8af45;color:#102313;border-color:#ffe9a8}
    #fgShotMenu button:disabled{opacity:.32}
    #fgResult{position:fixed;left:50%;top:calc(145px + env(safe-area-inset-top));transform:translate(-50%,-6px);z-index:12;max-width:88vw;padding:7px 11px;border:1px solid rgba(255,255,255,.28);border-radius:999px;background:rgba(6,24,14,.86);color:#fff;font:750 11px system-ui;white-space:nowrap;opacity:0;pointer-events:none;transition:.2s;box-shadow:0 7px 22px rgba(0,0,0,.3)}
    #fgResult.show{opacity:1;transform:translate(-50%,0)}
    #fgResult b{color:#a9f1ff}
    @media(max-width:820px),(pointer:coarse){#fgResult{top:calc(142px + env(safe-area-inset-top));font-size:10px;max-width:92vw}}
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
  addEventListener('resize',resize,{passive:true});

  const result=document.createElement('div');
  result.id='fgResult';
  document.body.appendChild(result);
  let resultTimer=0;
  function showResult(html){
    result.innerHTML=html;
    result.classList.add('show');
    clearTimeout(resultTimer);
    resultTimer=setTimeout(()=>result.classList.remove('show'),2300);
  }

  const lieBox=byId('liebox');
  const plan=document.createElement('div');
  plan.id='fgPlan';
  plan.innerHTML='<b>Reading shot…</b>';
  if(lieBox)lieBox.appendChild(plan);

  const shotTypes={
    normal:{label:'Normal',carry:1,roll:.08},
    punch:{label:'Punch',carry:.91,roll:.25},
    knockdown:{label:'Knockdown',carry:.88,roll:.17},
    chip:{label:'Chip',carry:.43,roll:.48},
    pitch:{label:'Pitch',carry:.68,roll:.10},
    flop:{label:'Flop',carry:.62,roll:.025},
    splash:{label:'Splash',carry:.48,roll:.02}
  };
  S.fgShotType=S.fgShotType||'normal';
  const clubsPanel=byId('clubs');
  const dock=document.createElement('div');
  dock.id='fgShotDock';
  const shotButton=document.createElement('button');
  shotButton.type='button';
  shotButton.id='fgShotButton';
  dock.appendChild(shotButton);
  if(clubsPanel)clubsPanel.insertBefore(dock,clubsPanel.firstChild);
  const shotMenu=document.createElement('div');
  shotMenu.id='fgShotMenu';
  document.body.appendChild(shotMenu);

  function relevantTypes(){
    const lie=getLie();
    const distance=getDistanceYards();
    const values=['normal'];
    if(/bunker|sand/.test(lie))values.push('splash','pitch');
    else{
      if(distance>70)values.push('punch','knockdown');
      if(distance<=95)values.push('pitch');
      if(distance<=55)values.push('chip','flop');
    }
    return [...new Set(values)];
  }
  function positionMenu(){
    const r=shotButton.getBoundingClientRect();
    shotMenu.style.top=Math.max(8,Math.min(innerHeight-shotMenu.offsetHeight-8,r.top))+'px';
    shotMenu.style.right=Math.max(8,innerWidth-r.left+7)+'px';
  }
  function renderMenu(){
    const available=relevantTypes();
    shotMenu.innerHTML=available.map(type=>'<button type="button" data-type="'+type+'" class="'+(S.fgShotType===type?'on':'')+'">'+shotTypes[type].label+'</button>').join('');
    shotButton.textContent='SHOT · '+shotTypes[S.fgShotType].label.toUpperCase();
  }
  function closeMenu(){shotMenu.classList.remove('open');}
  shotButton.addEventListener('click',event=>{
    event.preventDefault();event.stopPropagation();
    renderMenu();
    shotMenu.classList.toggle('open');
    if(shotMenu.classList.contains('open'))requestAnimationFrame(positionMenu);
  });
  shotMenu.addEventListener('click',event=>{
    const button=event.target.closest('[data-type]');
    if(!button)return;
    event.preventDefault();event.stopPropagation();
    S.fgShotType=button.dataset.type;
    renderMenu();closeMenu();updatePlan();
  });
  document.addEventListener('pointerdown',event=>{
    if(!shotMenu.contains(event.target)&&event.target!==shotButton)closeMenu();
  },true);
  addEventListener('resize',()=>{if(shotMenu.classList.contains('open'))positionMenu();},{passive:true});
  renderMenu();

  const originalCompute=typeof computeStrike==='function'?computeStrike:null;
  if(originalCompute){
    computeStrike=function(powerPct){
      const lie=getLie();
      const clean=['tee','fairway','first cut','firstcut','fringe','green'].includes(lie);
      const random=Math.random;
      let strike;
      if(clean){
        Math.random=()=>0.5;
        try{strike=originalCompute(powerPct);}finally{Math.random=random;}
      }else strike=originalCompute(powerPct);
      if(!strike||strike.putter)return strike;
      const type=S.fgShotType||'normal';
      if(type==='punch'){
        strike.loft=Math.max(4,strike.loft-10);strike.v*=.96;strike.bs*=.5;strike.windLift=(strike.windLift||1)*.58;strike.rollBias=(strike.rollBias||1)*1.5;
      }else if(type==='knockdown'){
        strike.loft=Math.max(6,strike.loft-6);strike.v*=.92;strike.bs*=.73;strike.windLift=(strike.windLift||1)*.64;strike.rollBias=(strike.rollBias||1)*1.2;
      }else if(type==='chip'){
        strike.loft=Math.max(10,Math.min(31,strike.loft-7));strike.v*=.54;strike.bs*=.54;strike.rollBias=(strike.rollBias||1)*1.7;
      }else if(type==='pitch'){
        strike.loft=Math.min(58,strike.loft+5);strike.v*=.73;strike.bs*=.92;strike.rollBias=(strike.rollBias||1)*.78;
      }else if(type==='flop'){
        strike.loft=Math.min(69,strike.loft+17);strike.v*=.69;strike.bs*=1.24;strike.rollBias=(strike.rollBias||1)*.43;
      }else if(type==='splash'){
        strike.loft=Math.min(72,strike.loft+20);strike.v*=.61;strike.bs*=.6;strike.rollBias=(strike.rollBias||1)*.34;
      }
      return strike;
    };
  }

  function baseCarry(){
    const club=getClub();
    if(!club)return 0;
    try{if(typeof CARRY_Y!=='undefined'&&CARRY_Y&&CARRY_Y[club.n]!=null)return Number(CARRY_Y[club.n]);}catch(e){}
    if(Number.isFinite(Number(club.carry)))return Number(club.carry);
    if(Number.isFinite(Number(club.dist)))return Number(club.dist);
    if(Number.isFinite(Number(club.v)))return Number(club.v)*2.4;
    return 0;
  }
  function lieMultiplier(lie,club){
    try{if(typeof lieMult==='function')return Number(lieMult(lie==='tee'?'fairway':lie,club))||1;}catch(e){}
    if(/deep rough/.test(lie))return .78;
    if(/rough/.test(lie))return .88;
    if(/bunker|sand/.test(lie))return .72;
    return 1;
  }
  function elevationFeet(){
    try{
      const hole=getHole();if(!hole)return 0;
      const pin=hole.pin||{};
      const py=groundY(hole,pin.x,pin.z);
      const by=groundY(hole,S.pos.x,S.pos.z);
      return Math.round((py-by)*(typeof YDS==='number'?YDS:1)*3);
    }catch(e){return 0;}
  }
  function slopeRead(){
    const hole=getHole();
    if(!hole)return {side:0,along:0,distance:0};
    const pin=hole.pin||{};
    const dx=pin.x-S.pos.x,dz=pin.z-S.pos.z;
    const distance=Math.hypot(dx,dz)||1;
    const ux=dx/distance,uz=dz/distance;
    const e=.35;
    const gx=(groundY(hole,S.pos.x+e,S.pos.z)-groundY(hole,S.pos.x-e,S.pos.z))/(2*e);
    const gz=(groundY(hole,S.pos.x,S.pos.z+e)-groundY(hole,S.pos.x,S.pos.z-e))/(2*e);
    return {side:gx*uz-gz*ux,along:gx*ux+gz*uz,distance};
  }
  function updatePlan(){
    if(!plan)return;
    const club=getClub();
    const lie=getLie();
    const state=S.state;
    const aiming=state==='aiming'||state==='charging'||state==='address';
    plan.style.display=aiming?'block':'none';
    if(!aiming||!club)return;
    if(isPutter()){
      const slope=slopeRead();
      const feet=Math.max(1,Math.round(getDistanceYards()*3));
      const breakText=Math.abs(slope.side)<.005?'mostly straight':slope.side>0?'breaks left':'breaks right';
      const grade=Math.abs(slope.along)<.004?'level':slope.along>0?'downhill':'uphill';
      plan.innerHTML='<b>'+feet+' ft · '+breakText+'</b><br><span>'+grade+' · swipe controls pace</span>';
      return;
    }
    const type=shotTypes[S.fgShotType]||shotTypes.normal;
    const mult=lieMultiplier(lie,club);
    const aim=(S.aimPct==null?100:Number(S.aimPct))/100;
    const carry=Math.max(1,Math.round(baseCarry()*mult*aim*type.carry));
    const total=Math.max(carry,Math.round(carry*(1+type.roll)));
    const penalty=Math.max(0,Math.round((1-mult)*100));
    const elev=elevationFeet();
    plan.innerHTML='<b>'+carry+'y carry · '+total+'y total</b><br><span>'+titleCase(lie||'lie')+(penalty?' −'+penalty+'%':'')+' · '+(elev>0?'+':'')+elev+' ft · '+type.label+'</span>';
  }
  setInterval(()=>{try{updatePlan();renderMenu();}catch(e){}},350);

  function enhanceMaterial(object,color,opacity,scale){
    if(!object)return;
    object.visible=true;
    object.renderOrder=40;
    if(object.scale&&!object.userData.fgV3Scaled){object.scale.multiplyScalar(scale);object.userData.fgV3Scaled=true;}
    const apply=node=>{
      if(!node.material)return;
      const materials=Array.isArray(node.material)?node.material:[node.material];
      materials.forEach(material=>{
        if(material.color&&material.color.setHex)material.color.setHex(color);
        material.transparent=true;material.opacity=opacity;material.needsUpdate=true;
      });
    };
    apply(object);if(object.traverse)object.traverse(apply);
  }
  function enhanceAim(){
    if(S.state!=='aiming'&&S.state!=='charging')return;
    try{if(typeof marker!=='undefined')enhanceMaterial(marker,0xffffff,.92,1.1);}catch(e){}
    try{if(typeof rolloutMarker!=='undefined')enhanceMaterial(rolloutMarker,0xffd86a,.92,1.12);}catch(e){}
    try{if(typeof landingArea!=='undefined')enhanceMaterial(landingArea,0xffffff,.13,1);}catch(e){}
    try{if(typeof arcLine!=='undefined'&&arcLine.material){arcLine.material.transparent=true;arcLine.material.opacity=.65;if(arcLine.material.color)arcLine.material.color.setHex(0xffffff);}}catch(e){}
  }

  let beadGroup=null;
  let beads=[];
  function ensureBeads(){
    if(beadGroup||typeof scene==='undefined')return;
    beadGroup=new THREE.Group();
    beadGroup.renderOrder=25;
    const geometry=new THREE.SphereGeometry(.075,10,8);
    for(let i=0;i<9;i++){
      const material=new THREE.MeshBasicMaterial({color:0xa8f4ff,transparent:true,opacity:.86,depthTest:true,depthWrite:false});
      const bead=new THREE.Mesh(geometry,material);
      bead.frustumCulled=false;
      beadGroup.add(bead);beads.push(bead);
    }
    scene.add(beadGroup);
  }
  function updateBeads(now){
    ensureBeads();
    if(!beadGroup)return;
    const putting=isPutter()&&(S.state==='aiming'||S.state==='charging');
    beadGroup.visible=putting;
    if(!putting)return;
    const hole=getHole();if(!hole)return;
    const pin=hole.pin||{};
    const ax=S.pos.x,az=S.pos.z,bx=pin.x,bz=pin.z;
    const dx=bx-ax,dz=bz-az,distance=Math.hypot(dx,dz)||1;
    const ux=dx/distance,uz=dz/distance;
    const px=-uz,pz=ux;
    const slope=slopeRead();
    const bend=clampValue(slope.side*distance*distance*.75,-2.4,2.4);
    beads.forEach((bead,index)=>{
      const t=(index/beads.length+now*.00016)%1;
      const curve=4*t*(1-t)*bend;
      const x=ax+dx*t+px*curve;
      const z=az+dz*t+pz*curve;
      bead.position.set(x,groundY(hole,x,z)+.085,z);
      const pulse=.8+.2*Math.sin(now*.009+index);
      bead.scale.setScalar(pulse);
      bead.material.opacity=.7+.2*pulse;
    });
  }

  function project(vector){
    const p=vector.clone().project(camera);
    return {x:(p.x*.5+.5)*innerWidth,y:(-.5*p.y+.5)*innerHeight,z:p.z};
  }
  let trail=[];
  let trailFade=0;
  function addTrailPoint(){
    const point=project(S.pos);
    if(point.z<-1||point.z>1||!Number.isFinite(point.x)||!Number.isFinite(point.y))return;
    const last=trail[trail.length-1];
    if(!last||Math.hypot(last.x-point.x,last.y-point.y)>3)trail.push(point);
    if(trail.length>58)trail.shift();
  }
  function drawTrail(){
    if(trail.length<2||trailFade<=.02)return;
    ctx.save();
    ctx.globalAlpha=.52*trailFade;
    ctx.lineCap='round';ctx.lineJoin='round';
    ctx.strokeStyle='rgba(255,255,255,.92)';
    ctx.lineWidth=1.6;
    ctx.shadowColor='rgba(85,215,235,.55)';ctx.shadowBlur=3;
    ctx.beginPath();ctx.moveTo(trail[0].x,trail[0].y);
    for(let i=1;i<trail.length;i++)ctx.lineTo(trail[i].x,trail[i].y);
    ctx.stroke();
    ctx.restore();
  }

  let previousState='';
  let shot=null;
  function beginShot(){
    const club=getClub();
    const start=S.lastShot&&S.lastShot.clone?S.lastShot.clone():S.pos.clone();
    shot={start,putt:!!(club&&Number(club.loft)===0),type:S.fgShotType||'normal'};
    trail=[];trailFade=1;closeMenu();
  }
  function finishShot(){
    if(!shot)return;
    let lie='';try{lie=titleCase(getLie()||'Shot Complete');}catch(e){lie='Shot Complete';}
    const remaining=getDistanceYards();
    if(shot.putt){
      if(remaining<.7)showResult('<b>HOLED</b>');
      else showResult('<b>'+Math.max(1,Math.round(remaining*3))+' ft remaining</b> · '+lie);
    }else{
      const total=Math.max(0,Math.hypot(S.pos.x-shot.start.x,S.pos.z-shot.start.z)*(typeof YDS==='number'?YDS:1));
      let carry=total;
      try{if(Number.isFinite(Number(S.maxCarry))&&Number(S.maxCarry)>0)carry=Number(S.maxCarry)*(typeof YDS==='number'?YDS:1);}catch(e){}
      showResult('<b>'+Math.round(carry)+'y carry</b> · '+Math.round(total)+'y total · '+lie+' · '+Math.round(remaining)+'y left');
    }
    shot=null;
  }

  const swingSub=byId('sfSub')||byId('shotFeedback');
  if(swingSub){
    const clarify=()=>{
      if(swingSub.nodeType!==1)return;
      if(swingSub.id==='sfSub'){
        swingSub.textContent=swingSub.textContent.replace(/club\s*face/ig,'start direction').replace(/\bpath\b/ig,'swipe path');
        swingSub.title='Estimated from swipe direction and tempo';
      }
    };
    new MutationObserver(clarify).observe(swingSub,{childList:true,subtree:true,characterData:true});
  }
  const grade=byId('sfGrade');
  if(grade&&navigator.vibrate){
    let last='';
    const haptic=()=>{
      const value=grade.textContent.trim();if(!value||value===last)return;last=value;
      if(/PURE|SOLID/i.test(value))navigator.vibrate(14);
      else if(/OFF|MIS|POOR/i.test(value))navigator.vibrate([8,24,8]);
    };
    new MutationObserver(haptic).observe(grade,{childList:true,subtree:true,characterData:true});
  }

  function loop(now){
    ctx.clearRect(0,0,innerWidth,innerHeight);
    const state=S.state;
    if(state==='flying'&&previousState!=='flying')beginShot();
    if(state==='flying'){addTrailPoint();trailFade=1;}
    else if(previousState==='flying'){finishShot();trailFade=1;}
    else if(trailFade>0)trailFade-=.035;
    drawTrail();
    updateBeads(now);
    enhanceAim();
    if(isPutter()){dock.style.display='none';closeMenu();}
    else dock.style.display=(state==='aiming'||state==='charging'||state==='address')?'block':'none';
    previousState=state;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  console.info('Fairway Golf Core v3 enhancements installed');
}
if(document.readyState==='complete')wait();else window.addEventListener('load',wait,{once:true});
})();
