import './style.css';
import huatulcoImg from './src/assets/huatulco.jpg';
import huatulcoPortada from './src/assets/huatulco_portada.jpg';
import colimaImg from './src/assets/portada.jpeg';

const NUM_ROOMS = {
    'Huatulco': 57,
    'Colima': 30
};
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxB0vqxRc5opINc15oX6QMmTSpH0ZRX-HOFlvFW_yQKFEnJ1yadghuSI6LK37HkFIoo/exec';

const AUDIT_STRUCTURE = [
    {
        id: "habitacion",
        title: "🛏️ Habitación",
        subsections: [
            { id: "hab_puertas", title: "🚪 Puertas", points: ["✨ Limpieza", "🔒 Candado"] },
            { id: "hab_paredes", title: "🧱 Paredes Y Piso", points: ["💡 Apagadores", "🪵 Soclos", "🪟 Ventanas", "🧱 Paredes", "🧹 Piso"] },
            { id: "hab_muebles", title: "🪑 Muebles", points: ["📝 Escritorio", "👕 Closet", "📺 Repisa de TV", "🧣 Cortineros", "🪆 Buros", "🛋️ Lámparas", "🪞 Espejos", "🪑 Silla"] },
            { id: "hab_amenidades", title: "☕ Amenidades", points: ["☕ Café", "💧 Botella de Agua", "👔 Ganchos", "🛍️ Bolsa de Lavandería"] },
            { id: "hab_electricos", title: "🔌 Eléctricos", points: ["💡 Focos Funcionando", "❄️ Aire Acondicionado Funcionando", "📺 TV Limpia y funcionando", "📞 Teléfono Funcionando", "☕ Cafetera Funcionando", "🧊 Frigobar Funcionando", "🕰️ Microondas"] },
            { id: "hab_camas", title: "🛌 Camas", points: ["🛏️ Tendido", "☁️ Almohadas Alineadas", "✨ Limpieza Cabeceras", "🧣 Camino de Cama", "🧼 Base de Cama", "🧹 Bajo Cama"] },
            { id: "hab_cortinas", title: "🪟 Cortinas", points: ["✨ Limpieza"] }
        ]
    },
    {
        id: "bano",
        title: "🚿 Baño",
        subsections: [
            { id: "bano_amenidades", title: "🧴 Amenidades", points: ["🧴 Shampoo", "🧼 Jabón", "🧻 Papel Higienico", "👞 Lustra Calzado"] },
            { id: "bano_lavabo", title: "🚰 Lavabo", points: ["🪞 Limpieza Espejo", "✨ Limpieza Lavabo"] },
            { id: "bano_wc", title: "🚽 WC", points: ["✨ Limpio y sin mal olor", "💧 Tanque limpio", "🌀 Extractor Limpio"] },
            { id: "bano_ducha", title: "🛁 Ducha", points: ["🧹 Piso", "🧱 Paredes", "🚰 Cromos", "🚿 Cortina/Cristal", "🧼 Jabonera", "🕳️ Coladera", "📏 Rieles"] }
        ]
    },
    {
        id: "terraza",
        title: "🌅 Terraza",
        hasCondition: true,
        subsections: [
            { id: "terraza_limpieza", title: "✨ Limpieza", points: ["🪟 Cristales", "📏 Rieles", "🧱 Muro", "🧹 Piso"] }
        ]
    }
];

function getSavedCompletedRooms(hotel) {
    if (!hotel) return [];
    try {
        const saved = JSON.parse(localStorage.getItem(`${hotel}_completedRooms_date`));
        const today = new Date().toLocaleDateString('es-ES');
        if (saved && saved.date === today) {
            return saved.rooms || [];
        }
    } catch (e) {}
    return [];
}

function saveCompletedRooms() {
    if (!state.selectedHotel) return;
    localStorage.setItem(`${state.selectedHotel}_completedRooms_date`, JSON.stringify({
        date: new Date().toLocaleDateString('es-ES'),
        rooms: state.completedRooms
    }));
}

