document.addEventListener('DOMContentLoaded', () => {
    const username = localStorage.getItem('username');
    const usernameElement = document.getElementById('perfil-username');

    if (username && usernameElement) {
        usernameElement.textContent = `@${username}`;
    } else {
        
        alert('No has iniciado sesión. Por favor, inicia sesión para ver tu perfil.');

        window.location.href = 'inicio.html'; 
    }

    const logoutButton = document.querySelector('.perfil-botones button:last-child'); // El último botón

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('userId');
            localStorage.removeItem('username');
            localStorage.removeItem('currentWorld');
            
            alert('Sesión cerrada correctamente. ¡Vuelve pronto!');
            window.location.href = 'inicio.html'; 
        });
    }
});