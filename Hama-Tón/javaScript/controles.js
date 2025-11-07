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

  const toggleVolumen = document.getElementById("toggleVolumen");
  const toggleMusica = document.getElementById("toggleMusica");

  const modalInicio = document.getElementById("modalInicio");
  const easyModeBtn = document.getElementById("easyModeBtn");
  const hardModeBtn = document.getElementById("hardModeBtn");

if (modalInicio) modalInicio.style.display = "flex";

  const togglePause = (estado) => {
    if (window.GameApi && typeof window.GameApi.setPauseState === 'function') {
      window.GameApi.setPauseState(estado);
    }
  };

  const resumeAudio = () => {
    if (window.GameApi && typeof window.GameApi.resumeAudioContext === 'function') {
      window.GameApi.resumeAudioContext();
    }
  };

  const isPaused = () => {
    if (window.GameApi && typeof window.GameApi.isGamePaused === 'function') {
      return window.GameApi.isGamePaused();
    }
    return false;
  };

const startGame = (difficulty) => {
    if (window.GameApi && typeof window.GameApi.startGame === 'function') {
      window.GameApi.startGame(difficulty); 

      if (modalInicio) modalInicio.style.display = "none";
    }
  };

  if (easyModeBtn) {
    easyModeBtn.addEventListener("click", () => { 
      modalInicio.style.display = "none";
      startGame('EASY'); });
    
  }

  if (hardModeBtn) {
    hardModeBtn.addEventListener("click", () => {
      modalInicio.style.display = "none";
      startGame('HARD'); });
  }

  if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
      resumeAudio();
      togglePause(true);
      if (modalPausa) modalPausa.style.display = "flex";
    });
  }

  if (ajustesBtn) {
    ajustesBtn.addEventListener("click", () => {
      resumeAudio();
      togglePause(true);
      if (modalAjustes) modalAjustes.style.display = "flex";
    });
  }

  if (cerrarModalPausa) { cerrarModalPausa.addEventListener("click", () => { togglePause(false); if (modalPausa) modalPausa.style.display = "none"; }); }
  if (cerrarModalAjustes) { cerrarModalAjustes.addEventListener("click", () => { togglePause(false); if (modalAjustes) modalAjustes.style.display = "none"; }); }
  if (continuarBtn) { continuarBtn.addEventListener("click", () => { togglePause(false); if (modalPausa) modalPausa.style.display = "none"; }); }

  if (salirBtn) { salirBtn.addEventListener("click", () => { window.location.href = "inicio.html"; }); }
  if (explorarBtn) { explorarBtn.addEventListener("click", () => { window.location.href = "world.html"; }); }
  if (casaBtn) { casaBtn.addEventListener("click", () => { window.location.href = "casa.html"; }); }
  if (reiniciarBtn) { reiniciarBtn.addEventListener("click", () => { window.location.href = "world.html"; }); }

  window.addEventListener("click", (event) => {
    if (modalPausa && event.target === modalPausa) {
      togglePause(false); modalPausa.style.display = "none";
    }
    if (modalAjustes && event.target === modalAjustes) {
      togglePause(false); modalAjustes.style.display = "none";
    }

    if (toggleVolumen) {
      toggleVolumen.addEventListener("change", () => {
        if (window.GameApi && typeof window.GameApi.setAudioVolume === 'function') {
          window.GameApi.setAudioVolume('master', toggleVolumen.checked);
        }
      });
    }

    if (toggleMusica) {
      toggleMusica.addEventListener("change", () => {
        if (window.GameApi && typeof window.GameApi.setAudioVolume === 'function') {
          window.GameApi.setAudioVolume('music', toggleMusica.checked);
        }
      });
    }

  });

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
        pendingPlayersList = null;
      }
    } else {
      setTimeout(checkGameApiAndConnect, 100);
    }
  } else {
    console.warn('Sesión no encontrada. Redirigiendo a login.');
    window.location.href = "inicio.html";
  }
}



socket.on('connect', () => {
  checkGameApiAndConnect();
});

socket.on('jugadores en línea', (lista) => {
  if (isGameApiReady) {
    console.log('jugadores en línea recibidos y procesados:', lista);
    lista.forEach(p => {
      window.GameApi.createRemoteHamster(p.id, p.username);
    });
  } else {
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