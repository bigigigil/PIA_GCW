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

let juegoPausado = false;

/* Abrir modales */
pauseBtn.addEventListener("click", () => {
  juegoPausado = true;
  modalPausa.style.display = "flex";
});

ajustesBtn.addEventListener("click", () => {
  juegoPausado = true;
  modalAjustes.style.display = "flex";
});

/* Cerrar modales */
cerrarModalPausa.addEventListener("click", () => {
  juegoPausado = false;
  modalPausa.style.display = "none";
});

cerrarModalAjustes.addEventListener("click", () => {
  juegoPausado = false;
  modalAjustes.style.display = "none";
});

continuarBtn.addEventListener("click", () => {
  juegoPausado = false;
  modalPausa.style.display = "none";
});

salirBtn.addEventListener("click", () => {
  window.location.href = "inicio.html";
});

if (explorarBtn) {
  explorarBtn.addEventListener("click", () => {
    window.location.href = "world.html";
  });
}


casaBtn.addEventListener("click", () => {
  window.location.href = "casa.html";
});
reiniciarBtn.addEventListener("click", () => {
  window.location.href = "world.html";
});


window.addEventListener("click", (event) => {
  if (event.target === modalPausa) {
    juegoPausado = false;
    modalPausa.style.display = "none";
  }
  if (event.target === modalAjustes) {
    juegoPausado = false;
    modalAjustes.style.display = "none";
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (modalPausa.style.display === "flex") {
      juegoPausado = false;
      modalPausa.style.display = "none";
    } else if (modalAjustes.style.display === "flex") {
      juegoPausado = false;
      modalAjustes.style.display = "none";
    } else {
      juegoPausado = true;
      modalPausa.style.display = "flex";
    }
  }
});
