import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { DatePicker } from './DatePicker.jsx';


// ─────────────────────────────────────────────
// FIXED DROPDOWN — si posiziona sopra tutto con position:fixed
// evita il clipping da overflow:hidden della modal-content
// ─────────────────────────────────────────────
function FixedDropdown({ triggerRef, children }) {
  const [pos, setPos] = React.useState({ top: 0, left: 0, width: 0 });
  React.useEffect(() => {
    if (triggerRef?.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
  }, [triggerRef]);
  return (
    <div style={{
      position: 'fixed', top: pos.top, left: pos.left, width: pos.width,
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)', zIndex: 9999, overflow: 'hidden'
    }}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// MODULI DEFAULT TESEO7
// ─────────────────────────────────────────────
const MODULI_TESEO7_DEFAULT = [
  { area: 'BASE', codice: 'T7X-BASG', nome: 'MODULO BASE', prereq: [], gg: 1 },
  { area: 'BASE', codice: 'T7X-BASM', nome: 'MODULO BASE MILK', prereq: ['T7X-BASG'], gg: 0.5 },
  { area: 'BASE', codice: 'T7X-BASI', nome: 'MODULO BASE INDUSTRY', prereq: ['T7X-BASG'], gg: 0.5 },
  { area: 'BASE', codice: 'T7X-BASF', nome: 'MODULO BASE FASHION', prereq: ['T7X-BASG'], gg: 0.5 },
  { area: 'BASE', codice: 'T7X-BASW', nome: 'MODULO BASE WINE', prereq: ['T7X-BASG'], gg: 0.5 },
  { area: 'AMMINISTRAZIONE', codice: 'T7X-CONG', nome: "CONTABILITA' GENERALE", prereq: ['T7X-BASG'], gg: 1 },
  { area: 'AMMINISTRAZIONE', codice: 'T7X-COTG', nome: 'CONTENZIOSO', prereq: ['T7X-CONG'], gg: 0.5 },
  { area: 'AMMINISTRAZIONE', codice: 'T7X-CESG', nome: 'CESPITI', prereq: ['T7X-BASG'], gg: 0.5 },
  { area: 'AMMINISTRAZIONE', codice: 'T7X-CBIG', nome: "CONTABILITA' SCRITTURE AVANZATE BILANCIO INFRANNUALE", prereq: ['T7X-CONG'], gg: 0.5 },
  { area: 'LOGISTICA', codice: 'T7X-MAGG', nome: 'MAGAZZINO', prereq: ['T7X-BASG'], gg: 1 },
  { area: 'LOGISTICA', codice: 'T7X-ATTG', nome: 'CICLO ATTIVO', prereq: ['T7X-MAGG'], gg: 1 },
  { area: 'LOGISTICA', codice: 'T7X-PASG', nome: 'CICLO PASSIVO', prereq: ['T7X-MAGG'], gg: 1 },
  { area: 'AGGIUNTIVI', codice: 'T7X-AGEG', nome: 'AGENTI', prereq: ['T7X-ATTG', 'T7X-CONG'], gg: 0.5 },
  { area: 'AGGIUNTIVI', codice: 'T7X-VEBG', nome: 'VENDITA A BANCO', prereq: ['T7X-ATTG'], gg: 0.5 },
  { area: 'AGGIUNTIVI', codice: 'T7X-CTRG', nome: 'CONTRATTI', prereq: ['T7X-ATTG'], gg: 0.5 },
  { area: 'AGGIUNTIVI', codice: 'T7X-CGDG', nome: 'CONTRATTI GDO', prereq: ['T7X-ATTG'], gg: 0.5 },
  { area: 'AGGIUNTIVI', codice: 'T7X-OFFG', nome: 'PREVENTIVI CAPITOLATO / OFFERTE COMMERCIALI', prereq: ['T7X-ATTG'], gg: 0.5 },
  { area: 'AGGIUNTIVI', codice: 'T7X-RMEG', nome: 'TERMINALI RADIO CON MEMORIA', prereq: ['T7X-MAGG'], gg: 0.5 },
  { area: 'AGGIUNTIVI', codice: 'T7X-RLIG', nome: 'TERMINALI RADIO WI-FI CON LISTE', prereq: ['T7X-MAGG'], gg: 0.5 },
  { area: 'AGGIUNTIVI', codice: 'T7X-SPEG', nome: 'PIANO SPEDIZIONI', prereq: ['T7X-ATTG'], gg: 0.5 },
  { area: 'AGGIUNTIVI', codice: 'T7X-GASG', nome: 'GIRO AUTISTI E PIANO SPEDIZIONI', prereq: ['T7X-ATTG'], gg: 0.5 },
  { area: 'AGGIUNTIVI', codice: 'T7X-CNFG', nome: 'CONFERIMENTI MILK', prereq: ['T7X-PASG'], gg: 0.5 },
  { area: 'AGGIUNTIVI', codice: 'T7X-CNFW', nome: 'CONFERIMENTI WINE', prereq: ['T7X-PASG'], gg: 0.5 },
  { area: 'AGGIUNTIVI', codice: 'T7X-IMBG', nome: 'IMBALLAGGI', prereq: ['T7X-ATTG', 'T7X-PASG'], gg: 0.5 },
  { area: 'AGGIUNTIVI', codice: 'T7X-ETIG', nome: 'ETICHETTE LOGISTICHE', prereq: ['T7X-ATTG', 'T7X-PASG'], gg: 0.5 },
  { area: 'AGGIUNTIVI', codice: 'T7X-PKLG', nome: 'PACKING LIST', prereq: ['T7X-ATTG'], gg: 0.5 },
  { area: 'AGGIUNTIVI', codice: 'T7X-WMSG', nome: 'WMS', prereq: ['T7X-MAGG'], gg: 1 },
  { area: 'AGGIUNTIVI', codice: 'T7X-TSAN', nome: 'TESSERA SANITARIA', prereq: ['T7X-BASG'], gg: 0.5 },
  { area: 'AGGIUNTIVI', codice: 'T7X-MESG', nome: 'INTERFACCIAMENTO CON MES (OPERA)', prereq: ['T7X-PROG'], gg: 0.5 },
  { area: 'AGGIUNTIVI', codice: 'T7X-ICBG', nome: 'INTERFACCIAMENTO CON CORRIERE BARTOLINI', prereq: ['T7X-MAGG'], gg: 0.5 },
  { area: 'AGGIUNTIVI', codice: 'T7X-IAMG', nome: 'INTERFACCIAMENTO CON MAGAZZINI MODULA (DB FRONTIERA)', prereq: ['T7X-MAGG'], gg: 0.5 },
  { area: 'AGGIUNTIVI', codice: 'T7X-IAWG', nome: 'INTERFACCIAMENTO CON MAGAZZINI MODULA (WEBSERVICES)', prereq: ['T7X-MAGG'], gg: 0.5 },
  { area: 'AGGIUNTIVI', codice: 'T7X-IMIG', nome: 'INTERFACCIAMENTO CON MAGAZZINI VERTICALI INCARICOTECH', prereq: ['T7X-MAGG'], gg: 0.5 },
  { area: 'AGGIUNTIVI', codice: 'T7S-USGA', nome: 'INTERFACCIAMENTO CON SW TRASPORTI SGA', prereq: ['T7X-ATTG'], gg: 0.5 },
  { area: 'PRODUZIONE', codice: 'T7X-PROG', nome: 'PRODUZIONE BASE', prereq: ['T7X-MAGG'], gg: 1 },
  { area: 'PRODUZIONE', codice: 'T7X-PROW', nome: 'PRODUZIONE WINE', prereq: [], gg: 0.5 },
  { area: 'PRODUZIONE', codice: 'T7X-PROM', nome: 'PRODUZIONE MILK', prereq: ['T7X-PROG'], gg: 0.5 },
  { area: 'PRODUZIONE', codice: 'T7X-PROI', nome: 'PRODUZIONE INDUSTRIALE', prereq: ['T7X-PROG'], gg: 0.5 },
  { area: 'PRODUZIONE', codice: 'T7X-PROF', nome: 'PRODUZIONE FASHION', prereq: ['T7X-PROG'], gg: 0.5 },
  { area: 'PRODUZIONE', codice: 'T7X-MRPG', nome: 'MRP - MATERIAL REQUIREMENTS PLANNING', prereq: ['T7X-PROG', 'T7X-PASG'], gg: 1 },
  { area: 'CED', codice: 'T7X-CEDG', nome: 'CED', prereq: ['T7X-BASG'], gg: 0.5 },
  { area: 'CED', codice: 'T7X-ELEG', nome: 'INVIO MULTIPLO DOC. PER EMAIL, PEC, FAX', prereq: ['T7X-ATTG', 'T7X-PASG', 'T7X-CONG'], gg: 0.5 },
  { area: 'CED', codice: 'T7X-MAZG', nome: 'MULTI-AZIENDA (ARCHIVI BASE SEPARATI)', prereq: ['T7X-BASG'], gg: 0.5 },
  { area: 'CED', codice: 'T7X-DIVG', nome: 'MULTI-AZIENDA DIV. CONTAB. (ARCHIVI CONDIVISI)', prereq: ['T7X-BASG'], gg: 0.5 },
  { area: 'CED', codice: 'T7X-SOCG', nome: 'INTERSOCIETARIO', prereq: ['T7X-DIVG'], gg: 0.5 },
  { area: 'PASSAGGIO / UPGRADE', codice: 'T7X-P67G', nome: 'PASSAGGIO DATI DA T6 A T7', prereq: [], gg: 1 },
  { area: 'PASSAGGIO / UPGRADE', codice: 'T7X-WEBG', nome: 'MIGRAZIONE DA TESEO7 A TESEO7.WEB', prereq: [], gg: 1 },
  { area: 'RETAIL', codice: 'T7S-BCKR', nome: 'RETAIL BACKOFFICE', prereq: [], gg: 1 },
  { area: 'RETAIL', codice: 'T7S-FOFR', nome: 'RETAIL FRONTOFFICE (per ogni punto vendita)', prereq: [], gg: 0.5 },
  { area: 'RETAIL', codice: 'RTS-WPOS1', nome: 'RTS-WPOS1 (per ogni Registratore di Cassa)', prereq: [], gg: 0.5 },
  { area: 'RETAIL', codice: 'RTS-WEBPOS1', nome: 'RTS-WEBPOS1 (per ogni registratore di Cassa)', prereq: [], gg: 0.5 },
  { area: 'CONTROLLO DI GESTIONE', codice: 'T7X-STAG', nome: 'STATISTICHE', prereq: ['T7X-MAGG', 'T7X-ATTG', 'T7X-PASG', 'T7X-CONG'], gg: 0.5 },
  { area: 'CONTROLLO DI GESTIONE', codice: 'T7X-BDGG', nome: 'BUDGET', prereq: ['T7X-CONG', 'T7X-MAGG'], gg: 0.5 },
  { area: 'CONTROLLO DI GESTIONE', codice: 'T7X-COAG', nome: "CONTABILITA' ANALITICA (CENTRI DI COSTO)", prereq: ['T7X-CONG'], gg: 0.5 },
  { area: 'CONTROLLO DI GESTIONE', codice: 'T7X-CING', nome: "CONTABILITA' INDUSTRIALE (COMMESSE)", prereq: ['T7X-PROG'], gg: 0.5 },
  { area: 'CONTROLLO DI GESTIONE', codice: 'T7X-CISG', nome: "CONTABILITA' COMMESSA SERVIZI", prereq: ['T7X-ATTG', 'T7X-PASG'], gg: 0.5 },
  { area: 'PROGRAMMI ACCESSORI', codice: 'T7X-DFIG', nome: 'INTERFACCIAMENTO TESORERIA DOC-FINANCE', prereq: ['T7X-CONG'], gg: 0.5 },
  { area: 'PROGRAMMI ACCESSORI', codice: 'T7X-AGIG', nome: 'INTERFACCIAMENTO TESORERIA AGICAP', prereq: ['T7X-CONG'], gg: 0.5 },
  { area: 'PROGRAMMI ACCESSORI', codice: 'T7X-EXPG', nome: 'EXPORT / IMPORT MOVIMENTI (EDIFACT/FILCONAD)', prereq: ['T7X-MAGG'], gg: 0.5 },
  { area: 'PROGRAMMI ACCESSORI', codice: 'T7X-OMNG', nome: 'EXPORT DATI VERSO ZUCCHETTI OMNIA/AGO', prereq: ['T7X-CONG'], gg: 0.5 },
  { area: 'PROGRAMMI ACCESSORI', codice: 'T7X-SPPG', nome: 'EXPORT DATI VERSO SELF-PLANNING', prereq: ['T7X-CONG'], gg: 0.5 },
  { area: 'PROGRAMMI ACCESSORI', codice: 'T7X-EXVG', nome: 'INTERFACCIAMENTO EXTRAVIRGIN', prereq: ['T7X-ATTG'], gg: 0.5 },
  { area: 'PROGRAMMI ACCESSORI', codice: 'T7X-TWAG', nome: 'INTERFACCIAMENTO TAWEB ACCISE', prereq: ['T7X-ATTG'], gg: 0.5 },
  { area: 'PROGRAMMI ACCESSORI', codice: 'T7X-TWVG', nome: 'INTERFACCIAMENTO TAWEB REG.VINI', prereq: ['T7X-ATTG'], gg: 0.5 },
  { area: 'PROGRAMMI ACCESSORI', codice: 'T7S-ATOG', nome: 'INTERFACCIAMENTO TENTATA VENDITA ATON', prereq: ['T7X-ATTG'], gg: 0.5 },
  { area: 'PROGRAMMI ACCESSORI', codice: 'T7S-MIXG', nome: 'INTERFACCIAMENTO TENTATA VENDITA MIXNOW', prereq: ['T7X-ATTG'], gg: 0.5 },
  { area: 'PROGRAMMI ACCESSORI', codice: 'T7S-ZTMG', nome: 'INTERFACCIAMENTO HR TIMESHEET PER IMPORT COSTI', prereq: ['T7X-CONG'], gg: 0.5 },
  { area: 'PROGRAMMI ACCESSORI', codice: 'T7S-ZTRG', nome: 'INTERFACCIAMENTO ZTRAVEL', prereq: ['T7X-CONG'], gg: 0.5 },
  { area: 'PROGRAMMI ACCESSORI', codice: 'T7S-IHRG', nome: 'INTERFACCIAMENTO HR IMPORT RIMBORSI SPESE E TRASFERTE', prereq: ['T7X-CONG', 'T7X-PASG'], gg: 0.5 },
  { area: 'PROGRAMMI ACCESSORI', codice: 'T7S-IPGG', nome: 'INTERFACCIAMENTO IMPORT PAGHE', prereq: ['T7X-CONG'], gg: 0.5 },
  { area: 'PROGRAMMI ACCESSORI', codice: 'T7X-ATEG', nome: 'INTERFACCIAMENTO CON ATELIER', prereq: ['T7X-CONG'], gg: 0.5 },
  { area: 'PROGRAMMI ACCESSORI', codice: 'T7X-TLBG', nome: 'INTERFACCIAMENTO CON TILBY', prereq: ['T7X-CONG'], gg: 0.5 },
  { area: 'PROGRAMMI ACCESSORI', codice: 'T7X-AHCG', nome: 'INTERFACCIAMENTO CON ADHOC', prereq: ['T7X-BASG'], gg: 0.5 },
  { area: 'PROGRAMMI ACCESSORI', codice: 'T7S-WWAG', nome: 'INTERFACCIAMENTO WINWASTE', prereq: ['T7X-BASG'], gg: 0.5 },
  { area: 'PROGRAMMI ACCESSORI', codice: 'T7X-CADG', nome: 'INTERFACCIAMENTO CAD (SOLIDWORKS)', prereq: ['T7X-PROG'], gg: 0.5 },
  { area: 'PROGRAMMI ACCESSORI', codice: 'T7X-ECOG', nome: 'INTERFACCIAMENTO E-COMMERCE', prereq: ['T7X-ATTG'], gg: 0.5 },
  { area: 'PROGRAMMI ACCESSORI', codice: 'T7X-WSIG', nome: 'INTERFACCIAMENTO CON WEBSERVICES API', prereq: ['T7X-BASG', 'T7X-MAGG', 'T7X-ATTG', 'T7X-PASG'], gg: 0.5 },
  { area: 'PROGRAMMI ACCESSORI', codice: 'T7S-ETLG', nome: 'ETL PER DATAWAREHOUSE NON INFOBUSINESS', prereq: ['T7X-BASG'], gg: 0.5 },
  { area: 'INFOBUSINESS', codice: 'MART-DOC', nome: 'MART AREA DOCUMENTI - CICLO ATTIVO E PASSIVO', prereq: [], gg: 0.5 },
  { area: 'INFOBUSINESS', codice: 'MART-COG', nome: "MART AREA CONTABILITA' GENERALE", prereq: [], gg: 0.5 },
  { area: 'INFOBUSINESS', codice: 'MART-CFL', nome: 'MART AREA FINANZIARIA - CASH FLOW', prereq: [], gg: 0.5 },
  { area: 'INFOBUSINESS', codice: 'MART-SCA', nome: 'MART AREA FINANZIARIA - SCADENZARIO', prereq: [], gg: 0.5 },
  { area: 'INFOBUSINESS', codice: 'MART-CDC', nome: "MART AREA CONTABILITA' ANALITICA", prereq: [], gg: 0.5 },
  { area: 'INFOBUSINESS', codice: 'MART-CIN', nome: "MART AREA CONTABILITA' INDUSTRIALE", prereq: [], gg: 0.5 },
  { area: 'INFOBUSINESS', codice: 'MART-CNF', nome: 'MART AREA CONFERIMENTI MILK', prereq: [], gg: 0.5 },
];

// ─────────────────────────────────────────────
// MODULI DEFAULT CASSIOPEA
// ─────────────────────────────────────────────
const MODULI_CASSIOPEA_DEFAULT = [
  // CRM SEGRETERIA
  { area: 'CRM SEGRETERIA', codice: 'CSP-ERZS', nome: 'CRM Gestionale ERP ZCS', prereq: [], gg: 1 },
  { area: 'CRM SEGRETERIA', codice: 'CSP-ERSS', nome: 'CRM Gestionale Standalone', prereq: [], gg: 1 },
  { area: 'CRM SEGRETERIA', codice: 'CSP-ERXS', nome: 'Interfaccia Gestionale ERP Esterno (DataHub)', prereq: [], gg: 0.5 },
  { area: 'CRM SEGRETERIA', codice: 'CSP-CALS', nome: 'Sincronizzazione Agenda Planning con Google / Office365', prereq: [], gg: 0.5 },
  { area: 'CRM SEGRETERIA', codice: 'CSP-PRDS', nome: 'Bilancio e Avanzamento Commesse T7', prereq: [], gg: 0.5 },
  { area: 'CRM SEGRETERIA', codice: 'CSP-MRKS', nome: 'Campagne Comunicazione Marketing', prereq: [], gg: 0.5 },
  { area: 'CRM SEGRETERIA', codice: 'CSP-MKAS', nome: 'Integrazione Marketing Automation', prereq: [], gg: 0.5 },
  { area: 'CRM SEGRETERIA', codice: 'CSP-MSMS', nome: 'Invio notifiche SMS', prereq: [], gg: 0.5 },
  { area: 'CRM SEGRETERIA', codice: 'CSP-QSTS', nome: 'Questionari Valutazione / Moduli', prereq: [], gg: 0.5 },
  { area: 'CRM SEGRETERIA', codice: 'CSP-PRAS', nome: 'Prospect gestione avanzata', prereq: [], gg: 0.5 },
  { area: 'CRM SEGRETERIA', codice: 'CSP-MAVS', nome: 'Magazzino Funzioni Avanzate (per standalone)', prereq: [], gg: 0.5 },
  { area: 'CRM SEGRETERIA', codice: 'CSP-I40S', nome: 'Modulo Interfacciamento Industria 4.0', prereq: [], gg: 0.5 },
  { area: 'CRM SEGRETERIA', codice: 'CSP-CORS', nome: 'Modulo Corsi', prereq: [], gg: 0.5 },
  { area: 'CRM SEGRETERIA', codice: 'CSP-APIS', nome: 'Interfacciamento con Webservices API', prereq: [], gg: 0.5 },
  { area: 'CRM SEGRETERIA', codice: 'CSP-DOCS', nome: 'Inserimento Documenti/Ordini', prereq: [], gg: 0.5 },
  { area: 'CRM SEGRETERIA', codice: 'CSP-AHCS', nome: 'Connettore Importazione Documenti/Ordini per AdHoc', prereq: [], gg: 0.5 },
  // SFA AGENTI
  { area: 'SFA AGENTI', codice: 'CSP-CTWA', nome: 'Catalogo Web', prereq: [], gg: 0.5 },
  { area: 'SFA AGENTI', codice: 'CSP-DOMA', nome: 'Inserimento Ordini da Kit e Mappa Visuale', prereq: [], gg: 0.5 },
  { area: 'SFA AGENTI', codice: 'CSP-PRBA', nome: 'Calcolo Premi e Budget agenti', prereq: [], gg: 0.5 },
  { area: 'SFA AGENTI', codice: 'CSP-GRVA', nome: 'Forza Vendite Funzioni Avanzate', prereq: [], gg: 0.5 },
  // BPM PRATICHE
  { area: 'BPM PRATICHE', codice: 'CSP-BPMP', nome: 'Pratiche Processi interni Workflow', prereq: [], gg: 1 },
  { area: 'BPM PRATICHE', codice: 'CSP-IAMP', nome: 'Pratiche integrazione automatica da Mail', prereq: [], gg: 0.5 },
  { area: 'BPM PRATICHE', codice: 'CSP-ASSP', nome: 'Manutenzione Prodotti', prereq: [], gg: 0.5 },
  { area: 'BPM PRATICHE', codice: 'CSP-RDAP', nome: 'RDA Approvazione Richieste Acquisto con budget', prereq: [], gg: 0.5 },
  { area: 'BPM PRATICHE', codice: 'CSP-MIBP', nome: 'Mart InfoBusiness', prereq: [], gg: 0.5 },
  { area: 'BPM PRATICHE', codice: 'CSP-IMPP', nome: 'Manutenzione Impianti', prereq: [], gg: 0.5 },
  { area: 'BPM PRATICHE', codice: 'CSP-PACP', nome: 'Portale Assistenza Clienti', prereq: [], gg: 0.5 },
  { area: 'BPM PRATICHE', codice: 'CSP-PFRP', nome: 'Piano Fabbisogni Ricambi', prereq: [], gg: 0.5 },
  { area: 'BPM PRATICHE', codice: 'CSP-PIFP', nome: 'Pianificazione Fasi Pratiche', prereq: [], gg: 0.5 },
  { area: 'BPM PRATICHE', codice: 'CSP-CARP', nome: 'Manutenzione Automezzi e Attrezzature', prereq: [], gg: 0.5 },
  { area: 'BPM PRATICHE', codice: 'CSP-GPSP', nome: 'Interfaccia GPS', prereq: [], gg: 0.5 },
  { area: 'BPM PRATICHE', codice: 'CSP-KEYP', nome: 'Interfacciamento Armadietto Chiavi', prereq: [], gg: 0.5 },
  // RFID
  { area: 'RFID', codice: 'CSP-RFIR', nome: 'Modulo Base RFID', prereq: [], gg: 0.5 },
  { area: 'RFID', codice: 'CSP-CESR', nome: 'Inventario Cespiti con RFID', prereq: [], gg: 0.5 },
  // APP CRM
  { area: 'APP CRM', codice: 'CSP-BCKM', nome: 'Backoffice interfacciamento APP CRM (3 utenti compresi)', prereq: [], gg: 0.5 },
  { area: 'APP CRM', codice: 'CSP-RUBM', nome: 'App Rubrica Contatti Offline', prereq: [], gg: 0.5 },
  { area: 'APP CRM', codice: 'CSP-CRMM', nome: 'App Segreteria ERP Offline', prereq: [], gg: 0.5 },
  { area: 'APP CRM', codice: 'CSP-DOAM', nome: 'App Inserimento Ordini / Documenti Offline', prereq: [], gg: 0.5 },
  { area: 'APP CRM', codice: 'CSP-CATM', nome: 'App Catalogo Offline', prereq: [], gg: 0.5 },
  { area: 'APP CRM', codice: 'CSP-FIRM', nome: 'App Raccolta Firma Ordini / Documenti', prereq: [], gg: 0.5 },
  { area: 'APP CRM', codice: 'CSP-PLAM', nome: 'App Gestione Planning Online', prereq: [], gg: 0.5 },
  { area: 'APP CRM', codice: 'CSP-IMGM', nome: 'App Caricamento Allegati Online', prereq: [], gg: 0.5 },
  { area: 'APP CRM', codice: 'CSP-BPMM', nome: 'App Avanzamento Pratiche Online', prereq: [], gg: 0.5 },
  { area: 'APP CRM', codice: 'CSP-QSTM', nome: 'App Questionari / Moduli Offline', prereq: [], gg: 0.5 },
  { area: 'APP CRM', codice: 'CSP-CONM', nome: 'App Gestione Risorse Online', prereq: [], gg: 0.5 },
  { area: 'APP CRM', codice: 'CSP-IMPM', nome: 'App Manutenzione Impianti Online', prereq: [], gg: 0.5 },
  { area: 'APP CRM', codice: 'CSP-COAM', nome: 'App Consuntivazione Attività e Commesse Online', prereq: [], gg: 0.5 },
  { area: 'APP CRM', codice: 'CSP-DOLM', nome: 'App Consultazione Documentazione Online', prereq: [], gg: 0.5 },
  { area: 'APP CRM', codice: 'CSP-ADOM', nome: 'App Area Download', prereq: [], gg: 0.5 },
  { area: 'APP CRM', codice: 'CSP-GR4M', nome: 'App Visualizzazione 4 Desktop Online', prereq: [], gg: 0.5 },
  { area: 'APP CRM', codice: 'CSP-GRXM', nome: 'App Visualizzazione Desktop Illimitati Online', prereq: [], gg: 0.5 },
  { area: 'APP CRM', codice: 'CSP-PAPM', nome: 'App Personalizzazione su Store', prereq: [], gg: 0.5 },
  { area: 'APP CRM', codice: 'CSP-UAPM', nome: 'App Utente aggiuntivo oltre il terzo (1 utente può attivare 2 device)', prereq: [], gg: 0.5 },
  // APP WMS
  { area: 'APP WMS', codice: 'CSP-BCKL', nome: 'Backoffice interfacciamento APP WMS (2 dispositivi compresi)', prereq: [], gg: 0.5 },
  { area: 'APP WMS', codice: 'CSP-WMSL', nome: 'App Preparazione Ordini Offline', prereq: [], gg: 0.5 },
  { area: 'APP WMS', codice: 'CSP-UAPL', nome: 'App Utente aggiuntivo (per ogni ulteriore device attivato)', prereq: [], gg: 0.5 },
  // SMART RECEPTION
  { area: 'SMART RECEPTION', codice: 'CSP-BOAC', nome: 'BackOffice Accoglienza', prereq: [], gg: 0.5 },
  { area: 'SMART RECEPTION', codice: 'CSP-FOAC', nome: 'FrontOffice Accoglienza', prereq: [], gg: 0.5 },
  // VERTICALI
  { area: 'VERTICALI', codice: 'CSP-PAPV', nome: 'Portale del Pastore (fasce conferitori 100/250/400/500)', prereq: [], gg: 1 },
  { area: 'VERTICALI', codice: 'CSP-ALFV', nome: 'Albo Fornitori', prereq: [], gg: 0.5 },
  { area: 'VERTICALI', codice: 'CSP-MDGV', nome: 'Middleware Midgear', prereq: [], gg: 0.5 },
  { area: 'VERTICALI', codice: 'CSP-TRKV', nome: 'Trak', prereq: [], gg: 0.5 },
];

const AREE_CASSIOPEA = [
  'CRM SEGRETERIA', 'SFA AGENTI', 'BPM PRATICHE', 'RFID',
  'APP CRM', 'APP WMS', 'SMART RECEPTION', 'VERTICALI',
];

const AREA_COLORS_CASSIOPEA = {
  'CRM SEGRETERIA':  { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd', dot: '#0284c7' },
  'SFA AGENTI':      { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', dot: '#16a34a' },
  'BPM PRATICHE':    { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff', dot: '#8b5cf6' },
  'RFID':            { bg: '#fef9c3', text: '#a16207', border: '#fde68a', dot: '#ca8a04' },
  'APP CRM':         { bg: '#fff1f2', text: '#be123c', border: '#fecdd3', dot: '#e11d48' },
  'APP WMS':         { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', dot: '#ea580c' },
  'SMART RECEPTION': { bg: '#fdf4ff', text: '#86198f', border: '#f0abfc', dot: '#c026d3' },
  'VERTICALI':       { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0', dot: '#22c55e' },
};


const AREE_ORDINATE = [
  'BASE','AMMINISTRAZIONE','LOGISTICA','AGGIUNTIVI','PRODUZIONE','CED',
  'PASSAGGIO / UPGRADE','RETAIL','CONTROLLO DI GESTIONE','PROGRAMMI ACCESSORI','INFOBUSINESS'
];

const AREA_COLORS = {
  'BASE':                   { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd', dot: '#0284c7' },
  'AMMINISTRAZIONE':        { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', dot: '#16a34a' },
  'LOGISTICA':              { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', dot: '#ea580c' },
  'AGGIUNTIVI':             { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff', dot: '#8b5cf6' },
  'PRODUZIONE':             { bg: '#fef9c3', text: '#a16207', border: '#fde68a', dot: '#ca8a04' },
  'CED':                    { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd', dot: '#0ea5e9' },
  'PASSAGGIO / UPGRADE':    { bg: '#fff1f2', text: '#be123c', border: '#fecdd3', dot: '#e11d48' },
  'RETAIL':                 { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0', dot: '#22c55e' },
  'CONTROLLO DI GESTIONE':  { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6' },
  'PROGRAMMI ACCESSORI':    { bg: '#fdf4ff', text: '#86198f', border: '#f0abfc', dot: '#c026d3' },
  'INFOBUSINESS':           { bg: '#fff8f1', text: '#9a3412', border: '#fed7aa', dot: '#f97316' },
};

const fmtDate = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('it-IT'); } catch { return iso; }
};

const todayStr = () => new Date().toLocaleDateString('it-IT');

// ─────────────────────────────────────────────
// STEP INDICATOR
// ─────────────────────────────────────────────
const STEPS = ['Intestazione', 'Cliente', 'Moduli', 'Sistemistica', 'Sintesi'];

function StepIndicator({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 72 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: done ? '#001d47' : active ? '#2563eb' : '#e2e8f0',
                color: (done || active) ? '#fff' : '#94a3b8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
                boxShadow: active ? '0 0 0 4px #bfdbfe' : 'none',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? '#001d47' : done ? '#64748b' : '#94a3b8', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? '#001d47' : '#e2e8f0', marginBottom: 16, transition: 'background 0.2s' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// STAFF DROPDOWN — ricercabile, senza re-render bug
// ─────────────────────────────────────────────
function StaffDropdown({ value, onChange, staff, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (open && searchRef.current) setTimeout(() => searchRef.current?.focus(), 30);
  }, [open]);

  const filtered = (staff || []).filter(s =>
    !search || `${s.cognome} ${s.nome}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${open ? '#2563eb' : '#e2e8f0'}`, background: '#f8fafc', cursor: 'pointer', minHeight: 38, transition: 'border-color 0.15s' }}>
        <span style={{ fontSize: 13, color: value ? '#0f172a' : '#94a3b8', fontStyle: value ? 'normal' : 'italic' }}>
          {value || placeholder}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      {open && (
        <FixedDropdown triggerRef={ref}>
          <div style={{ padding: '6px 8px', borderBottom: '1px solid #f1f5f9' }}>
            <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cerca..."
              style={{ width: '100%', padding: '5px 8px', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 6, outline: 'none', background: '#f8fafc', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            <div onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
              style={{ padding: '8px 14px', fontSize: 13, cursor: 'pointer', color: '#94a3b8', fontStyle: 'italic' }}
              onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
              — Nessuno —
            </div>
            {filtered.map(s => {
              const key = `${s.cognome} ${s.nome}`;
              const sel = value === key;
              return (
                <div key={s.id || key} onClick={() => { onChange(key); setOpen(false); setSearch(''); }}
                  style={{ padding: '8px 14px', fontSize: 13, cursor: 'pointer', background: sel ? '#eff6ff' : 'transparent', color: sel ? '#2563eb' : '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}
                  onMouseOver={e => { if (!sel) e.currentTarget.style.background = '#f8fafc'; }}
                  onMouseOut={e => { if (!sel) e.currentTarget.style.background = sel ? '#eff6ff' : 'transparent'; }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                    {(s.nome?.[0] || '') + (s.cognome?.[0] || '')}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{key}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.ruolo}</div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: '10px 14px', fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Nessun risultato</div>
            )}
          </div>
        </FixedDropdown>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// STEP 1 — INTESTAZIONE
// Tutti i campi usano stato locale + onBlur per evitare
// il bug di re-render che fa perdere il focus ad ogni keystroke
// ─────────────────────────────────────────────
function FieldText({ label, value, onChange, placeholder, mono }) {
  const [local, setLocal] = useState(value || '');
  useEffect(() => { setLocal(value || ''); }, [value]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      <input
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={e => onChange(e.target.value)}
        placeholder={placeholder || ''}
        style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#0f172a', outline: 'none', background: '#f8fafc', fontFamily: mono ? 'IBM Plex Mono, monospace' : 'IBM Plex Sans, sans-serif', width: '100%', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
        onFocus={e => e.target.style.borderColor = '#2563eb'}
        onBlur2={e => e.target.style.borderColor = '#e2e8f0'}
      />
    </div>
  );
}

function StepIntestazione({ data, onChange, staff, onChangeProdotto }) {
  const consulentiPM = (staff || []).filter(s =>
    ['Consulente', 'PM', 'Project Manager', 'Consulente applicativo'].includes(s.ruolo)
  );
  const salesAccount = (staff || []).filter(s =>
    ['Sales Account', 'Sales', 'Commerciale', 'Account'].includes(s.ruolo)
  );

  const upd = (key, val) => onChange({ ...data, [key]: val });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* PRODOTTO */}
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Prodotto *</label>
        <div style={{ display: 'flex', gap: 10 }}>
          {['Teseo7', 'Cassiopea'].map(p => (
            <button key={p} onClick={() => onChangeProdotto(p)}
              style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: `2px solid ${data.prodotto === p ? '#001d47' : '#e2e8f0'}`, background: data.prodotto === p ? '#001d47' : '#fff', color: data.prodotto === p ? '#fff' : '#374151', fontSize: 14, fontWeight: data.prodotto === p ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* DATA — usa il DatePicker del portale */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data</label>
          <div style={{ position: 'relative', zIndex: 500 }}>
            <DatePicker
              value={data.data || ''}
              onChange={val => upd('data', val)}
            />
          </div>
        </div>
        {/* PRATICA — stato locale per evitare bug focus */}
        <FieldText label="Pratica N°" value={data.pratica} onChange={v => upd('pratica', v)} placeholder="es. DM.26.00913" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agente</label>
          {staff && staff.length > 0 ? (
            <StaffDropdown
              value={data.agente || ''}
              onChange={val => upd('agente', val)}
              staff={salesAccount.length > 0 ? salesAccount : staff}
              placeholder="Seleziona agente..."
            />
          ) : (
            <FieldText label="" value={data.agente} onChange={v => upd('agente', v)} placeholder="Nome agente commerciale" />
          )}
        </div>

        {/* TECNICO — dropdown staff */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tecnico</label>
          {staff && staff.length > 0 ? (
            <StaffDropdown
              value={data.tecnico || ''}
              onChange={val => upd('tecnico', val)}
              staff={consulentiPM.length > 0 ? consulentiPM : staff}
              placeholder="Seleziona tecnico..."
            />
          ) : (
            <FieldText label="" value={data.tecnico} onChange={v => upd('tecnico', v)} placeholder="Nome tecnico" />
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* DEMO N° */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Demo N°</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['1°', '2°', '3°'].map(v => (
              <button key={v} onClick={() => upd('demoN', v)}
                style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: `1.5px solid ${data.demoN === v ? '#001d47' : '#e2e8f0'}`, background: data.demoN === v ? '#001d47' : '#fff', color: data.demoN === v ? '#fff' : '#374151', fontSize: 13, fontWeight: data.demoN === v ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* MODALITÀ — solo 2 opzioni */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Modalità</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { val: 'Presenza',  icon: 'presenza' },
              { val: 'Videocall', icon: 'videocall' },
            ].map(({ val, icon }) => (
              <button key={val} onClick={() => upd('modalita', val)}
                style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: `1.5px solid ${data.modalita === val ? '#001d47' : '#e2e8f0'}`, background: data.modalita === val ? '#001d47' : '#fff', color: data.modalita === val ? '#fff' : '#374151', fontSize: 13, fontWeight: data.modalita === val ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                {icon === 'presenza'
                  ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><circle cx="19" cy="7" r="2"/><path d="M23 21v-1a3 3 0 0 0-2-2.8"/></svg>
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                }
                {val}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STEP 2 — CLIENTE
// Stessa tecnica: stato locale + onBlur
// ─────────────────────────────────────────────
function PersonaRow({ persona, onUpdate, onRemove }) {
  const [nome, setNome] = useState(persona.nome || '');
  const [ruolo, setRuolo] = useState(persona.ruolo || '');
  useEffect(() => { setNome(persona.nome || ''); setRuolo(persona.ruolo || ''); }, [persona]);
  const inp = { padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#0f172a', outline: 'none', background: '#f8fafc', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' };
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input value={nome} onChange={e => setNome(e.target.value)} onBlur={() => onUpdate('nome', nome)} placeholder="Nome e Cognome" style={{ ...inp, flex: 2 }} />
      <input value={ruolo} onChange={e => setRuolo(e.target.value)} onBlur={() => onUpdate('ruolo', ruolo)} placeholder="Ruolo (es. Titolare, Resp. IT)" style={{ ...inp, flex: 2 }} />
      <button onClick={onRemove} style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: '#fee2e2', color: '#dc2626', fontSize: 15, cursor: 'pointer', lineHeight: 1, flexShrink: 0, fontFamily: 'inherit' }}>×</button>
    </div>
  );
}

function StepCliente({ data, onChange }) {
  const upd = (key, val) => onChange({ ...data, [key]: val });
  const addPersona = () => onChange({ ...data, persone: [...(data.persone || []), { nome: '', ruolo: '' }] });
  const removePersona = (i) => onChange({ ...data, persone: data.persone.filter((_, idx) => idx !== i) });
  const updatePersona = (i, field, val) => {
    const p = [...(data.persone || [])];
    p[i] = { ...p[i], [field]: val };
    onChange({ ...data, persone: p });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <FieldText label="Azienda *" value={data.azienda} onChange={v => upd('azienda', v)} placeholder="Ragione sociale" />
        <FieldText label="Settore / Attività" value={data.settore} onChange={v => upd('settore', v)} placeholder="es. BAKERY" />
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Persone Presenti</label>
          <button onClick={addPersona} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 6, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            + Aggiungi
          </button>
        </div>
        {(data.persone || []).length === 0 && (
          <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: 13, background: '#f8fafc', borderRadius: 8, border: '1.5px dashed #e2e8f0', fontStyle: 'italic' }}>
            Nessuna persona aggiunta
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(data.persone || []).map((p, i) => (
            <PersonaRow key={i} persona={p}
              onUpdate={(field, val) => updatePersona(i, field, val)}
              onRemove={() => removePersona(i)} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STEP 3 — MODULI (Layout B: sidebar aree + lista destra)
// ─────────────────────────────────────────────
function GiornateInput({ codice, modulo, giornate, setGiornate, sel, col }) {
  const stored = giornate[codice] !== undefined ? giornate[codice] : modulo.gg;
  const [local, setLocal] = useState(String(stored));
  useEffect(() => { setLocal(String(giornate[codice] !== undefined ? giornate[codice] : modulo.gg)); }, [codice, giornate, modulo.gg]);
  return (
    <input
      type="number" step="0.5" min="0"
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={e => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) setGiornate(prev => ({ ...prev, [codice]: v }));
      }}
      onClick={e => e.stopPropagation()}
      style={{ width: 52, padding: '3px 6px', borderRadius: 6, border: `1px solid ${sel ? col.border : '#e2e8f0'}`, fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', outline: 'none', background: '#fff', color: sel ? col.text : '#94a3b8', fontWeight: sel ? 600 : 400 }}
    />
  );
}

function NoteAreaInput({ area, noteArea, setNoteArea }) {
  const [local, setLocal] = useState(noteArea[area] || '');
  useEffect(() => { setLocal(noteArea[area] || ''); }, [area, noteArea]);
  return (
    <input
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={e => setNoteArea(prev => ({ ...prev, [area]: e.target.value }))}
      placeholder="Criticità..."
      onClick={e => e.stopPropagation()}
      style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, width: 170, outline: 'none', background: '#fff', fontFamily: 'inherit' }}
    />
  );
}

function SearchInput({ value, onChange }) {
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);
  return (
    <input
      value={local}
      onChange={e => { setLocal(e.target.value); onChange(e.target.value); }}
      placeholder="Cerca modulo per nome o codice..."
      style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, flex: 1, color: '#0f172a', fontFamily: 'inherit' }}
    />
  );
}

function StepModuli({ selezione, setSelezione, giornate, setGiornate, noteArea, setNoteArea, moduli, areeOrdinate: areeOrdinateProps, areaColors: areaColorsProps }) {
  const areeOrdinate = areeOrdinateProps || AREE_ORDINATE;
  const areaColors = areaColorsProps || AREA_COLORS;
  const areePresenti = areeOrdinate.filter(a => moduli.some(m => m.area === a));
  const [areaAttivaState, setAreaAttiva] = useState(null);
  const [search, setSearch] = useState('');
  // Se l'area attiva non esiste nel prodotto corrente, torna alla prima disponibile
  const areaAttiva = (areaAttivaState && areePresenti.includes(areaAttivaState))
    ? areaAttivaState
    : (areePresenti[0] || null);

  const toggleModulo = useCallback((codice) => {
    setSelezione(prev => {
      const next = new Set(prev);
      if (next.has(codice)) {
        next.delete(codice);
      } else {
        next.add(codice);
        const m = moduli.find(x => x.codice === codice);
        if (m) m.prereq.forEach(p => next.add(p));
      }
      return next;
    });
  }, [moduli, setSelezione]);

  const totGiornate = moduli
    .filter(m => selezione.has(m.codice))
    .reduce((sum, m) => sum + parseFloat(giornate[m.codice] !== undefined ? giornate[m.codice] : m.gg), 0);

  // Moduli da mostrare a destra
  const moduliDestra = search.trim()
    ? moduli.filter(m => m.nome.toLowerCase().includes(search.toLowerCase()) || m.codice.toLowerCase().includes(search.toLowerCase()))
    : moduli.filter(m => m.area === areaAttiva);

  const areaCorrenteCol = areaColors[areaAttiva] || areaColors['BASE'];
  const isSearch = !!search.trim();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Barra ricerca + totale */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '7px 12px' }}>
          <svg width="13" height="13" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="6.5" cy="6.5" r="5" stroke="#94a3b8" strokeWidth="1.5"/>
            <path d="M10 10l3 3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <SearchInput value={search} onChange={setSearch} />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
          )}
        </div>
        <div style={{ background: '#001d47', borderRadius: 8, padding: '8px 16px', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap', fontFamily: 'IBM Plex Mono, monospace' }}>
          {selezione.size} mod · {totGiornate.toFixed(1)} gg
        </div>
      </div>

      {/* Layout due colonne */}
      <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr', border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', height: 380 }}>

        {/* SIDEBAR AREE */}
        <div style={{ borderRight: '1px solid #e2e8f0', overflowY: 'auto', background: '#f8fafc' }}>
          {areePresenti.map(area => {
            const col = areaColors[area] || areaColors['BASE'];
            const selCount = moduli.filter(m => m.area === area && selezione.has(m.codice)).length;
            const active = !isSearch && area === areaAttiva;
            return (
              <div key={area}
                onClick={() => { setAreaAttiva(area); setSearch(''); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #e2e8f0', background: active ? col.bg : 'transparent', borderRight: active ? `3px solid ${col.dot}` : '3px solid transparent', transition: 'all 0.12s' }}
                onMouseOver={e => { if (!active) e.currentTarget.style.background = '#f1f5f9'; }}
                onMouseOut={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: col.dot, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? col.text : '#374151', flex: 1, lineHeight: 1.2 }}>{area}</span>
                {selCount > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: col.text, background: '#fff', borderRadius: 20, padding: '1px 5px', border: `1px solid ${col.border}`, flexShrink: 0 }}>{selCount}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* LISTA MODULI */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Header area corrente */}
          {!isSearch && (
            <div style={{ padding: '9px 14px', background: areaCorrenteCol.bg, borderBottom: `1px solid ${areaCorrenteCol.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'sticky', top: 0, zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: areaCorrenteCol.dot }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: areaCorrenteCol.text, letterSpacing: '0.04em' }}>{areaAttiva}</span>
                {moduli.filter(m => m.area === areaAttiva && selezione.has(m.codice)).length > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: areaCorrenteCol.text, background: '#fff', borderRadius: 20, padding: '1px 7px', border: `1px solid ${areaCorrenteCol.border}` }}>
                    {moduli.filter(m => m.area === areaAttiva && selezione.has(m.codice)).length} sel. · {moduli.filter(m => m.area === areaAttiva && selezione.has(m.codice)).reduce((s, m) => s + parseFloat(giornate[m.codice] !== undefined ? giornate[m.codice] : m.gg), 0).toFixed(1)} gg
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: areaCorrenteCol.text, opacity: 0.7 }}>Note:</span>
                <NoteAreaInput area={areaAttiva} noteArea={noteArea} setNoteArea={setNoteArea} />
              </div>
            </div>
          )}
          {isSearch && (
            <div style={{ padding: '8px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 11, color: '#64748b', flexShrink: 0 }}>
              {moduliDestra.length} risultati per "<strong>{search}</strong>"
            </div>
          )}

          {/* Righe moduli */}
          <div style={{ flex: 1 }}>
            {moduliDestra.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>Nessun modulo trovato</div>
            )}
            {moduliDestra.map(m => {
              const col = areaColors[m.area] || areaColors['BASE'];
              const sel = selezione.has(m.codice);
              const prereqMancanti = m.prereq.filter(p => !selezione.has(p));
              return (
                <div key={m.codice}
                  onClick={() => toggleModulo(m.codice)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: '1px solid #f1f5f9', background: sel ? col.bg : '#fff', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseOver={e => { if (!sel) e.currentTarget.style.background = '#f8fafc'; }}
                  onMouseOut={e => { if (!sel) e.currentTarget.style.background = sel ? col.bg : '#fff'; }}>
                  {/* Checkbox */}
                  <div style={{ width: 17, height: 17, borderRadius: 4, border: `2px solid ${sel ? col.dot : '#cbd5e1'}`, background: sel ? col.dot : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                    {sel && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                  </div>
                  {/* Codice */}
                  <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', background: sel ? col.bg : '#f1f5f9', color: sel ? col.text : '#64748b', border: `1px solid ${sel ? col.border : '#e2e8f0'}`, borderRadius: 4, padding: '2px 6px', flexShrink: 0, fontWeight: sel ? 700 : 400 }}>{m.codice}</span>
                  {/* Nome */}
                  <span style={{ flex: 1, fontSize: 12, color: sel ? '#0f172a' : '#374151', fontWeight: sel ? 600 : 400, lineHeight: 1.3 }}>{m.nome}</span>
                  {/* Area badge se stiamo cercando */}
                  {isSearch && (
                    <span style={{ fontSize: 9, color: col.text, background: col.bg, border: `1px solid ${col.border}`, borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>{m.area}</span>
                  )}
                  {/* Prerequisiti mancanti */}
                  {sel && prereqMancanti.length > 0 && (
                    <span title={`Prerequisiti mancanti: ${prereqMancanti.join(', ')}`} style={{ fontSize: 10, color: '#d97706', flexShrink: 0 }}>⚠</span>
                  )}
                  {/* Giornate */}
                  <GiornateInput codice={m.codice} modulo={m} giornate={giornate} setGiornate={setGiornate} sel={sel} col={col} />
                  <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>gg</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STEP 4 — SISTEMISTICA
// ─────────────────────────────────────────────
function StepSistemistica({ data, onChange }) {
  const upd = (key, val) => onChange({ ...data, [key]: val });
  const opzioni = [
    { val: 'Locale',          icon: 'locale',  desc: 'Installazione on-premise presso il cliente' },
    { val: 'Cloud Server dedicato', icon: 'server', desc: 'Server dedicato in cloud — infrastruttura riservata al cliente' },
    { val: 'Cloud SaaS',      icon: 'cloud',   desc: 'Software as a Service in ambiente multi-tenant condiviso' },
  ];
  const iconaSistemistica = (icon) => {
    if (icon === 'locale') return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/><line x1="12" y1="12" x2="12" y2="17"/><line x1="9.5" y1="14.5" x2="14.5" y2="14.5"/></svg>;
    if (icon === 'server') return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>;
    return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>;
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 10 }}>Tipo Installazione</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {opzioni.map(({ val, icon, desc }) => {
            const sel = data.installazione === val;
            return (
              <div key={val} onClick={() => upd('installazione', val)}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 10, border: `1.5px solid ${sel ? '#001d47' : '#e2e8f0'}`, background: sel ? '#f0f4ff' : '#fff', cursor: 'pointer', transition: 'all 0.15s' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2.5px solid ${sel ? '#001d47' : '#cbd5e1'}`, background: sel ? '#001d47' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {sel && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
                </div>
                <span style={{ color: sel ? '#001d47' : '#64748b', flexShrink: 0, display: 'flex' }}>{iconaSistemistica(icon)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: sel ? 700 : 500, color: sel ? '#001d47' : '#374151' }}>{val}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <FieldText label="N° Utenti Totali" value={data.numUtenti} onChange={v => upd('numUtenti', v)} placeholder="es. 5" mono />
        <FieldText label="Gg Passaggio Dati (stima)" value={data.ggPassaggioDati} onChange={v => upd('ggPassaggioDati', v)} placeholder="es. 2" mono />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Note finali</label>
        <NoteAreaInput area="__sistemistica__" noteArea={{ '__sistemistica__': data.note || '' }}
          setNoteArea={obj => upd('note', obj['__sistemistica__'])} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STEP 5 — SINTESI
// ─────────────────────────────────────────────
function StepSintesi({ intestazione, cliente, selezione, giornate, noteArea, sistemistica, moduli, areaColors: areaColorsProps }) {
  const areaColors = areaColorsProps || AREA_COLORS;
  const moduliSel = moduli.filter(m => selezione.has(m.codice));
  const totGiornate = moduliSel.reduce((sum, m) => sum + parseFloat(giornate[m.codice] !== undefined ? giornate[m.codice] : m.gg), 0);
  const areeUsate = [...new Set(moduliSel.map(m => m.area))];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13 }}>
      <div style={{ background: '#001d47', borderRadius: 10, padding: '14px 18px', color: '#fff' }}>
        <div style={{ fontSize: 17, fontWeight: 800 }}>{cliente.azienda || '—'}</div>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 3 }}>
          {fmtDate(intestazione.data)} · Demo {intestazione.demoN || '—'} · {intestazione.modalita || '—'} · Pratica {intestazione.pratica || '—'}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Team</div>
          <div>Agente: <strong>{intestazione.agente || '—'}</strong></div>
          <div>Tecnico: <strong>{intestazione.tecnico || '—'}</strong></div>
        </div>
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Cliente</div>
          <div>Settore: <strong>{cliente.settore || '—'}</strong></div>
          <div>Presenti: <strong>{(cliente.persone || []).length || '—'}</strong></div>
        </div>
        <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Moduli selezionati</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#001d47' }}>{moduliSel.length}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>in {areeUsate.length} aree</div>
        </div>
        <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Giornate totali</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#001d47', fontFamily: 'IBM Plex Mono, monospace' }}>{totGiornate.toFixed(1)}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>da listino</div>
        </div>
      </div>
      <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {areeUsate.map(area => {
          const col = areaColors[area] || areaColors['BASE'];
          return (
            <div key={area}>
              <div style={{ fontSize: 10, fontWeight: 700, color: col.text, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 0 3px', borderBottom: `2px solid ${col.border}`, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                <span>{area}</span>
                {noteArea[area] && <span style={{ color: '#d97706', fontWeight: 400, textTransform: 'none' }}>{noteArea[area]}</span>}
              </div>
              {moduli.filter(m => m.area === area && selezione.has(m.codice)).map(m => (
                <div key={m.codice} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 4px', color: '#374151' }}>
                  <span><span style={{ fontFamily: 'IBM Plex Mono, monospace', color: col.text, marginRight: 6, fontSize: 10 }}>{m.codice}</span>{m.nome}</span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#2563eb', flexShrink: 0, marginLeft: 8 }}>{parseFloat(giornate[m.codice] !== undefined ? giornate[m.codice] : m.gg).toFixed(1)} gg</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
        {[['INSTALLAZIONE', sistemistica.installazione], ['N° UTENTI', sistemistica.numUtenti], ['GG PASSAGGIO DATI', sistemistica.ggPassaggioDati]].map(([lbl, val]) => (
          <div key={lbl} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>{lbl}</div>
            <strong>{val || '—'}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// EXPORT EXCEL
// ─────────────────────────────────────────────
function exportExcel({ intestazione, cliente, selezione, giornate, noteArea, sistemistica, moduli }) {
  const wb = XLSX.utils.book_new();
  const rows = [];
  rows.push(['Teseo7 - Scheda Demo', '', '', '', '', '']);
  rows.push(['MD-CO-SW-05 - Rev. 1.0', '', '', '', '', '']);
  rows.push([]);
  rows.push(['Data', 'Agente', 'Tecnico', '', 'Demo N°', 'Pratica N.']);
  rows.push([fmtDate(intestazione.data), intestazione.agente || '', intestazione.tecnico || '', '', intestazione.demoN || '', intestazione.pratica || '']);
  rows.push([]);
  rows.push(['Azienda', cliente.azienda || '', '', '', 'Modalità Demo', intestazione.modalita || '']);
  rows.push(['Attività/Settore', cliente.settore || '', '', 'Persone Presenti', '', '']);
  (cliente.persone || []).forEach(p => rows.push(['', '', '', `${p.nome} — ${p.ruolo}`, '', '']));
  rows.push([]);
  rows.push(['', 'MODULI', '', 'Pre-Requisiti', 'Giornate', 'Note']);
  const areePresenti = areeOrdinate.filter(a => moduli.some(m => m.area === a));
  const [areaAttivaState, setAreaAttiva] = useState(null);
  const [search, setSearch] = useState('');
  // Se l'area attiva non esiste nel prodotto corrente, torna alla prima disponibile
  const areaAttiva = (areaAttivaState && areePresenti.includes(areaAttivaState))
    ? areaAttivaState
    : (areePresenti[0] || null);
  areePresenti.forEach(area => {
    const moduliArea = moduli.filter(m => m.area === area);
    const ggArea = moduliArea.filter(m => selezione.has(m.codice)).reduce((s, m) => s + parseFloat(giornate[m.codice] !== undefined ? giornate[m.codice] : m.gg), 0);
    rows.push(['', area, '', '', ggArea.toFixed(1), noteArea[area] || '']);
    moduliArea.forEach(m => {
      rows.push([selezione.has(m.codice) ? 'X' : '', m.codice, m.nome, m.prereq.join(', '), selezione.has(m.codice) ? parseFloat(giornate[m.codice] !== undefined ? giornate[m.codice] : m.gg).toFixed(1) : '', '']);
    });
  });
  rows.push([]); rows.push(['INFORMAZIONI SISTEMISTICHE']);
  rows.push(['INSTALLAZIONE', sistemistica.installazione || '']);
  rows.push([]); rows.push(['SINTESI FINALE']);
  rows.push(['NUM UTENTI TOTALI', sistemistica.numUtenti || '']);
  const tot = moduli.filter(m => selezione.has(m.codice)).reduce((s, m) => s + parseFloat(giornate[m.codice] !== undefined ? giornate[m.codice] : m.gg), 0);
  rows.push(['GIORNATE PREVISTE CALCOLATE', tot.toFixed(1)]);
  rows.push(['GIORNATE STIMATE PASSAGGIO DATI', sistemistica.ggPassaggioDati || '']);
  rows.push(['NOTE', sistemistica.note || '']);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 6 }, { wch: 16 }, { wch: 50 }, { wch: 30 }, { wch: 10 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Scheda Demo');
  XLSX.writeFile(wb, `SchedaDemo_${(cliente.azienda || 'export').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─────────────────────────────────────────────
// EXPORT PDF
// ─────────────────────────────────────────────
function exportPDF({ intestazione, cliente, selezione, giornate, noteArea, sistemistica, moduli }) {
  const moduliSel = moduli.filter(m => selezione.has(m.codice));
  const totGiornate = moduliSel.reduce((s, m) => s + parseFloat(giornate[m.codice] !== undefined ? giornate[m.codice] : m.gg), 0);
  const areeUsate = [...new Set(moduliSel.map(m => m.area))];
  const html = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Scheda Demo — ${cliente.azienda || 'ZCS'}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'IBM Plex Sans',sans-serif;font-size:10pt;color:#0f172a;padding:18mm 16mm}
.hdr{background:#001d47;color:#fff;padding:14px 18px;border-radius:6px;margin-bottom:16px}
.hdr h1{font-size:14pt;font-weight:700}.hdr .sub{font-size:9pt;opacity:.7;margin-top:4px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
.box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px}
.lbl{font-size:8pt;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px}
.ah{padding:5px 10px;font-size:9pt;font-weight:700;letter-spacing:.04em;margin-top:10px;margin-bottom:3px;border-radius:4px;display:flex;justify-content:space-between}
.mr{display:flex;align-items:baseline;gap:8px;padding:3px 6px;border-bottom:1px solid #f1f5f9;font-size:9pt}
.mc{font-family:'IBM Plex Mono',monospace;font-size:8pt;font-weight:600;min-width:90px;flex-shrink:0}
.mg{font-family:'IBM Plex Mono',monospace;font-size:8pt;font-weight:700;color:#2563eb;margin-left:auto;flex-shrink:0}
.tot{background:#001d47;color:#fff;padding:10px 14px;border-radius:6px;margin-top:14px;display:flex;justify-content:space-between;align-items:center}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px}
@media print{body{padding:10mm 12mm}}</style></head><body>
<div class="hdr"><h1>Teseo7 — Scheda Demo</h1><div class="sub">${fmtDate(intestazione.data)} · Demo ${intestazione.demoN||'—'} · ${intestazione.modalita||'—'} · Pratica ${intestazione.pratica||'—'}</div></div>
<div class="g2">
<div class="box"><div class="lbl">Team</div><div>Agente: <strong>${intestazione.agente||'—'}</strong></div><div>Tecnico: <strong>${intestazione.tecnico||'—'}</strong></div></div>
<div class="box"><div class="lbl">Cliente</div><div><strong>${cliente.azienda||'—'}</strong></div><div>Settore: ${cliente.settore||'—'}</div>${(cliente.persone||[]).length?`<div style="margin-top:4px;font-size:9pt;color:#64748b">Presenti: ${(cliente.persone||[]).map(p=>`${p.nome} (${p.ruolo})`).join(', ')}</div>`:''}</div>
</div>
<div class="lbl" style="margin-bottom:4px">Moduli selezionati</div>
${areeUsate.map(area=>{const col=areaColors[area]||areaColors['BASE'];const mm=moduli.filter(m=>m.area===area&&selezione.has(m.codice));const gg=mm.reduce((s,m)=>s+parseFloat(giornate[m.codice]!==undefined?giornate[m.codice]:m.gg),0);return`<div class="ah" style="background:${col.bg};color:${col.text};border:1px solid ${col.border}"><span>${area}</span><span>${gg.toFixed(1)} gg${noteArea[area]?' — '+noteArea[area]:''}</span></div>${mm.map(m=>`<div class="mr"><span class="mc" style="color:${col.text}">${m.codice}</span><span>${m.nome}</span><span class="mg">${parseFloat(giornate[m.codice]!==undefined?giornate[m.codice]:m.gg).toFixed(1)} gg</span></div>`).join('')}`;}).join('')}
<div class="tot"><span>Totale giornate calcolate</span><strong style="font-size:14pt">${totGiornate.toFixed(1)} gg</strong></div>
<div class="g3">
<div class="box"><div class="lbl">Installazione</div><strong>${sistemistica.installazione||'—'}</strong></div>
<div class="box"><div class="lbl">N° Utenti</div><strong>${sistemistica.numUtenti||'—'}</strong></div>
<div class="box"><div class="lbl">Gg Passaggio Dati</div><strong>${sistemistica.ggPassaggioDati||'—'}</strong></div>
</div>
${sistemistica.note?`<div class="box" style="margin-top:10px"><div class="lbl">Note</div>${sistemistica.note}</div>`:''}
<div style="margin-top:20px;font-size:8pt;color:#94a3b8;text-align:right;border-top:1px solid #e2e8f0;padding-top:8px">ZCS Group — Portale Delivery · Generato il ${todayStr()}</div>
</body></html>`;
  const win = window.open('', '_blank');
  win.document.write(html); win.document.close();
  win.onload = () => { win.focus(); win.print(); };
}

// ─────────────────────────────────────────────
// MODALE PRINCIPALE
// ─────────────────────────────────────────────
export function SchedaDemoModal({ onClose, moduli: moduliEsterni, staff }) {
  const [step, setStep] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [intestazione, setIntestazione] = useState({ data: new Date().toISOString().slice(0, 10), demoN: '1°', modalita: 'Videocall', prodotto: 'Teseo7' });
  const [cliente, setCliente] = useState({ persone: [] });
  const [selezione, setSelezione] = useState(new Set());
  const [giornate, setGiornate] = useState({});
  const [noteArea, setNoteArea] = useState({});
  const [sistemistica, setSistemistica] = useState({});

  const moduli = moduliEsterni || (intestazione.prodotto === 'Cassiopea' ? MODULI_CASSIOPEA_DEFAULT : MODULI_TESEO7_DEFAULT);
  const areeOrdinate = intestazione.prodotto === 'Cassiopea' ? AREE_CASSIOPEA : AREE_ORDINATE;
  const areaColors = intestazione.prodotto === 'Cassiopea' ? AREA_COLORS_CASSIOPEA : areaColors;

  const handleOverlayClick = () => setShowExitConfirm(true);

  const handleChangeProdotto = (p) => {
    setIntestazione(prev => ({ ...prev, prodotto: p }));
    setSelezione(new Set());
    setGiornate({});
    setNoteArea({});
  };

    const canNext = () => {
    if (step === 0) return intestazione.agente?.trim() && intestazione.tecnico?.trim();
    if (step === 1) return cliente.azienda?.trim();
    if (step === 2) return selezione.size > 0;
    return true;
  };

  const exportData = { intestazione, cliente, selezione, giornate, noteArea, sistemistica, moduli };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      {showExitConfirm && (
        <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,18,41,0.65)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 400, maxWidth: '90vw', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ background: '#001d47', padding: '18px 24px' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Uscire dalla Scheda Demo — {intestazione.prodotto || 'Teseo7'}?</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>Il documento non è stato esportato e andrà perso.</div>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowExitConfirm(false)}
                style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Continua a compilare
              </button>
              <button onClick={onClose}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Esci e perdi i dati
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="modal-content" onClick={e => e.stopPropagation()}
        style={{ position: 'relative', width: '800px', maxWidth: '96vw', minHeight: '580px', display: 'flex', flexDirection: 'column', maxHeight: '92vh' }}>
        <button className="btn-close-circle" onClick={() => setShowExitConfirm(true)}>×</button>
        <div className="modal-header" style={{ paddingRight: 44 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="3" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>
            <polyline points="6 9 9 12 13 8 16 11"/>
          </svg>
          Nuova Scheda Demo — {intestazione.prodotto || 'Teseo7'}
        </h3>
        </div>
        <StepIndicator current={step} />
        <div style={{ flex: 1, overflowY: step === 0 ? 'visible' : 'auto', paddingRight: 2, overflow: step === 0 ? 'visible' : undefined }}>
          {step === 0 && <StepIntestazione data={intestazione} onChange={setIntestazione} staff={staff} onChangeProdotto={handleChangeProdotto} />}
          {step === 1 && <StepCliente data={cliente} onChange={setCliente} />}
          {step === 2 && <StepModuli selezione={selezione} setSelezione={setSelezione} giornate={giornate} setGiornate={setGiornate} noteArea={noteArea} setNoteArea={setNoteArea} moduli={moduli} areeOrdinate={areeOrdinate} areaColors={areaColors} />}
          {step === 3 && <StepSistemistica data={sistemistica} onChange={setSistemistica} />}
          {step === 4 && <StepSintesi intestazione={intestazione} cliente={cliente} selezione={selezione} giornate={giornate} noteArea={noteArea} sistemistica={sistemistica} moduli={moduli} areaColors={areaColors} />}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 14, borderTop: '1px solid #e2e8f0' }}>
          <button onClick={() => step === 0 ? setShowExitConfirm(true) : setStep(s => s - 1)}
            style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            {step === 0 ? 'Annulla' : '← Indietro'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {step === 4 && (
              <>
                <button onClick={() => exportExcel(exportData)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="8 13 8 17"/><polyline points="16 13 16 17"/><line x1="12" y1="11" x2="12" y2="19"/><line x1="8" y1="15" x2="16" y2="15"/></svg> Excel</button>
                <button onClick={() => exportPDF(exportData)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff5f5', color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> PDF</button>
              </>
            )}
            {step < 4 && (
              <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
                style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: canNext() ? '#001d47' : '#e2e8f0', color: canNext() ? '#fff' : '#94a3b8', fontSize: 13, fontWeight: 600, cursor: canNext() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                Avanti →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// NUOVO DOCUMENTO MODAL — scelta tipo documento
// ─────────────────────────────────────────────
export function NuovoDocumentoModal({ onClose, onSchedaDemo, onRaccoltaRequisiti }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ position: 'relative', width: '520px', maxWidth: '96vw', background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>

        {/* Header navy — identico a "Nuova Attività" */}
        <div style={{ background: '#001d47', padding: '20px 24px', position: 'relative' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
            NUOVO DOCUMENTO
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>Cosa vuoi creare?</div>
          <button onClick={onClose}
            style={{ position: 'absolute', top: 14, right: 16, width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 18, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ×
          </button>
        </div>

        {/* Card opzioni */}
        <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Scheda Demo */}
          <div onClick={onSchedaDemo}
            style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseOver={e => { e.currentTarget.style.background = '#f0f7ff'; e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.08)'; }}
            onMouseOut={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="3" width="20" height="13" rx="2"/>
                <path d="M8 21h8M12 17v4"/>
                <polyline points="6 9 9 12 13 8 16 11"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>Scheda Demo</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>Crea una scheda demo guidata per Teseo7, Cassiopea e altri prodotti</div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
          </div>

                    {/* Raccolta Requisiti */}
          <div onClick={onRaccoltaRequisiti}
            style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseOver={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#bbf7d0'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(22,163,74,0.08)'; }}
            onMouseOut={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                <rect x="9" y="3" width="6" height="4" rx="1"/>
                <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
                <polyline points="9 9 10 10 12 8"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>Raccolta Requisiti</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>Documento strutturato per raccogliere i requisiti del cliente</div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
          </div>

        </div>
      </div>
    </div>
  );
}