let state = {
    selectedHotel: localStorage.getItem('selectedHotel') || null,
    auditorName: localStorage.getItem('auditorName') || null,
    selectedRoom: null,
    selectedAuditada: null,
    currentAudit: {}, // "hab_puertas_0": { status: "Completo", comment: "" }
    openSection: null, 
    openSubsection: null, 
    terrazaStatus: null, 
    pendingSyncs: [],
    completedRooms: getSavedCompletedRooms(localStorage.getItem('selectedHotel')),
    isOnline: navigator.onLine
};

const appDiv = document.getElementById('app');

function init() {
    const savedPending = localStorage.getItem('pendingAudits');
    if (savedPending) state.pendingSyncs = JSON.parse(savedPending);

    setupNetworkListeners();
    render();
}

function savePendingSyncs() {
    localStorage.setItem('pendingAudits', JSON.stringify(state.pendingSyncs));
    renderHeader();
}

function setupNetworkListeners() {
    window.addEventListener('online', () => {
        state.isOnline = true;
        renderHeader();
        showToast('Conexión restaurada 🌐');
        if (state.pendingSyncs.length > 0) syncData();
    });
    window.addEventListener('offline', () => {
        state.isOnline = false;
        renderHeader();
        showToast('Modo Offline Activado 📴');
    });
}

function render() {
    if (!state.selectedHotel) {
        appDiv.innerHTML = renderHotelSelector();
        return;
    }
    if (!state.auditorName) {
        appDiv.innerHTML = renderLoginModal();
        return;
    }

    appDiv.innerHTML = `
        ${renderHeaderHTML()}
        <main>
            <div class="rooms-pane">
                <div class="pane-title">🏠 Habitaciones</div>
                <div class="rooms-grid">
                    ${Array.from({ length: NUM_ROOMS[state.selectedHotel] || 30 }, (_, i) => i + 1).map(num => `
                        <button class="room-btn ${state.completedRooms.includes(num) ? 'completed-room' : ''} ${state.selectedRoom === num ? 'active-room' : ''}" onclick="selectRoom(${num})">
                            ${num}
                        </button>
                    `).join('')}
                </div>
            </div>
            <div id="audit-pane" class="audit-pane">
                ${renderAuditPane()}
            </div>
        </main>
        <div id="toast" class="toast"></div>
    `;
}

function renderHeaderHTML() {
    return `
        <header id="main-header">
            <div class="brand-section">
                <h1>✦ ${state.selectedHotel}</h1>
                ${state.auditorName ? `<span class="auditor-name-display">| Auditora: ${state.auditorName} <a href="#" onclick="changeAuditor()" style="color:#94a3b8; font-size: 0.9rem; margin-left:10px;">(Cambiar)</a></span>` : ''}
            </div>
            <div class="sync-container">
                <div class="network-status ${state.isOnline ? '' : 'offline'}" title="${state.isOnline ? 'Online' : 'Offline'}"></div>
                ${state.pendingSyncs.length > 0 ? `<button id="btn-sync" class="btn-sync" onclick="syncData()">↻ Sincronizar <span class="badge">${state.pendingSyncs.length}</span></button>` : `<div class="btn-sync" style="background:transparent; border-color:transparent; opacity:0.6;">Sincronizado ✔️</div>`}
            </div>
        </header>
    `;
}

function renderHeader() {
    const header = document.getElementById('main-header');
    if (header) {
        header.outerHTML = renderHeaderHTML();
    }
}

function updateAuditPane() {
    const ap = document.getElementById('audit-pane');
    if (ap) ap.innerHTML = renderAuditPane();

    const btns = document.querySelectorAll('.room-btn');
    btns.forEach((btn, idx) => {
        const num = idx + 1;
        btn.classList.remove('active-room');
        if (state.completedRooms.includes(num)) {
            btn.classList.add('completed-room');
        }
        if (state.selectedRoom === num) {
            btn.classList.add('active-room');
        }
    });
}

function isSubsectionComplete(subId) {
    const sec = AUDIT_STRUCTURE.find(s => s.subsections.find(sub => sub.id === subId));
    const sub = sec.subsections.find(s => s.id === subId);
    for (let i = 0; i < sub.points.length; i++) {
        if (!state.currentAudit[`${sub.id}_${i}`]?.status) return false;
    }
    return true;
}

