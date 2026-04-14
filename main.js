import './style.css';

const NUM_ROOMS = 35;
const CHECKLIST_ITEMS = [
    { id: 'cama', label: 'Cama', icon: '🛏️' },
    { id: 'bano', label: 'Baño', icon: '🚿' },
    { id: 'barra', label: 'Barra', icon: '🍽️' },
    { id: 'basura', label: 'Cestos de basura', icon: '🗑️' },
    { id: 'puertas', label: 'Limpieza en puertas', icon: '🚪' },
    { id: 'ventanas', label: 'Ventanas', icon: '🪟' },
    { id: 'escritorio', label: 'Escritorio', icon: '🪑' },
    { id: 'piso', label: 'Piso', icon: '🧹' },
    { id: 'pelos', label: 'Pelos o peluzas en camas', icon: '🔎' }
];

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxB0vqxRc5opINc15oX6QMmTSpH0ZRX-HOFlvFW_yQKFEnJ1yadghuSI6LK37HkFIoo/exec';

let state = {
    auditorName: localStorage.getItem('auditorName') || null,
    selectedRoom: null,
    currentAudit: {},
    pendingSyncs: [],
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
        showToast('Conexión restaurada');
        if (state.pendingSyncs.length > 0) syncData();
    });
    window.addEventListener('offline', () => {
        state.isOnline = false;
        renderHeader();
        showToast('Modo Offline Activado');
    });
}

function render() {
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
                    ${Array.from({ length: NUM_ROOMS }, (_, i) => i + 1).map(num => `
                        <button class="room-btn ${state.selectedRoom === num ? 'active-room' : ''}" onclick="selectRoom(${num})">
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
                <h1>✦ Casa Danna</h1>
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

    // Update active room classes in the list
    document.querySelectorAll('.room-btn').forEach(btn => btn.classList.remove('active-room'));
    if (state.selectedRoom) {
        const btns = document.querySelectorAll('.room-btn');
        if (btns[state.selectedRoom - 1]) btns[state.selectedRoom - 1].classList.add('active-room');
    }
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

    const isComplete = CHECKLIST_ITEMS.every(item => state.currentAudit[item.id]?.status !== undefined);

    return `
        <div class="audit-header">
            <h2>Auditando: Habitación ${state.selectedRoom}</h2>
            <button class="btn-save-report" onclick="saveAudit()" ${!isComplete ? 'disabled' : ''}>
                💾 Guardar Reporte
            </button>
        </div>
        <div class="checklist">
            ${CHECKLIST_ITEMS.map(item => renderCheckItem(item)).join('')}
        </div>
    `;
}

function renderCheckItem(item) {
    const auditData = state.currentAudit[item.id] || {};
    const st = auditData.status;

    return `
        <div class="check-item">
            <div class="check-item-header">
                ${item.icon} ${item.label}
            </div>
            <div class="check-actions">
                <button class="action-btn good ${st === 'Bien' ? 'selected' : ''}" onclick="setAuditStatus('${item.id}', 'Bien')">😊 Bien</button>
                <button class="action-btn regular ${st === 'Regular' ? 'selected' : ''}" onclick="setAuditStatus('${item.id}', 'Regular')">😐 Regular</button>
                <button class="action-btn bad ${st === 'Mal' ? 'selected' : ''}" onclick="setAuditStatus('${item.id}', 'Mal')">🙁 Mal</button>
            </div>
            <div class="comment-section">
                <div class="comment-text" id="comment-text-${item.id}">${auditData.comment || ''}</div>
                <button id="btn-mic-${item.id}" class="btn-mic" onclick="startDictation('${item.id}')">
                    🎤 ${auditData.comment ? 'Volver a dictar comentario' : 'Agregar comentario por voz'}
                </button>
            </div>
        </div>
    `;
}

function renderLoginModal() {
    const today = new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return `
        <div class="login-bg">
            <div class="login-glass-card">
                <h2>Auditoria de Limpieza 🔍</h2>
                <p style="text-transform: capitalize; font-weight: 500; color: var(--primary); margin-bottom: 20px;">
                    📅 ${today}
                </p>
                <input type="text" id="auditor-name-input" class="input-large" placeholder="Escribe tu nombre..." autocomplete="off">
                <button class="btn-jumbo" onclick="saveAuditorName()">Empezar</button>
            </div>
        </div>
    `;
}

// ---- ACTIONS ----

window.saveAuditorName = function () {
    const input = document.getElementById('auditor-name-input').value.trim();
    if (input.length < 2) {
        alert("Por favor ingresa un nombre válido.");
        return;
    }
    state.auditorName = input;
    localStorage.setItem('auditorName', input);
    render();
};

window.changeAuditor = function () {
    state.auditorName = null;
    localStorage.removeItem('auditorName');
    render();
};

window.selectRoom = function (num) {
    state.selectedRoom = num;
    state.currentAudit = {}; // Reset previous audit data
    updateAuditPane();
    const ap = document.getElementById('audit-pane');
    if (ap) ap.scrollTo(0, 0);
};

window.setAuditStatus = function (id, value) {
    if (!state.currentAudit[id]) state.currentAudit[id] = {};
    state.currentAudit[id].status = value;
    updateAuditPane();
};

window.saveAudit = function () {
    const isComplete = CHECKLIST_ITEMS.every(item => state.currentAudit[item.id]?.status !== undefined);
    if (!isComplete) return;

    const auditData = {
        fecha: new Date().toISOString(),
        auditora: state.auditorName,
        habitacion: state.selectedRoom,
        detalles: state.currentAudit
    };

    state.pendingSyncs.push(auditData);
    savePendingSyncs();

    showToast('¡Reporte guardado localmente! 👏');

    // Reset view
    state.selectedRoom = null;
    state.currentAudit = {};
    updateAuditPane();

    if (state.isOnline) {
        syncData();
    }
};

window.startDictation = function (itemId) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Tu dispositivo o navegador no soporta el dictado por voz. Recomendado: Google Chrome en Android/Tablet.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-MX';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const btn = document.getElementById(`btn-mic-${itemId}`);
    btn.classList.add('recording');
    btn.innerHTML = '🔴 Escuchando... Habla ahora';

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (!state.currentAudit[itemId]) state.currentAudit[itemId] = {};

        // Append or replace? Replace makes it easier if they make a mistake
        state.currentAudit[itemId].comment = transcript;

        btn.classList.remove('recording');
        updateAuditPane();
    };

    recognition.onerror = (event) => {
        showToast("Error de micrófono: " + event.error);
        btn.classList.remove('recording');
        btn.innerHTML = '🎤 Volver a intentar';
    };

    recognition.onend = () => {
        btn.classList.remove('recording');
        // Will re-render normally unless error, if no result, just resets
        if (state.currentAudit[itemId] && state.currentAudit[itemId].comment) {
            btn.innerHTML = '🎤 Volver a dictar comentario';
        } else {
            btn.innerHTML = '🎤 Agregar comentario por voz';
        }
    };

    recognition.start();
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
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            successCount++;
        } catch (error) {
            console.error('Error syncing:', error);
            break;
        }
    }

    if (successCount > 0) {
        state.pendingSyncs.splice(0, successCount);
        savePendingSyncs();
        showToast(`¡Se enviaron ${successCount} reportes al Google Sheet!`);
    } else {
        showToast('Error de red. Usa el botón sincronizar más tarde.');
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
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// Iniciar aplicación
init();
