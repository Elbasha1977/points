(function(){
  "use strict";
  const GLOBAL_ADMIN_UID="hwPgzTQbdfUJa45G2Wwc79ANNJE";
  const STYLE_ID="points-grade-analysis-launch-style";
  const LINK_ID="points-grade-analysis-launch";
  const VISIBILITY_HINTS={
    dailyChallenge:{href:["daily-challenge.html"],text:["تحدي اليوم","التحدي اليومي"]},
    questionHunter:{href:["question-hunter.html"],text:["صائد الأسئلة"]},
    homeworkHonorBoard:{text:["لوحة الشرف في واجبات النقاط المنزلية"]}
  };
  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement("style");style.id=STYLE_ID;
    style.textContent="#"+LINK_ID+"{display:inline-flex;align-items:center;justify-content:center;gap:9px;padding:14px 18px;border:0;border-radius:14px;background:linear-gradient(135deg,#0f3e66,#1976d2);color:#fff!important;text-decoration:none!important;font-family:Tahoma,Arial,sans-serif;font-size:15px;font-weight:900;box-shadow:0 6px 18px rgba(15,62,102,.25);cursor:pointer;transition:transform .2s,box-shadow .2s;white-space:nowrap}"+
      "#"+LINK_ID+":hover{transform:translateY(-2px);box-shadow:0 9px 22px rgba(15,62,102,.32)}"+
      "#"+LINK_ID+" .ga-icon{font-size:22px}"+
      "#"+LINK_ID+".ga-floating{position:fixed;left:18px;bottom:20px;z-index:99990;max-width:calc(100vw - 36px)}"+
      "@media(max-width:600px){#"+LINK_ID+".ga-floating{left:10px;right:10px;bottom:10px;width:auto}}";
    document.head.appendChild(style);
  }
  function createButton(){
    if(document.getElementById(LINK_ID))return;
    installStyle();
    const link=document.createElement("a");
    link.id=LINK_ID;link.href="./grade-analysis.html";link.target="_blank";link.rel="noopener";
    link.innerHTML='<span class="ga-icon">📊</span><span>تحليل درجات الطلاب</span>';
    const host=document.querySelector(".buttons-grid")||document.querySelector(".grid-container")||document.querySelector(".bottom-row");
    if(host){link.style.minHeight="48px";host.appendChild(link);}
    else{link.classList.add("ga-floating");document.body.appendChild(link);}
  }
  function removeButton(){document.getElementById(LINK_ID)?.remove();}
  async function featureEnabled(featureKey){
    const check=firebase.app().functions("us-central1").httpsCallable("checkCustomerFeature");
    const response=await check({feature:featureKey});
    return response.data?.success===true && response.data?.allowed===true;
  }
  function applyFeatureLauncherVisibility(featureKey,enabled){
    const hints=VISIBILITY_HINTS[featureKey];
    if(!hints)return;
    const selector='a,button,[role="button"],[onclick],.menu-item,.menu-button';
    document.querySelectorAll(selector).forEach(el=>{
      if(el.id===LINK_ID)return;
      const href=String(el.getAttribute("href")||"").toLowerCase();
      const text=String(el.innerText||el.textContent||"").replace(/\s+/g," ").trim();
      const matches=hints.href.some(x=>href.includes(x)) ||
        (text.length>0 && text.length<=90 && hints.text.some(x=>text.includes(x)));
      if(!matches)return;
      if(!enabled){
        if(el.dataset.pointsFeatureOriginalDisplay===undefined){
          el.dataset.pointsFeatureOriginalDisplay=el.style.display||"";
        }
        el.dataset.pointsFeatureHidden=featureKey;
        el.style.display="none";
        el.setAttribute("aria-hidden","true");
      }else if(el.dataset.pointsFeatureHidden===featureKey){
        el.style.display=el.dataset.pointsFeatureOriginalDisplay||"";
        delete el.dataset.pointsFeatureHidden;
        delete el.dataset.pointsFeatureOriginalDisplay;
        el.removeAttribute("aria-hidden");
      }
    });
  }
  async function syncFeatureLaunchers(){
    const keys=Object.keys(VISIBILITY_HINTS);
    const checks=await Promise.all(keys.map(async key=>{
      try{return [key,await featureEnabled(key)];}
      catch(error){console.warn("POINTS feature check failed:",key,error);return [key,false];}
    }));
    checks.forEach(([key,enabled])=>applyFeatureLauncherVisibility(key,enabled));
  }
  function boot(){
    if(!window.firebase||!firebase.apps||!firebase.apps.length||!firebase.auth||!firebase.firestore){
      setTimeout(boot,300);return;
    }
    let visibilityObserver=null;
    firebase.auth().onAuthStateChanged(async user=>{
      removeButton();
      applyFeatureLauncherVisibility("dailyChallenge",false);
      applyFeatureLauncherVisibility("questionHunter",false);
      if(visibilityObserver){visibilityObserver.disconnect();visibilityObserver=null;}
      if(!user)return;
      try{
        const snap=await firebase.firestore().collection("users").doc(user.uid).get();
        if(!snap.exists)return;
        const profile=snap.data()||{};
        const admin=user.uid===GLOBAL_ADMIN_UID&&profile.role==="admin";
        const staff=profile.role==="staff"&&Array.isArray(profile.classIds)&&profile.classIds.length>0;
        if(profile.active!==true||profile.approved!==true||(!admin&&!staff))return;
        if(await featureEnabled("gradeAnalysis"))createButton();
        await syncFeatureLaunchers();
        if(document.body&&window.MutationObserver){
          visibilityObserver=new MutationObserver(()=>syncFeatureLaunchers());
          visibilityObserver.observe(document.body,{childList:true,subtree:true,characterData:true});
        }
      }catch(error){console.warn("POINTS feature visibility check unavailable:",error);}
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();