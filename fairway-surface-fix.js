(function(){
'use strict';

if(typeof THREE==='undefined'||typeof pointAt!=='function'||typeof terrainY!=='function'){
  console.warn('Fairway surface fix skipped: engine not ready');
  return;
}

window.ribbon=function ribbon(h,halfW,mat,y,startD){
  startD=startD||0;
  const cols=(typeof MOBILE!=='undefined'&&MOBILE)?6:12;
  const rowStep=3;
  const pos=[];
  const uv=[];
  const idx=[];
  let rows=0;
  let ptx=0;
  let ptz=-1;

  for(let d=startD;d<=h.len;d+=rowStep){
    const p=pointAt(h.path,d);
    if(Math.hypot(p.x-h.pin.x,p.z-h.pin.z)<h.gr+4.5) break;

    const p2=pointAt(h.path,Math.min(h.len,d+1));
    let tx=p2.x-p.x;
    let tz=p2.z-p.z;
    let length=Math.hypot(tx,tz);
    if(length<1e-6){
      tx=ptx;
      tz=ptz;
      length=1;
    }
    tx/=length;
    tz/=length;
    ptx=tx;
    ptz=tz;

    const lx=tz;
    const lz=-tx;
    const f=d/h.len;
    const phase=(h.pin.x+h.pin.z)*0.13;
    const wob=1+0.07*Math.sin(d*0.05+phase)+0.04*Math.sin(d*0.022+phase*1.7);
    const startNeck=Math.max(0,Math.min(1,(d-startD)/16));
    const taper=(0.80+0.20*Math.sin(Math.PI*Math.min(1,f*1.08)))*startNeck;
    const hw=halfW*wob*taper;

    for(let c=0;c<=cols;c++){
      const side=1-(c/cols)*2;
      const x=p.x+lx*hw*side;
      const z=p.z+lz*hw*side;
      pos.push(x,terrainY(h,x,z)+y+0.018,z);
      uv.push(c/cols,d);
    }
    rows++;
  }

  const stride=cols+1;
  for(let r=0;r<rows-1;r++){
    for(let c=0;c<cols;c++){
      const a=r*stride+c;
      const b=a+1;
      const next=(r+1)*stride+c;
      const nextB=next+1;
      idx.push(a,b,next,b,nextB,next);
    }
  }

  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geometry.setIndex(idx);
  geometry.computeVertexNormals();

  const mesh=new THREE.Mesh(geometry,mat);
  mesh.receiveShadow=true;
  mesh.renderOrder=2;
  return mesh;
};

console.info('Fairway surface fix installed');
})();
