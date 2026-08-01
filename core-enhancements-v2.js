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
  document.title='Fairway Golf Core';
  const style=document.createElement('style');
  style.textContent='#fgFx{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:7}';
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

  function project(v){
    const p=v.clone().project(camera);
    return {x:(p.x*.5+.5)*innerWidth,y:(-.5*p.y+.5)*innerHeight,z:p.z};
  }

  let previousState='';
  let trail=[];
  let trailFade=0;

  function updateTrail(){
    const point=project(S.pos);
    if(point.z<-1||point.z>1||!Number.isFinite(point.x)||!Number.isFinite(point.y))return;
    const last=trail[trail.length-1];
    if(!last||Math.hypot(last.x-point.x,last.y-point.y)>2.2)trail.push(point);
    if(trail.length>220)trail.shift();
  }

  function drawTrail(){
    if(trail.length<2||trailFade<=.02)return;
    ctx.save();
    ctx.globalAlpha=trailFade;
    ctx.lineCap='round';
    ctx.lineJoin='round';
    ctx.shadowColor='#5de7ff';
    ctx.shadowBlur=13;
    ctx.strokeStyle='rgba(255,255,255,.96)';
    ctx.lineWidth=5;
    ctx.beginPath();
    ctx.moveTo(trail[0].x,trail[0].y);
    for(let i=1;i<trail.length;i++)ctx.lineTo(trail[i].x,trail[i].y);
    ctx.stroke();
    ctx.shadowBlur=5;
    ctx.strokeStyle='#4eddf5';
    ctx.lineWidth=2;
    ctx.stroke();
    const head=trail[trail.length-1];
    ctx.shadowBlur=18;
    ctx.fillStyle='#fff';
    ctx.beginPath();
    ctx.arc(head.x,head.y,5.5,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function puttData(){
    try{
      if(!CLUBS[S.club]||CLUBS[S.club].loft!==0)return null;
      if(!['aiming','charging'].includes(S.state))return null;
      const lie=String(currentLie()).toLowerCase();
      if(lie!=='green'&&lie!=='fringe')return null;
      const hole=H();
      const ball=S.pos.clone();
      ball.y=surfaceWorldY(hole,ball.x,ball.z)+.12;
      const pin=new THREE.Vector3(hole.pin.x,surfaceWorldY(hole,hole.pin.x,hole.pin.z)+.12,hole.pin.z);
      const a=project(ball),b=project(pin);
      if(a.z<-1||a.z>1||b.z<-1||b.z>1)return null;
      const dx=hole.pin.x-S.pos.x;
      const dz=hole.pin.z-S.pos.z;
      const distance=Math.hypot(dx,dz)||1;
      const ux=dx/distance,uz=dz/distance;
      let sx=0,sz=0;
      if(typeof greenSlopeAt==='function'){
        const slope=greenSlopeAt(hole,S.pos.x,S.pos.z)||{};
        sx=slope.gx||slope.x||0;
        sz=slope.gz||slope.z||0;
      }else if(hole.slope){
        sx=hole.slope.x||0;
        sz=hole.slope.z||0;
      }
      return {a,b,breakValue:sx*uz-sz*ux};
    }catch(error){return null;}
  }

  function bezier(a,c,b,t){
    const u=1-t;
    return {x:u*u*a.x+2*u*t*c.x+t*t*b.x,y:u*u*a.y+2*u*t*c.y+t*t*b.y};
  }

  function drawPutting(now){
    const data=puttData();
    if(!data)return;
    const vx=data.b.x-data.a.x;
    const vy=data.b.y-data.a.y;
    const len=Math.hypot(vx,vy)||1;
    const px=-vy/len,py=vx/len;
    const bend=Math.max(-110,Math.min(110,data.breakValue*len*12));
    const control={x:(data.a.x+data.b.x)/2+px*bend,y:(data.a.y+data.b.y)/2+py*bend};

    ctx.save();
    ctx.lineCap='round';
    ctx.setLineDash([7,8]);
    ctx.strokeStyle='rgba(255,255,255,.92)';
    ctx.lineWidth=3.5;
    ctx.shadowColor='rgba(0,0,0,.9)';
    ctx.shadowBlur=5;
    ctx.beginPath();
    ctx.moveTo(data.a.x,data.a.y);
    for(let i=1;i<=36;i++){
      const p=bezier(data.a,control,data.b,i/36);
      ctx.lineTo(p.x,p.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    for(let i=0;i<13;i++){
      const t=(i/13+(now*.00024))%1;
      const p=bezier(data.a,control,data.b,t);
      ctx.shadowColor='#00f5ff';
      ctx.shadowBlur=15;
      ctx.fillStyle='#00f5ff';
      ctx.strokeStyle='#001b1f';
      ctx.lineWidth=2.5;
      ctx.beginPath();
      ctx.arc(p.x,p.y,6,0,Math.PI*2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function loop(now){
    ctx.clearRect(0,0,innerWidth,innerHeight);
    const state=S.state;
    if(state==='flying'&&previousState!=='flying'){
      trail=[];
      trailFade=1;
    }
    if(state==='flying'){
      updateTrail();
      trailFade=1;
    }else if(previousState==='flying'){
      trailFade=1;
    }else if(trailFade>0){
      trailFade-=.012;
    }
    drawTrail();
    drawPutting(now);
    previousState=state;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  console.info('Fairway Golf Core visual-only enhancements installed');
}
if(document.readyState==='complete')waitForGame();
else window.addEventListener('load',waitForGame,{once:true});
})();
