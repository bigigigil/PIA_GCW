const express = require('express');
const { findUser } = require('./database');

const { createServer } = require('node:http');
const { Server } = require('socket.io');
const { join } = require('node:path');

const app = express();

app.use(express.urlencoded({ extended: true })); 
app.use(express.json());

const server = createServer(app);
const io = new Server(server); 

// Mapa para rastrear la información completa (incluyendo en qué mundo está)
const userSocketMap = new Map(); // Mapea userId -> { socketId, username, world }
const socketUserMap = new Map(); // Mapea socketId -> userId

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'inicio.html'));
});

app.use(express.static(__dirname));

app.post('/login', async (req, res) => {
    // ... (Tu código de login, sin cambios)
    const { usuario, password } = req.body;

    if (!usuario || !password) {
        return res.status(400).send({ success: false, message: 'Faltan credenciales.' });
    }

    let connection;
    try {
        const user = await findUser(usuario);
        
        if (!user) {
            return res.status(401).send({ success: false, message: 'Usuario o contraseña incorrectos.' });
        }

        if (user.password === password) {
            
            console.log(`٩(^ᗜ^ )و ´- Usuario ${user.usuario} ha iniciado sesión con éxito. ID: ${user.id}`);
           
            return res.status(200).json({ 
                success: true, 
                message: 'Inicio de sesión exitoso.', 
                redirect: '/world.html',
                userId: user.id,        
                username: user.usuario   
            });
            
        } else {
            return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos.' });
        }

    } catch (error) {
        console.error('Error en el proceso de login:', error);
        return res.status(500).send({ success: false, message: 'Error interno del servidor.' });
    }
});
 

io.on('connection', (socket) => {

   socket.on('usuario conectado', ({ userId, username, currentWorld }) => {
    // Guardamos info
    userSocketMap.set(userId, { socketId: socket.id, username: username, world: currentWorld });
    socketUserMap.set(socket.id, userId);

    console.log(`Usuario autenticado: ${username} (DB ID: ${userId}, Socket ID: ${socket.id}, Mundo: ${currentWorld})`);

    if (currentWorld) {
        // Unir socket a la sala del mundo
        socket.join(currentWorld);

        // Notificar a los demás en la misma sala que hay un nuevo jugador
        socket.to(currentWorld).emit('nuevo jugador', { id: socket.id, username: username });

        // Construir la lista de jugadores activos en ESTE mundo usando userSocketMap (más fiable)
        const jugadoresActivos = [];
        for (const [uid, info] of userSocketMap.entries()) {
            if (info && info.world === currentWorld && info.socketId !== socket.id) {
                jugadoresActivos.push({ id: info.socketId, username: info.username });
            }
        }

        // Enviar la lista al nuevo cliente
        console.log('Enviando jugadoresActivos a', socket.id, jugadoresActivos);

        socket.emit('jugadores en línea', jugadoresActivos);

    } else {
        // Fallback: notificar a todos (si no hay mundo)
        socket.broadcast.emit('nuevo jugador', { id: socket.id, username: username });
    }
});


    socket.on('disconnect', () => {
        const userId = socketUserMap.get(socket.id);
        if (userId) {
            const userData = userSocketMap.get(userId);
            
            socketUserMap.delete(socket.id);
            userSocketMap.delete(userId);
            
            console.log(`/ᐠ - ˕ -マ ᶻ 𝗓 𐰁  Usuario ${userId} desconectado.`);
            
            // Notificar a la sala o a todos
            if (userData && userData.world) {
                io.to(userData.world).emit('jugador desconectado', { id: socket.id });
            } else {
                socket.broadcast.emit('jugador desconectado', { id: socket.id });
            }
        } else {
            console.log('Un socket no autenticado se ha desconectado.');
        }
    });

   socket.on('movimiento jugador', (data) => {
    const userId = socketUserMap.get(socket.id);
    const userData = userSocketMap.get(userId);

    if (!data) return;

    // Añadimos el ID del socket a los datos del movimiento
    const movementData = {
        id: socket.id, 
        x: data.x,
        y: data.y,
        z: data.z,
        rotationY: data.rotationY
    };

    if (userData && userData.world) {
        // Reenviar a todos en la misma sala (excepto al emisor)
        socket.to(userData.world).emit('actualizar posición', movementData);
    } else {
        socket.broadcast.emit('actualizar posición', movementData);
    }
});

});


server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});