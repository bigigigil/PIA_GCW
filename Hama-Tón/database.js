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
            'INSERT INTO usuario (usuario, password, seeds) VALUES (?, ?, 0)',
            [username, hashedPassword]
        );
        return true;
    } catch (error) {
        console.error('Error al registrar usuario:', error);
        return false;
    } finally {
        if (connection) connection.end();
    }
}

async function findUser(username) {
    let connection;
    try {
        connection = await connectToDatabase();
   
        const [rows] = await connection.execute(
            'SELECT id, usuario, password, seeds FROM usuario WHERE usuario = ?',
            [username]
        );
        return rows[0];
    } catch (error) {
        console.error('Error al buscar usuario:', error);
        return null;
    } finally {
        if (connection) connection.end();
    }
}

async function updateUserSeeds(userId, seedsToAdd) {
    let connection;
    try {
        connection = await connectToDatabase();
        
        await connection.execute(
            'UPDATE usuario SET seeds = seeds + ? WHERE id = ?',
            [seedsToAdd, userId]
        );

        const [rows] = await connection.execute(
            'SELECT seeds FROM usuario WHERE id = ?',
            [userId]
        );
        
        const newTotal = rows.length > 0 ? rows[0].seeds : 0;
        return { success: true, newTotal };

    } catch (error) {
        console.error('Error al actualizar semillas:', error);
        return { success: false };
    } finally {
        if (connection) connection.end();
    }
}

async function getLeaderboard() {
    let connection;
    try {
        connection = await connectToDatabase();
        const [rows] = await connection.execute(
            'SELECT usuario, seeds FROM usuario ORDER BY seeds DESC LIMIT 10'
        );
        return rows;
    } catch (error) {
        console.error('Error leaderboard:', error);
        return [];
    } finally {
        if (connection) connection.end();
    }
}

async function getUserById(userId) {
    let connection;
    try {
        connection = await connectToDatabase();
        const [rows] = await connection.execute(
            'SELECT id, usuario, seeds FROM usuario WHERE id = ?',
            [userId]
        );
        return rows[0];
    } catch (error) {
        return null;
    } finally {
        if (connection) connection.end();
    }
}

module.exports = { 
    connectToDatabase, 
    registerUser, 
    findUser, 
    updateUserSeeds, 
    getLeaderboard,
    getUserById 
};