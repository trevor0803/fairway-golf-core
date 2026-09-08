var S=window.SUNDAY;
const roleW={Featured:1.5,Starter:1,Rotation:.58,Package:.38,Emergency:.15,Backup:.22};
function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash(...x){let h=2166136261;for(const c of x.join('|')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function normal(r,m=0,sd=1){const u=Math.max(1e-9,r()),v=Math.max(1e-9,r());return m+Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)*sd}
function choice(r,a){return a[Math.floor(r()*a.length)]}
function weighted(r,a,w){let total=a.reduce((n,x)=>n+Math.max(0,w(x)),0),z=r()*total;for(const x of a){z-=Math.max(0,w(x));if(z<=0)return x}return a[a.length-1]}
function blankTeam(){return{points:0,yards:0,passYards:0,rushYards:0,plays:0,punts:0,turnovers:0,sacksAllowed:0,fgAtt:0,fgMade:0}}
function gs(G,p){if(!G.stats[p.id])G.stats[p.id]={playerId:p.id,name:p.name,team:p.team,pos:p.pos,...S.blankStats()};return G.stats[p.id]}
function offPlayers(t){return t.roster.filter(p=>p.status==='ACT')}
function ol(t){const a=offPlayers(t).filter(p=>['OT','OG','C','OL'].includes(p.pos));return [...a.filter(p=>p.role==='Starter'),...a.filter(p=>p.role!=='Starter')].slice(0,5)}
function qb(t){return offPlayers(t).filter(p=>p.pos==='QB').sort((a,b)=>b.overall-a.overall)[0]}
function backs(t){return offPlayers(t).filter(p=>p.pos==='RB')}
function elig(t){return offPlayers(t).filter(p=>['RB','WR','TE'].includes(p.pos))}
function defense(t){return offPlayers(t).filter(p=>['DL','LB','DB'].includes(p.pos))}
function prep(t,p,area){if(t.code!==S.state.coach.team||!p)return 0;let b=(p.practiceReps-50)/60;if(p.practiceFocus==='Run Blocking'&&area==='run')b+=.75;if(p.practiceFocus==='Pass Protection'&&area==='pass')b+=.75;if(p.practiceFocus==='Route Detail'&&area==='route')b+=.55;if(p.practiceFocus==='Hands'&&area==='hands')b+=.45;if(p.practiceFocus==='Run Reads'&&area==='run')b+=.55;if(p.practiceFocus==='Pass Game'&&(area==='route'||area==='hands'))b+=.5;if(p.practiceFocus==='Timing'&&area==='timing')b+=.55;if(p.practiceFocus==='Pressure Answers'&&area==='pressure')b+=.65;if(p.practiceFocus==='Red Zone'&&area==='redzone')b+=.6;return b}
function gp(t,G){return t.code===S.state.coach.team?{...S.state.gamePlan,...G.plan}:{runRate:44,tempo:'Balanced',aggression:'Normal',rbPassGame:true,protection:'Balanced',shotRate:11}}
function active(G,p){return G.driveIndex>(G.restUntil[p.id]??-1)}
function pickRB(t,r,G){const a=backs(t).filter(p=>active(G,p));return weighted(r,a,p=>(roleW[p.role]||.3)*(1+(p.overall-72)/80)*(G.rbBias[p.id]||1)*(1+prep(t,p,'run')*.025))}
function pickTarget(t,r,kind,G){const a=elig(t).filter(p=>active(G,p));if(!a.length)return null;const plan=gp(t,G);return weighted(r,a,p=>{let w=p.pos==='WR'?1:p.pos==='TE'?.7:.25;if(kind==='screen')w=p.pos==='RB'?2.7:p.pos==='WR'?.4:.14;else if(kind==='check')w=p.pos==='RB'?1.6:p.pos==='TE'?.9:.38;if(plan.rbPassGame&&p.pos==='RB')w*=1.08;w*=roleW[p.role]||.3;w*=1+(p.overall-72)/120;w*=G.targetBias[p.id]||1;w*=1-S.clamp((p.fatigue-38)/110,0,.25);w*=1+prep(t,p,'route')*.035;return w})}
function tackle(G,t,r,kind){const a=defense(t);if(!a.length)return;const p=weighted(r,a,x=>kind==='run'?(x.pos==='LB'?1.5:x.pos==='DL'?1.2:.7):(x.pos==='DB'?1.5:x.pos==='LB'?1:.4));gs(G,p).tackles++}
function defSack(G,t,r){const a=defense(t);if(a.length)gs(G,weighted(r,a,x=>x.pos==='DL'?1.8:x.pos==='LB'?1:.15)).defSacks++}
function defInt(G,t,r){const a=defense(t);if(a.length)gs(G,weighted(r,a,x=>x.pos==='DB'?1.9:x.pos==='LB'?.7:.08)).defInt++}
function addSnaps(G,t,pass,r){for(const p of ol(t)){const x=gs(G,p);x.snaps++;pass?x.passBlockSnaps++:x.runBlockSnaps++}for(const p of elig(t)){if(!active(G,p))continue;const rw=roleW[p.role]||.25;if(r()<Math.min(.98,.34+rw*.42)){const x=gs(G,p);x.snaps++;if(pass&&p.pos!=='RB')x.routes++}}}
function runBlock(G,t,o,r){const line=ol(t);if(!line.length)return 0;const p=choice(r,line),x=gs(G,p),skill=((p.attrs.runBlock||p.overall)-74)/14+prep(t,p,'run')+(t.code===S.state.coach.team?(S.state.morale.olChemistry-50)/18:0)-((o.defense??o.power)-(t.offense??t.power))/40;const win=r()<S.clamp(.53+skill*.07,.28,.77);win?x.runBlockWins++:x.runBlockLosses++;return win?normal(r,.65,.6):-Math.max(.2,normal(r,1,.7))}
function pressure(G,t,r,sack=false){const line=ol(t);if(!line.length)return;const p=weighted(r,line,x=>Math.max(.25,100-(x.attrs.passBlock||x.overall))*(x.practiceFocus==='Pass Protection'?.72:1)),x=gs(G,p);x.pressuresAllowed++;if(sack)x.sacksAllowed++;return p}
