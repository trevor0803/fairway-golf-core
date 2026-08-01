(function(){
'use strict';
function install(){
  if(typeof fireSwing!=='function'||typeof shoot!=='function'||typeof S==='undefined'||typeof CLUBS==='undefined'){
    setTimeout(install,50);
    return;
  }
  fireSwing=function(x,y,now){
    if(!sw)return;
    const g=typeof gearStats==='function'?gearStats():{forg:0};
    const dtF=Math.max(0.03,(now-sw.tFore)/1000);
    const dist=Math.max(1,sw.yAtMax-y);
    const speedNorm=clamp((dist/dtF)/(innerHeight*1.12),0,1);
    const timingPenalty=speedNorm<0.42?0.84:1;
    const scale=Math.min(innerWidth,innerHeight)*0.068;
    const backDev=clamp((sw.xAtMax-sw.x0)/scale,-1,1);
    const foreDev=clamp((x-sw.xAtMax)/scale,-1,1);
    const forg=clamp(1-((g.forg||0)+(DIFF.forg||0))*0.6,0.4,1.35);
    const isPutt=CLUBS[S.club].loft===0;
    const startPush=backDev*forg*(isPutt?0.5:1);
    let swipeCurve=clamp(foreDev*forg,-1,1);
    if(!isPutt){
      if(S.shotType==='draw')swipeCurve-=0.13;
      else if(S.shotType==='fade')swipeCurve+=0.13;
    }
    const pow=isPutt?clamp(S.power,1,100):clamp(S.power*(0.6+0.4*speedNorm)*timingPenalty,3,100);
    const trailPts=sw.pts;
    sw=null;
    if(!isPutt&&typeof showSwingFeedback==='function')showSwingFeedback(backDev,foreDev,speedNorm);
    shoot(pow,isPutt?0:clamp(swipeCurve*2.05,-1.35,1.35),startPush*(isPutt?2.0:4.4)*Math.PI/180);
    if(trailPts&&typeof swipeFadeOut==='function')swipeFadeOut(trailPts);
  };
  const details=document.getElementById('fgSwingDetails');
  if(details)details.style.display='none';
  console.info('Fairway Golf Core swing launch hotfix installed');
}
install();
})();
