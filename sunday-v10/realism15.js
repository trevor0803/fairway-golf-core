(()=>{
const S=window.SUNDAY;if(!S||S._realism15)return;S._realism15=true;
const BUILD={label:'Updated Sep 8, 2026 · 8:47 PM ET',version:'11.12',stamp:'2026-09-08T20:47:22-04:00'};
S.BUILD=BUILD;
const style=document.createElement('style');style.textContent=`
.s15-build-stamp{position:fixed;right:9px;bottom:calc(76px + env(safe-area-inset-bottom));z-index:650;pointer-events:none;border:1px solid rgba(255,255,255,.09);border-radius:999px;background:rgba(3,9,7,.76);backdrop-filter:blur(8px);color:#8fa199;padding:5px 8px;font:800 8px/1.1 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.025em;box-shadow:0 5px 18px rgba(0,0,0,.18)}
body.s11-game-day .s15-build-stamp{bottom:calc(9px + env(safe-area-inset-bottom));color:#769087;background:rgba(2,7,5,.72)}
.s12-home~.s15-build-stamp,.s14-overlay~.s15-build-stamp{bottom:calc(9px + env(safe-area-inset-bottom))}
@media(max-width:480px){.s15-build-stamp{font-size:7px;padding:4px 7px;max-width:52vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
`;document.head.appendChild(style);
const ensure=()=>{let el=document.querySelector('.s15-build-stamp');if(!el){el=document.createElement('div');el.className='s15-build-stamp';document.body.appendChild(el)}el.textContent=`${BUILD.label} · v${BUILD.version}`;el.title=`SUNDAY build ${BUILD.version} — ${BUILD.stamp}`};
const oldRender=S.render;S.render=()=>{oldRender();if(typeof document!=='undefined')ensure()};
ensure();
})();