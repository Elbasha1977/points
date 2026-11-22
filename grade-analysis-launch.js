(function(){
  "use strict";
  const STYLE_ID="points-grade-analysis-launch-style";
  const LINK_ID="points-grade-analysis-launch";
  const VISIBILITY_HINTS={
    gradeAnalysis:{href:["grade-analysis.html"],text:["تحليل درجات الطلاب"]},
    dailyChallenge:{href:["daily-challenge.html"],text:["تحدي اليوم","التحدي اليومي"]},
    questionHunter:{href:["question-hunter.html"],text:["صائد الأسئلة"]},
    homeworkHonorBoard:{text:["لوحة الشرف في واجبات النقاط المنزلية"]},
    studentHomeworkResults:{text:["عرض نتائج نقاط واجباتي"]}
  };
  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement("style");style.id=STYLE_ID;
    style.textContent="#"+LINK_ID+"{display:inline-flex;align-items:center;justify-content:center;gap:9px;padding:14px 18px;border:0;border-radius:14px;background:linear-gradient(135deg,#0f3e66,#1976d2);color:#fff!important;text-decoration:none!important;font-family:Tahoma,Arial,sans-serif;font-size:15px;font-weight:900;box-shadow:0 6px 18px rgba(15,62,102,.25);cursor:pointer;transition:transform .2s,box-shadow .2s;white-space:nowrap}"+
      "#"+LINK_ID+":hover{transform:translateY(-2px);box-shadow:0 9px 22px rgba(15,62,102,.32)}"+
      "#"+LINK_ID+" .ga-icon{font-size:22px}"+
      "#"+LINK_ID+".ga-dashboard{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:48px;padding:12px 20px;border:0;border-radius:14px;background:linear-gradient(135deg,#0f3e66,#1976d2);color:#fff!important;text-decoration:none!important;font-family:Tahoma,Arial,sans-serif;font-size:15px;font-weight:900;box-shadow:0 6px 18px rgba(15,62,102,.20);cursor:pointer;white-space:nowrap;margin:6px auto}"+
      ".ga-launch-row{display:flex;justify-content:center;align-items:center;width:100%;margin:14px auto 4px}";
    document.head.appendChild(style);
  }
  function createButton(){
    if(!firebase?.auth || !firebase.auth().currentUser)return;
    const isVisible=el=>{
      if(!el)return false;
      const cs=getComputedStyle(el);
      return cs.display!=="none"&&cs.visibility!=="hidden"&&Number(cs.opacity||1)>0&&el.getClientRects().length>0;
    };
    if(isVisible(document.querySelector(".login-overlay"))||
       isVisible(document.getElementById("pointsIntroScreen")))return;
    if(document.getElementById(LINK_ID))return;
    installStyle();
    const host=document.querySelector(".header-buttons")||
      document.querySelector(".buttons-grid")||
      document.querySelector("#mainApp .buttons-grid")||
      document.querySelector(".container:not(.login-overlay)");
    if(!host)return;
    const row=document.createElement("div");
    row.className="ga-launch-row";
    row.id=LINK_ID+"-row";
    const link=document.createElement("a");
    link.id=LINK_ID;link.href="./grade-analysis.html";link.target="_blank";link.rel="noopener";
    link.setAttribute("aria-label","فتح تحليل درجات الطلاب");
    link.title="تحليل درجات الطلاب";
    link.innerHTML='<span class="ga-icon">📊</span><span>تحليل درجات الطلاب</span>';
    link.className="ga-dashboard";
    row.appendChild(link);
    host.appendChild(row);
  }
  function removeButton(){document.getElementById(LINK_ID+"-row")?.remove();document.getElementById(LINK_ID)?.remove();}
  function hideAllOptionalFeatureLaunchers(){
    const keys=new Set(Object.keys(VISIBILITY_HINTS));
    document.querySelectorAll("[data-feature]").forEach(el=>{
      const key=String(el.dataset?.feature||"").trim();
      if(key&&!key.startsWith("menu"))keys.add(key);
    });
    keys.forEach(key=>applyFeatureLauncherVisibility(key,false));
  }
  async function featureEnabled(featureKey){
    const check=firebase.app().functions("us-central1").httpsCallable("checkCustomerFeature");
    const response=await check({feature:featureKey});
    return response.data?.success===true && response.data?.allowed===true;
  }
  function applyFeatureLauncherVisibility(featureKey,enabled){
    const hints=VISIBILITY_HINTS[featureKey]||null;
    const selector='a,button,[role="button"],[onclick],.menu-item,.menu-button,[data-feature]';
    document.querySelectorAll(selector).forEach(el=>{
      if(el.id===LINK_ID)return;
      const href=String(el.getAttribute("href")||"").toLowerCase();
      const text=String(el.innerText||el.textContent||"").replace(/\s+/g," ").trim();
      const dataMatch=String(el.dataset?.feature||"")===featureKey;
      const linkMatch=!!hints && hints.href.some(x=>href.includes(x));
      const textMatch=!!hints && text.length>0 && text.length<=90 && hints.text.some(x=>text.includes(x));
      const matches=dataMatch||linkMatch||textMatch;
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
  const registeredFeatureKeys=new Set();
  async function syncNewUiFeatureCatalog(isGlobalAdmin){
    if(!isGlobalAdmin)return;
    const pending=new Map();
    document.querySelectorAll("[data-feature]").forEach(el=>{
      const key=String(el.dataset?.feature||"").trim();
      if(!key||key.startsWith("menu")||registeredFeatureKeys.has(key))return;
      if(!/^[a-zA-Z][a-zA-Z0-9_]{1,49}$/.test(key))return;
      const label=String(el.dataset?.featureLabel||el.getAttribute("aria-label")||el.getAttribute("title")||el.innerText||el.textContent||key).replace(/\s+/g," ").trim().slice(0,100)||key;
      const category=String(el.dataset?.featureCategory||"ميزات إضافية").replace(/\s+/g," ").trim().slice(0,80);
      const description=String(el.dataset?.featureDescription||"").replace(/\s+/g," ").trim().slice(0,300);
      if(!pending.has(key))pending.set(key,{key,label,category,description});
    });
    const items=Array.from(pending.values());
    if(!items.length)return;
    const sync=firebase.app().functions("us-central1").httpsCallable("syncUiFeatureCatalog");
    for(let i=0;i<items.length;i+=100){
      const batch=items.slice(i,i+100);
      try{
        const response=await sync({features:batch});
        if(response.data?.success!==true)throw new Error("Feature catalog synchronization was not confirmed.");
        batch.forEach(item=>registeredFeatureKeys.add(item.key));
      }catch(error){
        console.warn("POINTS automatic feature registration failed:",error);
        break;
      }
    }
  }
  async function syncFeatureLaunchers(isGlobalAdmin){
    await syncNewUiFeatureCatalog(isGlobalAdmin);
    const keySet=new Set(Object.keys(VISIBILITY_HINTS));
    // اكتشاف تلقائي لمفاتيح الواجهات الجديدة؛ مفاتيح menu* تُدار في آلية قائمة الموظفين الحالية.
    document.querySelectorAll("[data-feature]").forEach(el=>{
      const key=String(el.dataset?.feature||"").trim();
      if(key && !key.startsWith("menu"))keySet.add(key);
    });
    const keys=Array.from(keySet);
    const checks=await Promise.all(keys.map(async key=>{
      try{return [key,await featureEnabled(key)];}
      catch(error){console.warn("POINTS feature check failed:",key,error);return [key,false];}
    }));
    checks.forEach(([key,enabled])=>{
      applyFeatureLauncherVisibility(key,enabled);
      if(key==="gradeAnalysis"){
        if(enabled)createButton();
        else removeButton();
      }
    });
  }
  function boot(){
    if(!window.firebase||!firebase.apps||!firebase.apps.length||!firebase.auth||!firebase.firestore){
      setTimeout(boot,300);return;
    }
    let uiObserver=null;
    firebase.auth().onAuthStateChanged(async user=>{
      removeButton();
      if(uiObserver){uiObserver.disconnect();uiObserver=null;}
      if(!user)return;
      try{
        const analysisAllowed=await featureEnabled("gradeAnalysis");
        if(analysisAllowed)createButton();
        let isGlobalAdmin=false;
        try{
          const snap=await firebase.firestore().collection("users").doc(user.uid).get();
          const profile=snap.exists?(snap.data()||{}):{};
          isGlobalAdmin=profile.role==="admin";
        }catch(profileError){
          console.warn("POINTS optional profile read failed:",profileError);
        }
        if(isGlobalAdmin)await syncNewUiFeatureCatalog(true);
        await syncFeatureLaunchers(isGlobalAdmin);
        if(document.body&&window.MutationObserver){
          let syncTimer=null;
          const scheduleSync=()=>{
            clearTimeout(syncTimer);
            syncTimer=setTimeout(()=>{
              if(!firebase.auth().currentUser){removeButton();return;}
              createButton();
              syncFeatureLaunchers(isGlobalAdmin);
            },400);
          };
          uiObserver=new MutationObserver(scheduleSync);
          uiObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["style","class"]});
          window.addEventListener("focus",scheduleSync);
        }
      }catch(error){
        removeButton();
        console.warn("POINTS feature visibility check unavailable:",error);
      }
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();