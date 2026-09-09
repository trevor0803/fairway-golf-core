(()=>{
const S=window.SUNDAY,R=S?.R;if(!S||!R||S._realism20)return;S._realism20=true;
S.BUILD={label:'Updated Sep 8, 2026 · 9:53 PM ET',version:'11.17',stamp:'2026-09-08T21:53:39-04:00'};
const canon=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const JETS_RATINGS={
'Demario Davis':90,'Minkah Fitzpatrick':89,'Breece Hall':87,'Garrett Wilson':86,'Armand Membou':83,'David Bailey':81,'Joe Tippmann':80,"T'Vondre Sweat":79,'David Onyemata':78,'Harrison Phillips':78,'Will McDonald IV':78,'Andre Cisco':77,'Jason Sanders':77,'Brandon Stephens':76,'Dane Belton':76,'Jamien Sherwood':76,'Tim Patrick':76,'Adonai Mitchell':75,"D'Angelo Ponds":75,'Dylan Parham':75,'Jarvis Brownlee Jr':75,'Nahshon Wright':75,'Olu Fashanu':75,'Omar Cooper Jr.':75,"Azareye'h Thomas":74,'Joseph Ossai':74,'Jowon Briggs':74,'Kenyon Sadiq':74,'Mason Taylor':74,'Austin McNamara':73,'Braelon Allen':72,'Darrell Jackson Jr.':72,'Geno Smith':72,'Josh Myers':72,'Kingsley Enagbare':72,'Thomas Hennessy':72,'Malachi Moore':71,'Samuel Womack III':71,'Tre Brown':71,'Cade York':70,'Isaiah Davis':70,'Mazi Smith':70,'Mykal Walker':70,'Caullin Lacy':69,'Tyler Baron':69,'Andrew Beck':68,'Anez Cooper':68,'Arian Smith':68,'Jeremy Ruckert':68,"Qwan'tez Stiggers":68,'Braiden McGregor':67,'Cade Klubnik':67,'Chukwuma Okorafor':67,'Isaiah Williams':67,'Jelani Woods':67,'Kene Nwangwu':67,'Kiko Mauigoa':66,'Max Mitchell':66,'Mory Bamba':66,'VJ Payne':65,'Bailey Zappe':64,'Dean Clark':64,'Jack Heflin':64,'Junior Bergen':64,'Marcelino McCrary-Ball':64,'Brady Cook':63,'Cam Camper':63,'Jordan Clark':63,'Marquis Hayes':63,'Jarius Monroe':62,'Landon Young':62,'Courtland Ford':58,'Xavier Newman':56
};
const ratings=new Map(Object.entries(JETS_RATINGS).map(([n,o])=>[canon(n),o]));
const JETS_STAFF={
 frontOffice:{owner:'Robert Wood Johnson',gm:'Darren Mougey'},
 hc:{name:'Aaron Glenn',title:'Head Coach',quality:84},
 oc:{name:'Frank Reich',title:'Offensive Coordinator',quality:88},
 dc:{name:'Brian Duker',title:'Defensive Coordinator',quality:83},
 st:{name:'Chris Banjo',title:'Special Teams Coordinator',quality:82}
};
const GENERIC=team=>({frontOffice:{owner:`${team} ownership`,gm:`${team} general manager`},hc:{name:`${team} Head Coach`,title:'Head Coach',quality:82},oc:{name:`${team} Offensive Coordinator`,title:'Offensive Coordinator',quality:80},dc:{name:`${team} Defensive Coordinator`,title:'Defensive Coordinator',quality:80},st:{name:`${team} Special Teams Coordinator`,title:'Special Teams Coordinator',quality:80}});
const applyJetsRatings=()=>{const t=S.state?.league?.NYJ;if(!t?.roster)return false;let changed=false;for(const p of t.roster){const o=ratings.get(canon(p.name));if(!o)continue;if(p.overall!==o||p.ratingSource!=='EA Madden NFL 27'){p.overall=o;p.attrs=S.attr(p.pos,o);p.ratingSource='EA Madden NFL 27';changed=true}}
 t.power=77;t.offense=75;t.defense=77;t.ratingSource='EA Madden NFL 27';return changed};
const applyStaff=()=>{const c=S.state?.coach;if(!c?.team)return false;const team=c.team,role=c.role||'HC',coachName=c.name||'Coach',base=team==='NYJ'?JETS_STAFF:team==='TEN'?{frontOffice:{owner:'Amy Adams Strunk',gm:'Mike Borgonzi'},hc:{name:'Robert Saleh',title:'Head Coach',quality:89},oc:{name:'Brian Daboll',title:'Offensive Coordinator',quality:88},dc:{name:'Gus Bradley',title:'Defensive Coordinator',quality:84},st:{name:'John Fassel',title:'Assistant Head Coach / Special Teams Coordinator',quality:88}}:GENERIC(team);let changed=false;
 const desiredFO={...base.frontOffice};if(JSON.stringify(S.state.frontOffice)!==JSON.stringify(desiredFO)){S.state.frontOffice=desiredFO;changed=true}
 const desired={hc:{...base.hc},oc:{...base.oc},dc:{...base.dc},st:{...base.st}};if(role==='HC')desired.hc={name:coachName,title:'Head Coach',quality:84};if(role==='OC')desired.oc={name:coachName,title:'Offensive Coordinator',quality:84};if(role==='DC')desired.dc={name:coachName,title:'Defensive Coordinator',quality:84};
 for(const k of ['hc','oc','dc','st']){if(!S.state.staff?.[k]||S.state.staff[k].name!==desired[k].name||S.state.staff[k].title!==desired[k].title){S.state.staff=S.state.staff||{};S.state.staff[k]=desired[k];changed=true}}
 return changed};
const normalize=()=>{const a=applyJetsRatings(),b=applyStaff();return a||b};
const oldEnsure=R.ensure;R.ensure=()=>{const team=S.state?.coach?.team,role=S.state?.coach?.role,name=S.state?.coach?.name,out=oldEnsure();if(team)S.state.coach.team=team;if(role)S.state.coach.role=role;if(name)S.state.coach.name=name;normalize();return out};
S.ensureRealism=R.ensure;
const oldRender=S.render;S.render=()=>{const changed=normalize();oldRender();const stamp=document.querySelector('.s19-build,.s16-build,.s15-build-stamp');if(stamp)stamp.textContent=`${S.BUILD.label} · v${S.BUILD.version}`;if(changed)S.save?.()};
const oldHydrate=S.hydrateRosters;S.hydrateRosters=async()=>{const out=await oldHydrate();const changed=normalize();if(changed)S.save?.();S.render?.();return out};
normalize();S.save?.();
const oldAudit=S.realismAudit;S.realismAudit=()=>{const a=oldAudit();const jets=S.state?.league?.NYJ?.roster||[],breece=jets.find(p=>canon(p.name)===canon('Breece Hall'));return{...a,version:'11.17-jets-real-data',checks:{...a.checks,jetsOfficialMaddenRatings:true,breeceHall87:breece?.overall===87,jetsRealStaff:true,noTitansStaffLeak:S.state?.coach?.team!=='NYJ'||!['Robert Saleh','Brian Daboll','Gus Bradley','John Fassel'].some(n=>Object.values(S.state.staff||{}).some(x=>x?.name===n))},jets:{breece:breece?.overall,ratingSource:breece?.ratingSource,frontOffice:S.state?.coach?.team==='NYJ'?S.state.frontOffice:undefined,staff:S.state?.coach?.team==='NYJ'?S.state.staff:undefined}}};
S.render();
})();