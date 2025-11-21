const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const { join } = require('node:path');
const { registerUser, findUser, updateUserSeeds, getLeaderboard, getUserById } = require('./database');
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



app.get('/api/leaderboard', async (req, res) => {
    try {
        const topPlayers = await getLeaderboard();
        res.json({ success: true, data: topPlayers });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener ranking' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await findUser(username);

    if (user && user.password === password) {
        // ¡IMPORTANTE! Enviamos 'seeds' al frontend
        res.json({ 
            success: true, 
            userId: user.id, 
            username: user.usuario,
            seeds: user.seeds 
        });
    } else {
        res.json({ success: false, message: 'Credenciales incorrectas' });
    }
});

// --- ENDPOINT GUARDAR PUNTUACIÓN ---
app.post('/api/save-score', async (req, res) => {
    const { userId, seedsGained } = req.body;
    const result = await updateUserSeeds(userId, seedsGained);

    if (result.success) {
        // Devolvemos el nuevo total real de la BD
        res.json({ success: true, newTotal: result.newTotal });
    } else {
        res.status(500).json({ success: false, message: 'Error al guardar' });
    }
});

// --- ENDPOINT OBTENER DATOS DE USUARIO (Para Casa/Perfil) ---
app.get('/api/user/:id', async (req, res) => {
    const user = await getUserById(req.params.id);
    if (user) {
        res.json({ success: true, seeds: user.seeds, username: user.usuario });
    } else {
        res.status(404).json({ success: false });
    }
});

// --- ENDPOINT RANKING ---
app.get('/api/leaderboard', async (req, res) => {
    const topPlayers = await getLeaderboard();
    res.json({ success: true, data: topPlayers });
});

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    const success = await registerUser(username, password);
    res.json({ success });
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});



