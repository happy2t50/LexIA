"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var pg_1 = require("pg");
var poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'lexia_db',
    user: process.env.DB_USER || 'lexia_user',
    password: process.env.DB_PASSWORD || 'lexia_password_2024',
    max: 20, // Máximo de conexiones en el pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};
var pool = new pg_1.Pool(poolConfig);
// Event listeners para debugging
pool.on('connect', function () {
    console.log('✅ Nueva conexión a PostgreSQL establecida');
});
pool.on('error', function (err) {
    console.error('❌ Error inesperado en el pool de PostgreSQL:', err);
    process.exit(-1);
});
// Test de conexión inicial
pool.query('SELECT NOW()', function (err, res) {
    if (err) {
        console.error('❌ Error al conectar a PostgreSQL:', err);
    }
    else {
        console.log('✅ Conexión a PostgreSQL exitosa:', res.rows[0].now);
    }
});
exports.default = pool;
