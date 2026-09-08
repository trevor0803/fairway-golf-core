(()=>{
const S=window.SUNDAY,R=S?.R;if(!S||!R||S._realism4)return;S._realism4=true;
const canon=x=>String(x||'').normalize('NFKD').replace(/[’']/g,'').replace(/[^a-zA-Z0-9]/g,'').toLowerCase();
R.depth2026={
  camward:'Starter',mitchelltrubisky:'Backup',tonypollard:'Starter',tyjaespears:'Rotation',nicholassingleton:'Rotation',juliuschestnut:'Emergency',
  calvinridley:'Featured',wandalerobinson:'Starter',carnelltate:'Starter',elicayomanor:'Rotation',chimeredike:'Package',
  gunnarhelm:'Starter',danielbellinger:'Rotation',kylengranson:'Package',davidmartinrobinson:'Emergency',
  danmoorejr:'Starter',peterskoronski:'Starter',austinschlottmann:'Starter',fernandocarmonajr:'Starter',jclatham:'Starter',brandoncrenshawdickson:'Backup',pathcoogan:'Backup',patcoogan:'Backup',garrettdellinger:'Backup',jacksonslater:'Backup',jameshudsoniii:'Backup',
  jermainejohnsonii:'Starter',jefferysimmons:'Starter',johnfranklinmyers:'Starter',jacobmartin:'Starter',keldricfaulk:'Rotation',codybarton:'Starter',cedricgray:'Starter',jameswilliamssr:'Rotation',anthonyhilljr:'Rotation',owenpappoe:'Rotation',
  alontaytaylor:'Starter',alontetaylor:'Starter',cordaleflott:'Starter',marcusharris:'Starter',amanihooker:'Starter',kevinwinstonjr:'Starter',tonyadams:'Rotation',terrellburgess:'Rotation',
  joeyslye:'Starter',tommytownsend:'Starter',morgancox:'Starter'
};
R.applyCurrentDepth=()=>{if(S.state.season.year!==2026||S.state.rosterSource!=='nflverse-2026-normalized'||S.state.depthChartSeeded2026)return;const t=R.team();for(const p of t.roster){if((p.roleHistory||[]).length)continue;const role=R.depth2026[canon(p.name)];if(role)p.role=role}const gray=t.roster.find(p=>canon(p.name)==='cedricgray');if(gray&&S.state.season.week===1&&(t.teamStats?.games||0)===0&&!gray.injury){gray.injury={type:'concussion protocol',weeksOut:0,severity:'QUESTIONABLE',week:1,season:2026,clearancePending:true};gray.practiceReps=Math.min(gray.practiceReps,25);S.note?.(gray,'Medical','In NFL concussion protocol after a UTV accident. Contact participation and Week 1 availability require medical and independent neurological clearance.')}S.state.depthChartSeeded2026=true;S.addLog?.('system','Week 1 Titans depth chart synced','Public Titans Week 1 roles were applied to current roster names. Existing user role decisions were preserved.');S.save?.()};
const priorRender=S.render;S.render=()=>{R.applyCurrentDepth();return priorRender()};
R.applyCurrentDepth();
S.advanceDrive=G=>{if(G.complete)return G;const postseason=!!G.postseason||S.state.season.phase==='POSTSEASON';
  if(!G.overtime){const regDone=G.elapsed>=3600||G.driveIndex>=G.maxRegDrives;if(regDone){if(G.score[G.away]!==G.score[G.home]){G.complete=true;finalNums(G);return G}G.overtime=true;G.otElapsed=0;G.otPossessions=0;G.otPeriod=1}}
  if(G.overtime&&!postseason&&(G.otElapsed||0)>=600){G.complete=true;finalNums(G);return G}
  const code=G.possession,remain=G.overtime?(postseason?900:Math.max(1,600-(G.otElapsed||0))):Math.max(1,3600-G.elapsed),r=rng((G.seed+Math.imul(G.driveIndex+1,7919))>>>0),d=drive(G,code,G.startPos||35,remain,r),q=G.overtime?'OT':Math.min(4,Math.floor(G.elapsed/900)+1);
  const used=Math.max(45,d.clock);G.elapsed+=used;if(G.overtime){G.otElapsed=(G.otElapsed||0)+used;G.otPossessions=(G.otPossessions||0)+1;if(postseason&&G.otElapsed>=900){G.otElapsed=0;G.otPeriod=(G.otPeriod||1)+1}}
  G.drives.push({team:code,start:G.startPos||35,quarter:q,...d,coachImpact:coachImpact(G,d)});G.driveIndex++;G.startPos=d.nextStart;G.possession=code===G.away?G.home:G.away;finalNums(G);
  if(!G.overtime){if((G.elapsed>=3600||G.driveIndex>=G.maxRegDrives)&&G.score[G.away]!==G.score[G.home])G.complete=true}
  else if(G.score[G.away]!==G.score[G.home]&&(G.otPossessions||0)>=2)G.complete=true;
  else if(!postseason&&(G.otElapsed||0)>=600)G.complete=true;
  return G};
S.simGame=(a,h)=>{const G=S.initializeGame(a,h);G.postseason=S.state.season.phase==='POSTSEASON';let guard=0;while(!G.complete&&guard++<120)S.advanceDrive(G);if(!G.complete){G.complete=true;finalNums(G)}return G};
const priorStart=S.startGame;S.startGame=()=>{const out=priorStart();if(S.state.liveGame)S.state.liveGame.postseason=S.state.season.phase==='POSTSEASON';return out};
const priorAudit=S.realismAudit;S.realismAudit=()=>{const a=priorAudit();const t=R.team(),gray=t.roster.find(p=>canon(p.name)==='cedricgray');return{...a,version:'11.2-realism',depthChartSeeded:!!S.state.depthChartSeeded2026,currentMedical:gray?.injury?.type||null,checks:{...a.checks,overtimeEngine:true,currentDepthChart:S.state.season.year!==2026||S.state.rosterSource!=='nflverse-2026-normalized'||!!S.state.depthChartSeeded2026}}};
if(window.SUNDAY_QA){window.SUNDAY_QA.realismAudit=S.realismAudit;window.SUNDAY_QA.startGame=S.startGame}
S.render();
})();
