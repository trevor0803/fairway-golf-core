(function(){
'use strict';
let installed=false;
function ready(){
  return typeof S!=='undefined' && typeof CLUBS!=='undefined' && typeof holeGroup!=='undefined';
}
function materialsOf(node){
  if(!node||!node.material)return[];
  return Array.isArray(node.material)?node.material:[node.material];
}
function enhance(root,hex,opacity,pulse){
  if(!root)return;
  root.visible=true;
  root.frustumCulled=false;
  root.renderOrder=9999;
  if(root.traverse)root.traverse(function(node){
    node.visible=true;
    node.frustumCulled=false;
    node.renderOrder=9999;
    if(node.scale&&!node.userData.fgBeadScaled){
      node.scale.multiplyScalar(1.45);
      node.userData.fgBeadScaled=true;
    }
    materialsOf(node).forEach(function(mat){
      if(!mat)return;
      mat.transparent=true;
      mat.opacity=Math.min(1,opacity+pulse);
      mat.depthTest=false;
      mat.depthWrite=false;
      mat.toneMapped=false;
      if(mat.color&&mat.color.setHex)mat.color.setHex(hex);
      if(mat.emissive&&mat.emissive.setHex){
        mat.emissive.setHex(hex);
        mat.emissiveIntensity=1.6;
      }
      mat.needsUpdate=true;
    });
  });
}
function isPutting(){
  try{
    if(!S||!CLUBS[S.club]||CLUBS[S.club].loft!==0)return false;
    if(!['aiming','charging','swinging'].includes(S.state))return false;
    const lie=typeof currentLie==='function'?String(currentLie()).toLowerCase():'';
    return lie==='green'||lie==='fringe';
  }catch(e){return false;}
}
function tick(now){
  try{
    if(ready()&&holeGroup&&holeGroup.userData){
      const putting=isPutting();
      const arrows=holeGroup.userData.slopeArrows;
      const lines=holeGroup.userData.breakLines;
      if(arrows)arrows.visible=putting;
      if(lines)lines.visible=putting;
      if(putting){
        const pulse=(Math.sin(now*0.007)+1)*0.08;
        enhance(arrows,0x00f5ff,0.84,pulse);
        enhance(lines,0xffffff,0.68,pulse*0.55);
      }
    }
  }catch(e){}
  requestAnimationFrame(tick);
}
function install(){
  if(installed)return;
  installed=true;
  requestAnimationFrame(tick);
  console.info('High-contrast putting beads installed');
}
if(document.readyState==='complete')install();else window.addEventListener('load',install,{once:true});
})();
