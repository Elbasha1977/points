/* POINTS Grade Analysis — secure server-backed client bridge. */
(function () {
  "use strict";
  const firebaseConfig = {
    apiKey: "AIzaSyCAeHOVGUpG7WcPcUh0XtBvmTwLGdcBCJE",
    authDomain: "school-points-qatar.firebaseapp.com",
    projectId: "school-points-qatar",
    storageBucket: "school-points-qatar.firebasestorage.app",
    messagingSenderId: "689880020347",
    appId: "1:689880020347:web:24305b6f89ac3448acb9de"
  };
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  const functions = firebase.app().functions("us-central1");
  const callable = name => functions.httpsCallable(name);
  const GLOBAL_ADMIN_UID = "hwPgzTQbdfUJa45G2Wwc79ANNJE";
  const KEY_DATA = "gradesSystemDataByContext_v1";
  const ALLOWED_SETTINGS = [
    "gradesSystemData_v1", "individualPlansSettings_v1", "gradesStudentStatus_v1",
    "gradesSystemProactiveClassification_v1", "gradesSystemProactivePlans_v1",
    "gradesSystemPlanSchedules_v1", "gradesSystemInitialProactiveSchedules_v1",
    "gradesSystemExamMarksSettings_v1"
  ];
  let currentUser = null, currentProfile = null, activeSchoolId = "", activeClassId = "";
  let assignedClasses = [], hydrating = false, pendingContexts = null, pendingSettings = {};
  let saveTimer = null, calcTimer = null, calcInFlight = false, calcAgain = false, initialTimer = null;
  let lastOverview = null, failingData = [], enrichmentCache = null, originalOnload = null, initialClassificationCache = null;
  let legacyContexts = null, legacySettings = {}, migratedSettings = new Set();
  const memory = Object.create(null);

  window.gradeAnalysisStore = {
    getItem(key) { return Object.prototype.hasOwnProperty.call(memory, String(key)) ? memory[String(key)] : null; },
    setItem(key, value) {
      key = String(key); memory[key] = String(value);
      if (hydrating) return;
      if (key === KEY_DATA) {
        try { pendingContexts = JSON.parse(memory[key] || "{}"); }
        catch (_) { throw new Error("بيانات السياق المحفوظة ليست JSON صالحًا."); }
      } else if (ALLOWED_SETTINGS.includes(key)) pendingSettings[key] = memory[key];
      gradeAnalysisScheduleSave();
    },
    removeItem(key) {
      key = String(key); delete memory[key];
      if (hydrating) return;
      if (key === KEY_DATA) {
        gradeAnalysisShowMessage("الحذف الشامل من الخادم محمي. استخدم إدارة البيانات المخصصة بدل Reset.", "error");
        return;
      }
      if (ALLOWED_SETTINGS.includes(key)) pendingSettings[key] = null;
      gradeAnalysisScheduleSave();
    },
    key(index) { return Object.keys(memory)[Number(index)] ?? null; },
    get length() { return Object.keys(memory).length; },
    clear() {
      Object.keys(memory).forEach(key => delete memory[key]);
      gradeAnalysisShowMessage("تم مسح ذاكرة العرض فقط. بيانات الخادم لم تُحذف.", "error");
    },
    _hydrate(settings, contexts) {
      hydrating = true;
      try {
        Object.keys(memory).forEach(key => delete memory[key]);
        Object.entries(settings || {}).forEach(([key, value]) => {
          if (ALLOWED_SETTINGS.includes(key) && value !== null && value !== undefined) memory[key] = String(value);
        });
        memory[KEY_DATA] = JSON.stringify(contexts || {});
      } finally { hydrating = false; }
    }
  };

  function gradeAnalysisShowMessage(message, type) {
    const el = document.getElementById("gradeAnalysisStatus");
    if (!el) return;
    el.textContent = message;
    el.style.background = type === "error" ? "#fee2e2" : type === "success" ? "#dcfce7" : "#eff6ff";
    el.style.color = type === "error" ? "#991b1b" : type === "success" ? "#166534" : "#1e40af";
    el.style.display = "inline-block";
  }
  window.gradeAnalysisShowMessage = gradeAnalysisShowMessage;

  function gradeAnalysisScheduleSave() {
    if (!currentUser || hydrating) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => gradeAnalysisFlush().catch(error => {
      console.error("Grade Analysis save failed:", error);
      gradeAnalysisShowMessage("تعذر الحفظ على الخادم: " + (error.message || error), "error");
    }), 700);
  }
  async function gradeAnalysisFlush() {
    clearTimeout(saveTimer);
    if (!currentUser) throw new Error("يجب تسجيل الدخول أولًا.");
    const contextPayload = pendingContexts;
    const settingsPayload = pendingSettings;
    pendingContexts = null;
    pendingSettings = {};
    try {
      if (contextPayload) {
        const entries = Object.entries(contextPayload);
        for (let offset = 0; offset < entries.length; offset += 150) {
          const chunk = Object.fromEntries(entries.slice(offset, offset + 150));
          await callable("gradeAnalysisSaveContexts")({ contexts: chunk });
        }
      }
      if (Object.keys(settingsPayload).length) {
        await callable("gradeAnalysisSaveSettings")({ classId: activeClassId, settings: settingsPayload });
      }
      gradeAnalysisShowMessage("☁️ تم حفظ التغييرات في الخادم.", "success");
      return true;
    } catch (error) {
      if (contextPayload) pendingContexts = Object.assign({}, pendingContexts || {}, contextPayload);
      pendingSettings = Object.assign({}, settingsPayload, pendingSettings);
      throw error;
    }
  }
  window.gradeAnalysisFlush = gradeAnalysisFlush;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  }
  function gradeAnalysisCanonicalClass(value) {
    const raw = String(value || "").trim().replace(/\s+/g, " ");
    const match = raw.match(/^(?:ال)?(خامس|سادس)\s*(\d{1,2})$/);
    if (!match) return raw;
    return (match[1] === "خامس" ? "الخامس " : "السادس ") + String(Number(match[2]));
  }
  function gradeAnalysisEnsureToolbar() {
    if (document.getElementById("gradeAnalysisAccessBar")) return;
    const container = document.querySelector(".container");
    if (!container) return;
    const bar = document.createElement("section");
    bar.id = "gradeAnalysisAccessBar";
    bar.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:linear-gradient(135deg,#0f2f50,#235a83);padding:14px 18px;border-radius:15px;margin:0 0 14px;color:#fff;box-shadow:0 5px 15px #0f2f5033;";
    bar.innerHTML = '<div style="min-width:210px;flex:1"><div style="font-size:18px;font-weight:900">📊 نظام تحليل درجات الطلاب — POINTS</div><div id="gradeAnalysisUserLabel" style="font-size:12px;opacity:.9;margin-top:4px">جارٍ التحقق من الحساب...</div></div><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><label for="gradeAnalysisClassSelect" style="color:#fff;font-weight:bold;margin:0">الشعبة</label><select id="gradeAnalysisClassSelect" style="min-width:140px;padding:9px;border-radius:9px;border:0;font-weight:bold;color:#172554"></select><button id="gradeAnalysisSaveNow" type="button" style="background:#16a34a;color:#fff;padding:10px 14px">💾 حفظ على الخادم</button><span id="gradeAnalysisStatus" style="display:none;padding:8px 10px;background:#eff6ff;color:#1e40af;border-radius:8px;font-size:12px;font-weight:bold"></span></div>';
    container.insertBefore(bar, container.firstChild);
    document.getElementById("gradeAnalysisSaveNow").addEventListener("click", async () => {
      try { if (typeof window.saveDataByContext === "function") window.saveDataByContext(); await gradeAnalysisFlush(); }
      catch (error) { gradeAnalysisShowMessage(error.message || "تعذر الحفظ.", "error"); }
    });
    document.getElementById("gradeAnalysisClassSelect").addEventListener("change", event => {
      gradeAnalysisSwitchClass(event.target.value).catch(error => gradeAnalysisShowMessage(error.message || "تعذر تغيير الشعبة.", "error"));
    });
  }
  function gradeAnalysisSetContextClass(classId) {
    const canonical = gradeAnalysisCanonicalClass(classId);
    const match = canonical.match(/^(الخامس|السادس)\s+(\d+)$/);
    if (!match) throw new Error("اسم الشعبة غير مطابق لصيغة الصف والشعبة المعتمدة.");
    const gradeSelect = document.getElementById("gradeSelect");
    const sectionSelect = document.getElementById("sectionSelect");
    if (!gradeSelect || !sectionSelect) throw new Error("تعذر العثور على حقول الصف والشعبة.");
    gradeSelect.value = match[1];
    sectionSelect.innerHTML = "";
    const option = document.createElement("option");
    option.value = match[2]; option.textContent = match[2];
    sectionSelect.appendChild(option);
    gradeSelect.disabled = true;
    sectionSelect.disabled = true;
  }
  function gradeAnalysisCurrentSettings() {
    const values = {};
    ALLOWED_SETTINGS.forEach(key => { const value = gradeAnalysisStore.getItem(key); if (value !== null) values[key] = value; });
    return values;
  }
  async function gradeAnalysisLoadForClass(classId) {
    const response = await callable("gradeAnalysisLoadWorkspace")({ classId });
    const data = response.data || {};
    if (data.success !== true) throw new Error("لم يؤكد الخادم تحميل مساحة تحليل الدرجات.");
    activeSchoolId = String(data.schoolId || activeSchoolId);
    activeClassId = String(data.classId || classId);
    const remoteContexts = Object.assign({}, data.contexts || {});
    // One-time migration of this assigned class's browser-only legacy records.
    const missingLegacy = {};
    if (legacyContexts) {
      Object.entries(legacyContexts).forEach(([key, value]) => {
        const parts = String(key).split("|");
        if (parts.length !== 5) return;
        const canonical = gradeAnalysisCanonicalClass(parts[3] + " " + parts[4]);
        if (canonical === activeClassId && !Object.prototype.hasOwnProperty.call(remoteContexts, key) && value && typeof value === "object") missingLegacy[key] = value;
      });
      if (Object.keys(missingLegacy).length) {
        await callable("gradeAnalysisSaveContexts")({ contexts: missingLegacy });
        Object.assign(remoteContexts, missingLegacy);
        gradeAnalysisShowMessage("تم نقل بيانات هذه الشعبة القديمة إلى الحفظ الآمن على الخادم.", "success");
      }
    }
    const legacySettingsToSave = {};
    Object.entries(legacySettings || {}).forEach(([key, value]) => {
      if (ALLOWED_SETTINGS.includes(key) && !migratedSettings.has(key) &&
          (data.settings || {})[key] === undefined && value !== null && value !== undefined) legacySettingsToSave[key] = String(value);
    });
    if (Object.keys(legacySettingsToSave).length) {
      await callable("gradeAnalysisSaveSettings")({ classId: activeClassId, settings: legacySettingsToSave });
      Object.keys(legacySettingsToSave).forEach(key => migratedSettings.add(key));
    }
    let current = {};
    try { current = JSON.parse(gradeAnalysisStore.getItem(KEY_DATA) || "{}"); } catch (_) {}
    Object.assign(current, remoteContexts);
    gradeAnalysisStore._hydrate(Object.assign(gradeAnalysisCurrentSettings(), data.settings || {}, legacySettingsToSave), current);
    gradeAnalysisSetContextClass(activeClassId);
    const select = document.getElementById("gradeAnalysisClassSelect");
    if (select) select.value = activeClassId;
    if (typeof window.loadDataByContext === "function") {
      const found = window.loadDataByContext();
      if (!found && typeof window.buildAnalysisTable === "function") {
        const exam = document.getElementById("examTitleSelect")?.value || "";
        const defaults = typeof window.getDefaultStandardsForExam === "function" ? window.getDefaultStandardsForExam(exam) : [];
        const tbody = document.querySelector("#standardsTable tbody");
        if (tbody && defaults.length) {
          tbody.innerHTML = defaults.map(std => '<tr><td contenteditable="true" class="id-input">' + escapeHtml(std.id) + '</td><td contenteditable="true" class="mark-input">' + escapeHtml(std.mark) + '</td><td contenteditable="true" class="name-input">' + escapeHtml(std.name) + '</td><td contenteditable="true" class="obj-input">' + escapeHtml(std.objective) + '</td></tr>').join("");
        }
        window.buildAnalysisTable();
      }
    }
    gradeAnalysisShowMessage("متصل بالخادم — بيانات هذه الشعبة محفوظة في Firebase.", "success");
    return data;
  }
  async function gradeAnalysisSwitchClass(classId) {
    if (!classId || classId === activeClassId) return;
    try {
      if (typeof window.saveDataByContext === "function") window.saveDataByContext();
      await gradeAnalysisFlush();
      gradeAnalysisShowMessage("⏳ جارٍ تحميل بيانات الشعبة المختارة...", "notice");
      await gradeAnalysisLoadForClass(classId);
      if (typeof window.syncExamSelectInHeader === "function") window.syncExamSelectInHeader();
      if (typeof window.updatePdfTitle === "function") window.updatePdfTitle();
    } catch (error) {
      const select = document.getElementById("gradeAnalysisClassSelect");
      if (select) select.value = activeClassId;
      gradeAnalysisShowMessage(error.message || "تعذر تحميل الشعبة.", "error");
      throw error;
    }
  }
  async function gradeAnalysisBoot() {
    gradeAnalysisEnsureToolbar();
    const user = await new Promise(resolve => {
      let settled = false;
      const unsubscribe = auth.onAuthStateChanged(value => {
        if (settled) return;
        settled = true; unsubscribe(); resolve(value || null);
      }, () => resolve(null));
    });
    if (!user) {
      const container = document.querySelector(".container");
      if (container) container.style.display = "none";
      const gate = document.createElement("div");
      gate.id = "gradeAnalysisLoginGate";
      gate.style.cssText = "max-width:650px;margin:8vh auto;background:#fff;border-radius:20px;padding:30px;text-align:center;box-shadow:0 8px 30px #0002;color:#172554;line-height:1.9";
      gate.innerHTML = '<h2 style="color:#1e4f78">🔐 الدخول إلى تحليل الدرجات</h2><p>يجب تسجيل الدخول إلى حساب POINTS أولًا. افتح برنامج POINTS وسجّل الدخول، ثم افتح أداة تحليل الدرجات مرة أخرى.</p><a href="./" style="display:inline-block;background:#1e88e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:bold">العودة إلى POINTS</a>';
      document.body.appendChild(gate);
      return false;
    }
    currentUser = user;
    // Capture old local browser records once, before the app uses the server-backed store.
    if (legacyContexts === null) {
      try { legacyContexts = JSON.parse(window.localStorage.getItem(KEY_DATA) || "{}"); }
      catch (_) { legacyContexts = {}; }
      ALLOWED_SETTINGS.forEach(key => {
        try { const value = window.localStorage.getItem(key); if (value !== null) legacySettings[key] = value; }
        catch (_) {}
      });
    }
    const snap = await db.collection("users").doc(user.uid).get();
    if (!snap.exists) throw new Error("حساب المستخدم غير موجود في POINTS.");
    currentProfile = snap.data() || {};
    if (currentProfile.active !== true || currentProfile.approved !== true) throw new Error("الحساب غير نشط أو غير معتمد.");
    if (user.uid === GLOBAL_ADMIN_UID && currentProfile.role === "admin") assignedClasses = ["السادس 2", "السادس 4", "السادس 6"];
    else if (currentProfile.role === "staff") {
      assignedClasses = Array.from(new Set((Array.isArray(currentProfile.classIds) ? currentProfile.classIds : [])
        .map(gradeAnalysisCanonicalClass).filter(value => /^(الخامس|السادس)\s+\d+$/.test(value))));
    } else throw new Error("هذه الأداة متاحة للمدير العام ومعلمي POINTS المعتمدين.");
    if (!assignedClasses.length) throw new Error("لا توجد شعب مسندة إلى حسابك.");
    const classSelect = document.getElementById("gradeAnalysisClassSelect");
    classSelect.innerHTML = assignedClasses.map(value => '<option value="' + escapeHtml(value) + '">' + escapeHtml(value) + '</option>').join("");
    const label = document.getElementById("gradeAnalysisUserLabel");
    if (label) label.textContent = (user.email || "حساب POINTS") + " — " + String(currentProfile.schoolName || currentProfile.schoolId || "المدرسة المرتبطة بالحساب");
    const container = document.querySelector(".container");
    if (container) container.style.display = "block";
    await gradeAnalysisLoadForClass(assignedClasses[0]);
    const selectedMatch = assignedClasses[0].match(/^(الخامس|السادس)\s+(\d+)$/);
    if (selectedMatch) {
      const initialGrade = document.getElementById("initialGradeSelect");
      const initialSection = document.getElementById("initialSectionSelect");
      if (initialGrade) initialGrade.value = selectedMatch[1];
      if (typeof window.updateInitialSectionOptions === "function") window.updateInitialSectionOptions();
      if (initialSection) initialSection.value = selectedMatch[2];
    }
    if (typeof window.initializeInitialClassification === "function") window.initializeInitialClassification();
    return true;
  }
  window.gradeAnalysisBoot = gradeAnalysisBoot;

  function gradeAnalysisCurrentContextKey() {
    return typeof window.getCurrentContextKey === "function" ? window.getCurrentContextKey() : "";
  }
  async function gradeAnalysisRunCalculation(operation, extra, classOverride) {
    if (!currentUser || !activeClassId) throw new Error("مساحة تحليل الدرجات غير متصلة بالخادم.");
    if (typeof window.saveDataByContext === "function" && !classOverride) window.saveDataByContext();
    await gradeAnalysisFlush();
    const response = await callable("gradeAnalysisCalculate")({
      classId: classOverride || activeClassId,
      contextKey: gradeAnalysisCurrentContextKey(),
      operation: operation,
      ...(extra || {})
    });
    if (response.data?.success !== true) throw new Error("لم يؤكد الخادم عملية التحليل.");
    return response.data.result;
  }
  window.gradeAnalysisRunCalculation = gradeAnalysisRunCalculation;

  function gradeAnalysisLevelClass(key) {
    return key === "weak" ? "status-weak" : key === "low" ? "status-low" : key === "medium" ? "status-mid" : key === "high" ? "status-high" : "status-very-high";
  }
  function gradeAnalysisRenderOverview(result) {
    lastOverview = result;
    const rows = Array.from(document.querySelectorAll("#analysisTbody tr"));
    (result.students || []).forEach(student => {
      const row = rows[Number(student.index)];
      if (!row) return;
      const total = row.querySelector(".student-total");
      const status = row.querySelector(".student-status");
      if (total) total.textContent = student.status ? "—" : (Number(student.total || 0).toFixed(2).replace(/\.00$/, ""));
      if (!status) return;
      status.classList.remove("status-high", "status-very-high", "status-mid", "status-low", "status-weak", "student-status-locked", "student-status-absent");
      if (student.status) {
        status.textContent = student.status === "discontinued" ? "منقطع" : "غائب";
        status.classList.add(student.status === "discontinued" ? "student-status-locked" : "student-status-absent");
      } else if (student.level) {
        status.textContent = student.level.label;
        status.classList.add(gradeAnalysisLevelClass(student.level.key));
      } else status.textContent = "-";
    });
    (result.standardStats || []).forEach((stat, index) => {
      const set = (selector, value) => { const el = document.querySelector(selector + '[data-col="' + index + '"]'); if (el) el.textContent = value; };
      set(".stat-avg", Number(stat.average || 0).toFixed(2));
      set(".stat-max", stat.max ?? 0); set(".stat-min", stat.min ?? 0);
      set(".stat-high", stat.highCount ?? 0); set(".stat-mid", stat.midCount ?? 0);
      set(".stat-low", stat.lowCount ?? 0); set(".stat-pass", stat.passCount ?? 0);
      set(".stat-pass-rate", Number(stat.passRate || 0).toFixed(1) + "%");
      set(".stat-achieve", Number(stat.achieveRate || 0).toFixed(1) + "%");
    });
    const total = result.totalStats || {};
    const setTotal = (selector, value) => { const el = document.querySelector(selector); if (el) el.textContent = value; };
    setTotal(".stat-avg-total", Number(total.average || 0).toFixed(2));
    setTotal(".stat-max-total", total.max ?? 0); setTotal(".stat-min-total", total.min ?? 0);
    setTotal(".stat-high-total", total.highCount ?? 0); setTotal(".stat-mid-total", total.midCount ?? 0);
    setTotal(".stat-low-total", total.lowCount ?? 0); setTotal(".stat-pass-total", total.passCount ?? 0);
    setTotal(".stat-pass-rate-total", Number(total.passRate || 0).toFixed(1) + "%");
    setTotal(".stat-achieve-total", Number(total.achieveRate || 0).toFixed(1) + "%");
    if (typeof window.updateCharts === "function" && result.chart) window.updateCharts(result.chart.labels || [], result.chart.passRates || [], result.chart.achieveRates || []);
    return result;
  }
  async function gradeAnalysisRefreshOverview() {
    if (calcInFlight) { calcAgain = true; return; }
    calcInFlight = true;
    try {
      do {
        calcAgain = false;
        const result = await gradeAnalysisRunCalculation("overview");
        gradeAnalysisRenderOverview(result);
      } while (calcAgain);
    } catch (error) {
      console.error("Server calculation failed:", error);
      gradeAnalysisShowMessage("تعذر إجراء التحليل في الخادم: " + (error.message || error), "error");
    } finally { calcInFlight = false; }
  }
  function gradeAnalysisScheduleOverview() {
    if (!currentUser || !activeClassId) return;
    clearTimeout(calcTimer);
    calcTimer = setTimeout(gradeAnalysisRefreshOverview, 350);
  }
  window.gradeAnalysisScheduleOverview = gradeAnalysisScheduleOverview;

  async function gradeAnalysisRefreshInitialClassification() {
    const initialClass = gradeAnalysisCanonicalClass(
      (document.getElementById("initialGradeSelect")?.value || "") + " " +
      (document.getElementById("initialSectionSelect")?.value || "")
    );
    if (!assignedClasses.includes(initialClass)) {
      gradeAnalysisShowMessage("التصنيف الأولي متاح للشعب المسندة فقط إلى حسابك.", "error");
      return;
    }
    if (typeof window.saveInitialClassification === "function") window.saveInitialClassification();
    await gradeAnalysisFlush();
    const response = await callable("gradeAnalysisCalculate")({
      classId: initialClass, contextKey: gradeAnalysisCurrentContextKey(),
      operation: "initialClassification",
      initialTeacher: document.getElementById("initialTeacherSelect")?.value || "",
      initialCoordinator: document.getElementById("initialCoordinatorSelect")?.value || "",
      term: document.getElementById("initialTermSelect")?.value || "",
      initialGrade: document.getElementById("initialGradeSelect")?.value || "",
      initialSection: document.getElementById("initialSectionSelect")?.value || ""
    });
    const result = response.data?.result;
    if (!result) throw new Error("لم يرجع الخادم نتيجة التصنيف الأولي.");
    initialClassificationCache = result;
    window.gradeAnalysisInitialMeta = {
      high: Number(result.averageByGroup?.veryHigh || 0),
      medium: Number(result.averageByGroup?.medium || 0)
    };
    const rows = Array.from(document.querySelectorAll("#initialClassificationTbody tr"));
    rows.forEach(row => {
      const name = row.querySelector(".initial-student-name")?.innerText.trim() || "";
      const student = result.students.find(item => item.name === name);
      const avg = row.querySelector(".initial-average"), pct = row.querySelector(".initial-percentage"), level = row.querySelector(".initial-level");
      if (!student || student.percentage === null) {
        if (avg) avg.textContent = student?.status ? "—" : "-";
        if (pct) pct.textContent = student?.status ? "—" : "-";
        if (level) level.textContent = student?.status === "discontinued" ? "منقطع — مستبعد من التقييمات" : student?.status === "absent" ? "غائب — مستبعد من التقييمات" : "-";
      } else {
        if (avg) avg.textContent = Number(student.average).toFixed(2);
        if (pct) pct.textContent = Number(student.percentage).toFixed(1) + "%";
        if (level) level.textContent = student.level?.label || "-";
        if (level && student.level?.key) level.style.background = ({ weak:"#ffcdd2", low:"#ffe0b2", medium:"#fff9c4", high:"#dcedc8", veryHigh:"#2e7d32" })[student.level.key] || "";
      }
    });
    return result;
  }
  window.gradeAnalysisRefreshInitialClassification = gradeAnalysisRefreshInitialClassification;

  function gradeAnalysisInstallServerOverrides() {
    const originalInitialSections = window.updateInitialSectionOptions;
    window.updateInitialSectionOptions = function () {
      const grade = document.getElementById("initialGradeSelect")?.value || "الخامس";
      const prefix = grade === "السادس" ? "السادس " : "الخامس ";
      const allowed = assignedClasses.filter(value => value.startsWith(prefix));
      const select = document.getElementById("initialSectionSelect");
      if (!select) return;
      const previous = select.value;
      select.innerHTML = allowed.length
        ? allowed.map(value => '<option value="' + escapeHtml(value.slice(prefix.length)) + '">' + escapeHtml(value.slice(prefix.length)) + '</option>').join("")
        : '<option value="">لا توجد شعبة مسندة لهذا الصف</option>';
      if (allowed.some(value => value.slice(prefix.length) === previous)) select.value = previous;
    };
    window.getInitialProactiveStudents = function (kind) {
      const key = kind === "high" ? "veryHigh" : "medium";
      return initialClassificationCache?.groups?.[key] || [];
    };
    window.updateRowTotalAndStatus = function () { gradeAnalysisScheduleOverview(); };
    window.calculateStats = function () { gradeAnalysisScheduleOverview(); };
    window.updateAllTotalsAndStats = function () { gradeAnalysisScheduleOverview(); };
    window.updateInitialRow = function (row) {
      if (!row) return;
      clearTimeout(initialTimer);
      const name = row.querySelector(".initial-student-name")?.innerText.trim() || "";
      const status = typeof window.getAssessmentStudentStatus === "function" ? window.getAssessmentStudentStatus(name) : "";
      if (status === "discontinued" || status === "absent") {
        row.querySelectorAll(".initial-eval-1,.initial-eval-2").forEach(input => { input.value = ""; input.disabled = true; });
        row.querySelector(".initial-average").textContent = "—";
        row.querySelector(".initial-percentage").textContent = "—";
        const level = row.querySelector(".initial-level");
        if (level) level.textContent = status === "discontinued" ? "منقطع — مستبعد من التقييمات" : "غائب — مستبعد من التقييمات";
      } else {
        initialTimer = setTimeout(() => gradeAnalysisRefreshInitialClassification().catch(error => gradeAnalysisShowMessage("تعذر حساب التصنيف الأولي على الخادم: " + (error.message || error), "error")), 550);
      }
    };
    window.buildFailingTable = async function () {
      const result = await gradeAnalysisRunCalculation("overview");
      failingData = result.failingByStandard || [];
      const tbody = document.getElementById("failingTableBody");
      if (!tbody) return;
      const standards = Array.from(document.querySelectorAll("#standardsTable tbody tr")).map((row, index) => ({
        id: row.querySelector(".id-input")?.innerText.trim() || String(index + 1),
        name: row.querySelector(".name-input")?.innerText.trim() || ""
      })).filter(row => row.name);
      tbody.innerHTML = "";
      standards.forEach((standard, index) => {
        const failed = failingData.find(item => item.id === standard.id || item.name === standard.name)?.students || [];
        const summary = failed.length ? "يوجد " + failed.length + " طالب راسب" : '<span class="no-fail">لا يوجد راسبون</span>';
        tbody.insertAdjacentHTML("beforeend", '<tr><td class="col-num">' + (index + 1) + '</td><td class="col-standard">' + escapeHtml(standard.name) + '</td><td class="col-students">' + summary + '</td></tr>');
      });
    };
    window.getFailingStudentsList = function (colIndex) {
      const row = Array.from(document.querySelectorAll("#standardsTable tbody tr"))[colIndex];
      const id = row?.querySelector(".id-input")?.innerText.trim() || "";
      const name = row?.querySelector(".name-input")?.innerText.trim() || "";
      return (failingData.find(item => item.id === id || item.name === name)?.students || []).map((student, index) => Object.assign({ index: index + 1 }, student));
    };
    window.showFailingModal = async function () {
      const result = await gradeAnalysisRunCalculation("overview");
      failingData = result.failingByStandard || [];
      const standards = Array.from(document.querySelectorAll("#standardsTable tbody tr")).map((row, index) => ({
        num: row.querySelector(".id-input")?.innerText.trim() || String(index + 1),
        name: row.querySelector(".name-input")?.innerText.trim() || "",
        mark: Number(row.querySelector(".mark-input")?.innerText.trim()) || 0
      })).filter(item => item.name && item.mark > 0);
      window.lastExtractedFailingData = standards.map((standard, index) => ({
        questionNum: index + 1, standardNum: standard.num, standardName: standard.name, maxMark: standard.mark,
        students: failingData.find(item => item.id === standard.num || item.name === standard.name)?.students || []
      }));
      const modal = document.getElementById("modalContent");
      if (modal) modal.innerHTML = window.lastExtractedFailingData.map(data =>
        '<div class="failing-block"><div class="failing-block-title"><span>السؤال ' + data.questionNum + ': ' + escapeHtml(data.standardName) + ' (رقم المعيار: ' + escapeHtml(data.standardNum) + ')</span><span class="std-count">' + data.students.length + ' راسب</span></div><div class="failing-block-list">' +
        (data.students.length ? data.students.map((student,index) => '<span class="fail-student">' + (index+1) + '. ' + escapeHtml(student.name) + ' <span class="grade">(' + student.mark + '/' + data.maxMark + ')</span></span>').join("") : '<span class="no-fail">✓ لا يوجد راسبون</span>') + '</div></div>'
      ).join("");
      const subtitle = document.getElementById("modalSubtitle");
      if (subtitle) subtitle.textContent = document.getElementById("failingPeriodSelect")?.value || "";
      document.getElementById("failingModal")?.classList.add("active");
    };

    const oldBuildEnrichment = window.generateEnrichmentPlans;
    window.gradeAnalysisLoadEnrichment = async function () {
      enrichmentCache = await gradeAnalysisRunCalculation("enrichment");
      window.gradeAnalysisEnrichmentMeta = {};
      return enrichmentCache;
    };
    window.getEnrichmentPeriods = function () {
      if (!enrichmentCache) return [];
      const titles = ["تحليل درجات منتصف الفصل الدراسي الأول","تحليل درجات نهاية الفصل الدراسي الأول","تحليل درجات منتصف الفصل الدراسي الثاني","تحليل درجات نهاية الفصل الدراسي الثاني"];
      const labels = ["منتصف الفصل الدراسي الأول","نهاية الفصل الدراسي الأول","منتصف الفصل الدراسي الثاني","نهاية الفصل الدراسي الثاني"];
      const all = JSON.parse(gradeAnalysisStore.getItem(KEY_DATA) || "{}");
      return titles.map((title,index) => {
        const meta = enrichmentCache[title] || { high: [], medium: [], averagePercentage: 0 };
        window.gradeAnalysisEnrichmentMeta[index] = meta;
        const key = [title, document.getElementById("subjectSelect")?.value || "", document.getElementById("yearSelect")?.value || "", document.getElementById("gradeSelect")?.value || "", document.getElementById("sectionSelect")?.value || ""].join("|");
        const saved = all[key] || {};
        return { title, label: labels[index], key, data: { students: meta.high || [], teacher: saved.teacher || "" }, _server: meta };
      });
    };
    window.getEnrichmentPeriodStudents = period => period?._server?.high || [];
    window.getMediumEnrichmentPeriods = function () {
      return window.getEnrichmentPeriods().map(period => ({
        ...period, data: Object.assign({}, period.data, { students: period._server?.medium || [] })
      }));
    };
    window.getMediumPeriodStudents = period => period?._server?.medium || [];
    window.generateEnrichmentPlans = async function (silent) {
      await window.gradeAnalysisLoadEnrichment();
      if (oldBuildEnrichment) return oldBuildEnrichment.call(this, silent);
    };
    const oldMedium = window.generateMediumEnrichmentPlans;
    window.generateMediumEnrichmentPlans = async function (silent) {
      await window.gradeAnalysisLoadEnrichment();
      if (oldMedium) return oldMedium.call(this, silent);
    };
    if (typeof window.generateInitialProactivePlan === "function") {
      const oldInitialPlan = window.generateInitialProactivePlan;
      window.generateInitialProactivePlan = async function (kind, silent) {
        await gradeAnalysisRefreshInitialClassification();
        return oldInitialPlan.call(this, kind, silent);
      };
    }
    if (typeof window.showPage === "function" && !window.showPage.__gradeAnalysisServerWrapped) {
      const originalShowPage = window.showPage;
      const wrappedShowPage = function (pageId) {
        const result = originalShowPage.apply(this, arguments);
        if (pageId === "analysis-page") {
          setTimeout(() => gradeAnalysisScheduleOverview(), 250);
        }
        if (pageId === "initial-classification-page") {
          setTimeout(() => gradeAnalysisRefreshInitialClassification().catch(error =>
            gradeAnalysisShowMessage("تعذر تحميل التصنيف الأولي من الخادم: " + (error.message || error), "error")
          ), 250);
        }
        return result;
      };
      wrappedShowPage.__gradeAnalysisServerWrapped = true;
      window.showPage = wrappedShowPage;
    }
    ["initialGradeSelect","initialSectionSelect","initialTermSelect","initialTeacherSelect","initialCoordinatorSelect","initialEvalCount"].forEach(id => {
      const el = document.getElementById(id);
      if (!el || el.__gradeAnalysisServerListener) return;
      el.__gradeAnalysisServerListener = true;
      el.addEventListener("change", () => {
        setTimeout(() => gradeAnalysisRefreshInitialClassification().catch(error =>
          gradeAnalysisShowMessage("تعذر تحديث التصنيف الأولي على الخادم: " + (error.message || error), "error")
        ), 350);
      });
    });
    window.gradeAnalysisScheduleOverview = gradeAnalysisScheduleOverview;
  }

  function gradeAnalysisInstallOnloadWrapper() {
    originalOnload = window.onload;
    window.onload = async function (event) {
      try {
        // Install back-end handlers before any original page initialization can calculate locally.
        gradeAnalysisInstallServerOverrides();
        const ok = await gradeAnalysisBoot();
        if (!ok) return;
        if (typeof originalOnload === "function") originalOnload.call(this, event);
        gradeAnalysisScheduleOverview();
      } catch (error) {
        console.error("Grade Analysis boot failed:", error);
        const container = document.querySelector(".container");
        if (container) container.style.display = "none";
        const gate = document.createElement("div");
        gate.style.cssText = "max-width:700px;margin:8vh auto;background:#fff;border-radius:20px;padding:28px;text-align:center;color:#7f1d1d;line-height:1.9";
        gate.innerHTML = "<h2>تعذر فتح تحليل الدرجات</h2><p>" + escapeHtml(error.message || error) + '</p><a href="./" style="display:inline-block;background:#1e88e5;color:white;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:bold">العودة إلى POINTS</a>';
        document.body.appendChild(gate);
      }
    };
  }
  window.gradeAnalysisInstallOnloadWrapper = gradeAnalysisInstallOnloadWrapper;
})();