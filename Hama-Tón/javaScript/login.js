document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(loginForm);

            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok && result.success) {

                    localStorage.setItem('userId', result.userId);
                    localStorage.setItem('username', result.username);
                    localStorage.setItem('currentWorld', result.redirect);
                    window.location.href = result.redirect;
                } else {
                    alert('Error de login: ' + (result.message || 'Credenciales incorrectas o error desconocido.'));
                }
            } catch (error) {
                console.error('Error de conexión o de red:', error);
                alert('Error de conexión con el servidor.');
            }
        });
    }
});