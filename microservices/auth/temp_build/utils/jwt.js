"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.generateTokens = generateTokens;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.decodeToken = decodeToken;
exports.getTokenExpiration = getTokenExpiration;
exports.extractTokenFromHeader = extractTokenFromHeader;
var jsonwebtoken_1 = require("jsonwebtoken");
var crypto_1 = require("crypto");
var ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'lexia_access_secret_2024_change_me';
var REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'lexia_refresh_secret_2024_change_me';
var ACCESS_TOKEN_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m'; // 15 minutos
var REFRESH_TOKEN_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d'; // 7 días
/**
 * Genera Access Token (corta duración - 15 minutos)
 */
function generateAccessToken(payload) {
    return jsonwebtoken_1.default.sign(payload, ACCESS_TOKEN_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRES,
    });
}
/**
 * Genera Refresh Token (larga duración - 7 días)
 */
function generateRefreshToken(payload) {
    // Agregar un jti (JWT ID) único para poder revocar tokens individuales
    var tokenPayload = __assign(__assign({}, payload), { jti: crypto_1.default.randomBytes(16).toString('hex') });
    return jsonwebtoken_1.default.sign(tokenPayload, REFRESH_TOKEN_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRES,
    });
}
/**
 * Genera ambos tokens (Access + Refresh)
 */
function generateTokens(payload) {
    var accessToken = generateAccessToken(payload);
    var refreshToken = generateRefreshToken(payload);
    return {
        accessToken: accessToken,
        refreshToken: refreshToken,
        accessTokenExpiresIn: 15 * 60, // 15 minutos en segundos
        refreshTokenExpiresIn: 7 * 24 * 60 * 60, // 7 días en segundos
    };
}
/**
 * Verifica Access Token
 */
function verifyAccessToken(token) {
    try {
        var decoded = jsonwebtoken_1.default.verify(token, ACCESS_TOKEN_SECRET);
        return decoded;
    }
    catch (error) {
        return null;
    }
}
/**
 * Verifica Refresh Token
 */
function verifyRefreshToken(token) {
    try {
        var decoded = jsonwebtoken_1.default.verify(token, REFRESH_TOKEN_SECRET);
        return decoded;
    }
    catch (error) {
        return null;
    }
}
/**
 * Decodifica un token sin verificar (útil para debugging)
 */
function decodeToken(token) {
    try {
        return jsonwebtoken_1.default.decode(token);
    }
    catch (error) {
        return null;
    }
}
/**
 * Calcula cuándo expira un token
 */
function getTokenExpiration(token) {
    try {
        var decoded = jsonwebtoken_1.default.decode(token);
        if (decoded && decoded.exp) {
            return new Date(decoded.exp * 1000);
        }
        return null;
    }
    catch (error) {
        return null;
    }
}
/**
 * Extrae el token del header Authorization
 */
function extractTokenFromHeader(authHeader) {
    if (!authHeader)
        return null;
    var parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }
    return parts[1];
}
