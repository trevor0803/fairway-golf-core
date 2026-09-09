(()=>{
const S=window.SUNDAY;if(!S||S._realism13)return;S._realism13=true;
const RESET='sunday_force_clean_20260908_v1';
const REG='sunday_career_registry_v1';
const INIT='sunday_career_registry_initialized_v1';
if(!localStorage.getItem(RESET)){
  for(const k of ['sunday_v10','sunday_v9','sunday_v8','sunday_v7','sunday_v6',REG,INIT]) localStorage.removeItem(k);
  localStorage.setItem(REG,JSON.stringify({active:null,careers:{}}));
  localStorage.setItem(INIT,'1');
  localStorage.setItem(RESET,'1');
  S.state=S.baseState();
  S.state.careerSetupComplete=false;
  S.state.careerId=null;
  S.state.ui={...(S.state.ui||{}),tab:'week',careerHome:true,careerWizard:false,guideOpen:false,guideSeen:false,gamePane:'overview'};
  try{S.render?.()}catch(e){console.error('SUNDAY clean reset render failed',e)}
}
const oldAudit=S.realismAudit;
if(oldAudit)S.realismAudit=()=>{const a=oldAudit();return{...a,version:'11.10-clean-careers',checks:{...a.checks,forcedCleanReset:true}}};
})();