const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost', 
    user: 'root', 
    password: 'young.KDAY6rati',
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
        
        const [rows] = await connection.execute(
            'SELECT id, usuario, password FROM usuario WHERE usuario = ?',
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

module.exports = { 
    connectToDatabase, 
    registerUser, 
    findUser 
};