function isSectionComplete(secId) {
    const sec = AUDIT_STRUCTURE.find(s => s.id === secId);
    if (!sec) return false;
    if (sec.id === 'terraza' && state.terrazaStatus === 'No') return true;
    if (sec.id === 'terraza' && !state.terrazaStatus) return false;
    
    for (const sub of sec.subsections) {
        if (!isSubsectionComplete(sub.id)) return false;
    }
    return true;
}

function isAuditComplete() {
    for (const sec of AUDIT_STRUCTURE) {
        if (!isSectionComplete(sec.id)) return false;
    }
    return true;
}

function renderAuditPane() {
    if (!state.selectedRoom) {
        return `
            <div class="empty-state">
                <div class="empty-icon">👈</div>
                Selecciona una habitación de la lista para comenzar a auditar.
            </div>
        `;
    }

    if (!state.selectedAuditada) {
        const auditadas = ["Ruby", "Bianca", "Ivonne", "Maggi"];
        return `
            <div class="audit-header">
                <h2>Habitación ${state.selectedRoom}</h2>
            </div>
            <div class="auditada-selection">
                <div class="auditada-prompt-card">
                    <span style="font-size: 3rem; display:block; margin-bottom: 10px;">👤</span>
                    <p style="margin-bottom: 25px; font-weight: 600; font-size: 1.2rem; color: var(--text-dark);">¿Quién realizó la limpieza?</p>
                    <div class="auditada-grid">
                        ${auditadas.map(name => `
                            <button class="btn-auditada friendly-btn" onclick="selectAuditada('${name}')">${name}</button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    let html = `
        <div class="audit-header">
            <div>
                <h2>Habitación ${state.selectedRoom}</h2>
                <span class="auditada-badge">Limpió: ${state.selectedAuditada}</span>
            </div>
            <button class="btn-save-report glowing" onclick="saveAudit()" ${!isAuditComplete() ? 'disabled' : ''}>
                💾 Guardar Reporte
            </button>
        </div>
        <div class="sections-container">
    `;

    AUDIT_STRUCTURE.forEach(sec => {
        const isSecOpen = state.openSection === sec.id;
        const isSecComplete = isSectionComplete(sec.id);
        
        let secStatusHtml = '';
        if (sec.id === 'terraza' && state.terrazaStatus === 'No') {
            secStatusHtml = '<span class="badge-na">N/A</span>';
        }

        html += `
        <div class="section-card">
            <div class="section-header ${isSecComplete ? 'completed-section-header' : ''}" onclick="toggleSection('${sec.id}')">
                <h3>${sec.title} ${secStatusHtml} ${isSecComplete ? '✅' : ''}</h3>
                <span class="icon">${isSecOpen ? '▼' : '▶'}</span>
            </div>
        `;

        if (isSecOpen) {
            html += `<div class="section-body">`;
            
            if (sec.id === 'terraza') {
                html += `
                <div class="terraza-prompt">
                    <p>¿Tiene terraza esta habitación?</p>
                    <div class="terraza-btns">
                        <button class="btn-terraza ${state.terrazaStatus === 'Si' ? 'selected' : ''}" onclick="setTerraza('Si')">Sí tiene</button>
                        <button class="btn-terraza no-btn ${state.terrazaStatus === 'No' ? 'selected' : ''}" onclick="setTerraza('No')">No tiene</button>
                    </div>
                </div>`;
            }

            if (sec.id !== 'terraza' || state.terrazaStatus === 'Si') {
                sec.subsections.forEach(sub => {
                    const isSubOpen = state.openSubsection === sub.id;
                    const isSubComplete = isSubsectionComplete(sub.id);
                    
                    html += `
                    <div class="subsection-card ${isSubComplete ? 'completed-sub' : ''} ${isSubOpen ? 'active-sub' : ''}">
                        <div class="subsection-header" onclick="toggleSubsection('${sub.id}')">
                            <h4>📄 ${sub.title} ${isSubComplete ? '✅' : ''}</h4>
                            <span class="icon">${isSubOpen ? '▼' : '▶'}</span>
                        </div>
                    `;
                    
                    if (isSubOpen) {
                        html += `<div class="subsection-body">`;
                        sub.points.forEach((pointName, pIdx) => {
                            const key = `${sub.id}_${pIdx}`;
                            const st = state.currentAudit[key]?.status;
                            const comment = state.currentAudit[key]?.comment || '';
                            
                            html += `
                            <div class="point-item">
                                <p class="point-title">• ${pointName}</p>
                                <div class="point-actions-new">
                                    <button class="action-btn-sm good ${st === 'Completo' ? 'selected' : ''}" onclick="setAuditStatus('${sub.id}', ${pIdx}, 'Completo')">Completo</button>
                                    <button class="action-btn-sm bad ${st === 'Incompleto' ? 'selected' : ''}" onclick="setAuditStatus('${sub.id}', ${pIdx}, 'Incompleto')">Incompleto</button>
                                    <button class="action-btn-sm neutral ${st === 'No Aplica' ? 'selected' : ''}" onclick="setAuditStatus('${sub.id}', ${pIdx}, 'No Aplica')">No Aplica</button>
                                </div>
                                <div class="comment-section-sm">
                                    ${comment ? `<div class="comment-text-sm">${comment}</div>` : ''}
                                    <button id="btn-mic-${key}" class="btn-mic-sm" onclick="startDictation('${key}')">
                                        🎤 ${comment ? 'Reescribir comentario' : 'Comentario por Voz'}
                                    </button>
                                </div>
                            </div>`;
                        });
                        html += `</div>`; // .subsection-body
                    }
                    html += `</div>`; // .subsection-card
                });
            }
            html += `</div>`; // .section-body
        }
        html += `</div>`; // .section-card
    });

    html += `</div>`; // .sections-container
    return html;
}

function renderHotelSelector() {
    return `
        <div class="hotel-selector-bg">
            <h2 class="hotel-title-pop">SISTEMA DE AUDITORÍAS</h2>
            <p class="hotel-subtitle-pop">Selecciona la propiedad que vas a inspeccionar</p>
            <div class="hotel-cards-container">
                <div class="hotel-card" onclick="selectHotel('Huatulco')">
                    <img src="${huatulcoImg}" alt="Casa Danna Huatulco">
                    <div class="hotel-card-content">
                        <h3>Casa Danna Huatulco</h3>
                        <p>Playa y Arena →</p>
                    </div>
                </div>
                <div class="hotel-card colima-card" onclick="selectHotel('Colima')">
                    <img src="${colimaImg}" alt="Casa Danna Colima">
                    <div class="hotel-card-content">
                        <h3>Casa Danna Colima</h3>
                        <p>Ciudad y Descanso →</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderLoginModal() {
    const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const bgImg = state.selectedHotel === 'Huatulco' ? huatulcoPortada : colimaImg;
    return `
        <div class="login-bg" style="background: url('${bgImg}') no-repeat center center; background-size: cover;">
            <div class="login-glass-card">
                <h2>${state.selectedHotel === 'Huatulco' ? '🌴 Huatulco' : '🌆 Colima'} 🔍</h2>
                <p style="text-transform: capitalize; font-weight: 500; color: var(--primary); margin-bottom: 20px;">📅 ${today}</p>
                <input type="text" id="auditor-name-input" class="input-large" placeholder="Escribe tu nombre..." autocomplete="off">
                <input type="password" id="auditor-pass-input" class="input-large" placeholder="Clave de seguridad" autocomplete="off" style="margin-top: 15px;">
                <button class="btn-jumbo" onclick="saveAuditorName()" style="margin-top: 25px;">Ingresar</button>
                <div style="margin-top:20px;"><a href="#" onclick="changeHotel()" style="color:#64748b; font-size:0.9rem; text-decoration: underline;">← Elegir otra propiedad</a></div>
            </div>
        </div>
    `;
}

// ---- ACTIONS ----

window.saveAuditorName = function () {
    const nameInput = document.getElementById('auditor-name-input').value.trim();
    const passInput = document.getElementById('auditor-pass-input').value.trim();
    
    if (nameInput.length < 2) return alert("Por favor ingresa un nombre válido.");
    
    const requiredPass = state.selectedHotel === 'Huatulco' ? '2303' : '8909';
    if (passInput !== requiredPass) return alert("Clave de seguridad incorrecta. Intenta nuevamente.");
    
    state.auditorName = nameInput;
    localStorage.setItem('auditorName', nameInput);
    render();
};

window.changeAuditor = function () {
    state.auditorName = null;
    localStorage.removeItem('auditorName');
    render();
};

window.changeHotel = function () {
    state.selectedHotel = null;
    state.auditorName = null;
    localStorage.removeItem('selectedHotel');
    localStorage.removeItem('auditorName');
    render();
};

window.selectHotel = function (hotel) {
    state.selectedHotel = hotel;
    localStorage.setItem('selectedHotel', hotel);
    state.completedRooms = getSavedCompletedRooms(hotel);
    render();
};

window.selectRoom = function (num) {
    state.selectedRoom = num;
    state.selectedAuditada = null; 
    state.currentAudit = {}; 
    state.openSection = null;
    state.openSubsection = null;
    state.terrazaStatus = null;
    updateAuditPane();
    const ap = document.getElementById('audit-pane');
    if (ap) ap.scrollTo(0, 0);
};

window.selectAuditada = function (name) {
    state.selectedAuditada = name;
    updateAuditPane();
};

window.toggleSection = function (secId) {
    if (state.openSection === secId) {
        state.openSection = null;
    } else {
        state.openSection = secId;
    }
    updateAuditPane();
};

window.toggleSubsection = function (subId) {
    if (state.openSubsection === subId) {
        if (!isSubsectionComplete(subId)) {
            showToast("Debes calificar todos los puntos antes de cerrar.");
            return;
        }
        state.openSubsection = null;
    } else {
        state.openSubsection = subId;
    }
    updateAuditPane();
};

window.setTerraza = function(val) {
    state.terrazaStatus = val;
    if (val === 'No') {
        state.openSubsection = null;
        state.openSection = null; // Cierra la sección completa si es No
    } else {
        if (isSectionComplete('terraza')) {
            state.openSection = null;
        }
    }
    updateAuditPane();
};

window.setAuditStatus = function (subId, pIdx, value) {
    if (navigator.vibrate) navigator.vibrate(20); // Ligero toque háptico

    const key = `${subId}_${pIdx}`;
    if (!state.currentAudit[key]) state.currentAudit[key] = {};
    state.currentAudit[key].status = value;
    
    if (isSubsectionComplete(subId)) {
        state.openSubsection = null; // Cierra en automático
        
        // Verifica si TODA LA SECCIÓN se completó con esta respuesta
        const parentSec = AUDIT_STRUCTURE.find(s => s.subsections.find(sub => sub.id === subId));
        if (parentSec) {
            if (isSectionComplete(parentSec.id)) {
                state.openSection = null; // CIERRA TODA LA SECCIÓN
                showToast("¡Sección " + parentSec.title.split(' ')[1] + " Completada! 🎉");
            } else {
                showToast("¡Subsección completada!");
            }
        }
    }
    updateAuditPane();
};

window.startDictation = function (key) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Tu dispositivo no soporta dictado por voz.");

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-MX';
    
    const btn = document.getElementById(`btn-mic-${key}`);
    btn.classList.add('recording');
    btn.innerHTML = '🔴 Escuchando...';

    recognition.onresult = (event) => {
        if (!state.currentAudit[key]) state.currentAudit[key] = {};
        state.currentAudit[key].comment = event.results[0][0].transcript;
        btn.classList.remove('recording');
        updateAuditPane();
    };

    recognition.onerror = (event) => {
        showToast("Error de micrófono: " + event.error);
        btn.classList.remove('recording');
    };

    recognition.onend = () => {
        btn.classList.remove('recording');
        if (state.currentAudit[key]?.comment) {
            btn.innerHTML = '🎤 Reescribir comentario';
        } else {
            btn.innerHTML = '🎤 Comentario por Voz';
        }
    };

    recognition.start();
};

function prepareAuditDataForSync() {
    const detalles = [];
    let countCompleto = 0;
    let countIncompleto = 0;
    let countNA = 0;

    AUDIT_STRUCTURE.forEach(sec => {
        if (sec.id === 'terraza' && state.terrazaStatus === 'No') return;

        // Strip emojis for the Excel report for a cleaner look
        const cleanSecTitle = sec.title.replace(/[\u1000-\uFFFF]+/g, '').trim();

        sec.subsections.forEach(sub => {
            const cleanSubTitle = sub.title.replace(/[\u1000-\uFFFF]+/g, '').trim();

            sub.points.forEach((pointName, pIdx) => {
                const key = `${sub.id}_${pIdx}`;
                const data = state.currentAudit[key];
                if (data) {
                    const cleanPointName = pointName.replace(/[\u1000-\uFFFF]+/g, '').trim();
                    
                    if (data.status === 'Completo') {
                        countCompleto++;
                        if (data.comment) {
                            detalles.push(`✅ [Completado]: ${cleanSubTitle} > ${cleanPointName} | 🗣️ Nota: "${data.comment}"`);
                        }
                    } else if (data.status === 'Incompleto') {
                        countIncompleto++;
                        let texto = `❌ [Falló]: ${cleanSubTitle} > ${cleanPointName}`;
                        if (data.comment) texto += ` | 🗣️ Nota: "${data.comment}"`;
                        detalles.push(texto);
                    } else if (data.status === 'No Aplica') {
                        countNA++;
                        if (data.comment) {
                            detalles.push(`➖ [N/A]: ${cleanSubTitle} > ${cleanPointName} | 🗣️ Nota: "${data.comment}"`);
                        }
                    }
                }
            });
        });
    });

    return {
        fecha: new Date().toISOString(),
        hotel: state.selectedHotel,
        auditora: state.auditorName,
        auditada: state.selectedAuditada,
        habitacion: state.selectedRoom,
        terraza: state.terrazaStatus,
        completo: countCompleto,
        incompleto: countIncompleto,
        na: countNA,
        fallos_str: detalles.join('\n') || '✅ Todo en orden sin observaciones.'
    };
}

window.saveAudit = function () {
    if (!isAuditComplete()) return;

    const auditData = prepareAuditDataForSync();

    if (!state.completedRooms.includes(state.selectedRoom)) {
        state.completedRooms.push(state.selectedRoom);
        saveCompletedRooms();
    }

    state.pendingSyncs.push(auditData);
    savePendingSyncs();

    showToast('¡Reporte guardado localmente! 👏');

    // Reset view
    state.selectedRoom = null;
    state.selectedAuditada = null;
    state.currentAudit = {};
    state.openSection = null;
    state.openSubsection = null;
    state.terrazaStatus = null;
    updateAuditPane();

    if (state.isOnline) {
        syncData();
    }
};

// ---- SYNC ----
async function syncData() {
    if (state.pendingSyncs.length === 0) return;
    const btnSync = document.getElementById('btn-sync');
    if (btnSync) {
        btnSync.innerHTML = '↻ Enviando...';
        btnSync.style.pointerEvents = 'none';
    }

    const syncBatch = [...state.pendingSyncs];
    let successCount = 0;

    for (let i = 0; i < syncBatch.length; i++) {
        try {
            const formData = new URLSearchParams();
            formData.append('data', JSON.stringify(syncBatch[i]));
            await fetch(GAS_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: formData,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            successCount++;
        } catch (error) {
            break;
        }
    }

    if (successCount > 0) {
        state.pendingSyncs.splice(0, successCount);
        savePendingSyncs();
        showToast(`¡Se enviaron ${successCount} reportes!`);
    } else {
        showToast('Error de red. Sincroniza más tarde.');
    }
    renderHeader();
}

let toastTimeout;
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 4000);
}

init();
