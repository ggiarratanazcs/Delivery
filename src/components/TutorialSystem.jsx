/**
 * ZCS Portale Delivery — Sistema Tutorial Guidato v3
 * Tour aggiornato con home, collaboratori, attività, documenti, KPI, Yoda e sezioni portale.
 */

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
  } from "react";
  
  // ─────────────────────────────────────────────
  // STORAGE KEYS
  // ─────────────────────────────────────────────
  const STORAGE_KEY       = "zcs_tutorial_completed";
  const STORAGE_KEY_ADMIN = "zcs_tutorial_completed_admin";
  
  // ─────────────────────────────────────────────
  // STEP — ADMIN / COORDINATORE
  // ─────────────────────────────────────────────
  export const TUTORIAL_STEPS_ADMIN = [
    {
      id: "welcome",
      target: null,
      position: "center",
      icon: "🚀",
      title: "Benvenuto nel Portale Delivery ZCS",
      content: "Questo breve tour ti guida nelle funzionalità principali. Puoi interromperlo in qualsiasi momento e riaprirlo dal menu utente in alto a destra.",
    },
    {
      id: "home-my-card",
      target: "home-my-card",
      position: "bottom",
      icon: "👤",
      title: "Area personale",
      content: "Il tasto scuro apre la tua scheda personale: skill map con i livelli di competenza per prodotto, pianificazione mensile e settimanale sulle tue commesse attive.",
    },
    {
      id: "home-collaboratori",
      target: "home-collaboratori",
      position: "bottom",
      icon: "👥",
      title: "Collaboratori",
      content: "Visibile se hai collaboratori assegnati. Apre un popup con due scelte: — Skill matrix: visualizza e valuta le competenze del tuo team — Cerca collaboratore: apre la scheda personale di un membro del team.",
    },
    {
      id: "home-nuova-attivita",
      target: "home-nuova-attivita",
      position: "bottom",
      icon: "➕",
      title: "Nuova attività",
      content: "Crea una nuova attività di workflow. Puoi associarla a una commessa esistente tra quelle attive, oppure inserirla come attività libera. Utile per tracciare richieste, sviluppi e attività di prevendita.",
    },
    {
      id: "home-nuovo-documento",
      target: "home-nuovo-documento",
      position: "bottom",
      icon: "📄",
      title: "Nuovo documento",
      content: "Genera documenti strutturati per i tuoi clienti. Puoi scegliere tra: — Scheda demo: presentazione prodotto per una demo commerciale — Raccolta requisiti: documento tecnico per la raccolta dei requisiti di progetto.",
    },
    {
      id: "home-coinvolto",
      target: "home-coinvolto",
      position: "top",
      icon: "🔗",
      title: "Dove sei coinvolto",
      content: "Riepilogo rapido delle tue attività. Mostra le commesse attive a cui appartieni (come PM o membro del team) e le attività in carico — suddivise tra prevendita, richieste sviluppo e task di progetto.",
    },
    {
      id: "home-cubes",
      target: "home-cubes",
      position: "left",
      icon: "📊",
      title: "KPI di Delivery aziendale",
      content: "I quattro riquadri mostrano i numeri globali dell'operatività ZCS: Risorse totali per ruolo, Clienti attivi con prodotti, Commesse aperte, Bolle con giorni previsti/consuntivati ed efficacia. Sono dati aziendali generali, uguali per tutti.",
    },
    {
      id: "home-ticker",
      target: "home-ticker",
      position: "bottom",
      icon: "🤖",
      title: "Assistente Yoda",
      content: "Il ticker mostra i prodotti ZCS attivi. Nella barra in alto trovi anche Yoda, l'assistente AI del portale: puoi fargli domande sui dati, chiedere analisi o navigare rapidamente alle sezioni. Prova a chiedergli 'Chi è disponibile la prossima settimana?'",
    },
    {
      id: "nav-progetti",
      target: "nav-progetti",
      position: "bottom",
      icon: "📁",
      title: "Commesse e Progetti",
      content: "Lista di tutte le commesse attive con le relative card. Cliccando su una commessa apri il progetto collegato con: attività dettagliate, Gantt, avanzamento settimanale, consuntivi ore e diario note.",
    },
    {
      id: "nav-pianificazione",
      target: "nav-pianificazione",
      position: "bottom",
      icon: "📅",
      title: "Pianificazione",
      content: "Gestisci l'allocazione mensile e settimanale del team. Vista Clienti: assegna i giorni per commessa. Vista Risorse: controlla l'occupazione con barre verde/ambra/rosso. Gantt: timeline visiva delle commesse. L'indicatore sulla riga commessa mostra il budget residuo.",
    },
    {
      id: "nav-novita",
      target: "nav-novita",
      position: "bottom",
      icon: "⭐",
      title: "Novità di Prodotto",
      content: "Feed aggiornato con le ultime release e novità dei prodotti ZCS (Teseo, Cassiopea, InfoBusiness, Smarty…). Utile per essere sempre aggiornato prima di una demo o di un'attività con il cliente.",
    },
    {
      id: "nav-delivery",
      target: "nav-delivery",
      position: "bottom",
      icon: "🚚",
      title: "Delivery Room",
      content: "Area dedicata al team di delivery: risorse condivise, documentazione operativa e materiali di supporto ai progetti. Accessibile da tutti i membri del team.",
    },
    {
      id: "end",
      target: null,
      position: "center",
      icon: "✅",
      title: "Tour completato!",
      content: "Sei pronto a lavorare sul Portale Delivery. Puoi riaprire questa guida in qualsiasi momento dal menu utente in alto a destra. Buon lavoro!",
    },
  ];
  
  // ─────────────────────────────────────────────
  // STEP — UTENTE NORMALE (consulente)
  // ─────────────────────────────────────────────
  export const TUTORIAL_STEPS_USER = [
    {
      id: "welcome",
      target: null,
      position: "center",
      icon: "👋",
      title: "Benvenuto nel Portale Delivery ZCS",
      content: "Questo tour veloce ti mostra le funzionalità disponibili. Puoi interromperlo quando vuoi e riaprirlo dal menu utente in alto a destra.",
    },
    {
      id: "home-my-card",
      target: "home-my-card",
      position: "bottom",
      icon: "👤",
      title: "La tua area personale",
      content: "Clicca qui per aprire la tua scheda: skill map con i livelli di competenza, pianificazione mensile e settimanale sulle tue commesse, storico valutazioni e formazione in corso.",
    },
    {
      id: "home-nuova-attivita",
      target: "home-nuova-attivita",
      position: "bottom",
      icon: "➕",
      title: "Nuova attività",
      content: "Crea una nuova attività e associala a una delle tue commesse attive, oppure lasciala libera. Utile per tracciare richieste, sviluppi o attività di prevendita.",
    },
    {
      id: "home-nuovo-documento",
      target: "home-nuovo-documento",
      position: "bottom",
      icon: "📄",
      title: "Nuovo documento",
      content: "Genera documenti strutturati: Scheda demo per presentazioni commerciali o Raccolta requisiti per la fase di analisi di un progetto.",
    },
    {
      id: "home-coinvolto",
      target: "home-coinvolto",
      position: "top",
      icon: "🔗",
      title: "Dove sei coinvolto",
      content: "Riepilogo delle tue commesse attive e delle attività in carico — prevendita, richieste sviluppo e task di progetto. Tutto quello che ti riguarda in un colpo solo.",
    },
    {
      id: "home-cubes",
      target: "home-cubes",
      position: "left",
      icon: "📊",
      title: "KPI di Delivery aziendale",
      content: "I riquadri mostrano i numeri globali dell'azienda: risorse, clienti, commesse e bolle. Sono dati di riferimento generale, uguali per tutti.",
    },
    {
      id: "nav-progetti",
      target: "nav-progetti",
      position: "bottom",
      icon: "📁",
      title: "Commesse e Progetti",
      content: "Accedi alle commesse a cui sei assegnato. Apri il progetto per vedere le tue attività, lo stato di avanzamento e i consuntivi ore.",
    },
    {
      id: "nav-pianificazione",
      target: "nav-pianificazione",
      position: "bottom",
      icon: "📅",
      title: "Pianificazione",
      content: "Visualizza la tua occupazione mensile e settimanale. Le barre colorate ti indicano quando sei sotto, a regime o sovra-allocato.",
    },
    {
      id: "nav-novita",
      target: "nav-novita",
      position: "bottom",
      icon: "⭐",
      title: "Novità di Prodotto",
      content: "Ultime release e aggiornamenti dei prodotti ZCS. Tieniti aggiornato per le tue attività con i clienti.",
    },
    {
      id: "nav-delivery",
      target: "nav-delivery",
      position: "bottom",
      icon: "🚚",
      title: "Delivery Room",
      content: "Risorse condivise e documentazione operativa del team delivery.",
    },
    {
      id: "end",
      target: null,
      position: "center",
      icon: "✅",
      title: "Tutto chiaro!",
      content: "Sei pronto. Puoi riaprire questa guida in qualsiasi momento dal menu utente in alto a destra. Buon lavoro!",
    },
  ];
  
  // ─────────────────────────────────────────────
  // CONTEXT
  // ─────────────────────────────────────────────
  const TutorialContext = createContext(null);
  
  export function TutorialProvider({ children, isAdmin = false }) {
    const [active, setActive]         = useState(false);
    const [stepIndex, setStepIndex]   = useState(0);
    const [targetRect, setTargetRect] = useState(null);
    const [forceCenter, setForceCenter] = useState(false);
  
    const steps       = isAdmin ? TUTORIAL_STEPS_ADMIN : TUTORIAL_STEPS_USER;
    const storageKey  = isAdmin ? STORAGE_KEY_ADMIN    : STORAGE_KEY;
    const currentStep = steps[stepIndex] || null;
  
    const measureTarget = useCallback((step) => {
      if (!step || !step.target) { setTargetRect(null); setForceCenter(true); return; }
      const el = document.querySelector(`[data-tutorial="${step.target}"]`);
      if (!el) { setTargetRect(null); setForceCenter(true); return; }
      setForceCenter(false);
      const rect = el.getBoundingClientRect();
      setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height, bottom: rect.bottom, right: rect.right });
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, []);
  
    useEffect(() => {
      if (!active) return;
      const t = setTimeout(() => measureTarget(currentStep), 200);
      return () => clearTimeout(t);
    }, [active, stepIndex, currentStep, measureTarget]);
  
    useEffect(() => {
      if (!active) return;
      const handler = () => measureTarget(currentStep);
      window.addEventListener("resize", handler);
      return () => window.removeEventListener("resize", handler);
    }, [active, currentStep, measureTarget]);
  
    const startTutorial = useCallback(() => { setStepIndex(0); setActive(true); }, []);
    const stopTutorial  = useCallback(() => { setActive(false); setTargetRect(null); setForceCenter(false); }, []);
  
    const nextStep = useCallback(() => {
      if (stepIndex < steps.length - 1) { setStepIndex(i => i + 1); }
      else { localStorage.setItem(storageKey, "true"); stopTutorial(); }
    }, [stepIndex, steps.length, storageKey, stopTutorial]);
  
    const prevStep     = useCallback(() => { if (stepIndex > 0) setStepIndex(i => i - 1); }, [stepIndex]);
    const skipTutorial = useCallback(() => { localStorage.setItem(storageKey, "true"); stopTutorial(); }, [storageKey, stopTutorial]);
    const resetTutorial = useCallback(() => { localStorage.removeItem(storageKey); }, [storageKey]);
    const isCompleted   = useCallback(() => !!localStorage.getItem(storageKey), [storageKey]);
  
    return (
      <TutorialContext.Provider value={{
        active, stepIndex, steps, currentStep,
        targetRect, forceCenter, isAdmin,
        startTutorial, stopTutorial,
        nextStep, prevStep, skipTutorial,
        resetTutorial, isCompleted,
      }}>
        {children}
        {active && <TutorialOverlay />}
      </TutorialContext.Provider>
    );
  }
  
  export function useTutorial() {
    const ctx = useContext(TutorialContext);
    if (!ctx) throw new Error("useTutorial must be used inside TutorialProvider");
    return ctx;
  }
  
  // ─────────────────────────────────────────────
  // OVERLAY
  // ─────────────────────────────────────────────
  function TutorialOverlay() {
    const { currentStep, targetRect, forceCenter, stepIndex, steps, nextStep, prevStep, skipTutorial } = useTutorial();
    if (!currentStep) return null;
  
    const isCenter = forceCenter || currentStep.position === "center" || !targetRect;
    const isFirst  = stepIndex === 0;
    const isLast   = stepIndex === steps.length - 1;
    const progress = ((stepIndex + 1) / steps.length) * 100;
  
    return (
      <>
        <div style={S.backdrop} onClick={skipTutorial} />
        {targetRect && !forceCenter && (
          <div style={{ ...S.spotlight, top: targetRect.top - 8, left: targetRect.left - 8, width: targetRect.width + 16, height: targetRect.height + 16 }} />
        )}
        {isCenter
          ? <div style={{ ...S.card, ...S.cardCenter }}><CardContent {...{ currentStep, stepIndex, steps, progress, isFirst, isLast, onNext: nextStep, onPrev: prevStep, onSkip: skipTutorial }} /></div>
          : <TooltipCard {...{ currentStep, targetRect, stepIndex, steps, progress, isFirst, isLast, onNext: nextStep, onPrev: prevStep, onSkip: skipTutorial }} />
        }
      </>
    );
  }
  
  function TooltipCard({ currentStep, targetRect, stepIndex, steps, progress, isFirst, isLast, onNext, onPrev, onSkip }) {
    const W = 320, MARGIN = 16;
    const vpW = window.innerWidth;
    const pos = currentStep.position;
    let top, left;
  
    if (pos === "bottom")     { top = targetRect.bottom + MARGIN; left = targetRect.left + targetRect.width / 2 - W / 2; }
    else if (pos === "top")   { top = targetRect.top - 240 - MARGIN; left = targetRect.left + targetRect.width / 2 - W / 2; }
    else if (pos === "right") { top = targetRect.top + targetRect.height / 2 - 110; left = targetRect.right + MARGIN; }
    else if (pos === "left")  { top = targetRect.top + targetRect.height / 2 - 110; left = targetRect.left - W - MARGIN; }
    else                      { top = targetRect.bottom + MARGIN; left = targetRect.left + targetRect.width / 2 - W / 2; }
  
    left = Math.max(MARGIN, Math.min(left, vpW - W - MARGIN));
    top  = Math.max(MARGIN, top);
  
    const arrowDir = pos === "bottom" ? "top" : pos === "top" ? "bottom" : pos === "right" ? "left" : pos === "left" ? "right" : null;
  
    return (
      <div style={{ ...S.card, position: "fixed", top, left, width: W, transform: "none" }}>
        {arrowDir && <Arrow direction={arrowDir} />}
        <CardContent {...{ currentStep, stepIndex, steps, progress, isFirst, isLast, onNext, onPrev, onSkip }} />
      </div>
    );
  }
  
  function Arrow({ direction }) {
    const n = 9;
    const base = { position: "absolute", width: 0, height: 0 };
    const dirs = {
      top:    { top: -n, left: "50%", transform: "translateX(-50%)", borderLeft: `${n}px solid transparent`, borderRight: `${n}px solid transparent`, borderBottom: `${n}px solid #001d47` },
      bottom: { bottom: -n, left: "50%", transform: "translateX(-50%)", borderLeft: `${n}px solid transparent`, borderRight: `${n}px solid transparent`, borderTop: `${n}px solid #001d47` },
      left:   { left: -n, top: "40%", transform: "translateY(-50%)", borderTop: `${n}px solid transparent`, borderBottom: `${n}px solid transparent`, borderRight: `${n}px solid #001d47` },
      right:  { right: -n, top: "40%", transform: "translateY(-50%)", borderTop: `${n}px solid transparent`, borderBottom: `${n}px solid transparent`, borderLeft: `${n}px solid #001d47` },
    };
    return <div style={{ ...base, ...dirs[direction] }} />;
  }
  
  function CardContent({ currentStep, stepIndex, steps, progress, isFirst, isLast, onNext, onPrev, onSkip }) {
    return (
      <>
        <div style={S.cardHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{currentStep.icon}</span>
            <span style={S.stepCount}>{stepIndex + 1} / {steps.length}</span>
          </div>
          <button style={S.closeBtn} onClick={onSkip}>×</button>
        </div>
        <div style={S.progressTrack}>
          <div style={{ ...S.progressFill, width: `${progress}%` }} />
        </div>
        <div style={S.cardBody}>
          <h3 style={S.stepTitle}>{currentStep.title}</h3>
          <p style={S.stepContent}>{currentStep.content}</p>
        </div>
        <div style={S.cardFooter}>
          <button style={{ ...S.btn, ...S.btnGhost }} onClick={onSkip}>Salta</button>
          <div style={{ display: "flex", gap: 8 }}>
            {!isFirst && <button style={{ ...S.btn, ...S.btnSecondary }} onClick={onPrev}>← Indietro</button>}
            <button style={{ ...S.btn, ...S.btnPrimary }} onClick={onNext}>{isLast ? "Fatto ✓" : "Avanti →"}</button>
          </div>
        </div>
      </>
    );
  }
  
  // ─────────────────────────────────────────────
  // WELCOME MODAL
  // ─────────────────────────────────────────────
  export function TutorialWelcomeModal({ show }) {
    const { active, startTutorial, isCompleted } = useTutorial();
    const [dismissed, setDismissed] = useState(false);
  
    const visible = show && !active && !dismissed && !isCompleted();
  
    const handleStart = () => {
      setDismissed(true);
      setTimeout(() => startTutorial(), 150);
    };
  
    const handleSkip = () => {
      setDismissed(true);
      localStorage.setItem("zcs_tutorial_completed", "true");
    };
  
    if (!visible) return null;
  
    return (
      <div style={S.modalBackdrop}>
        <div style={S.welcomeModal}>
          <div style={S.welcomeAccent} />
          <div style={S.welcomeBody}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>🚀</div>
            <h2 style={S.welcomeTitle}>Benvenuto nel Portale Delivery</h2>
            <p style={S.welcomeText}>È la prima volta che accedi. Vuoi fare un breve tour guidato per scoprire le funzionalità principali?</p>
            <p style={{ margin: "0 0 28px", fontSize: 12, color: "#9ca3af" }}>Durata stimata: circa 2 minuti</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <button style={{ ...S.btn, ...S.btnGhost, fontSize: 13 }} onClick={handleSkip}>Non ora</button>
              <button style={{ ...S.btn, ...S.btnPrimary, padding: "10px 24px", fontSize: 14 }} onClick={handleStart}>Inizia il tour →</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // ─────────────────────────────────────────────
  // LAUNCH BUTTON
  // ─────────────────────────────────────────────
  export function TutorialLaunchButton({ compact = false, onClick }) {
    const { resetTutorial, startTutorial } = useTutorial();
  
    const handle = () => {
      resetTutorial();
      if (onClick) onClick();
      setTimeout(() => startTutorial(), 100);
    };
  
    if (compact) {
      return <button style={S.launchBtnCompact} onClick={handle} title="Guida rapida">?</button>;
    }
    return (
      <button style={S.launchBtn} onClick={handle}>
        <span>📖</span><span>Guida rapida</span>
      </button>
    );
  }
  
  // ─────────────────────────────────────────────
  // STILI
  // ─────────────────────────────────────────────
  const S = {
    backdrop:    { position: "fixed", inset: 0, backgroundColor: "rgba(0,29,71,0.68)", zIndex: 9990, backdropFilter: "blur(1px)", cursor: "pointer" },
    spotlight:   { position: "fixed", zIndex: 9991, borderRadius: 6, boxShadow: "0 0 0 9999px rgba(0,29,71,0.68), 0 0 0 3px #1a6ab5", pointerEvents: "none", transition: "all 0.22s ease" },
    card:        { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 360, backgroundColor: "#fff", borderRadius: 12, boxShadow: "0 20px 60px rgba(0,29,71,0.22), 0 4px 16px rgba(0,29,71,0.10)", zIndex: 9999, overflow: "hidden", fontFamily: "'IBM Plex Sans', sans-serif", animation: "ztutFadeIn 0.2s ease" },
    cardCenter:  { width: 420 },
    cardHeader:  { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 0" },
    stepCount:   { fontSize: 11, fontWeight: 600, color: "#6b7280", letterSpacing: "0.04em", fontFamily: "'IBM Plex Mono', monospace" },
    closeBtn:    { background: "none", border: "none", fontSize: 20, color: "#9ca3af", cursor: "pointer", lineHeight: 1, padding: "0 2px" },
    progressTrack: { height: 3, backgroundColor: "#e5e9f0", margin: "12px 0 0" },
    progressFill:  { height: "100%", backgroundColor: "#001d47", transition: "width 0.3s ease" },
    cardBody:    { padding: "16px 20px 12px" },
    stepTitle:   { margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "#001d47", lineHeight: 1.3 },
    stepContent: { margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.65, whiteSpace: "pre-line" },
    cardFooter:  { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px 16px", borderTop: "1px solid #f0f2f5", gap: 8 },
    btn:         { border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif", padding: "7px 14px", whiteSpace: "nowrap", transition: "background 0.15s" },
    btnPrimary:   { backgroundColor: "#001d47", color: "#fff" },
    btnSecondary: { backgroundColor: "#e8edf5", color: "#001d47" },
    btnGhost:     { backgroundColor: "transparent", color: "#9ca3af", padding: "7px 8px" },
    launchBtn:    { display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "inherit", fontFamily: "'IBM Plex Sans', sans-serif", padding: 0 },
    launchBtnCompact: { width: 28, height: 28, borderRadius: "50%", border: "2px solid #001d47", background: "#fff", color: "#001d47", fontWeight: 800, fontSize: 14, cursor: "pointer" },
    modalBackdrop: { position: "fixed", inset: 0, backgroundColor: "rgba(0,29,71,0.55)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" },
    welcomeModal:  { backgroundColor: "#fff", borderRadius: 14, width: 460, maxWidth: "90vw", overflow: "hidden", boxShadow: "0 30px 80px rgba(0,29,71,0.28)", fontFamily: "'IBM Plex Sans', sans-serif", animation: "ztutFadeIn 0.28s ease" },
    welcomeAccent: { height: 5, background: "linear-gradient(90deg,#001d47 0%,#1a6ab5 100%)" },
    welcomeBody:   { padding: "32px 36px 28px", textAlign: "center" },
    welcomeTitle:  { margin: "0 0 12px", fontSize: 20, fontWeight: 700, color: "#001d47" },
    welcomeText:   { margin: "0 0 8px", fontSize: 14.5, color: "#374151", lineHeight: 1.65 },
  };
  
  if (typeof document !== "undefined" && !document.getElementById("ztut-style")) {
    const tag = document.createElement("style");
    tag.id = "ztut-style";
    tag.textContent = `
      @keyframes ztutFadeIn {
        from { opacity:0; transform:translate(-50%,-47%) scale(0.96); }
        to   { opacity:1; transform:translate(-50%,-50%) scale(1); }
      }
    `;
    document.head.appendChild(tag);
  }