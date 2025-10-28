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

const userSocketMap = new Map();
const socketUserMap = new Map(); 

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
    } finally {
        if (connection) {
            connection.end();
        }
    }
});
 

io.on('connection', (socket) => {

  socket.on('usuario conectado', ({ userId, username }) => {
        userSocketMap.set(userId, socket.id);
        socketUserMap.set(socket.id, userId);
        
        console.log(`৻(  •̀ ᗜ •́  ৻) Usuario autenticado: ${username} (DB ID: ${userId}, Socket ID: ${socket.id})`);
  
        socket.broadcast.emit('nuevo jugador', { id: socket.id, username: username });
        
        const jugadoresActivos = Array.from(socketUserMap.keys())
            .filter(sid => sid !== socket.id) 
            .map(sid => ({ id: sid, username: socketUserMap.get(sid).username })); 

        socket.emit('jugadores en línea', jugadoresActivos);
    });

  socket.on('disconnect', () => {
    const userId = socketUserMap.get(socket.id);
    if (userId) {
        socketUserMap.delete(socket.id);
        userSocketMap.delete(userId);
        
        console.log(`/ᐠ - ˕ -マ ᶻ 𝗓 𐰁  Usuario ${userId} desconectado.`);
        socket.broadcast.emit('jugador desconectado', { id: socket.id });
    } else {
        console.log('Un socket no autenticado se ha desconectado.');
    }
  });

  socket.on('movimiento jugador', (data) => {
    socket.broadcast.emit('actualizar posición', data);
  });
});


server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});