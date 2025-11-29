import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'lexia_access_secret_2024_change_me';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'lexia_refresh_secret_2024_change_me';

const ACCESS_TOKEN_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m'; // 15 minutos
const REFRESH_TOKEN_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d'; // 7 días

export interface TokenPayload {
    userId: number;
    email: string;
    rol: string;
    twoFactorEnabled?: boolean;
}

export interface Tokens {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresIn: number;
    refreshTokenExpiresIn: number;
}

/**
 * Genera Access Token (corta duración - 15 minutos)
 */
export function generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRES,
    });
}

/**
 * Genera Refresh Token (larga duración - 7 días)
 */
export function generateRefreshToken(payload: TokenPayload): string {
    // Agregar un jti (JWT ID) único para poder revocar tokens individuales
    const tokenPayload = {
        ...payload,
        jti: crypto.randomBytes(16).toString('hex'),
    };

    return jwt.sign(tokenPayload, REFRESH_TOKEN_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRES,
    });
}

/**
 * Genera ambos tokens (Access + Refresh)
 */
export function generateTokens(payload: TokenPayload): Tokens {
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
        accessToken,
        refreshToken,
        accessTokenExpiresIn: 15 * 60, // 15 minutos en segundos
        refreshTokenExpiresIn: 7 * 24 * 60 * 60, // 7 días en segundos
    };
}

/**
 * Verifica Access Token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
    try {
        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
        return decoded;
    } catch (error) {
        return null;
    }
}

/**
 * Verifica Refresh Token
 */
export function verifyRefreshToken(token: string): (TokenPayload & { jti: string }) | null {
    try {
        const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as TokenPayload & { jti: string };
        return decoded;
    } catch (error) {
        return null;
    }
}

/**
 * Decodifica un token sin verificar (útil para debugging)
 */
export function decodeToken(token: string): any {
    try {
        return jwt.decode(token);
    } catch (error) {
        return null;
    }
}

/**
 * Calcula cuándo expira un token
 */
export function getTokenExpiration(token: string): Date | null {
    try {
        const decoded: any = jwt.decode(token);
        if (decoded && decoded.exp) {
            return new Date(decoded.exp * 1000);
        }
        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Extrae el token del header Authorization
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }

    return parts[1];
}