document.addEventListener('DOMContentLoaded', () => {

  const pauseBtn = document.getElementById("pauseBtn");
  const ajustesBtn = document.getElementById("ajustesBtn");

  const modalPausa = document.getElementById("modalPausa");
  const modalAjustes = document.getElementById("modalAjustes");

  const cerrarModalPausa = document.getElementById("cerrarModalPausa");
  const cerrarModalAjustes = document.getElementById("cerrarModalAjustes");

  const salirBtn = document.getElementById("salirBtn");
  const casaBtn = document.getElementById("casaBtn");
  const reiniciarBtn = document.getElementById("reiniciarBtn");
  const explorarBtn = document.getElementById("explorarBtn");
  const continuarBtn = document.getElementById("continuarBtn");

  // Función para cambiar el estado de pausa, usando la API de Three.js si está cargada
  const togglePause = (estado) => {
    if (window.GameApi && typeof window.GameApi.setPauseState === 'function') {
      window.GameApi.setPauseState(estado);
    }
  };

  // Función para obtener el estado de pausa
  const isPaused = () => {
    if (window.GameApi && typeof window.GameApi.isGamePaused === 'function') {
      return window.GameApi.isGamePaused();
    }
    return false; // Asumir no pausado si la API no está lista
  };


  // Funcionalidad de Pausa/Ajustes
  if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
      togglePause(true);
      if (modalPausa) modalPausa.style.display = "flex";
    });
  }

  if (ajustesBtn) {
    ajustesBtn.addEventListener("click", () => {
      togglePause(true);
      if (modalAjustes) modalAjustes.style.display = "flex";
    });
  }

  // Funcionalidad de Cerrar Modales
  if (cerrarModalPausa) { cerrarModalPausa.addEventListener("click", () => { togglePause(false); if (modalPausa) modalPausa.style.display = "none"; }); }
  if (cerrarModalAjustes) { cerrarModalAjustes.addEventListener("click", () => { togglePause(false); if (modalAjustes) modalAjustes.style.display = "none"; }); }
  if (continuarBtn) { continuarBtn.addEventListener("click", () => { togglePause(false); if (modalPausa) modalPausa.style.display = "none"; }); }

  // Lógica de Navegación
  if (salirBtn) { salirBtn.addEventListener("click", () => { window.location.href = "inicio.html"; }); }
  if (explorarBtn) { explorarBtn.addEventListener("click", () => { window.location.href = "world.html"; }); }
  if (casaBtn) { casaBtn.addEventListener("click", () => { window.location.href = "casa.html"; }); }
  if (reiniciarBtn) { reiniciarBtn.addEventListener("click", () => { window.location.href = "world.html"; }); }


  // Cerrar modales con click fuera
  window.addEventListener("click", (event) => {
    if (modalPausa && event.target === modalPausa) {
      togglePause(false); modalPausa.style.display = "none";
    }
    if (modalAjustes && event.target === modalAjustes) {
      togglePause(false); modalAjustes.style.display = "none";
    }
  });

  // Cerrar modales con Escape
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modalPausa && modalAjustes) {
      if (modalPausa.style.display === "flex") {
        togglePause(false); modalPausa.style.display = "none";
      } else if (modalAjustes.style.display === "flex") {
        togglePause(false); modalAjustes.style.display = "none";
      } else {
        togglePause(true); modalPausa.style.display = "flex";
      }
    }
  });
});
// ----------------------------------------------------
// LÓGICA DE SOCKET.IO Y MULTIJUGADOR (Siempre se ejecuta)
// ----------------------------------------------------

// La variable 'io' se define en el HTML.
const socket = io();

const USUARIO_AUTENTICADO = {
  id: parseInt(window.localStorage.getItem('userId')),
  username: window.localStorage.getItem('username'),
  currentWorld: window.location.pathname.substring(window.location.pathname.lastIndexOf('/') + 1)
};

window.sendHamsterMovement = function (positionData) {
  socket.emit('movimiento jugador', positionData);
};

let pendingPlayersList = null;
let isGameApiReady = false;

function checkGameApiAndConnect() {
  const GameApi = window.GameApi;
  if (USUARIO_AUTENTICADO.id && USUARIO_AUTENTICADO.username) {

    if (GameApi && typeof GameApi.createRemoteHamster === 'function') {

      // ¡GameApi está lista!
      isGameApiReady = true;

      socket.emit('usuario conectado', {
        userId: USUARIO_AUTENTICADO.id,
        username: USUARIO_AUTENTICADO.username,
        currentWorld: USUARIO_AUTENTICADO.currentWorld
      });

      window.GameApi.createRemoteHamster(socket.id, USUARIO_AUTENTICADO.username, null, true);
      if (pendingPlayersList) {
        console.log('Procesando lista de jugadores pendientes:', pendingPlayersList);
        pendingPlayersList.forEach(p => {
          window.GameApi.createRemoteHamster(p.id, p.username);
        });
        pendingPlayersList = null; // Limpiamos la cola
      }
    } else {
      // Esperamos y reintentamos si Three.js/GameApi no está listo
      setTimeout(checkGameApiAndConnect, 100);
    }
  } else {
    // Sesión no encontrada, redireccionar
    console.warn('Sesión no encontrada. Redirigiendo a login.');
    window.location.href = "inicio.html";
  }
}

// ----------------------------------------------------
// MANEJO DE EVENTOS DE SOCKET
// ----------------------------------------------------

socket.on('connect', () => {
  // Al conectarse el socket, iniciamos el chequeo de la API del juego
  checkGameApiAndConnect();
});

socket.on('jugadores en línea', (lista) => {
  if (isGameApiReady) {
    // Si la API ya está lista, la procesamos inmediatamente
    console.log('jugadores en línea recibidos y procesados:', lista);
    lista.forEach(p => {
      window.GameApi.createRemoteHamster(p.id, p.username);
    });
  } else {
    // Si la API aún no está lista, almacenamos el evento
    console.log('jugadores en línea recibidos y en espera:', lista);
    pendingPlayersList = lista;
  }
});


socket.on('nuevo jugador', (data) => {
  if (window.GameApi) window.GameApi.createRemoteHamster(data.id, data.username);
});

socket.on('actualizar posición', (data) => {
  if (data.id !== socket.id && window.GameApi) {
    window.GameApi.updateRemoteHamsterPosition(data.id, data.x, data.y, data.z, data.rotationY);
  }
});



socket.on('jugador desconectado', (data) => {
  if (window.GameApi) window.GameApi.removeRemoteHamster(data.id);
});