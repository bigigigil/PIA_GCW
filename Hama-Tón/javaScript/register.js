document.addEventListener('DOMContentLoaded', () => {
    const registroHamster = document.getElementById('registroHamster');

    if (registroHamster) {
        registroHamster.addEventListener('submit', async (event) => {
            event.preventDefault(); 
            const formData = new FormData(registroHamster);
            
            const data = Object.fromEntries(formData.entries());

            if (!data.usuario || !data.password) {
                alert('Por favor, ingresa un usuario y una contraseña.');
                return;
            }

            try {
                
                const response = await fetch('/register', { 
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    alert('¡Registro exitoso! Ya puedes iniciar sesión.');
                    window.location.href = 'index.html'; 
                } else {
                    alert('Error en el registro: ' + (result.message || 'Error desconocido al registrar el usuario.'));
                }
            } catch (error) {
                console.error('Error de conexión o de red:', error);
                alert('Error de conexión con el servidor. Inténtalo más tarde.');
            }
        });
    }
});