"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSecureToken = generateSecureToken;
exports.generateBackupCodes = generateBackupCodes;
exports.hashBackupCode = hashBackupCode;
exports.verifyBackupCode = verifyBackupCode;
exports.calculateExpiration = calculateExpiration;
exports.isTokenExpired = isTokenExpired;
var crypto_1 = require("crypto");
/**
 * Genera un token aleatorio seguro para verificación de email o reset de contraseña
 */
function generateSecureToken(length) {
    if (length === void 0) { length = 32; }
    return crypto_1.default.randomBytes(length).toString('hex');
}
/**
 * Genera códigos de respaldo para 2FA (8 códigos de 8 caracteres cada uno)
 */
function generateBackupCodes(count) {
    if (count === void 0) { count = 8; }
    var codes = [];
    for (var i = 0; i < count; i++) {
        // Generar código alfanumérico de 8 caracteres
        var code = crypto_1.default.randomBytes(4).toString('hex').toUpperCase();
        // Formatear como XXXX-XXXX
        codes.push("".concat(code.substring(0, 4), "-").concat(code.substring(4, 8)));
    }
    return codes;
}
/**
 * Hashea un código de respaldo para almacenarlo en la base de datos
 */
function hashBackupCode(code) {
    return crypto_1.default.createHash('sha256').update(code).digest('hex');
}
/**
 * Verifica si un código de respaldo coincide con su hash
 */
function verifyBackupCode(code, hash) {
    var codeHash = hashBackupCode(code);
    return codeHash === hash;
}
/**
 * Calcula la fecha de expiración para un token
 * @param hours Horas hasta la expiración
 */
function calculateExpiration(hours) {
    var expiration = new Date();
    expiration.setHours(expiration.getHours() + hours);
    return expiration;
}
/**
 * Verifica si un token ha expirado
 */
function isTokenExpired(expiresAt) {
    return new Date() > new Date(expiresAt);
}
