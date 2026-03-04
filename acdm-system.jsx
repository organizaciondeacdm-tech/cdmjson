import { useState, useEffect, useCallback, useRef } from "react";
import apiService from "./acdm-api.js";

// ============================================================
// CRYPTO UTILS - Simple XOR + Base64 encryption for JSON DB
// ============================================================
const SECRET_KEY = "PAPIWEB_ACDM_2025_KEY";
function xorEncrypt(text, key) {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}
function xorDecrypt(encoded, key) {
  try {
    const text = atob(encoded);
    let result = "";
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch { return null; }
}
function saveDB(data) {
  const json = JSON.stringify(data);
  localStorage.setItem("acdm_db", xorEncrypt(json, SECRET_KEY));
}
function loadDB() {
  const enc = localStorage.getItem("acdm_db");
  if (!enc) return null;
  const dec = xorDecrypt(enc, SECRET_KEY);
  if (!dec) return null;
  try { return JSON.parse(dec); } catch { return null; }
}

// ============================================================
// INITIAL DATA
// ============================================================
const INITIAL_DB = {
  escuelas: [
    {
      id: "e1", de: "DE 01", escuela: "Escuela N°1 Julio Argentino Roca",
      nivel: "Primario", direccion: "Av. Corrientes 1234, CABA",
      lat: -34.6037, lng: -58.3816,
      telefonos: ["011-4321-1234"], mail: "escuela1@bue.edu.ar",
      jornada: "Completa", turno: "Mañana",
      alumnos: [
        { id: "a1", gradoSalaAnio: "3° Grado", nombre: "Martínez, Lucía", diagnostico: "TEA Nivel 1", observaciones: "Requiere acompañante en recreos" },
        { id: "a2", gradoSalaAnio: "3° Grado", nombre: "García, Tomás", diagnostico: "TDAH", observaciones: "Medicación en horario escolar" },
      ],
      docentes: [
        {
          id: "d1", cargo: "Titular", nombreApellido: "López, María Elena",
          estado: "Licencia", motivo: "Art. 102 - Enfermedad",
          diasAutorizados: 30, fechaInicioLicencia: "2025-01-15", fechaFinLicencia: "2025-02-14",
          jornada: "Completa",
          suplentes: [
            { id: "s1", cargo: "Suplente", nombreApellido: "Fernández, Ana Clara", estado: "Activo", motivo: "-", fechaIngreso: "2025-01-15", jornada: "Completa" }
          ]
        },
        {
          id: "d2", cargo: "Titular", nombreApellido: "Rodríguez, Carlos",
          estado: "Activo", motivo: "-", diasAutorizados: 0,
          fechaInicioLicencia: null, fechaFinLicencia: null, jornada: "Simple", suplentes: []
        }
      ],
      visitas: [
        { id: "v1", fecha: "2025-02-15", observaciones: "Primera visita de seguimiento. Escuela con muy buen desempeño." }
      ],
      proyectos: [
        { id: "p1", nombre: "Adaptación de material didáctico", estado: "Completado", descripcion: "Material visual para estudiante con TEA", fechaInicio: "2025-01-20", fechaBaja: "2025-02-28" }
      ],
      informes: [
        { id: "i1", titulo: "Informe mensual enero", estado: "Entregado", fechaEntrega: "2025-01-31", observaciones: "Informe detallado sobre el desempeño de los alumnos" }
      ]
    },
    {
      id: "e2", de: "DE 02", escuela: "Jardín de Infantes N°5 María Montessori",
      nivel: "Inicial", direccion: "Av. Santa Fe 567, CABA",
      lat: -34.5958, lng: -58.3975,
      telefonos: ["011-4765-5678", "011-4765-5679"], mail: "jardin5@bue.edu.ar",
      jornada: "Simple", turno: "Tarde",
      alumnos: [
        { id: "a3", gradoSalaAnio: "Sala Roja", nombre: "Pérez, Santiago", diagnostico: "Síndrome de Down", observaciones: "Integración escolar plena" }
      ],
      docentes: [
        {
          id: "d3", cargo: "Titular", nombreApellido: "Gómez, Patricia",
          estado: "Activo", motivo: "-", diasAutorizados: 0,
          fechaInicioLicencia: null, fechaFinLicencia: null, jornada: "Simple", suplentes: []
        }
      ],
      visitas: [],
      proyectos: [],
      informes: []
    },
    {
      id: "e3", de: "DE 03", escuela: "Escuela Secundaria N°12 Domingo F. Sarmiento",
      nivel: "Secundario", direccion: "Calle Rivadavia 890, CABA",
      lat: -34.6158, lng: -58.4053,
      telefonos: ["011-4987-9012"], mail: "secundaria12@bue.edu.ar",
      jornada: "Completa", turno: "Mañana",
      alumnos: [],
      docentes: [],
      visitas: [],
      proyectos: [],
      informes: []
    }
  ],
  usuarios: [
    { id: "u1", username: "admin", passwordHash: btoa("admin2025"), rol: "admin" },
    { id: "u2", username: "viewer", passwordHash: btoa("viewer123"), rol: "viewer" }
  ],
  alertasLeidas: []
};

// ============================================================
// DATE UTILS
// ============================================================
function diasRestantes(fechaFin) {
  if (!fechaFin) return null;
  const hoy = new Date();
  const fin = new Date(fechaFin);
  const diff = Math.ceil((fin - hoy) / (1000 * 60 * 60 * 24));
  return diff;
}
function formatDate(dateStr) {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

// ============================================================
// STYLES
// ============================================================
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;600;700;900&family=Rajdhani:wght@400;600;700&display=swap');

  :root {
    --bg: #0a0e1a;
    --bg2: #0f1626;
    --bg3: #141d30;
    --card: #111827;
    --card2: #1a2540;
    --border: #1e3a5f;
    --border2: #2a4a7f;
    --accent: #00d4ff;
    --accent2: #0099cc;
    --accent3: #00ff88;
    --gold: #ffd700;
    --red: #ff4757;
    --orange: #ff6b35;
    --yellow: #ffa502;
    --text: #e8f4f8;
    --text2: #8bacc8;
    --text3: #4a6fa5;
    --metal1: #c0d0e8;
    --metal2: #8098b8;
    --metal3: #405070;
    --shadow: 0 8px 32px rgba(0,0,0,0.5);
    --glow: 0 0 20px rgba(0,212,255,0.3);
    --glow2: 0 0 40px rgba(0,212,255,0.2);
    --radius: 12px;
    --radius2: 8px;
  }

  .app.light-mode {
    --bg: #f5f7fa;
    --bg2: #e8ecf1;
    --bg3: #dce4ed;
    --card: #ffffff;
    --card2: #f0f5fb;
    --border: #d1dae8;
    --border2: #b8c8e1;
    --accent: #0077be;
    --accent2: #004a96;
    --accent3: #008c45;
    --text: #1a1f3a;
    --text2: #475569;
    --text3: #64748b;
    --metal1: #1a1f3a;
    --metal2: #475569;
    --metal3: #94a3b8;
    --shadow: 0 4px 15px rgba(0,0,0,0.1);
    --glow: 0 0 15px rgba(0,119,190,0.2);
    --glow2: 0 0 30px rgba(0,119,190,0.15);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Exo 2', sans-serif;
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* SCROLLBAR */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: var(--bg2); }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }

  /* PAPIWEB BRAND */
  .papiweb-brand {
    display: flex; align-items: center; gap: 10px;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700; letter-spacing: 2px;
    font-size: 11px; text-transform: uppercase;
  }
  .papiweb-logo {
    position: relative;
    background: linear-gradient(135deg, #1a2540, #0a0e1a);
    border: 1px solid var(--border2);
    border-radius: 6px;
    padding: 4px 10px;
    overflow: hidden;
  }
  .papiweb-logo::before {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(0,212,255,0.15) 50%, transparent 100%);
    animation: metalShine 3s ease-in-out infinite;
  }
  .papiweb-logo::after {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
    animation: ledScan 2s linear infinite;
  }
  .papiweb-text {
    background: linear-gradient(135deg, #c0d0e8 0%, #ffffff 30%, #8098b8 50%, #ffffff 70%, #4a6fa5 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
    filter: drop-shadow(0 0 6px rgba(0,212,255,0.5));
    animation: metalPulse 4s ease-in-out infinite;
  }
  .papiweb-sub {
    color: var(--text3); font-size: 9px; letter-spacing: 1px;
    font-family: 'Exo 2', sans-serif; font-weight: 300;
    text-transform: uppercase;
  }
  .led-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--accent3);
    box-shadow: 0 0 8px var(--accent3), 0 0 16px var(--accent3);
    animation: ledBlink 1.5s ease-in-out infinite;
  }

  @keyframes metalShine {
    0%, 100% { transform: translateX(-100%); }
    50% { transform: translateX(100%); }
  }
  @keyframes ledScan {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  @keyframes metalPulse {
    0%, 100% { filter: drop-shadow(0 0 6px rgba(0,212,255,0.5)); }
    50% { filter: drop-shadow(0 0 12px rgba(0,212,255,0.8)); }
  }
  @keyframes ledBlink {
    0%, 100% { opacity: 1; box-shadow: 0 0 8px var(--accent3), 0 0 16px var(--accent3); }
    50% { opacity: 0.4; box-shadow: 0 0 4px var(--accent3); }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.05); opacity: 0.8; }
  }
  @keyframes slideIn {
    from { transform: translateY(-10px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes scanLine {
    0% { top: 0; }
    100% { top: 100%; }
  }
  @keyframes glitch {
    0%, 100% { transform: translate(0); }
    25% { transform: translate(-2px, 1px); }
    75% { transform: translate(2px, -1px); }
  }

  /* LAYOUT */
  .app { display: flex; flex-direction: column; min-height: 100vh; }
  .header {
    background: linear-gradient(180deg, var(--bg2) 0%, var(--bg3) 100%);
    border-bottom: 1px solid var(--border);
    padding: 12px 16px;
    display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
    position: sticky; top: 0; z-index: 100;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  }
  .header-title {
    font-family: 'Rajdhani', sans-serif;
    font-size: 22px; font-weight: 700;
    letter-spacing: 2px; text-transform: uppercase;
    background: linear-gradient(90deg, var(--accent), #fff, var(--accent2));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
    filter: drop-shadow(0 0 10px rgba(0,212,255,0.4));
  }
  .header-sub { font-size: 10px; color: var(--text3); letter-spacing: 1.5px; }

  .main { display: flex; flex: 1; }
  .sidebar {
    width: 240px; min-height: calc(100vh - 61px);
    background: linear-gradient(180deg, var(--bg2), var(--bg3));
    border-right: 1px solid var(--border);
    padding: 16px 0;
    position: sticky; top: 61px; height: calc(100vh - 61px);
    overflow-y: auto;
    transition: width 0.3s ease;
  }
  .sidebar.collapsed { width: 60px; }
  .content { flex: 1; padding: 24px; overflow-y: auto; animation: fadeIn 0.3s ease; }

  /* NAV */
  .nav-item {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 20px;
    cursor: pointer; transition: all 0.2s ease;
    border-left: 3px solid transparent;
    font-size: 13px; font-weight: 600; letter-spacing: 0.5px;
    color: var(--text2);
    text-transform: uppercase;
  }
  .nav-item:hover { background: rgba(0,212,255,0.05); color: var(--accent); border-left-color: var(--accent2); }
  .nav-item.active { background: rgba(0,212,255,0.1); color: var(--accent); border-left-color: var(--accent); }
  .nav-icon { font-size: 18px; min-width: 20px; text-align: center; }
  .nav-badge {
    margin-left: auto; background: var(--red); color: white;
    border-radius: 10px; padding: 1px 7px; font-size: 10px;
    animation: pulse 1.5s ease-in-out infinite;
  }
  .nav-section {
    padding: 8px 20px 4px;
    font-size: 9px; letter-spacing: 2px; color: var(--text3);
    text-transform: uppercase; font-weight: 700;
  }

  /* CARDS */
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    box-shadow: var(--shadow);
    transition: all 0.2s ease;
    animation: slideIn 0.3s ease;
  }
  .card:hover { border-color: var(--border2); box-shadow: var(--shadow), var(--glow); }
  .card-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 16px; padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap; gap: 8px;
  }
  .card-title { font-family: 'Rajdhani', sans-serif; font-size: 16px; font-weight: 700; letter-spacing: 1px; color: var(--accent); }
  .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }

  /* STATS */
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .stat-card {
    background: var(--card2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 20px;
    position: relative; overflow: hidden;
    transition: all 0.2s ease;
  }
  .stat-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: var(--gradient, linear-gradient(90deg, var(--accent), var(--accent2)));
  }
  .stat-card:hover { border-color: var(--border2); transform: translateY(-2px); }
  .stat-value { font-family: 'Rajdhani', sans-serif; font-size: 36px; font-weight: 700; color: var(--accent); line-height: 1; }
  .stat-label { font-size: 11px; color: var(--text2); text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
  .stat-icon { position: absolute; right: 16px; top: 16px; font-size: 28px; opacity: 0.2; }

  /* BADGES */
  .badge {
    display: inline-block; padding: 2px 10px; border-radius: 20px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .badge-active { background: rgba(0,255,136,0.15); color: var(--accent3); border: 1px solid rgba(0,255,136,0.3); }
  .badge-licencia { background: rgba(255,71,87,0.15); color: var(--red); border: 1px solid rgba(255,71,87,0.3); }
  .badge-titular { background: rgba(0,212,255,0.1); color: var(--accent); border: 1px solid rgba(0,212,255,0.2); }
  .badge-suplente { background: rgba(255,165,2,0.1); color: var(--yellow); border: 1px solid rgba(255,165,2,0.2); }
  .badge-interino { background: rgba(255,107,53,0.1); color: var(--orange); border: 1px solid rgba(255,107,53,0.2); }
  .badge-warning { background: rgba(255,165,2,0.15); color: var(--yellow); border: 1px solid rgba(255,165,2,0.3); }
  .badge-danger { background: rgba(255,71,87,0.15); color: var(--red); border: 1px solid rgba(255,71,87,0.3); animation: pulse 1.5s infinite; }

  /* BUTTONS */
  .btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 8px 16px; border-radius: var(--radius2);
    font-family: 'Exo 2', sans-serif; font-size: 13px; font-weight: 600;
    cursor: pointer; border: none; transition: all 0.2s ease;
    letter-spacing: 0.5px; text-transform: uppercase;
  }
  .btn-primary {
    background: linear-gradient(135deg, var(--accent2), var(--accent));
    color: #0a0e1a;
    box-shadow: 0 4px 15px rgba(0,212,255,0.3);
  }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,212,255,0.4); }
  .btn-secondary { background: var(--card2); color: var(--text); border: 1px solid var(--border2); }
  .btn-secondary:hover { border-color: var(--accent); color: var(--accent); }
  .btn-danger { background: rgba(255,71,87,0.2); color: var(--red); border: 1px solid rgba(255,71,87,0.3); }
  .btn-danger:hover { background: rgba(255,71,87,0.3); }
  .btn-sm { padding: 4px 10px; font-size: 11px; }
  .btn-icon { padding: 6px; border-radius: 6px; background: var(--card2); border: 1px solid var(--border); cursor: pointer; color: var(--text2); font-size: 16px; transition: all 0.2s; }
  .btn-icon:hover { border-color: var(--accent); color: var(--accent); }

  /* FORMS */
  .form-group { margin-bottom: 16px; }
  .form-label { display: block; font-size: 11px; font-weight: 600; letter-spacing: 1px; color: var(--text2); text-transform: uppercase; margin-bottom: 6px; }
  .form-input, .form-select, .form-textarea {
    width: 100%; background: var(--bg2); border: 1px solid var(--border);
    border-radius: var(--radius2); padding: 9px 14px;
    color: var(--text); font-family: 'Exo 2', sans-serif; font-size: 13px;
    transition: all 0.2s ease; outline: none;
  }
  .form-input:focus, .form-select:focus, .form-textarea:focus {
    border-color: var(--accent); box-shadow: 0 0 0 3px rgba(0,212,255,0.1);
  }
  .form-textarea { resize: vertical; min-height: 80px; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

  /* TABLE */
  .table-wrap { overflow-x: auto; border-radius: var(--radius); }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: var(--bg2); padding: 10px 14px; text-align: left; font-size: 10px; letter-spacing: 1.5px; color: var(--text3); text-transform: uppercase; font-weight: 700; border-bottom: 1px solid var(--border); }
  td { padding: 10px 14px; border-bottom: 1px solid rgba(30,58,95,0.5); transition: background 0.15s; }
  tr:hover td { background: rgba(0,212,255,0.03); }
  tr:last-child td { border-bottom: none; }

  /* MODAL */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.8);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; animation: fadeIn 0.2s ease;
    backdrop-filter: blur(4px);
  }
  .modal {
    background: var(--card); border: 1px solid var(--border2);
    border-radius: var(--radius); padding: 24px;
    max-width: 700px; width: 95%; max-height: 90vh; overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.8), var(--glow2);
    animation: slideIn 0.3s ease;
  }
  .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
  .modal-title { font-family: 'Rajdhani', sans-serif; font-size: 20px; font-weight: 700; color: var(--accent); letter-spacing: 1px; }

  /* ALERTS */
  .alert {
    padding: 12px 16px; border-radius: var(--radius2); margin-bottom: 10px;
    display: flex; align-items: flex-start; gap: 12px; font-size: 13px;
    animation: slideIn 0.3s ease;
  }
  .alert-danger { background: rgba(255,71,87,0.1); border: 1px solid rgba(255,71,87,0.3); color: var(--red); }
  .alert-warning { background: rgba(255,165,2,0.1); border: 1px solid rgba(255,165,2,0.3); color: var(--yellow); }
  .alert-info { background: rgba(0,212,255,0.1); border: 1px solid rgba(0,212,255,0.2); color: var(--accent); }
  .alert-success { background: rgba(0,255,136,0.1); border: 1px solid rgba(0,255,136,0.2); color: var(--accent3); }
  .alert-icon { font-size: 18px; min-width: 20px; }

  /* CALENDAR */
  .calendar {
    background: var(--card2); border: 1px solid var(--border);
    border-radius: var(--radius); overflow: hidden;
    max-width: 300px;
  }
  .cal-header {
    background: var(--bg2); padding: 10px 14px;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 13px; font-weight: 700; color: var(--accent);
  }
  .cal-grid { display: grid; grid-template-columns: repeat(7,1fr); }
  .cal-day-header { padding: 6px 4px; text-align: center; font-size: 10px; color: var(--text3); font-weight: 700; letter-spacing: 0.5px; }
  .cal-day {
    padding: 5px 4px; text-align: center; font-size: 11px; cursor: pointer;
    transition: all 0.15s; border-radius: 4px; margin: 1px;
    color: var(--text2);
  }
  .cal-day:hover { background: rgba(0,212,255,0.1); color: var(--accent); }
  .cal-day.today { background: rgba(0,212,255,0.15); color: var(--accent); font-weight: 700; }
  .cal-day.in-range { background: rgba(255,71,87,0.1); color: var(--red); }
  .cal-day.range-start, .cal-day.range-end { background: var(--red); color: white; font-weight: 700; border-radius: 50%; }
  .cal-day.other-month { opacity: 0.3; }
  .cal-day.empty { cursor: default; }

  /* CHARTS */
  .chart-bar-wrap { display: flex; flex-direction: column; gap: 8px; }
  .chart-bar-row { display: flex; align-items: center; gap: 10px; font-size: 12px; }
  .chart-bar-label { min-width: 140px; color: var(--text2); font-size: 11px; }
  .chart-bar-bg { flex: 1; height: 20px; background: var(--bg2); border-radius: 10px; overflow: hidden; position: relative; }
  .chart-bar-fill { height: 100%; border-radius: 10px; transition: width 1s ease; display: flex; align-items: center; padding-left: 8px; font-size: 10px; font-weight: 700; color: rgba(0,0,0,0.7); }
  .chart-val { min-width: 30px; text-align: right; font-weight: 700; color: var(--text); }

  /* VIEW TOGGLES */
  .view-toggle { display: flex; gap: 4px; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 4px; }
  .view-btn { padding: 5px 14px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; transition: all 0.2s; color: var(--text2); background: none; border: none; text-transform: uppercase; }
  .view-btn.active { background: var(--card2); color: var(--accent); border: 1px solid var(--border2); }

  /* SCHOOL CARD */
  .school-card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: var(--radius); overflow: hidden; transition: all 0.2s ease;
    animation: slideIn 0.3s ease;
  }
  .school-card:hover { border-color: var(--border2); box-shadow: var(--shadow), var(--glow); }
  .school-card-header {
    padding: 16px 20px; background: linear-gradient(135deg, var(--card2), var(--card));
    border-bottom: 1px solid var(--border);
    cursor: pointer;
  }
  .school-card-body { padding: 16px 20px; }
  .school-de { font-size: 10px; color: var(--accent); letter-spacing: 2px; font-weight: 700; text-transform: uppercase; }
  .school-name { font-family: 'Rajdhani', sans-serif; font-size: 18px; font-weight: 700; margin: 4px 0; }
  .school-meta { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 6px; }
  .school-meta-item { font-size: 11px; color: var(--text2); display: flex; align-items: center; gap: 4px; }
  .school-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px; }
  .school-info-label { font-size: 10px; color: var(--text3); letter-spacing: 1px; text-transform: uppercase; font-weight: 700; }
  .school-info-val { color: var(--text); margin-top: 2px; }

  /* DOCENTE */
  .docente-row {
    background: var(--card2); border: 1px solid var(--border);
    border-radius: var(--radius2); padding: 14px 16px; margin-bottom: 10px;
    transition: all 0.2s;
    position: relative;
  }
  .docente-row:hover { border-color: var(--border2); }
  .docente-row.suplente-row { margin-left: 24px; border-left: 3px solid var(--yellow); }
  .docente-header { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .docente-name { font-family: 'Rajdhani', sans-serif; font-size: 16px; font-weight: 700; color: var(--text); }
  .docente-details { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; margin-top: 10px; font-size: 12px; }
  .detail-item { }
  .detail-label { font-size: 10px; color: var(--text3); text-transform: uppercase; letter-spacing: 1px; }
  .detail-val { color: var(--text2); margin-top: 2px; }

  /* DAYS REMAINING */
  .days-remaining {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700;
  }
  .days-ok { background: rgba(0,255,136,0.1); color: var(--accent3); border: 1px solid rgba(0,255,136,0.2); }
  .days-warn { background: rgba(255,165,2,0.15); color: var(--yellow); border: 1px solid rgba(255,165,2,0.3); animation: pulse 2s infinite; }
  .days-danger { background: rgba(255,71,87,0.15); color: var(--red); border: 1px solid rgba(255,71,87,0.3); animation: pulse 1s infinite; }

  /* LOGIN */
  .login-container {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: radial-gradient(ellipse at 30% 50%, rgba(0,100,200,0.1) 0%, var(--bg) 70%);
    position: relative; overflow: hidden;
  }
  .login-container::before {
    content: ''; position: absolute; inset: 0;
    background: repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(0,212,255,0.02) 40px, rgba(0,212,255,0.02) 41px),
                repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(0,212,255,0.02) 40px, rgba(0,212,255,0.02) 41px);
  }
  .login-box {
    background: var(--card); border: 1px solid var(--border2);
    border-radius: var(--radius); padding: 40px;
    width: 400px; position: relative;
    box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(0,212,255,0.1);
    animation: slideIn 0.5s ease;
  }
  .login-box::before {
    content: ''; position: absolute; top: 0; left: 20%; right: 20%; height: 1px;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
    animation: ledScan 3s linear infinite;
  }
  .login-title { font-family: 'Rajdhani', sans-serif; font-size: 28px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--accent); text-align: center; margin-bottom: 4px; }
  .login-sub { font-size: 11px; color: var(--text3); text-align: center; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 28px; }
  .hint-text { font-size: 11px; color: var(--text3); text-align: center; margin-top: 16px; }
  .hint-key { background: var(--bg2); border: 1px solid var(--border); padding: 1px 6px; border-radius: 4px; font-family: monospace; font-size: 12px; color: var(--text2); }

  /* PDF EXPORT */
  .pdf-preview {
    background: white; color: #111; border-radius: 8px;
    padding: 24px; font-family: sans-serif; font-size: 12px;
    max-height: 400px; overflow-y: auto;
  }
  .pdf-header { border-bottom: 2px solid #0099cc; padding-bottom: 10px; margin-bottom: 14px; }
  .pdf-title { font-size: 18px; font-weight: 700; color: #0066aa; }
  .pdf-sub { font-size: 10px; color: #666; margin-top: 2px; }

  /* MISC */
  .flex { display: flex; }
  .flex-col { display: flex; flex-direction: column; }
  .gap-4 { gap: 4px; }
  .gap-8 { gap: 8px; }
  .gap-12 { gap: 12px; }
  .gap-16 { gap: 16px; }
  .items-center { align-items: center; }
  .justify-between { justify-content: space-between; }
  .justify-end { justify-content: flex-end; }
  .flex-wrap { flex-wrap: wrap; }
  .mb-8 { margin-bottom: 8px; }
  .mb-16 { margin-bottom: 16px; }
  .mb-24 { margin-bottom: 24px; }
  .mt-8 { margin-top: 8px; }
  .mt-16 { margin-top: 16px; }
  .text-sm { font-size: 12px; }
  .text-xs { font-size: 11px; }
  .text-accent { color: var(--accent); }
  .text-muted { color: var(--text2); }
  .text-danger { color: var(--red); }
  .text-success { color: var(--accent3); }
  .text-warn { color: var(--yellow); }
  .clickable { cursor: pointer; transition: color 0.15s; }
  .clickable:hover { color: var(--accent); }
  .link { color: var(--accent); text-decoration: underline; cursor: pointer; }
  .link:hover { color: var(--accent2); }
  .divider { border: none; border-top: 1px solid var(--border); margin: 16px 0; }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; }
  .no-data { text-align: center; padding: 40px; color: var(--text3); }
  .search-input-wrap { position: relative; }
  .search-input-wrap .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text3); font-size: 14px; pointer-events: none; }
  .search-input-wrap .form-input { padding-left: 32px; }

  @media (max-width: 1024px) {
    .header { flex-direction: column; align-items: flex-start; }
    .header .search-input-wrap { width: 100%; }
    .header > div:last-child { width: 100%; justify-content: space-between; }
    .content { padding: 16px; }
    .card-grid { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
  }

  @media (max-width: 768px) {
    .header { flex-direction: column; gap: 8px; padding: 8px 12px; }
    .header .search-input-wrap { width: 100%; }
    .sidebar { display: none; }
    .content { padding: 12px; }
    .form-row { grid-template-columns: 1fr; }
    .stats-grid { grid-template-columns: 1fr; }
    .card-grid { grid-template-columns: 1fr; }
    .school-info-grid { grid-template-columns: 1fr; }
    .modal { width: 90vw; max-height: 85vh; padding: 16px; }
    .view-toggle { width: 100%; }
    .docente-details { grid-template-columns: 1fr; }
    .papiweb-brand { display: none; }
    .school-meta { flex-direction: column; gap: 8px; }
    .header-title { font-size: 16px; letter-spacing: 1px; }
    .modal-title { font-size: 18px; }
  }
  
  @media (max-width: 480px) {
    .header { padding: 8px 12px; gap: 6px; }
    .header-title { font-size: 14px; }
    .header-sub { font-size: 8px; }
    .header > div:first-child { width: 100%; }
    .header > div:last-child { width: 100%; flex-wrap: wrap; gap: 4px; }
    h1 { font-size: 18px !important; }
    .content { padding: 8px; }
    .card { padding: 12px; }
    .school-card-body { padding: 12px; }
    .school-card-header { padding: 12px; }
    .form-input, .form-select, .form-textarea { font-size: 12px; padding: 8px 12px; }
    .btn { padding: 6px 12px; font-size: 11px; }
    .btn-sm { padding: 4px 8px; font-size: 10px; }
    .btn-icon { padding: 5px; font-size: 14px; }
    .nav-item { padding: 8px 12px; font-size: 11px; }
    .stat-value { font-size: 24px; }
    .stat-label { font-size: 10px; }
    .stat-card { padding: 12px 16px; }
    .modal { width: 95vw; max-height: 90vh; padding: 12px; }
    .modal-header { flex-direction: column; align-items: flex-start; gap: 8px; }
    .modal-title { font-size: 16px; }
    .table-wrap { font-size: 11px; }
    th, td { padding: 6px 8px; font-size: 11px; }
    .docente-name { font-size: 14px; }
    .docente-details { font-size: 11px; }
    .search-icon { font-size: 12px; left: 8px; }
    .search-input-wrap .form-input { padding-left: 28px; font-size: 12px; }
    .flex-wrap { flex-wrap: wrap; }
    .form-label { font-size: 10px; }
    .school-name { font-size: 16px; }
    .school-de { font-size: 9px; }
    .school-meta-item { font-size: 10px; }
  }
`;

// ============================================================
// CALENDAR COMPONENT
// ============================================================
function MiniCalendar({ year, month, rangeStart, rangeEnd, onNavigate }) {
  const today = new Date();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const dayNames = ["D","L","M","M","J","V","S"];
  
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function isInRange(d) {
    if (!rangeStart || !rangeEnd || !d) return false;
    const cur = new Date(year, month, d);
    const s = new Date(rangeStart); const e = new Date(rangeEnd);
    return cur >= s && cur <= e;
  }
  function isRangeStart(d) {
    if (!rangeStart || !d) return false;
    const s = new Date(rangeStart);
    return s.getFullYear() === year && s.getMonth() === month && s.getDate() === d;
  }
  function isRangeEnd(d) {
    if (!rangeEnd || !d) return false;
    const e = new Date(rangeEnd);
    return e.getFullYear() === year && e.getMonth() === month && e.getDate() === d;
  }
  function isToday(d) {
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
  }

  return (
    <div className="calendar">
      <div className="cal-header">
        <button className="btn-icon" onClick={() => onNavigate(-1)}>◀</button>
        <span>{monthNames[month]} {year}</span>
        <button className="btn-icon" onClick={() => onNavigate(1)}>▶</button>
      </div>
      <div className="cal-grid" style={{padding:'8px'}}>
        {dayNames.map(n => <div key={n} className="cal-day-header">{n}</div>)}
        {cells.map((d, i) => (
          <div key={i} className={[
            "cal-day",
            !d ? "empty" : "",
            d && isToday(d) ? "today" : "",
            d && isRangeStart(d) ? "range-start" : "",
            d && isRangeEnd(d) ? "range-end" : "",
            d && isInRange(d) && !isRangeStart(d) && !isRangeEnd(d) ? "in-range" : "",
          ].join(" ")}>
            {d || ""}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// DAYS REMAINING BADGE
// ============================================================
function DaysRemaining({ fechaFin, diasAutorizados, fechaInicio }) {
  if (!fechaFin) return null;
  const dias = diasRestantes(fechaFin);
  const cls = dias <= 0 ? "days-danger" : dias <= 5 ? "days-danger" : dias <= 10 ? "days-warn" : "days-ok";
  const icon = dias <= 0 ? "🔴" : dias <= 5 ? "⚠️" : dias <= 10 ? "🟡" : "🟢";
  return (
    <span className={`days-remaining ${cls}`}>
      {icon} {dias <= 0 ? "VENCIDA" : `${dias} días`}
    </span>
  );
}

// ============================================================
// ALERT PANEL
// ============================================================
function AlertPanel({ escuelas }) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [selectedForEmail, setSelectedForEmail] = useState(new Set());
  const [emailData, setEmailData] = useState({ to: "", subject: "", message: "" });
  const [sendingEmail, setSendingEmail] = useState(false);

  // Función para reproducir sonido de alerta
  const playAlertSound = () => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(500, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      console.log("Audio no disponible");
    }
  };

  // Función para enviar email
  const sendAlertEmail = async () => {
    if (!emailData.to) {
      alert("Por favor ingresa un email");
      return;
    }
    setSendingEmail(true);
    const selectedAlerts = alerts.filter(a => selectedForEmail.has(alerts.indexOf(a)));
    try {
      const response = await fetch("/api/send-alert-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailData.to,
          subject: emailData.subject || "Alertas del Sistema ACDM",
          alerts: selectedAlerts.map(a => ({ title: a.title, desc: a.desc, severity: a.type })),
          message: emailData.message,
          timestamp: new Date().toLocaleString('es-AR')
        })
      });
      const result = await response.json();
      if (result.success) {
        alert("✅ Alertas enviadas por email");
        setSelectedForEmail(new Set());
        setEmailData({ to: "", subject: "", message: "" });
        setShowEmailForm(false);
      }
    } catch (error) {
      alert("❌ Error: " + error.message);
    }
    setSendingEmail(false);
  };

  const alerts = [];
  
  escuelas.forEach(esc => {
    // Schools without ACDM
    if (esc.docentes.length === 0) {
      alerts.push({ type: "danger", icon: "🏫", title: `Sin ACDM asignado`, desc: `${esc.escuela} (${esc.de}) no tiene docente asignado.`, school: esc.escuela });
    }
    esc.docentes.forEach(doc => {
      if (doc.estado === "Licencia" && doc.fechaFinLicencia) {
        const dias = diasRestantes(doc.fechaFinLicencia);
        if (dias <= 0) {
          alerts.push({ type: "danger", icon: "⛔", title: "Licencia VENCIDA", desc: `${doc.nombreApellido} — ${esc.escuela}. ${doc.motivo}. Vencida el ${formatDate(doc.fechaFinLicencia)}`, school: esc.escuela });
          playAlertSound();
        } else if (dias <= 5) {
          alerts.push({ type: "danger", icon: "🔴", title: `Licencia por vencer (${dias} días)`, desc: `${doc.nombreApellido} — ${esc.escuela}. ${doc.motivo}. Vence ${formatDate(doc.fechaFinLicencia)}`, school: esc.escuela });
        } else if (dias <= 10) {
          alerts.push({ type: "warning", icon: "⚠️", title: `Licencia próxima a vencer (${dias} días)`, desc: `${doc.nombreApellido} — ${esc.escuela}. Vence ${formatDate(doc.fechaFinLicencia)}`, school: esc.escuela });
        }
      }
    });
    // Schools without students
    if (esc.alumnos.length === 0 && esc.docentes.length > 0) {
      alerts.push({ type: "info", icon: "👤", title: "Sin alumnos registrados", desc: `${esc.escuela} no tiene alumnos cargados en el sistema.`, school: esc.escuela });
    }
  });

  if (alerts.length === 0) return (
    <div className="alert alert-success"><span className="alert-icon">✅</span><div><strong>Sin alertas activas</strong><br/><span style={{fontSize:12}}>Todas las licencias y asignaciones están en orden.</span></div></div>
  );

  return (
    <div>
      {/* Controles */}
      <div style={{display:'flex', gap:12, marginBottom:16, flexWrap:'wrap'}}>
        <button 
          onClick={() => setSoundEnabled(!soundEnabled)}
          style={{padding:'6px 12px', fontSize:11, borderRadius:4, border:'1px solid var(--border)', background: soundEnabled ? 'var(--accent)' : 'transparent', color: soundEnabled ? '#000' : 'var(--text2)', cursor:'pointer', fontWeight:500}}
        >
          {soundEnabled ? '🔊' : '🔇'} Sonido
        </button>
        <button 
          onClick={() => setShowEmailForm(!showEmailForm)}
          style={{padding:'6px 12px', fontSize:11, borderRadius:4, border:'1px solid var(--border)', background: showEmailForm ? 'var(--accent)' : 'transparent', color: showEmailForm ? '#000' : 'var(--text2)', cursor:'pointer', fontWeight:500}}
        >
          📧 Enviar Email
        </button>
      </div>

      {/* Formulario de Email */}
      {showEmailForm && (
        <div style={{padding:12, background:'var(--bg2)', borderRadius:6, marginBottom:16}}>
          <input 
            type="email" 
            placeholder="correo@ejemplo.com"
            value={emailData.to}
            onChange={e => setEmailData({...emailData, to: e.target.value})}
            style={{width:'100%', padding:'6px 12px', borderRadius:4, border:'1px solid var(--border)', background:'var(--bg1)', marginBottom:8}}
          />
          <textarea 
            placeholder="Mensaje (opcional)"
            value={emailData.message}
            onChange={e => setEmailData({...emailData, message: e.target.value})}
            style={{width:'100%', height:60, padding:'6px 12px', borderRadius:4, border:'1px solid var(--border)', background:'var(--bg1)', marginBottom:8, resize:'vertical'}}
          />
          <button 
            onClick={sendAlertEmail}
            disabled={sendingEmail}
            style={{padding:'6px 12px', borderRadius:4, border:'none', background:'#0088ff', color:'#fff', cursor:'pointer', fontWeight:500, opacity: sendingEmail ? 0.6 : 1}}
          >
            {sendingEmail ? '⏳ Enviando...' : '✓ Enviar'}
          </button>
          <button 
            onClick={() => setShowEmailForm(false)}
            style={{marginLeft:8, padding:'6px 12px', borderRadius:4, border:'1px solid var(--border)', background:'transparent', cursor:'pointer'}}
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Alertas */}
      {alerts.map((a, i) => (
        <div key={i} className={`alert alert-${a.type}`} style={{marginBottom:12}}>
          <span className="alert-icon">{a.icon}</span>
          <div><strong>{a.title}</strong><br/><span style={{fontSize:12,opacity:0.9}}>{a.desc}</span></div>
          {showEmailForm && (
            <input 
              type="checkbox"
              checked={selectedForEmail.has(i)}
              onChange={e => {
                if(e.target.checked) {
                  setSelectedForEmail(new Set([...selectedForEmail, i]));
                } else {
                  setSelectedForEmail(new Set([...selectedForEmail].filter(x => x !== i)));
                }
              }}
              style={{marginLeft:'auto', cursor:'pointer'}}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// STATISTICS
// ============================================================
function Statistics({ escuelas }) {
  const totalEsc = escuelas.length;
  const totalAlumnos = escuelas.reduce((a, e) => a + e.alumnos.length, 0);
  const totalDocentes = escuelas.reduce((a, e) => a + e.docentes.length, 0);
  const docentesLicencia = escuelas.reduce((a, e) => a + e.docentes.filter(d => d.estado === "Licencia").length, 0);
  const docentesActivos = totalDocentes - docentesLicencia;
  const sinAcdm = escuelas.filter(e => e.docentes.length === 0).length;
  const totalSuplentes = escuelas.reduce((a, e) => a + e.docentes.reduce((b, d) => b + d.suplentes.length, 0), 0);
  
  const byNivel = {};
  escuelas.forEach(e => { byNivel[e.nivel] = (byNivel[e.nivel] || 0) + 1; });
  const byDE = {};
  escuelas.forEach(e => { byDE[e.de] = (byDE[e.de] || 0) + 1; });
  
  const maxByNivel = Math.max(...Object.values(byNivel));
  const colors = ["#00d4ff","#00ff88","#ffd700","#ff6b35","#ff4757"];

  return (
    <div>
      <div className="stats-grid mb-24">
        {[
          { val: totalEsc, label: "Escuelas", icon: "🏫", color: "linear-gradient(90deg, #00d4ff, #0099cc)" },
          { val: totalAlumnos, label: "Alumnos", icon: "👨‍🎓", color: "linear-gradient(90deg, #00ff88, #00cc66)" },
          { val: docentesActivos, label: "ACDM Activos", icon: "✅", color: "linear-gradient(90deg, #00ff88, #00cc66)" },
          { val: docentesLicencia, label: "En Licencia", icon: "🔴", color: "linear-gradient(90deg, #ff4757, #cc2233)" },
          { val: totalSuplentes, label: "Suplentes", icon: "↔", color: "linear-gradient(90deg, #ffa502, #cc8800)" },
          { val: sinAcdm, label: "Sin ACDM", icon: "⚠️", color: "linear-gradient(90deg, #ff6b35, #cc4400)" },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{"--gradient": s.color}}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.val}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
      
      <div className="card-grid">
        <div className="card">
          <div className="card-header"><span className="card-title">Distribución por Nivel</span></div>
          <div className="chart-bar-wrap">
            {Object.entries(byNivel).map(([nivel, count], i) => (
              <div key={nivel} className="chart-bar-row">
                <div className="chart-bar-label">{nivel}</div>
                <div className="chart-bar-bg">
                  <div className="chart-bar-fill" style={{ width: `${(count/maxByNivel)*100}%`, background: colors[i % colors.length] }}>{count}</div>
                </div>
                <div className="chart-val">{count}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="card">
          <div className="card-header"><span className="card-title">Estado ACDM</span></div>
          <div style={{display:'flex', justifyContent:'center', alignItems:'center', gap:40, padding:'20px 0'}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:48, fontFamily:'Rajdhani', fontWeight:700, color:'var(--accent3)'}}>{docentesActivos}</div>
              <div style={{fontSize:11, color:'var(--text2)', textTransform:'uppercase', letterSpacing:1}}>Activos</div>
            </div>
            <div style={{fontSize:32, color:'var(--border2)'}}>VS</div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:48, fontFamily:'Rajdhani', fontWeight:700, color:'var(--red)'}}>{docentesLicencia}</div>
              <div style={{fontSize:11, color:'var(--text2)', textTransform:'uppercase', letterSpacing:1}}>En Licencia</div>
            </div>
          </div>
          {totalDocentes > 0 && (
            <div style={{background:'var(--bg2)', borderRadius:10, height:16, overflow:'hidden', marginTop:8}}>
              <div style={{height:'100%', width:`${(docentesActivos/totalDocentes)*100}%`, background:'linear-gradient(90deg, var(--accent3), var(--accent))', borderRadius:10, transition:'width 1s ease'}}></div>
            </div>
          )}
        </div>
        
        <div className="card">
          <div className="card-header"><span className="card-title">Por Distrito Escolar</span></div>
          <div className="chart-bar-wrap">
            {Object.entries(byDE).map(([de, count], i) => (
              <div key={de} className="chart-bar-row">
                <div className="chart-bar-label">{de}</div>
                <div className="chart-bar-bg">
                  <div className="chart-bar-fill" style={{ width: `${(count/Math.max(...Object.values(byDE)))*100}%`, background: colors[i % colors.length] }}>{count}</div>
                </div>
                <div className="chart-val">{count}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Alertas de Licencias</span></div>
          <AlertPanel escuelas={escuelas} />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DOCENTE FORM MODAL
// ============================================================
function DocenteModal({ docente, titularId, isNew, onSave, onClose }) {
  const [form, setForm] = useState(docente || {
    id: `d${Date.now()}`, cargo: "Titular", nombreApellido: "",
    estado: "Activo", motivo: "-", motivoPersonalizado: "", diasAutorizados: 0,
    fechaInicioLicencia: null, fechaFinLicencia: null, suplentes: [],
    jornada: "Completa"
  });
  
  const MOTIVOS = ["-","Art. 101 - Enfermedad","Art. 102 - Familiar enfermo","Art. 103 - Maternidad","Art. 104 - Accidente de trabajo","Art. 108 - Gremial","Art. 115 - Estudio","Art. 140 - Concurso","Otro"];
  
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  
  function navCal(d) {
    let m = calMonth + d; let y = calYear;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    setCalMonth(m); setCalYear(y);
  }
  
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{isNew ? "➕ Nuevo ACDM" : "✏️ Editar ACDM"}</div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Rol ACDM</label>
            <select className="form-select" value={form.cargo} onChange={e => setForm({...form, cargo: e.target.value})}>
              <option>Titular</option><option>Suplente</option><option>Interino</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Jornada</label>
            <select className="form-select" value={form.jornada} onChange={e => setForm({...form, jornada: e.target.value})}>
              <option>Simple</option><option>Completa</option><option>Extendida</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Nombre y Apellido</label>
          <input className="form-input" value={form.nombreApellido} onChange={e => setForm({...form, nombreApellido: e.target.value})} placeholder="Apellido, Nombre" />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Estado</label>
            <select className="form-select" value={form.estado} onChange={e => setForm({...form, estado: e.target.value})}>
              <option>Activo</option><option>Licencia</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Motivo (Art.)</label>
            <select className="form-select" value={form.motivo} onChange={e => setForm({...form, motivo: e.target.value})}>
              {MOTIVOS.map(m => <option key={m}>{m}</option>)}
            </select>
            {form.motivo === "Otro" && (
              <input type="text" className="form-input" style={{marginTop: 8}} value={form.motivoPersonalizado} onChange={e => setForm({...form, motivoPersonalizado: e.target.value})} placeholder="Especificar artículo (ej: Art. 150 - Nombre del motivo)" />
            )}
          </div>
        </div>
        {form.estado === "Licencia" && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Días Autorizados</label>
                <input type="number" className="form-input" value={form.diasAutorizados} onChange={e => setForm({...form, diasAutorizados: Number(e.target.value)})} />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha Inicio Licencia</label>
                <input type="date" className="form-input" value={form.fechaInicioLicencia || ""} onChange={e => setForm({...form, fechaInicioLicencia: e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Fecha Fin Licencia</label>
                <input type="date" className="form-input" value={form.fechaFinLicencia || ""} onChange={e => setForm({...form, fechaFinLicencia: e.target.value})} />
              </div>
            </div>
            {(form.fechaInicioLicencia || form.fechaFinLicencia) && (
              <div className="mb-16">
                <MiniCalendar year={calYear} month={calMonth} rangeStart={form.fechaInicioLicencia} rangeEnd={form.fechaFinLicencia} onNavigate={navCal} />
              </div>
            )}
          </>
        )}
        <div className="flex gap-8 justify-end mt-16">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { onSave(form); onClose(); }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ALUMNO FORM MODAL
// ============================================================
function AlumnoModal({ alumno, isNew, onSave, onClose }) {
  const [form, setForm] = useState(alumno || { id: `a${Date.now()}`, gradoSalaAnio: "", nombre: "", diagnostico: "", observaciones: "" });
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{isNew ? "➕ Nuevo Alumno" : "✏️ Editar Alumno"}</div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Grado / Sala / Año</label>
            <input className="form-input" value={form.gradoSalaAnio} onChange={e => setForm({...form, gradoSalaAnio: e.target.value})} placeholder="Ej: 3° Grado" />
          </div>
          <div className="form-group">
            <label className="form-label">Alumno (Apellido, Nombre)</label>
            <input className="form-input" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Apellido, Nombre" />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Diagnóstico</label>
          <input className="form-input" value={form.diagnostico} onChange={e => setForm({...form, diagnostico: e.target.value})} placeholder="Ej: TEA Nivel 1, TDAH..." />
        </div>
        <div className="form-group">
          <label className="form-label">Observaciones</label>
          <textarea className="form-textarea" value={form.observaciones} onChange={e => setForm({...form, observaciones: e.target.value})} placeholder="Observaciones adicionales..." />
        </div>
        <div className="flex gap-8 justify-end mt-16">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { onSave(form); onClose(); }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SCHOOL FORM MODAL
// ============================================================
function EscuelaModal({ escuela, isNew, onSave, onClose }) {
  const [form, setForm] = useState(escuela || {
    id: `e${Date.now()}`, de: "", escuela: "", nivel: "Primario",
    direccion: "", lat: null, lng: null, telefonos: [""], mail: "",
    jornada: "Completa", turno: "Mañana", alumnos: [], docentes: []
  });
  
  function setPhone(i, val) {
    const t = [...form.telefonos]; t[i] = val; setForm({...form, telefonos: t});
  }
  
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{isNew ? "➕ Nueva Escuela" : "✏️ Editar Escuela"}</div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Distrito Escolar (DE)</label>
            <input className="form-input" value={form.de} onChange={e => setForm({...form, de: e.target.value})} placeholder="Ej: DE 01" />
          </div>
          <div className="form-group">
            <label className="form-label">Nivel</label>
            <select className="form-select" value={form.nivel} onChange={e => setForm({...form, nivel: e.target.value})}>
              <option>Inicial</option><option>Primario</option><option>Secundario</option><option>Especial</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Nombre de la Escuela</label>
          <input className="form-input" value={form.escuela} onChange={e => setForm({...form, escuela: e.target.value})} placeholder="Ej: Escuela N°1 ..." />
        </div>
        <div className="form-group">
          <label className="form-label">Dirección</label>
          <input className="form-input" value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} placeholder="Calle, número, localidad" />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Latitud (opcional)</label>
            <input type="number" className="form-input" value={form.lat || ""} onChange={e => setForm({...form, lat: parseFloat(e.target.value)})} placeholder="-34.603" />
          </div>
          <div className="form-group">
            <label className="form-label">Longitud (opcional)</label>
            <input type="number" className="form-input" value={form.lng || ""} onChange={e => setForm({...form, lng: parseFloat(e.target.value)})} placeholder="-58.381" />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Mail Institucional</label>
          <input type="email" className="form-input" value={form.mail} onChange={e => setForm({...form, mail: e.target.value})} placeholder="escuela@bue.edu.ar" />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Jornada</label>
            <select className="form-select" value={form.jornada} onChange={e => setForm({...form, jornada: e.target.value})}>
              <option>Simple</option><option>Completa</option><option>Extendida</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Turno</label>
            <select className="form-select" value={form.turno} onChange={e => setForm({...form, turno: e.target.value})}>
              <option>Mañana</option><option>Tarde</option><option>Vespertino</option><option>Completa</option><option>Noche</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Teléfonos</label>
          {form.telefonos.map((t, i) => (
            <div key={i} className="flex gap-8 mb-8">
              <input className="form-input" value={t} onChange={e => setPhone(i, e.target.value)} placeholder="011-XXXX-XXXX" />
              {form.telefonos.length > 1 && <button className="btn btn-danger btn-sm" onClick={() => setForm({...form, telefonos: form.telefonos.filter((_,j)=>j!==i)})}>✕</button>}
            </div>
          ))}
          <button className="btn btn-secondary btn-sm" onClick={() => setForm({...form, telefonos: [...form.telefonos, ""]})}>+ Agregar teléfono</button>
        </div>
        <div className="flex gap-8 justify-end mt-16">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { onSave(form); onClose(); }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SCHOOL DETAIL VIEW
// ============================================================
function EscuelaDetail({ esc, onEdit, onDelete, onAddDocente, onEditDocente, onDeleteDocente, onAddAlumno, onEditAlumno, onDeleteAlumno, viewMode, isAdmin }) {
  const [expanded, setExpanded] = useState(false);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [activeTab, setActiveTab] = useState("docentes");
  
  function navCal(d) {
    let m = calMonth + d; let y = calYear;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    setCalMonth(m); setCalYear(y);
  }
  
  const hasAlerts = esc.docentes.length === 0 || esc.docentes.some(d => d.estado === "Licencia" && d.fechaFinLicencia && diasRestantes(d.fechaFinLicencia) <= 10);

  const openMaps = (e) => {
    e.stopPropagation();
    const q = esc.lat && esc.lng ? `${esc.lat},${esc.lng}` : encodeURIComponent(esc.direccion);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
  };
  
  const openMail = (mailAddr, e) => {
    e.stopPropagation();
    const subject = encodeURIComponent(`Sistema ACDM - ${esc.escuela}`);
    window.open(`mailto:${mailAddr}?subject=${subject}`, "_blank");
  };

  if (viewMode === "compact") {
    return (
      <div className="school-card">
        <div className="school-card-header" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center justify-between flex-wrap gap-8">
            <div>
              <div className="school-de">{esc.de}</div>
              <div className="school-name">{esc.escuela}</div>
              <div className="school-meta">
                <span className="school-meta-item">📍 {esc.direccion}</span>
                <span className="school-meta-item">📚 {esc.nivel}</span>
              </div>
            </div>
            <div className="flex items-center gap-8">
              {hasAlerts && <span style={{animation:'pulse 1s infinite', fontSize:18}}>⚠️</span>}
              <span style={{color:'var(--text3)', fontSize:20}}>{expanded ? "▲" : "▼"}</span>
            </div>
          </div>
          
          {/* Compact view: show titular, suplente, motivo */}
          <div style={{marginTop:12}}>
            {esc.docentes.length === 0 ? (
              <span className="badge badge-danger">SIN ACDM ASIGNADO</span>
            ) : esc.docentes.map(doc => (
              <div key={doc.id} style={{marginBottom:8}}>
                <div className="flex items-center gap-8 flex-wrap">
                  <span className={`badge badge-${doc.cargo.toLowerCase()}`}>{doc.cargo}</span>
                  <span style={{fontFamily:'Rajdhani', fontWeight:700, fontSize:15}}>{doc.nombreApellido}</span>
                  <span className={`badge badge-${doc.estado === "Activo" ? "active" : "licencia"}`}>{doc.estado}</span>
                  <span style={{fontSize:11, color:'var(--text3)', background:'rgba(0,100,200,0.1)', padding:'2px 8px', borderRadius:'4px'}}>📅 {doc.jornada || "N/D"}</span>
                  {doc.estado === "Licencia" && <span style={{fontSize:12, color:'var(--text2)'}}>{doc.motivo}</span>}
                  {doc.estado === "Licencia" && <DaysRemaining fechaFin={doc.fechaFinLicencia} />}
                </div>
                {doc.suplentes.map(s => (
                  <div key={s.id} className="flex items-center gap-8 flex-wrap" style={{marginLeft:20, marginTop:4}}>
                    <span style={{color:'var(--yellow)', fontSize:12}}>↳</span>
                    <span className="badge badge-suplente">{s.cargo}</span>
                    <span style={{fontSize:13, color:'var(--text2)'}}>{s.nombreApellido}</span>
                    <span style={{fontSize:11, color:'var(--text3)', background:'rgba(0,100,200,0.1)', padding:'2px 8px', borderRadius:'4px'}}>📅 {s.jornada || "N/D"}</span>
                    {doc.estado === "Licencia" && doc.fechaInicioLicencia && (
                      <span style={{fontSize:11, color:'var(--text3)'}}>desde {formatDate(doc.fechaInicioLicencia)}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        
        {expanded && <EscuelaExpandida esc={esc} onEdit={onEdit} onDelete={onDelete} onAddDocente={onAddDocente} onEditDocente={onEditDocente} onDeleteDocente={onDeleteDocente} onAddAlumno={onAddAlumno} onEditAlumno={onEditAlumno} onDeleteAlumno={onDeleteAlumno} calYear={calYear} calMonth={calMonth} navCal={navCal} activeTab={activeTab} setActiveTab={setActiveTab} openMaps={openMaps} openMail={openMail} isAdmin={isAdmin} />}
      </div>
    );
  }
  
  return (
    <div className="school-card">
      <div className="school-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between flex-wrap gap-8">
          <div>
            <div className="school-de">{esc.de}</div>
            <div className="school-name">{esc.escuela}</div>
          </div>
          <div className="flex items-center gap-8">
            {hasAlerts && <span style={{animation:'pulse 1s infinite', fontSize:18}}>⚠️</span>}
            <span style={{color:'var(--text3)', fontSize:20}}>{expanded ? "▲" : "▼"}</span>
          </div>
        </div>
        <div className="school-meta">
          <span className="school-meta-item">📚 {esc.nivel}</span>
          <span className="school-meta-item">⏱ {esc.jornada}</span>
          <span className="school-meta-item">🌅 {esc.turno}</span>
          <span className="school-meta-item clickable" onClick={openMaps}>📍 {esc.direccion}</span>
          {esc.telefonos.map((t, i) => <span key={i} className="school-meta-item">📞 {t}</span>)}
          <span className="school-meta-item link" onClick={(e) => openMail(esc.mail, e)}>✉️ {esc.mail}</span>
        </div>
      </div>
      {expanded && <EscuelaExpandida esc={esc} onEdit={onEdit} onDelete={onDelete} onAddDocente={onAddDocente} onEditDocente={onEditDocente} onDeleteDocente={onDeleteDocente} onAddAlumno={onAddAlumno} onEditAlumno={onEditAlumno} onDeleteAlumno={onDeleteAlumno} calYear={calYear} calMonth={calMonth} navCal={navCal} activeTab={activeTab} setActiveTab={setActiveTab} openMaps={openMaps} openMail={openMail} isAdmin={isAdmin} />}
    </div>
  );
}

function EscuelaExpandida({ esc, onEdit, onDelete, onAddDocente, onEditDocente, onDeleteDocente, onAddAlumno, onEditAlumno, onDeleteAlumno, calYear, calMonth, navCal, activeTab, setActiveTab, openMaps, openMail, isAdmin }) {
  return (
    <div className="school-card-body" style={{animation:'slideIn 0.2s ease'}}>
      <div className="flex items-center justify-between mb-16">
        <div className="view-toggle">
          <button className={`view-btn ${activeTab === "docentes" ? "active" : ""}`} onClick={() => setActiveTab("docentes")}>👨‍🏫 Docentes</button>
          <button className={`view-btn ${activeTab === "alumnos" ? "active" : ""}`} onClick={() => setActiveTab("alumnos")}>👨‍🎓 Alumnos</button>
          <button className={`view-btn ${activeTab === "info" ? "active" : ""}`} onClick={() => setActiveTab("info")}>ℹ️ Info</button>
        </div>
        <div className="flex gap-8">
          {isAdmin && <button className="btn btn-secondary btn-sm" onClick={onEdit}>✏️ Editar</button>}
          {isAdmin && <button className="btn btn-danger btn-sm" onClick={() => { if(confirm("¿Está seguro de eliminar esta escuela?")) onDelete(); }}>🗑️ Eliminar</button>}
          {isAdmin && activeTab === "docentes" && <button className="btn btn-primary btn-sm" onClick={() => onAddDocente(esc.id)}>+ ACDM</button>}
          {isAdmin && activeTab === "alumnos" && <button className="btn btn-primary btn-sm" onClick={() => onAddAlumno(esc.id)}>+ Alumno</button>}
        </div>
      </div>
      
      {activeTab === "docentes" && (
        <div>
          {esc.docentes.length === 0 && <div className="no-data">⚠️ Sin docentes asignados</div>}
          {esc.docentes.map(doc => (
            <div key={doc.id}>
              <div className="docente-row">
                <div className="docente-header">
                  <span className={`badge badge-${doc.cargo.toLowerCase()}`}>{doc.cargo}</span>
                  <span className="docente-name">{doc.nombreApellido}</span>
                  <span className={`badge badge-${doc.estado === "Activo" ? "active" : "licencia"}`}>{doc.estado}</span>
                  <span style={{fontSize:11, color:'var(--text3)', background:'rgba(0,100,200,0.1)', padding:'2px 8px', borderRadius:'4px'}}>📅 {doc.jornada || "N/D"}</span>
                  {doc.estado === "Licencia" && <DaysRemaining fechaFin={doc.fechaFinLicencia} />}
                  {isAdmin && (
                    <div className="flex gap-4" style={{marginLeft:'auto'}}>
                      <button className="btn btn-secondary btn-sm" onClick={() => onEditDocente(esc.id, doc)}>✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={() => onDeleteDocente(esc.id, doc.id)}>🗑️</button>
                      {doc.cargo === "Titular" && <button className="btn btn-secondary btn-sm" onClick={() => onAddDocente(esc.id, doc.id)}>+ Suplente</button>}
                    </div>
                  )}
                </div>
                {doc.estado === "Licencia" && (
                  <div className="docente-details mt-8">
                    <div className="detail-item"><div className="detail-label">Motivo</div><div className="detail-val">{doc.motivo}</div></div>
                    <div className="detail-item"><div className="detail-label">Días Autorizados</div><div className="detail-val">{doc.diasAutorizados} días</div></div>
                    <div className="detail-item"><div className="detail-label">Inicio</div><div className="detail-val">{formatDate(doc.fechaInicioLicencia)}</div></div>
                    <div className="detail-item"><div className="detail-label">Fin</div><div className="detail-val">{formatDate(doc.fechaFinLicencia)}</div></div>
                  </div>
                )}
                {doc.estado === "Licencia" && (doc.fechaInicioLicencia || doc.fechaFinLicencia) && (
                  <div className="mt-8">
                    <MiniCalendar year={calYear} month={calMonth} rangeStart={doc.fechaInicioLicencia} rangeEnd={doc.fechaFinLicencia} onNavigate={navCal} />
                  </div>
                )}
              </div>
              {doc.suplentes && doc.suplentes.map(s => (
                <div key={s.id} className="docente-row suplente-row">
                  <div className="docente-header">
                    <span style={{fontSize:12, color:'var(--yellow)'}}>↳ Cubre a: <strong>{doc.nombreApellido}</strong></span>
                    <span className={`badge badge-${s.cargo.toLowerCase()}`}>{s.cargo}</span>
                    <span className="docente-name">{s.nombreApellido}</span>
                    <span className={`badge badge-${s.estado === "Activo" ? "active" : "licencia"}`}>{s.estado}</span>
                    <span style={{fontSize:11, color:'var(--text3)', background:'rgba(0,100,200,0.1)', padding:'2px 8px', borderRadius:'4px'}}>📅 {s.jornada || "N/D"}</span>
                    {s.fechaIngreso && <span style={{fontSize:11, color:'var(--text3)'}}>desde {formatDate(s.fechaIngreso)}</span>}
                    {isAdmin && (
                      <div className="flex gap-4" style={{marginLeft:'auto'}}>
                        <button className="btn btn-secondary btn-sm" onClick={() => onEditDocente(esc.id, s, doc.id)}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => onDeleteDocente(esc.id, s.id, doc.id)}>🗑️</button>
                      </div>
                    )}
                  </div>
                  {s.motivo && s.motivo !== "-" && (
                    <div className="detail-item mt-8"><div className="detail-label">Motivo</div><div className="detail-val">{s.motivo}</div></div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      
      {activeTab === "alumnos" && (
        <div className="table-wrap">
          {esc.alumnos.length === 0 ? <div className="no-data">Sin alumnos registrados</div> : (
            <table>
              <thead><tr><th>Grado/Sala</th><th>Alumno</th><th>Diagnóstico</th><th>Observaciones</th>{isAdmin && <th>Acciones</th>}</tr></thead>
              <tbody>
                {esc.alumnos.map(a => (
                  <tr key={a.id}>
                    <td><span className="badge badge-info" style={{background:'rgba(0,212,255,0.1)', color:'var(--accent)', border:'1px solid rgba(0,212,255,0.2)'}}>{a.gradoSalaAnio}</span></td>
                    <td style={{fontWeight:600}}>{a.nombre}</td>
                    <td><span style={{color:'var(--yellow)', fontSize:12}}>{a.diagnostico}</span></td>
                    <td style={{color:'var(--text2)', fontSize:12, maxWidth:200}}>{a.observaciones}</td>
                    {isAdmin && <td><div className="flex gap-4">
                      <button className="btn btn-secondary btn-sm" onClick={() => onEditAlumno(esc.id, a)}>✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={() => onDeleteAlumno(esc.id, a.id)}>🗑️</button>
                    </div></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      
      {activeTab === "info" && (
        <div className="school-info-grid">
          <div>
            <div className="school-info-label">Dirección</div>
            <div className="school-info-val link" onClick={openMaps}>📍 {esc.direccion}</div>
          </div>
          <div>
            <div className="school-info-label">Mail</div>
            <div className="school-info-val link" onClick={(e) => openMail(esc.mail, e)}>✉️ {esc.mail}</div>
          </div>
          <div>
            <div className="school-info-label">Teléfonos</div>
            <div className="school-info-val">{esc.telefonos.join(" | ")}</div>
          </div>
          <div>
            <div className="school-info-label">Jornada / Turno</div>
            <div className="school-info-val">{esc.jornada} — {esc.turno}</div>
          </div>
          <div>
            <div className="school-info-label">Nivel</div>
            <div className="school-info-val">{esc.nivel}</div>
          </div>
          <div>
            <div className="school-info-label">Distrito Escolar</div>
            <div className="school-info-val">{esc.de}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PDF EXPORT
// ============================================================
function ExportPDF({ escuelas, onClose }) {
  const [filter, setFilter] = useState("all");
  const [tipo, setTipo] = useState("completo");
  const [formato, setFormato] = useState("txt");
  
  // Generar CSV
  function generateCSV() {
    const data = filter === "all" ? escuelas : escuelas.filter(e => e.de === filter);
    const rows = [];
    
    // Encabezados generales
    rows.push(["SISTEMA ACDM - REPORTE EXPORTADO"]);
    rows.push([`Generado: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR')}`]);
    rows.push([`Tipo: ${tipo}`]);
    rows.push([]);
    
    if (tipo === "completo" || tipo === "docentes") {
      rows.push(["DE", "Escuela", "Nivel", "Jornada", "Turno", "Dirección", "Mail", "Teléfonos"]);
      data.forEach(esc => {
        rows.push([esc.de, esc.escuela, esc.nivel, esc.jornada, esc.turno, esc.direccion, esc.mail, esc.telefonos.join("; ")]);
        
        if (tipo !== "mini") {
          rows.push([]);
          rows.push(["DOCENTES:", esc.escuela]);
          rows.push(["Cargo", "Nombre", "Estado", "Motivo", "Jornada", "Días Autorizados", "Fecha Inicio", "Fecha Fin"]);
          esc.docentes.forEach(d => {
            rows.push([d.cargo, d.nombreApellido, d.estado, d.motivo, d.jornada || "N/D", d.diasAutorizados, formatDate(d.fechaInicioLicencia), formatDate(d.fechaFinLicencia)]);
            if (d.suplentes.length > 0) {
              rows.push(["-- SUPLENTES", d.nombreApellido]);
              d.suplentes.forEach(s => rows.push([s.cargo, s.nombreApellido, s.estado, s.motivo, s.jornada || "N/D"]));
            }
          });
          
          rows.push([]);
          rows.push(["ALUMNOS:", esc.escuela]);
          rows.push(["Grado/Sala", "Nombre", "Diagnóstico", "Observaciones"]);
          esc.alumnos.forEach(a => {
            rows.push([a.gradoSalaAnio, a.nombre, a.diagnostico, a.observaciones]);
          });
          rows.push([]);
        }
      });
    }
    
    // Convertir a CSV
    const csvContent = rows.map(row => row.map(cell => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ACDM_Reporte_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  // Generar Excel usando SheetJS CDN
  function generateExcel() {
    const data = filter === "all" ? escuelas : escuelas.filter(e => e.de === filter);
    
    // Cargar SheetJS desde CDN
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.min.js";
    script.onload = () => {
      const XLSX = window.XLSX;
      const workbook = XLSX.utils.book_new();
      
      // Hoja 1: Resumen de Escuelas
      const escuelasData = [];
      escuelasData.push(["DE", "Escuela", "Nivel", "Jornada", "Turno", "Dirección", "Mail", "Teléfonos", "Docentes", "Alumnos"]);
      data.forEach(esc => {
        escuelasData.push([
          esc.de, esc.escuela, esc.nivel, esc.jornada, esc.turno, esc.direccion, esc.mail,
          esc.telefonos.join("; "), esc.docentes.length, esc.alumnos.length
        ]);
      });
      const wsEscuelas = XLSX.utils.aoa_to_sheet(escuelasData);
      XLSX.utils.book_append_sheet(workbook, wsEscuelas, "Escuelas");
      
      // Hoja 2: Docentes
      if (tipo !== "mini") {
        const docentesData = [];
        docentesData.push(["Escuela", "DE", "Cargo", "Nombre", "Estado", "Motivo", "Jornada", "Días Auth.", "Inicio", "Fin", "Suplente"]);
        data.forEach(esc => {
          esc.docentes.forEach(d => {
            docentesData.push([
              esc.escuela, esc.de, d.cargo, d.nombreApellido, d.estado, d.motivo, d.jornada || "N/D",
              d.diasAutorizados, formatDate(d.fechaInicioLicencia), formatDate(d.fechaFinLicencia), ""
            ]);
            d.suplentes.forEach(s => {
              docentesData.push([
                esc.escuela, esc.de, s.cargo, s.nombreApellido, s.estado, s.motivo, s.jornada || "N/D", "", "", "", "Suplente"
              ]);
            });
          });
        });
        const wsDocentes = XLSX.utils.aoa_to_sheet(docentesData);
        XLSX.utils.book_append_sheet(workbook, wsDocentes, "Docentes");
        
        // Hoja 3: Alumnos
        const alumnosData = [];
        alumnosData.push(["Escuela", "DE", "Grado/Sala", "Nombre", "Diagnóstico", "Observaciones"]);
        data.forEach(esc => {
          esc.alumnos.forEach(a => {
            alumnosData.push([esc.escuela, esc.de, a.gradoSalaAnio, a.nombre, a.diagnostico, a.observaciones]);
          });
        });
        const wsAlumnos = XLSX.utils.aoa_to_sheet(alumnosData);
        XLSX.utils.book_append_sheet(workbook, wsAlumnos, "Alumnos");
      }
      
      // Generar archivo
      XLSX.writeFile(workbook, `ACDM_Reporte_${new Date().toISOString().split("T")[0]}.xlsx`);
    };
    document.head.appendChild(script);
  }
  
  function doExport() {
    if (formato === "csv") {
      generateCSV();
    } else if (formato === "excel") {
      generateExcel();
    } else {
      // TXT (original)
      const data = filter === "all" ? escuelas : escuelas.filter(e => e.de === filter);
      const lines = [];
      lines.push(`SISTEMA ACDM - REPORTE ${tipo.toUpperCase()}`);
      lines.push(`Generado: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR')}`);
      lines.push(`Desarrollado por: PAPIWEB Desarrollos Informáticos`);
      lines.push("─".repeat(60));
      data.forEach(esc => {
        lines.push(`\n${esc.de} | ${esc.escuela}`);
        lines.push(`Nivel: ${esc.nivel} | Jornada: ${esc.jornada} | Turno: ${esc.turno}`);
        lines.push(`Dirección: ${esc.direccion}`);
        lines.push(`Mail: ${esc.mail} | Tel: ${esc.telefonos.join(", ")}`);
        if (tipo !== "mini") {
          lines.push(`\n  DOCENTES (${esc.docentes.length}):`);
          esc.docentes.forEach(d => {
            lines.push(`  - [${d.cargo}] ${d.nombreApellido} (${d.jornada || "N/D"}) — ${d.estado}${d.estado === "Licencia" ? ` (${d.motivo}, hasta ${formatDate(d.fechaFinLicencia)})` : ""}`);
            d.suplentes.forEach(s => lines.push(`      ↳ [${s.cargo}] ${s.nombreApellido} (${s.jornada || "N/D"}) — ${s.estado}`));
          });
          lines.push(`\n  ALUMNOS (${esc.alumnos.length}):`);
          esc.alumnos.forEach(a => lines.push(`  - ${a.gradoSalaAnio}: ${a.nombre} — ${a.diagnostico}`));
        }
        lines.push("─".repeat(60));
      });
      const content = lines.join("\n");
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `ACDM_Reporte_${new Date().toISOString().split("T")[0]}.txt`;
      a.click(); URL.revokeObjectURL(url);
    }
    onClose();
  }
  
  const des = [...new Set(escuelas.map(e => e.de))];
  
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">📄 Exportar Reporte</div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Filtrar por DE</label>
            <select className="form-select" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">Todos los distritos</option>
              {des.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Tipo de Reporte</label>
            <select className="form-select" value={tipo} onChange={e => setTipo(e.target.value)}>
              <option value="completo">Completo (escuelas + docentes + alumnos)</option>
              <option value="docentes">Solo Docentes y Licencias</option>
              <option value="mini">Resumen ejecutivo</option>
            </select>
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label">Formato de Exportación</label>
          <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8}}>
            <button 
              className={`btn ${formato === 'txt' ? 'btn-primary' : 'btn-secondary'}`}
              style={{textAlign:'center'}}
              onClick={() => setFormato('txt')}>
              📄 TXT
            </button>
            <button 
              className={`btn ${formato === 'csv' ? 'btn-primary' : 'btn-secondary'}`}
              style={{textAlign:'center'}}
              onClick={() => setFormato('csv')}>
              📊 CSV (Excel)
            </button>
            <button 
              className={`btn ${formato === 'excel' ? 'btn-primary' : 'btn-secondary'}`}
              style={{textAlign:'center'}}
              onClick={() => setFormato('excel')}>
              📈 Excel
            </button>
          </div>
        </div>
        
        {/* Preview */}
        <div className="pdf-preview" style={{fontSize:12, maxHeight:'300px', overflowY:'auto'}}>
          <div className="pdf-header">
            <div className="pdf-title">Sistema ACDM — Reporte {tipo}</div>
            <div className="pdf-sub">Formato: {formato.toUpperCase()} · {new Date().toLocaleDateString('es-AR')}</div>
          </div>
          {(filter === "all" ? escuelas : escuelas.filter(e => e.de === filter)).slice(0, 3).map(esc => (
            <div key={esc.id} style={{marginBottom:12, paddingBottom:8, borderBottom:'1px solid #ddd'}}>
              <div style={{fontWeight:700, color:'#0066aa'}}>{esc.de} — {esc.escuela}</div>
              <div style={{fontSize:11, color:'#444'}}>{esc.nivel} | {esc.jornada} | {esc.turno} | {esc.mail}</div>
              {tipo !== "mini" && esc.docentes.slice(0, 2).map(d => (
                <div key={d.id} style={{marginLeft:12, marginTop:4, fontSize:11}}>
                  <span style={{fontWeight:700}}>[{d.cargo}]</span> {d.nombreApellido} · <span style={{color:'#0066aa'}}>📅 {d.jornada || 'N/D'}</span> — <span style={{color: d.estado === "Activo" ? "green" : "red"}}>{d.estado}</span>
                  {d.estado === "Licencia" && <span style={{color:'#888'}}> · {d.motivo} hasta {formatDate(d.fechaFinLicencia)}</span>}
                </div>
              ))}
            </div>
          ))}
          <div style={{fontSize:11, color:'#999', marginTop:8}}>*Mostrando vista previa de los primeros registros</div>
        </div>
        
        <div className="flex gap-8 justify-end mt-16">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={doExport}>⬇️ Exportar {formato.toUpperCase()}</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// LOGIN SCREEN
// ============================================================
function Login({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  
  async function doLogin() {
    setErr("");
    try {
      // Intentar login con el backend
      const response = await apiService.login(user, pass);
      if (response.user) {
        apiService.setToken(response.token);
        onLogin(response.user);
        return;
      }
    } catch (backendError) {
      console.log('Backend login fallido, intentando locally', backendError.message);
      // Fallback a localStorage si el backend no está disponible
    }
    
    // Fallback: login local
    const db = loadDB() || INITIAL_DB;
    const found = db.usuarios.find(u => u.username === user && u.passwordHash === btoa(pass));
    if (found) { onLogin(found); setErr(""); }
    else setErr("Credenciales incorrectas");
  }
  
  return (
    <div className="login-container">
      <div className="login-box">
        <div style={{textAlign:'center', marginBottom:24}}>
          <div style={{marginBottom:12, display:'flex', justifyContent:'center'}}>
            <div className="papiweb-logo" style={{padding:'8px 20px'}}>
              <div className="papiweb-text" style={{fontSize:22, letterSpacing:3}}>PAPIWEB</div>
              <div className="papiweb-sub">Desarrollos Informáticos</div>
            </div>
          </div>
          <div className="login-title">Sistema ACDM</div>
          <div className="login-sub">Gestión de Asistentes de Clase</div>
        </div>
        <div className="form-group">
          <label className="form-label">Usuario</label>
          <input className="form-input" value={user} onChange={e => setUser(e.target.value)} onKeyDown={e => e.key === "Enter" && doLogin()} placeholder="Usuario" autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Contraseña</label>
          <input type="password" className="form-input" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && doLogin()} placeholder="••••••••" />
        </div>
        {err && <div className="alert alert-danger" style={{marginBottom:12}}><span>⚠️</span>{err}</div>}
        <button className="btn btn-primary" style={{width:'100%', justifyContent:'center', marginTop:8}} onClick={doLogin}>Ingresar →</button>
      </div>
    </div>
  );
}

// ============================================================
// VISITA MODAL
// ============================================================
function VisitaModal({ visita, isNew, onSave, onClose, escuelas, escuelaId }) {
  const [form, setForm] = useState(visita || { id: `v${Date.now()}`, fecha: "", observaciones: "" });
  const [selectedEscuela, setSelectedEscuela] = useState(escuelaId || "");
  
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{isNew ? "➕ Nueva Visita" : "✏️ Editar Visita"}</div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        {isNew && (
          <div className="form-group">
            <label className="form-label">Seleccionar Escuela</label>
            <select className="form-select" value={selectedEscuela} onChange={e => setSelectedEscuela(e.target.value)}>
              <option value="">-- Seleccionar escuela --</option>
              {escuelas.map(e => <option key={e.id} value={e.id}>{e.escuela} ({e.de})</option>)}
            </select>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Fecha de Visita</label>
          <input type="date" className="form-input" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})} />
        </div>
        <div className="form-group">
          <label className="form-label">Observaciones</label>
          <textarea className="form-textarea" value={form.observaciones} onChange={e => setForm({...form, observaciones: e.target.value})} placeholder="Detalles de la visita..." rows="4"></textarea>
        </div>
        <div className="flex gap-8 justify-end mt-16">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { onSave(form, selectedEscuela || escuelaId); onClose(); }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PROYECTO MODAL
// ============================================================
function ProyectoModal({ proyecto, isNew, onSave, onClose, escuelas, escuelaId }) {
  const [form, setForm] = useState(proyecto || { id: `p${Date.now()}`, nombre: "", estado: "En progreso", descripcion: "", fechaInicio: "", fechaBaja: "" });
  const [selectedEscuela, setSelectedEscuela] = useState(escuelaId || "");
  
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{isNew ? "➕ Nuevo Proyecto" : "✏️ Editar Proyecto"}</div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        {isNew && (
          <div className="form-group">
            <label className="form-label">Seleccionar Escuela</label>
            <select className="form-select" value={selectedEscuela} onChange={e => setSelectedEscuela(e.target.value)}>
              <option value="">-- Seleccionar escuela --</option>
              {escuelas.map(e => <option key={e.id} value={e.id}>{e.escuela} ({e.de})</option>)}
            </select>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Nombre del Proyecto</label>
          <input className="form-input" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Ej: Adaptación de material didáctico" />
        </div>
        <div className="form-group">
          <label className="form-label">Descripción</label>
          <textarea className="form-textarea" value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} placeholder="Detalles del proyecto..." rows="3"></textarea>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Estado</label>
            <select className="form-select" value={form.estado} onChange={e => setForm({...form, estado: e.target.value})}>
              <option>En progreso</option><option>Completado</option><option>Pausado</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Fecha de Inicio</label>
            <input type="date" className="form-input" value={form.fechaInicio} onChange={e => setForm({...form, fechaInicio: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Fecha de Baja/Finalización</label>
            <input type="date" className="form-input" value={form.fechaBaja} onChange={e => setForm({...form, fechaBaja: e.target.value})} />
          </div>
        </div>
        <div className="flex gap-8 justify-end mt-16">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { onSave(form, selectedEscuela || escuelaId); onClose(); }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// INFORME MODAL
// ============================================================
function InformeModal({ informe, isNew, onSave, onClose, escuelas, escuelaId }) {
  const [form, setForm] = useState(informe || { id: `i${Date.now()}`, titulo: "", estado: "Entregado", observaciones: "", fechaEntrega: "" });
  const [selectedEscuela, setSelectedEscuela] = useState(escuelaId || "");
  
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{isNew ? "➕ Nuevo Informe" : "✏️ Editar Informe"}</div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        {isNew && (
          <div className="form-group">
            <label className="form-label">Seleccionar Escuela</label>
            <select className="form-select" value={selectedEscuela} onChange={e => setSelectedEscuela(e.target.value)}>
              <option value="">-- Seleccionar escuela --</option>
              {escuelas.map(e => <option key={e.id} value={e.id}>{e.escuela} ({e.de})</option>)}
            </select>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Título del Informe</label>
          <input className="form-input" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} placeholder="Ej: Informe mensual enero" />
        </div>
        <div className="form-group">
          <label className="form-label">Observaciones / Contenido</label>
          <textarea className="form-textarea" value={form.observaciones} onChange={e => setForm({...form, observaciones: e.target.value})} placeholder="Detalles del informe..." rows="4"></textarea>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Estado</label>
            <select className="form-select" value={form.estado} onChange={e => setForm({...form, estado: e.target.value})}>
              <option>Pendiente</option><option>Entregado</option><option>Revisado</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Fecha de Entrega</label>
            <input type="date" className="form-input" value={form.fechaEntrega} onChange={e => setForm({...form, fechaEntrega: e.target.value})} />
          </div>
        </div>
        <div className="flex gap-8 justify-end mt-16">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { onSave(form, selectedEscuela || escuelaId); onClose(); }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [db, setDB] = useState(() => loadDB() || INITIAL_DB);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [viewMode, setViewMode] = useState("full"); // full | compact | table
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [showExport, setShowExport] = useState(false);
  const [showMailsExtractor, setShowMailsExtractor] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("acdm_darkMode");
    return saved !== null ? saved === "true" : true;
  });
  
  // Modals
  const [escuelaModal, setEscuelaModal] = useState(null);
  const [docenteModal, setDocenteModal] = useState(null);
  const [alumnoModal, setAlumnoModal] = useState(null);
  const [addDocenteTarget, setAddDocenteTarget] = useState(null); // {escuelaId, titularId?}
  const [addAlumnoTarget, setAddAlumnoTarget] = useState(null); // escuelaId
  const [visitaModal, setVisitaModal] = useState(null);
  const [proyectoModal, setProyectoModal] = useState(null);
  const [informeModal, setInformeModal] = useState(null);
  
  const isAdmin = currentUser?.rol === "admin";
  
  // Persist on change (localStorage + backend sync)
  useEffect(() => { 
    if (currentUser) {
      // Siempre guardar en localStorage como respaldo
      saveDB(db);
      // El backend se actualizaría de forma independiente según sea necesario
    }
  }, [db]);
  
  // Persist dark mode preference
  useEffect(() => {
    localStorage.setItem("acdm_darkMode", darkMode);
  }, [darkMode]);
  
  // Keyboard shortcut: Ctrl+Alt+A = admin login
  useEffect(() => {
    function handler(e) {
      if (e.ctrlKey && e.altKey && e.key === "a") {
        const db2 = loadDB() || INITIAL_DB;
        const admin = db2.usuarios.find(u => u.rol === "admin");
        if (admin) setCurrentUser(admin);
      }
      if (e.ctrlKey && e.key === "f") { e.preventDefault(); document.querySelector(".search-main")?.focus(); }
      if (e.ctrlKey && e.key === "e" && isAdmin) setShowExport(true);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isAdmin]);
  
  // DB operations
  function updateEscuelas(updater) {
    setDB(prev => { const next = {...prev, escuelas: updater(prev.escuelas)}; return next; });
  }
  
  function saveEscuela(form) {
    updateEscuelas(escuelas => {
      const idx = escuelas.findIndex(e => e.id === form.id);
      if (idx >= 0) { const a = [...escuelas]; a[idx] = {...a[idx], ...form}; return a; }
      return [...escuelas, form];
    });
  }
  
  function deleteEscuela(id) {
    if (!confirm("¿Eliminar escuela?")) return;
    updateEscuelas(esc => esc.filter(e => e.id !== id));
  }
  
  function addDocente(escuelaId, docForm, titularId) {
    updateEscuelas(escuelas => escuelas.map(esc => {
      if (esc.id !== escuelaId) return esc;
      if (titularId) {
        // Add as suplente to titular
        return { ...esc, docentes: esc.docentes.map(d => d.id === titularId ? { ...d, suplentes: [...(d.suplentes||[]), docForm] } : d) };
      }
      return { ...esc, docentes: [...esc.docentes, { ...docForm, suplentes: docForm.suplentes || [] }] };
    }));
  }
  
  function updateDocente(escuelaId, docForm, titularId) {
    updateEscuelas(escuelas => escuelas.map(esc => {
      if (esc.id !== escuelaId) return esc;
      if (titularId) {
        return { ...esc, docentes: esc.docentes.map(d => d.id === titularId ? { ...d, suplentes: d.suplentes.map(s => s.id === docForm.id ? docForm : s) } : d) };
      }
      return { ...esc, docentes: esc.docentes.map(d => d.id === docForm.id ? { ...docForm, suplentes: d.suplentes } : d) };
    }));
  }
  
  function deleteDocente(escuelaId, docId, titularId) {
    if (!confirm("¿Eliminar docente?")) return;
    updateEscuelas(escuelas => escuelas.map(esc => {
      if (esc.id !== escuelaId) return esc;
      if (titularId) {
        return { ...esc, docentes: esc.docentes.map(d => d.id === titularId ? { ...d, suplentes: d.suplentes.filter(s => s.id !== docId) } : d) };
      }
      return { ...esc, docentes: esc.docentes.filter(d => d.id !== docId) };
    }));
  }
  
  function addAlumno(escuelaId, alumnoForm) {
    updateEscuelas(escuelas => escuelas.map(esc => esc.id !== escuelaId ? esc : { ...esc, alumnos: [...esc.alumnos, alumnoForm] }));
  }
  
  function updateAlumno(escuelaId, alumnoForm) {
    updateEscuelas(escuelas => escuelas.map(esc => esc.id !== escuelaId ? esc : { ...esc, alumnos: esc.alumnos.map(a => a.id === alumnoForm.id ? alumnoForm : a) }));
  }
  
  function deleteAlumno(escuelaId, alumnoId) {
    if (!confirm("¿Eliminar alumno?")) return;
    updateEscuelas(escuelas => escuelas.map(esc => esc.id !== escuelaId ? esc : { ...esc, alumnos: esc.alumnos.filter(a => a.id !== alumnoId) }));
  }
  
  // Visitas
  function addVisita(escuelaId, visitaForm) {
    updateEscuelas(escuelas => escuelas.map(esc => esc.id !== escuelaId ? esc : { ...esc, visitas: [...(esc.visitas || []), visitaForm] }));
  }
  
  function updateVisita(escuelaId, visitaForm) {
    updateEscuelas(escuelas => escuelas.map(esc => esc.id !== escuelaId ? esc : { ...esc, visitas: esc.visitas.map(v => v.id === visitaForm.id ? visitaForm : v) }));
  }
  
  function deleteVisita(escuelaId, visitaId) {
    if (!confirm("¿Eliminar visita?")) return;
    updateEscuelas(escuelas => escuelas.map(esc => esc.id !== escuelaId ? esc : { ...esc, visitas: esc.visitas.filter(v => v.id !== visitaId) }));
  }
  
  // Proyectos
  function addProyecto(escuelaId, proyectoForm) {
    updateEscuelas(escuelas => escuelas.map(esc => esc.id !== escuelaId ? esc : { ...esc, proyectos: [...(esc.proyectos || []), proyectoForm] }));
  }
  
  function updateProyecto(escuelaId, proyectoForm) {
    updateEscuelas(escuelas => escuelas.map(esc => esc.id !== escuelaId ? esc : { ...esc, proyectos: esc.proyectos.map(p => p.id === proyectoForm.id ? proyectoForm : p) }));
  }
  
  function deleteProyecto(escuelaId, proyectoId) {
    if (!confirm("¿Eliminar proyecto?")) return;
    updateEscuelas(escuelas => escuelas.map(esc => esc.id !== escuelaId ? esc : { ...esc, proyectos: esc.proyectos.filter(p => p.id !== proyectoId) }));
  }
  
  // Informes
  function addInforme(escuelaId, informeForm) {
    updateEscuelas(escuelas => escuelas.map(esc => esc.id !== escuelaId ? esc : { ...esc, informes: [...(esc.informes || []), informeForm] }));
  }
  
  function updateInforme(escuelaId, informeForm) {
    updateEscuelas(escuelas => escuelas.map(esc => esc.id !== escuelaId ? esc : { ...esc, informes: esc.informes.map(i => i.id === informeForm.id ? informeForm : i) }));
  }
  
  function deleteInforme(escuelaId, informeId) {
    if (!confirm("¿Eliminar informe?")) return;
    updateEscuelas(escuelas => escuelas.map(esc => esc.id !== escuelaId ? esc : { ...esc, informes: esc.informes.filter(i => i.id !== informeId) }));
  }
  
  const alertCount = db.escuelas.reduce((a, esc) => {
    if (esc.docentes.length === 0) a++;
    esc.docentes.forEach(d => { if (d.estado === "Licencia" && d.fechaFinLicencia && diasRestantes(d.fechaFinLicencia) <= 10) a++; });
    return a;
  }, 0);
  
  const filteredEscuelas = db.escuelas.filter(e =>
    !search || e.escuela.toLowerCase().includes(search.toLowerCase()) ||
    e.de.toLowerCase().includes(search.toLowerCase()) ||
    e.nivel.toLowerCase().includes(search.toLowerCase()) ||
    e.docentes.some(d => d.nombreApellido.toLowerCase().includes(search.toLowerCase())) ||
    e.alumnos.some(a => a.nombre.toLowerCase().includes(search.toLowerCase()))
  );
  
  // Filtrar visitas globalmente
  const filteredVisitas = db.escuelas.map(esc => ({
    ...esc,
    visitas: (!esc.visitas || !search) ? (esc.visitas || []) : esc.visitas.filter(v =>
      v.observaciones.toLowerCase().includes(search.toLowerCase()) ||
      esc.escuela.toLowerCase().includes(search.toLowerCase()) ||
      esc.de.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(esc => !search || esc.visitas.length > 0);
  
  // Filtrar proyectos globalmente
  const filteredProyectos = db.escuelas.map(esc => ({
    ...esc,
    proyectos: (!esc.proyectos || !search) ? (esc.proyectos || []) : esc.proyectos.filter(p =>
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.descripcion.toLowerCase().includes(search.toLowerCase()) ||
      esc.escuela.toLowerCase().includes(search.toLowerCase()) ||
      esc.de.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(esc => !search || esc.proyectos.length > 0);
  
  // Filtrar informes globalmente
  const filteredInformes = db.escuelas.map(esc => ({
    ...esc,
    informes: (!esc.informes || !search) ? (esc.informes || []) : esc.informes.filter(i =>
      i.titulo.toLowerCase().includes(search.toLowerCase()) ||
      i.observaciones.toLowerCase().includes(search.toLowerCase()) ||
      esc.escuela.toLowerCase().includes(search.toLowerCase()) ||
      esc.de.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(esc => !search || esc.informes.length > 0);
  
  if (!currentUser) return <><style>{STYLES}</style><Login onLogin={setCurrentUser} /></>;
  
  const navItems = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "escuelas", icon: "🏫", label: "Escuelas", badge: 0 },
    { id: "visitas", icon: "👁️", label: "Visitas" },
    { id: "proyectos", icon: "📦", label: "Proyectos" },
    { id: "informes", icon: "📋", label: "Informes" },
    { id: "alertas", icon: "🔔", label: "Alertas", badge: alertCount },
    { id: "estadisticas", icon: "📈", label: "Estadísticas" },
    { id: "calendario", icon: "📅", label: "Calendario" },
    { id: "exportar", icon: "📄", label: "Exportar" },
  ];
  
  return (
    <>
      <style>{STYLES}</style>
      <div className={`app ${darkMode ? "" : "light-mode"}`}>
        {/* HEADER */}
        <header className="header">
          <div className="flex items-center gap-16">
            <button className="btn-icon" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{fontSize:18}}>☰</button>
            <div>
              <div className="header-title">🏫 Sistema ACDM</div>
              <div className="header-sub">Gestión de Asistentes Celadores/as para estudiantes con Discapacidad Motora</div>
            </div>
          </div>
          <div className="flex items-center gap-16">
            <div className="search-input-wrap" style={{width:220}}>
              <span className="search-icon">🔍</span>
              <input className="form-input search-main" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." style={{paddingLeft:32}} />
            </div>
            <div className="papiweb-brand">
              <div className="led-dot" />
              <div className="papiweb-logo">
                <div className="papiweb-text">PAPIWEB</div>
                <div className="papiweb-sub">Desarrollos Informáticos</div>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <button className="btn-icon" onClick={() => setDarkMode(!darkMode)} title={darkMode ? "Modo claro" : "Modo oscuro"} style={{fontSize:18}}>{darkMode ? '☀️' : '🌙'}</button>
              <span style={{fontSize:11, color:'var(--text2)'}}>{currentUser.username}</span>
              <span className={`badge ${isAdmin ? "badge-titular" : "badge-active"}`}>{currentUser.rol}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setCurrentUser(null)}>Salir</button>
            </div>
          </div>
        </header>
        
        <div className="main">
          {/* SIDEBAR */}
          <nav className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
            <div className="nav-section" style={{display: sidebarCollapsed ? 'none' : 'block'}}>Navegación</div>
            {navItems.map(item => (
              <div key={item.id} className={`nav-item ${activeSection === item.id ? "active" : ""}`} onClick={() => setActiveSection(item.id)}>
                <span className="nav-icon">{item.icon}</span>
                {!sidebarCollapsed && <span>{item.label}</span>}
                {!sidebarCollapsed && item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
              </div>
            ))}
            
            {isAdmin && !sidebarCollapsed && (
              <>
                <hr className="divider" />
                <div className="nav-section">Admin</div>
                <div className="nav-item" onClick={() => { setEscuelaModal({ isNew: true, data: null }); setActiveSection("escuelas"); }}>
                  <span className="nav-icon">➕</span>
                  <span>Nueva Escuela</span>
                </div>
              </>
            )}
            
            {!sidebarCollapsed && (
              <div style={{padding:'20px 16px', marginTop:'auto'}}>
                <div style={{fontSize:9, color:'var(--text3)', letterSpacing:1, textTransform:'uppercase', lineHeight:1.6}}>
                  Atajos de teclado:<br/>
                  Ctrl+F: Buscar<br/>
                  Ctrl+E: Exportar<br/>
                  Ctrl+Alt+A: Admin
                </div>
              </div>
            )}
          </nav>
          
          {/* CONTENT */}
          <main className="content">
            {/* DASHBOARD */}
            {activeSection === "dashboard" && (
              <div>
                <div className="flex items-center justify-between mb-24">
                  <div>
                    <h1 style={{fontFamily:'Rajdhani', fontSize:28, fontWeight:700, color:'var(--accent)', letterSpacing:2}}>Dashboard</h1>
                    <p style={{color:'var(--text2)', fontSize:13}}>Vista general del sistema — {new Date().toLocaleDateString('es-AR', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</p>
                  </div>
                </div>
                <Statistics escuelas={db.escuelas} />
              </div>
            )}
            
            {/* ESCUELAS */}
            {activeSection === "escuelas" && (
              <div>
                <div className="flex items-center justify-between mb-16">
                  <div>
                    <h1 style={{fontFamily:'Rajdhani', fontSize:28, fontWeight:700, color:'var(--accent)', letterSpacing:2}}>Escuelas</h1>
                    <p style={{color:'var(--text2)', fontSize:13}}>{filteredEscuelas.length} escuela(s) encontrada(s)</p>
                  </div>
                  <div className="flex gap-8 items-center flex-wrap">
                    <div className="view-toggle">
                      <button className={`view-btn ${viewMode === "full" ? "active" : ""}`} onClick={() => setViewMode("full")}>Completo</button>
                      <button className={`view-btn ${viewMode === "compact" ? "active" : ""}`} onClick={() => setViewMode("compact")}>Compacto</button>
                    </div>
                    {isAdmin && <button className="btn btn-primary" onClick={() => setEscuelaModal({ isNew: true, data: null })}>➕ Nueva Escuela</button>}
                  </div>
                </div>
                
                {filteredEscuelas.length === 0 && <div className="no-data card">No se encontraron escuelas. {isAdmin && <button className="btn btn-primary btn-sm" style={{marginLeft:8}} onClick={() => setEscuelaModal({isNew:true,data:null})}>Crear primera escuela</button>}</div>}
                
                <div style={{display:'flex', flexDirection:'column', gap:12}}>
                  {filteredEscuelas.map(esc => (
                    <EscuelaDetail key={esc.id} esc={esc} viewMode={viewMode} isAdmin={isAdmin}
                      onEdit={() => setEscuelaModal({ isNew: false, data: esc })}
                      onDelete={() => deleteEscuela(esc.id)}
                      onAddDocente={(escId, titularId) => setDocenteModal({ isNew: true, escuelaId: escId, titularId: titularId || null, data: null })}
                      onEditDocente={(escId, doc, titularId) => setDocenteModal({ isNew: false, escuelaId: escId, titularId: titularId || null, data: doc })}
                      onDeleteDocente={deleteDocente}
                      onAddAlumno={(escId) => setAlumnoModal({ isNew: true, escuelaId: escId, data: null })}
                      onEditAlumno={(escId, alumno) => setAlumnoModal({ isNew: false, escuelaId: escId, data: alumno })}
                      onDeleteAlumno={deleteAlumno}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* ALERTAS */}
            {activeSection === "alertas" && (
              <div>
                <h1 style={{fontFamily:'Rajdhani', fontSize:28, fontWeight:700, color:'var(--accent)', letterSpacing:2, marginBottom:8}}>Centro de Alertas</h1>
                <p style={{color:'var(--text2)', fontSize:13, marginBottom:24}}>{alertCount} alerta(s) activa(s)</p>
                <AlertPanel escuelas={db.escuelas} />
                
                <div className="card mt-16">
                  <div className="card-header"><span className="card-title">📋 Resumen de Licencias Activas</span></div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Escuela</th><th>Docente</th><th>Motivo</th><th>Inicio</th><th>Fin</th><th>Días Rest.</th><th>Suplente</th></tr></thead>
                      <tbody>
                        {db.escuelas.flatMap(esc => esc.docentes.filter(d => d.estado === "Licencia").map(d => (
                          <tr key={`${esc.id}-${d.id}`}>
                            <td style={{maxWidth:180, fontSize:12}}>{esc.escuela}</td>
                            <td style={{fontFamily:'Rajdhani', fontWeight:700}}>{d.nombreApellido}</td>
                            <td style={{fontSize:12}}>{d.motivo}</td>
                            <td style={{fontSize:12}}>{formatDate(d.fechaInicioLicencia)}</td>
                            <td style={{fontSize:12}}>{formatDate(d.fechaFinLicencia)}</td>
                            <td><DaysRemaining fechaFin={d.fechaFinLicencia} /></td>
                            <td style={{fontSize:12}}>{d.suplentes.length > 0 ? d.suplentes.map(s => s.nombreApellido).join(", ") : <span className="badge badge-danger">SIN SUPLENTE</span>}</td>
                          </tr>
                        )))}
                      </tbody>
                    </table>
                    {db.escuelas.flatMap(e => e.docentes.filter(d => d.estado === "Licencia")).length === 0 && <div className="no-data">No hay licencias activas</div>}
                  </div>
                </div>
              </div>
            )}
            
            {/* ESTADISTICAS */}
            {activeSection === "estadisticas" && (
              <div>
                <h1 style={{fontFamily:'Rajdhani', fontSize:28, fontWeight:700, color:'var(--accent)', letterSpacing:2, marginBottom:24}}>Estadísticas</h1>
                <Statistics escuelas={db.escuelas} />
              </div>
            )}
            
            {/* CALENDARIO */}
            {activeSection === "calendario" && <CalendarioView escuelas={db.escuelas} />}
            
            {/* VISITAS */}
            {activeSection === "visitas" && (
              <div>
                <div className="flex items-center justify-between mb-16">
                  <div>
                    <h1 style={{fontFamily:'Rajdhani', fontSize:28, fontWeight:700, color:'var(--accent)', letterSpacing:2}}>Visitas a Escuelas</h1>
                    <p style={{color:'var(--text2)', fontSize:13}}>Registro de visitas y observaciones a las escuelas</p>
                  </div>
                  {isAdmin && <button className="btn btn-primary" onClick={() => setVisitaModal({ isNew: true, data: null, escuelaId: null })}>➕ Nueva Visita</button>}
                </div>
                {filteredVisitas.length === 0 && search && <div className="no-data card">No se encontraron visitas para "{search}"</div>}
                <div className="card-grid">
                  {filteredVisitas.map(esc => (
                    <div key={esc.id} className="card">
                      <div className="card-header">
                        <span className="card-title">{esc.escuela}</span>
                        <span style={{fontSize:11, color:'var(--text3)'}}>{esc.de}</span>
                      </div>
                      {(!esc.visitas || esc.visitas.length === 0) ? (
                        <div className="no-data">Sin visitas registradas</div>
                      ) : (
                        esc.visitas.map(v => (
                          <div key={v.id} style={{padding:'12px', borderBottom:'1px solid var(--border)', fontSize:13}}>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                              <div>
                                <div style={{fontFamily:'Rajdhani', fontWeight:700, color:'var(--accent)'}}>📅 {formatDate(v.fecha)}</div>
                                <div style={{color:'var(--text2)', marginTop:6, fontSize:12}}>{v.observaciones}</div>
                              </div>
                              {isAdmin && (
                                <div className="flex gap-4">
                                  <button className="btn btn-secondary btn-sm" onClick={() => setVisitaModal({ isNew: false, data: v, escuelaId: esc.id })}>✏️</button>
                                  <button className="btn btn-danger btn-sm" onClick={() => deleteVisita(esc.id, v.id)}>🗑️</button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      {isAdmin && (
                        <button className="btn btn-secondary btn-sm" style={{marginTop:12, width:'100%'}} onClick={() => setVisitaModal({ isNew: true, data: null, escuelaId: esc.id })}>+ Agregar visita</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* PROYECTOS */}
            {activeSection === "proyectos" && (
              <div>
                <div className="flex items-center justify-between mb-16">
                  <div>
                    <h1 style={{fontFamily:'Rajdhani', fontSize:28, fontWeight:700, color:'var(--accent)', letterSpacing:2}}>Proyectos Entregados</h1>
                    <p style={{color:'var(--text2)', fontSize:13}}>Proyectos desarrollados e implementados por los ACDM</p>
                  </div>
                  {isAdmin && <button className="btn btn-primary" onClick={() => setProyectoModal({ isNew: true, data: null, escuelaId: null })}>➕ Nuevo Proyecto</button>}
                </div>
                {filteredProyectos.length === 0 && search && <div className="no-data card">No se encontraron proyectos para "{search}"</div>}
                <div className="card-grid">
                  {filteredProyectos.map(esc => (
                    <div key={esc.id} className="card">
                      <div className="card-header">
                        <span className="card-title">{esc.escuela}</span>
                        <span style={{fontSize:11, color:'var(--text3)'}}>{esc.de}</span>
                      </div>
                      {(!esc.proyectos || esc.proyectos.length === 0) ? (
                        <div className="no-data">Sin proyectos registrados</div>
                      ) : (
                        esc.proyectos.map(p => (
                          <div key={p.id} style={{padding:'12px', borderBottom:'1px solid var(--border)', fontSize:13}}>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                              <div style={{flex:1}}>
                                <div style={{fontFamily:'Rajdhani', fontWeight:700, color:'var(--accent)'}}>{p.nombre}</div>
                                <div style={{color:'var(--text2)', marginTop:4, fontSize:11}}>{p.descripcion}</div>
                                <div style={{marginTop:6, display:'flex', gap:12, fontSize:11}}>
                                  <span className={`badge badge-${p.estado === 'Completado' ? 'active' : 'warning'}`}>{p.estado}</span>
                                  <span style={{color:'var(--text3)'}}>📅 {formatDate(p.fechaInicio)} → {formatDate(p.fechaBaja)}</span>
                                </div>
                              </div>
                              {isAdmin && (
                                <div className="flex gap-4" style={{marginLeft:8}}>
                                  <button className="btn btn-secondary btn-sm" onClick={() => setProyectoModal({ isNew: false, data: p, escuelaId: esc.id })}>✏️</button>
                                  <button className="btn btn-danger btn-sm" onClick={() => deleteProyecto(esc.id, p.id)}>🗑️</button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      {isAdmin && (
                        <button className="btn btn-secondary btn-sm" style={{marginTop:12, width:'100%'}} onClick={() => setProyectoModal({ isNew: true, data: null, escuelaId: esc.id })}>+ Agregar proyecto</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* INFORMES */}
            {activeSection === "informes" && (
              <div>
                <div className="flex items-center justify-between mb-16">
                  <div>
                    <h1 style={{fontFamily:'Rajdhani', fontSize:28, fontWeight:700, color:'var(--accent)', letterSpacing:2}}>Informes Entregados</h1>
                    <p style={{color:'var(--text2)', fontSize:13}}>Informes periódicos entregados por los ACDM</p>
                  </div>
                  {isAdmin && <button className="btn btn-primary" onClick={() => setInformeModal({ isNew: true, data: null, escuelaId: null })}>➕ Nuevo Informe</button>}
                </div>
                {filteredInformes.length === 0 && search && <div className="no-data card">No se encontraron informes para "{search}"</div>}
                <div className="card-grid">
                  {filteredInformes.map(esc => (
                    <div key={esc.id} className="card">
                      <div className="card-header">
                        <span className="card-title">{esc.escuela}</span>
                        <span style={{fontSize:11, color:'var(--text3)'}}>{esc.de}</span>
                      </div>
                      {(!esc.informes || esc.informes.length === 0) ? (
                        <div className="no-data">Sin informes registrados</div>
                      ) : (
                        esc.informes.map(i => (
                          <div key={i.id} style={{padding:'12px', borderBottom:'1px solid var(--border)', fontSize:13}}>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                              <div style={{flex:1}}>
                                <div style={{fontFamily:'Rajdhani', fontWeight:700, color:'var(--accent)'}}>{i.titulo}</div>
                                <div style={{color:'var(--text2)', marginTop:4, fontSize:11}}>{i.observaciones}</div>
                                <div style={{marginTop:6, display:'flex', gap:12, fontSize:11}}>
                                  <span className={`badge badge-${i.estado === 'Entregado' ? 'active' : 'warning'}`}>{i.estado}</span>
                                  <span style={{color:'var(--text3)'}}>📅 {formatDate(i.fechaEntrega)}</span>
                                </div>
                              </div>
                              {isAdmin && (
                                <div className="flex gap-4" style={{marginLeft:8}}>
                                  <button className="btn btn-secondary btn-sm" onClick={() => setInformeModal({ isNew: false, data: i, escuelaId: esc.id })}>✏️</button>
                                  <button className="btn btn-danger btn-sm" onClick={() => deleteInforme(esc.id, i.id)}>🗑️</button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      {isAdmin && (
                        <button className="btn btn-secondary btn-sm" style={{marginTop:12, width:'100%'}} onClick={() => setInformeModal({ isNew: true, data: null, escuelaId: esc.id })}>+ Agregar informe</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* EXPORTAR */}
            {activeSection === "exportar" && (
              <div>
                <h1 style={{fontFamily:'Rajdhani', fontSize:28, fontWeight:700, color:'var(--accent)', letterSpacing:2, marginBottom:24}}>Exportar</h1>
                <div className="card-grid">
                  <div className="card">
                    <div className="card-header"><span className="card-title">Reporte de Datos</span></div>
                    <p style={{color:'var(--text2)', marginBottom:16, fontSize:13}}>Genera reportes en formato texto, CSV o Excel con los datos del sistema.</p>
                    <button className="btn btn-primary" onClick={() => setShowExport(true)}>📄 Generar Reporte</button>
                  </div>
                  
                  <div className="card">
                    <div className="card-header"><span className="card-title">Extraer Mails</span></div>
                    <p style={{color:'var(--text2)', marginBottom:16, fontSize:13}}>Extrae todos los emails de las escuelas. Puedes copiarlos o descargarlos como archivo.</p>
                    <button className="btn btn-primary" onClick={() => setShowMailsExtractor(true)}>✉️ Extraer Emails</button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
      
      {/* MODALS */}
      {escuelaModal && (
        <EscuelaModal isNew={escuelaModal.isNew} escuela={escuelaModal.data}
          onSave={saveEscuela} onClose={() => setEscuelaModal(null)} />
      )}
      {docenteModal && (
        <DocenteModal isNew={docenteModal.isNew} docente={docenteModal.data} titularId={docenteModal.titularId}
          onSave={(form) => docenteModal.isNew ? addDocente(docenteModal.escuelaId, form, docenteModal.titularId) : updateDocente(docenteModal.escuelaId, form, docenteModal.titularId)}
          onClose={() => setDocenteModal(null)} />
      )}
      {alumnoModal && (
        <AlumnoModal isNew={alumnoModal.isNew} alumno={alumnoModal.data}
          onSave={(form) => alumnoModal.isNew ? addAlumno(alumnoModal.escuelaId, form) : updateAlumno(alumnoModal.escuelaId, form)}
          onClose={() => setAlumnoModal(null)} />
      )}
      {visitaModal && (
        <VisitaModal isNew={visitaModal.isNew} visita={visitaModal.data} escuelaId={visitaModal.escuelaId}
          onSave={(form, escId) => visitaModal.isNew ? addVisita(escId, form) : updateVisita(escId, form)}
          onClose={() => setVisitaModal(null)} escuelas={db.escuelas} />
      )}
      {proyectoModal && (
        <ProyectoModal isNew={proyectoModal.isNew} proyecto={proyectoModal.data} escuelaId={proyectoModal.escuelaId}
          onSave={(form, escId) => proyectoModal.isNew ? addProyecto(escId, form) : updateProyecto(escId, form)}
          onClose={() => setProyectoModal(null)} escuelas={db.escuelas} />
      )}
      {informeModal && (
        <InformeModal isNew={informeModal.isNew} informe={informeModal.data} escuelaId={informeModal.escuelaId}
          onSave={(form, escId) => informeModal.isNew ? addInforme(escId, form) : updateInforme(escId, form)}
          onClose={() => setInformeModal(null)} escuelas={db.escuelas} />
      )}
      {showExport && <ExportPDF escuelas={db.escuelas} onClose={() => setShowExport(false)} />}
      {showMailsExtractor && <MailsExtractor escuelas={db.escuelas} onClose={() => setShowMailsExtractor(false)} />}
    </>
  );
}

// ============================================================
// MAILS EXTRACTOR
// ============================================================
function MailsExtractor({ escuelas, onClose }) {
  const [formato, setFormato] = useState("lista");
  const [copiadoMsg, setCopiadoMsg] = useState("");
  
  // Extraer todos los mails
  const mails = escuelas
    .filter(esc => esc.mail && esc.mail.trim())
    .map(esc => ({ mail: esc.mail, escuela: esc.escuela, de: esc.de }));
  
  const mailsUnicos = [...new Set(mails.map(m => m.mail))];
  
  // Copiar al portapapeles
  function copiarAlPortapapeles() {
    const texto = formato === "lista" 
      ? mailsUnicos.join("\n")
      : mailsUnicos.join(", ");
    
    navigator.clipboard.writeText(texto).then(() => {
      setCopiadoMsg("✓ Copiado al portapapeles");
      setTimeout(() => setCopiadoMsg(""), 2000);
    }).catch(() => {
      alert("Error al copiar. Por favor intenta de nuevo.");
    });
  }
  
  // Descargar archivo
  function descargarArchivo() {
    const contenido = mails.map(m => `${m.mail},${m.escuela},${m.de}`).join("\n");
    const encabezado = "Email,Escuela,Distrito Escolar\n";
    const blob = new Blob([encabezado + contenido], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emails_acdm_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{maxWidth: '600px'}}>
        <div className="modal-header">
          <div className="modal-title">✉️ Extractor de Emails</div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        
        <div style={{marginBottom: 16, padding: '12px', background: 'rgba(0,212,255,0.1)', borderRadius: 8, fontSize: 13}}>
          <strong>Total de emails únicos:</strong> {mailsUnicos.length}
        </div>
        
        <div className="form-group">
          <label className="form-label">Formato</label>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8}}>
            <button 
              className={`btn ${formato === 'lista' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFormato('lista')}>
              📋 Listado (línea x línea)
            </button>
            <button 
              className={`btn ${formato === 'comas' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFormato('comas')}>
              🔗 Separado por comas
            </button>
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label">Vista Previa</label>
          <textarea 
            className="form-textarea" 
            value={formato === 'lista' ? mailsUnicos.join("\n") : mailsUnicos.join(", ")}
            readOnly
            rows="6"
            style={{fontFamily: 'monospace', fontSize: 12}}
          />
        </div>
        
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16}}>
          <button 
            className="btn btn-primary" 
            onClick={copiarAlPortapapeles}
            style={{justifyContent: 'center'}}>
            {copiadoMsg ? copiadoMsg : "📋 Copiar"}
          </button>
          <button 
            className="btn btn-primary" 
            onClick={descargarArchivo}
            style={{justifyContent: 'center'}}>
            💾 Descargar CSV
          </button>
        </div>
        
        <div style={{fontSize: 12, color: 'var(--text2)', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: 8}}>
          <strong>Detalles:</strong><br/>
          {mails.map((m, i) => (
            <div key={i} style={{marginTop: 4}}>
              <span style={{color: 'var(--accent)'}}>{m.mail}</span> <span style={{fontSize: 11, color: 'var(--text3)'}}>— {m.escuela} ({m.de})</span>
            </div>
          ))}
        </div>
        
        <div className="flex gap-8 justify-end mt-16">
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CALENDARIO VIEW
// ============================================================
function CalendarioView({ escuelas }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  
  const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const dayNames = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  
  function navCal(d) {
    let m = month + d; let y = year;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    setMonth(m); setYear(y);
  }
  
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  // Get events per day
  function getEventsForDay(d) {
    const date = new Date(year, month, d);
    const events = [];
    escuelas.forEach(esc => {
      esc.docentes.forEach(doc => {
        if (doc.fechaInicioLicencia && doc.fechaFinLicencia) {
          const s = new Date(doc.fechaInicioLicencia);
          const e = new Date(doc.fechaFinLicencia);
          if (date >= s && date <= e) {
            events.push({ type: "licencia", name: doc.nombreApellido, esc: esc.escuela, motivo: doc.motivo });
          }
        }
      });
    });
    return events;
  }
  
  const dayEvents = selectedDay ? getEventsForDay(selectedDay) : [];
  const today = new Date();
  
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  
  return (
    <div>
      <h1 style={{fontFamily:'Rajdhani', fontSize:28, fontWeight:700, color:'var(--accent)', letterSpacing:2, marginBottom:24}}>Calendario Interactivo</h1>
      <div style={{display:'grid', gridTemplateColumns:'1fr 320px', gap:24}}>
        <div className="card">
          <div className="flex items-center justify-between mb-16">
            <button className="btn btn-secondary" onClick={() => navCal(-1)}>◀ Anterior</button>
            <div style={{fontFamily:'Rajdhani', fontSize:22, fontWeight:700, color:'var(--accent)', letterSpacing:2}}>{monthNames[month]} {year}</div>
            <button className="btn btn-secondary" onClick={() => navCal(1)}>Siguiente ▶</button>
          </div>
          
          <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:4}}>
            {dayNames.map(n => (
              <div key={n} style={{textAlign:'center', padding:'8px 4px', fontSize:11, color:'var(--text3)', fontWeight:700, letterSpacing:1, textTransform:'uppercase'}}>{n}</div>
            ))}
            {cells.map((d, i) => {
              const events = d ? getEventsForDay(d) : [];
              const isToday = d && today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
              const isSelected = d === selectedDay;
              return (
                <div key={i} onClick={() => d && setSelectedDay(d)} style={{
                  minHeight:60, padding:'6px 8px', borderRadius:8, cursor: d ? 'pointer' : 'default',
                  background: isSelected ? 'rgba(0,212,255,0.15)' : isToday ? 'rgba(0,212,255,0.08)' : events.length > 0 ? 'rgba(255,71,87,0.08)' : 'var(--card2)',
                  border: isSelected ? '1px solid var(--accent)' : isToday ? '1px solid rgba(0,212,255,0.4)' : '1px solid transparent',
                  transition: 'all 0.15s',
                }}>
                  {d && <>
                    <div style={{fontSize:13, fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--accent)' : 'var(--text)'}}>{d}</div>
                    {events.slice(0, 2).map((ev, j) => (
                      <div key={j} style={{fontSize:9, background:'rgba(255,71,87,0.3)', color:'var(--red)', borderRadius:3, padding:'1px 4px', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>🔴</div>
                    ))}
                    {events.length > 2 && <div style={{fontSize:9, color:'var(--text3)'}}>+{events.length-2}</div>}
                  </>}
                </div>
              );
            })}
          </div>
        </div>
        
        <div>
          {selectedDay ? (
            <div className="card">
              <div className="card-header">
                <span className="card-title">{selectedDay} de {monthNames[month]}</span>
                <button className="btn-icon" onClick={() => setSelectedDay(null)}>✕</button>
              </div>
              {dayEvents.length === 0 ? (
                <div style={{color:'var(--text3)', fontSize:13, padding:'20px 0'}}>Sin eventos para este día</div>
              ) : (
                dayEvents.map((ev, i) => (
                  <div key={i} className="alert alert-danger" style={{marginBottom:8}}>
                    <span>🔴</span>
                    <div>
                      <strong>{ev.name}</strong><br/>
                      <span style={{fontSize:12}}>{ev.esc}</span><br/>
                      <span style={{fontSize:11, opacity:0.8}}>{ev.motivo}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="card">
              <div className="card-header"><span className="card-title">📋 Licencias del Mes</span></div>
              {escuelas.flatMap(esc => esc.docentes.filter(d => {
                if (!d.fechaInicioLicencia) return false;
                const s = new Date(d.fechaInicioLicencia);
                const e = d.fechaFinLicencia ? new Date(d.fechaFinLicencia) : s;
                return s.getMonth() <= month && e.getMonth() >= month && s.getFullYear() <= year && e.getFullYear() >= year;
              }).map(d => ({...d, esc: esc.escuela}))).map((d, i) => (
                <div key={i} className="docente-row" style={{marginBottom:8}}>
                  <div style={{fontFamily:'Rajdhani', fontWeight:700}}>{d.nombreApellido}</div>
                  <div style={{fontSize:11, color:'var(--text2)', marginTop:2}}>{d.esc}</div>
                  <div style={{fontSize:11, color:'var(--yellow)', marginTop:2}}>{d.motivo}</div>
                  <div style={{fontSize:11, color:'var(--text3)', marginTop:2}}>{formatDate(d.fechaInicioLicencia)} → {formatDate(d.fechaFinLicencia)}</div>
                </div>
              ))}
              {escuelas.flatMap(esc => esc.docentes.filter(d => d.fechaInicioLicencia)).length === 0 && (
                <div className="no-data">Sin licencias registradas</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
