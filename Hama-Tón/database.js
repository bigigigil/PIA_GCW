const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost', 
    user: 'root', 
    password: 'young.KDAY6rati', // Asegúrate que esta sea tu contraseña correcta
    database: 'hama_ton' 
};

async function connectToDatabase() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Conexión a la base de datos MySQL exitosa.');
        return connection;
    } catch (error) {
        console.error('Error al conectar a la base de datos:', error.message);
        process.exit(1);
    }
}

async function registerUser(username, hashedPassword) {
    let connection;
    try {
        connection = await connectToDatabase();
       
        const [result] = await connection.execute(
            'INSERT INTO usuario (usuario, password) VALUES (?, ?)',
            [username, hashedPassword] 
        );
        console.log(`Usuario ${username} registrado con ID: ${result.insertId}`);
        return true;
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
             console.error(`El usuario ${username} ya existe.`);
        } else {
             console.error('Error al registrar usuario:', error);
        }
        return false;
    } finally {
        if (connection) {
            connection.end();
        }
    }
}

async function findUser(username) {
    let connection;
    try {
        connection = await connectToDatabase();
        
        // Asegúrate de seleccionar 'seeds' también
        const [rows] = await connection.execute(
            'SELECT id, usuario, password, seeds FROM usuario WHERE usuario = ?',
            [username]
        );
    
        return rows[0]; 
    } catch (error) {
        console.error('Error al buscar usuario:', error);
        return null;
    } finally {
        if (connection) {
            connection.end();
        }
    }
}

// --- ESTA ES LA FUNCIÓN QUE TE FALTABA ---
async function updateUserSeeds(userId, seedsToAdd) {
    let connection;
    try {
        connection = await connectToDatabase();
        
        const [result] = await connection.execute(
            'UPDATE usuario SET seeds = seeds + ? WHERE id = ?',
            [seedsToAdd, userId]
        );

        if (result.affectedRows === 0) {
            console.log(`Advertencia: No se encontró el usuario con ID ${userId} para actualizar las semillas.`);
        } else {
            console.log(`Semillas actualizadas para el usuario ID ${userId}: +${seedsToAdd}`);
        }

        return { success: true, affectedRows: result.affectedRows };
    } catch (error) {
        console.error('Error al actualizar semillas:', error);
        return { success: false, message: 'Error al actualizar semillas.' };
    } finally {
        if (connection) {
            connection.end();
        }
    }
}

// --- FUNCIÓN PARA EL RANKING ---
async function getLeaderboard() {
    let connection;
    try {
        connection = await connectToDatabase();
        // Obtiene el top 10 de usuarios con más semillas
        const [rows] = await connection.execute(
            'SELECT usuario, seeds FROM usuario ORDER BY seeds DESC LIMIT 10'
        );
        return rows;
    } catch (error) {
        console.error('Error al obtener el ranking:', error);
        return [];
    } finally {
        if (connection) connection.end();
    }
}

module.exports = { 
    connectToDatabase, 
    registerUser, 
    findUser,
    updateUserSeeds, 
    getLeaderboard
};