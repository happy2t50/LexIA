"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
var password_1 = require("../utils/password");
var jwt_1 = require("../utils/jwt");
var tokens_1 = require("../utils/tokens");
var UserRepository_1 = require("../repositories/UserRepository");
var RefreshTokenRepository_1 = require("../repositories/RefreshTokenRepository");
var EmailVerificationRepository_1 = require("../repositories/EmailVerificationRepository");
var PasswordResetRepository_1 = require("../repositories/PasswordResetRepository");
var AuthLogRepository_1 = require("../repositories/AuthLogRepository");
var email_1 = require("../config/email");
var AuthService = /** @class */ (function () {
    function AuthService() {
    }
    /**
     * Registrar nuevo usuario
     */
    AuthService.prototype.register = function (data, ipAddress) {
        return __awaiter(this, void 0, void 0, function () {
            var existingUser, passwordValidation, password_hash, userData, user, verificationToken, expiresAt, emailContent, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, UserRepository_1.default.findByEmail(data.email)];
                    case 1:
                        existingUser = _a.sent();
                        if (existingUser) {
                            throw new Error('El email ya está registrado');
                        }
                        passwordValidation = (0, password_1.validatePasswordStrength)(data.password);
                        if (!passwordValidation.valid) {
                            throw new Error(passwordValidation.errors.join(', '));
                        }
                        return [4 /*yield*/, (0, password_1.hashPassword)(data.password)];
                    case 2:
                        password_hash = _a.sent();
                        userData = {
                            email: data.email,
                            nombre: data.nombre,
                            apellido: data.apellido,
                            telefono: data.telefono,
                            password_hash: password_hash,
                            rol: 'user',
                            account_type: 'local'
                        };
                        return [4 /*yield*/, UserRepository_1.default.create(userData)];
                    case 3:
                        user = _a.sent();
                        verificationToken = (0, tokens_1.generateSecureToken)();
                        expiresAt = (0, tokens_1.calculateExpiration)(24);
                        return [4 /*yield*/, EmailVerificationRepository_1.default.create({
                                usuario_id: user.id,
                                token: verificationToken,
                                expires_at: expiresAt,
                                ip_address: ipAddress
                            })];
                    case 4:
                        _a.sent();
                        // Log del evento
                        return [4 /*yield*/, AuthLogRepository_1.default.create({
                                usuario_id: user.id,
                                email: user.email,
                                event_type: 'register',
                                success: true,
                                ip_address: ipAddress
                            })];
                    case 5:
                        // Log del evento
                        _a.sent();
                        if (!process.env.SMTP_USER) return [3 /*break*/, 9];
                        _a.label = 6;
                    case 6:
                        _a.trys.push([6, 8, , 9]);
                        emailContent = email_1.emailTemplates.verification(verificationToken, user.nombre);
                        return [4 /*yield*/, email_1.transporter.sendMail({
                                from: process.env.SMTP_USER,
                                to: user.email,
                                subject: emailContent.subject,
                                html: emailContent.html
                            })];
                    case 7:
                        _a.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        error_1 = _a.sent();
                        console.error('Error al enviar email de verificación:', error_1);
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/, { user: user, verificationToken: verificationToken }];
                }
            });
        });
    };
    /**
     * Login de usuario
     */
    AuthService.prototype.login = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var email, password, ipAddress, userAgent, user, isLocked, isPasswordValid, tokenPayload, tokens, password_hash, userWithoutPassword;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = data.email, password = data.password, ipAddress = data.ipAddress, userAgent = data.userAgent;
                        return [4 /*yield*/, UserRepository_1.default.findByEmail(email)];
                    case 1:
                        user = _a.sent();
                        if (!!user) return [3 /*break*/, 3];
                        // Log del intento fallido
                        return [4 /*yield*/, AuthLogRepository_1.default.create({
                                email: email,
                                event_type: 'failed_login',
                                success: false,
                                failure_reason: 'Email no encontrado',
                                ip_address: ipAddress,
                                user_agent: userAgent
                            })];
                    case 2:
                        // Log del intento fallido
                        _a.sent();
                        throw new Error('Credenciales inválidas');
                    case 3: return [4 /*yield*/, UserRepository_1.default.isLocked(user.id)];
                    case 4:
                        isLocked = _a.sent();
                        if (!isLocked) return [3 /*break*/, 6];
                        return [4 /*yield*/, AuthLogRepository_1.default.create({
                                usuario_id: user.id,
                                email: email,
                                event_type: 'failed_login',
                                success: false,
                                failure_reason: 'Cuenta bloqueada',
                                ip_address: ipAddress,
                                user_agent: userAgent
                            })];
                    case 5:
                        _a.sent();
                        throw new Error('Cuenta bloqueada temporalmente. Intenta más tarde.');
                    case 6:
                        if (!!user.password_hash) return [3 /*break*/, 8];
                        return [4 /*yield*/, AuthLogRepository_1.default.create({
                                usuario_id: user.id,
                                email: email,
                                event_type: 'failed_login',
                                success: false,
                                failure_reason: 'Cuenta OAuth sin contraseña',
                                ip_address: ipAddress,
                                user_agent: userAgent
                            })];
                    case 7:
                        _a.sent();
                        throw new Error('Esta cuenta usa autenticación de terceros (Google)');
                    case 8: return [4 /*yield*/, (0, password_1.comparePassword)(password, user.password_hash)];
                    case 9:
                        isPasswordValid = _a.sent();
                        if (!!isPasswordValid) return [3 /*break*/, 12];
                        // Incrementar intentos fallidos
                        return [4 /*yield*/, UserRepository_1.default.incrementFailedAttempts(user.id)];
                    case 10:
                        // Incrementar intentos fallidos
                        _a.sent();
                        return [4 /*yield*/, AuthLogRepository_1.default.create({
                                usuario_id: user.id,
                                email: email,
                                event_type: 'failed_login',
                                success: false,
                                failure_reason: 'Contraseña incorrecta',
                                ip_address: ipAddress,
                                user_agent: userAgent
                            })];
                    case 11:
                        _a.sent();
                        throw new Error('Credenciales inválidas');
                    case 12:
                        if (!!user.activo) return [3 /*break*/, 14];
                        return [4 /*yield*/, AuthLogRepository_1.default.create({
                                usuario_id: user.id,
                                email: email,
                                event_type: 'failed_login',
                                success: false,
                                failure_reason: 'Cuenta desactivada',
                                ip_address: ipAddress,
                                user_agent: userAgent
                            })];
                    case 13:
                        _a.sent();
                        throw new Error('Cuenta desactivada');
                    case 14:
                        tokenPayload = {
                            userId: user.id,
                            email: user.email,
                            rol: user.rol,
                            twoFactorEnabled: user.two_factor_enabled
                        };
                        tokens = (0, jwt_1.generateTokens)(tokenPayload);
                        // Guardar refresh token en BD
                        return [4 /*yield*/, RefreshTokenRepository_1.default.create({
                                usuario_id: user.id,
                                token: tokens.refreshToken,
                                expires_at: new Date(Date.now() + tokens.refreshTokenExpiresIn * 1000),
                                ip_address: ipAddress,
                                user_agent: userAgent
                            })];
                    case 15:
                        // Guardar refresh token en BD
                        _a.sent();
                        // Resetear intentos fallidos y actualizar último login
                        return [4 /*yield*/, UserRepository_1.default.resetFailedAttempts(user.id, ipAddress)];
                    case 16:
                        // Resetear intentos fallidos y actualizar último login
                        _a.sent();
                        // Log de login exitoso
                        return [4 /*yield*/, AuthLogRepository_1.default.create({
                                usuario_id: user.id,
                                email: email,
                                event_type: 'successful_login',
                                success: true,
                                ip_address: ipAddress,
                                user_agent: userAgent
                            })];
                    case 17:
                        // Log de login exitoso
                        _a.sent();
                        password_hash = user.password_hash, userWithoutPassword = __rest(user, ["password_hash"]);
                        return [2 /*return*/, {
                                user: userWithoutPassword,
                                tokens: tokens
                            }];
                }
            });
        });
    };
    /**
     * Refrescar access token usando refresh token
     */
    AuthService.prototype.refreshAccessToken = function (refreshToken) {
        return __awaiter(this, void 0, void 0, function () {
            var payload, isValid, user, tokenPayload, newTokens;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        payload = (0, jwt_1.verifyRefreshToken)(refreshToken);
                        if (!payload) {
                            throw new Error('Refresh token inválido o expirado');
                        }
                        return [4 /*yield*/, RefreshTokenRepository_1.default.isValid(refreshToken)];
                    case 1:
                        isValid = _a.sent();
                        if (!isValid) {
                            throw new Error('Refresh token revocado o expirado');
                        }
                        return [4 /*yield*/, UserRepository_1.default.findById(payload.userId)];
                    case 2:
                        user = _a.sent();
                        if (!user || !user.activo) {
                            throw new Error('Usuario no encontrado o inactivo');
                        }
                        tokenPayload = {
                            userId: user.id,
                            email: user.email,
                            rol: user.rol,
                            twoFactorEnabled: user.two_factor_enabled
                        };
                        newTokens = (0, jwt_1.generateTokens)(tokenPayload);
                        // Guardar nuevo refresh token
                        return [4 /*yield*/, RefreshTokenRepository_1.default.create({
                                usuario_id: user.id,
                                token: newTokens.refreshToken,
                                expires_at: new Date(Date.now() + newTokens.refreshTokenExpiresIn * 1000)
                            })];
                    case 3:
                        // Guardar nuevo refresh token
                        _a.sent();
                        // Revocar el refresh token anterior
                        return [4 /*yield*/, RefreshTokenRepository_1.default.revoke(refreshToken)];
                    case 4:
                        // Revocar el refresh token anterior
                        _a.sent();
                        return [2 /*return*/, newTokens];
                }
            });
        });
    };
    /**
     * Logout
     */
    AuthService.prototype.logout = function (refreshToken, userId, ipAddress) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // Revocar refresh token
                    return [4 /*yield*/, RefreshTokenRepository_1.default.revoke(refreshToken)];
                    case 1:
                        // Revocar refresh token
                        _a.sent();
                        return [4 /*yield*/, UserRepository_1.default.findById(userId)];
                    case 2:
                        user = _a.sent();
                        if (!user) return [3 /*break*/, 4];
                        return [4 /*yield*/, AuthLogRepository_1.default.create({
                                usuario_id: userId,
                                email: user.email,
                                event_type: 'logout',
                                success: true,
                                ip_address: ipAddress
                            })];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Logout de todas las sesiones
     */
    AuthService.prototype.logoutAll = function (userId, ipAddress) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // Revocar todos los refresh tokens
                    return [4 /*yield*/, RefreshTokenRepository_1.default.revokeAllForUser(userId)];
                    case 1:
                        // Revocar todos los refresh tokens
                        _a.sent();
                        return [4 /*yield*/, UserRepository_1.default.findById(userId)];
                    case 2:
                        user = _a.sent();
                        if (!user) return [3 /*break*/, 4];
                        return [4 /*yield*/, AuthLogRepository_1.default.create({
                                usuario_id: userId,
                                email: user.email,
                                event_type: 'logout_all',
                                success: true,
                                ip_address: ipAddress
                            })];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Verificar email
     */
    AuthService.prototype.verifyEmail = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            var verificationToken, user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, EmailVerificationRepository_1.default.findByToken(token)];
                    case 1:
                        verificationToken = _a.sent();
                        if (!verificationToken) {
                            throw new Error('Token de verificación inválido o expirado');
                        }
                        // Marcar email como verificado
                        return [4 /*yield*/, UserRepository_1.default.verifyEmail(verificationToken.usuario_id)];
                    case 2:
                        // Marcar email como verificado
                        _a.sent();
                        // Marcar token como usado
                        return [4 /*yield*/, EmailVerificationRepository_1.default.markAsVerified(token)];
                    case 3:
                        // Marcar token como usado
                        _a.sent();
                        // Invalidar otros tokens del usuario
                        return [4 /*yield*/, EmailVerificationRepository_1.default.invalidateUserTokens(verificationToken.usuario_id)];
                    case 4:
                        // Invalidar otros tokens del usuario
                        _a.sent();
                        return [4 /*yield*/, UserRepository_1.default.findById(verificationToken.usuario_id)];
                    case 5:
                        user = _a.sent();
                        if (!user) return [3 /*break*/, 7];
                        return [4 /*yield*/, AuthLogRepository_1.default.create({
                                usuario_id: user.id,
                                email: user.email,
                                event_type: 'email_verified',
                                success: true
                            })];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7: return [2 /*return*/, true];
                }
            });
        });
    };
    /**
     * Reenviar email de verificación
     */
    AuthService.prototype.resendVerificationEmail = function (email, ipAddress) {
        return __awaiter(this, void 0, void 0, function () {
            var user, verificationToken, expiresAt, emailContent;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, UserRepository_1.default.findByEmail(email)];
                    case 1:
                        user = _a.sent();
                        if (!user) {
                            throw new Error('Usuario no encontrado');
                        }
                        if (user.email_verified) {
                            throw new Error('El email ya está verificado');
                        }
                        // Invalidar tokens anteriores
                        return [4 /*yield*/, EmailVerificationRepository_1.default.invalidateUserTokens(user.id)];
                    case 2:
                        // Invalidar tokens anteriores
                        _a.sent();
                        verificationToken = (0, tokens_1.generateSecureToken)();
                        expiresAt = (0, tokens_1.calculateExpiration)(24);
                        return [4 /*yield*/, EmailVerificationRepository_1.default.create({
                                usuario_id: user.id,
                                token: verificationToken,
                                expires_at: expiresAt,
                                ip_address: ipAddress
                            })];
                    case 3:
                        _a.sent();
                        if (!process.env.SMTP_USER) return [3 /*break*/, 5];
                        emailContent = email_1.emailTemplates.verification(verificationToken, user.nombre);
                        return [4 /*yield*/, email_1.transporter.sendMail({
                                from: process.env.SMTP_USER,
                                to: user.email,
                                subject: emailContent.subject,
                                html: emailContent.html
                            })];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Solicitar recuperación de contraseña - Genera código de 6 dígitos
     */
    AuthService.prototype.requestPasswordReset = function (email, ipAddress) {
        return __awaiter(this, void 0, void 0, function () {
            var user, hasRecentToken, code, expiresAt, emailContent, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, UserRepository_1.default.findByEmail(email)];
                    case 1:
                        user = _a.sent();
                        if (!user) {
                            // No revelar si el email existe o no (seguridad)
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, PasswordResetRepository_1.default.hasRecentToken(user.id, 2)];
                    case 2:
                        hasRecentToken = _a.sent();
                        if (hasRecentToken) {
                            throw new Error('Ya se envió un código recientemente. Espera 2 minutos.');
                        }
                        // Invalidar códigos anteriores
                        return [4 /*yield*/, PasswordResetRepository_1.default.invalidateUserTokens(user.id)];
                    case 3:
                        // Invalidar códigos anteriores
                        _a.sent();
                        code = Math.floor(100000 + Math.random() * 900000).toString();
                        expiresAt = new Date();
                        expiresAt.setMinutes(expiresAt.getMinutes() + 10);
                        return [4 /*yield*/, PasswordResetRepository_1.default.create({
                                usuario_id: user.id,
                                token: code,
                                expires_at: expiresAt,
                                ip_address: ipAddress
                            })];
                    case 4:
                        _a.sent();
                        // Log del evento
                        return [4 /*yield*/, AuthLogRepository_1.default.create({
                                usuario_id: user.id,
                                email: user.email,
                                event_type: 'password_reset_requested',
                                success: true,
                                ip_address: ipAddress
                            })];
                    case 5:
                        // Log del evento
                        _a.sent();
                        if (!process.env.SMTP_USER) return [3 /*break*/, 10];
                        _a.label = 6;
                    case 6:
                        _a.trys.push([6, 8, , 9]);
                        emailContent = email_1.emailTemplates.passwordReset(code, user.nombre);
                        return [4 /*yield*/, email_1.transporter.sendMail({
                                from: process.env.SMTP_USER,
                                to: user.email,
                                subject: emailContent.subject,
                                html: emailContent.html
                            })];
                    case 7:
                        _a.sent();
                        console.log("\u2709\uFE0F  C\u00F3digo de recuperaci\u00F3n enviado a ".concat(email, ": ").concat(code));
                        return [3 /*break*/, 9];
                    case 8:
                        error_2 = _a.sent();
                        console.error('Error al enviar email de recuperación:', error_2);
                        throw new Error('Error al enviar el email de recuperación');
                    case 9: return [3 /*break*/, 11];
                    case 10:
                        // En desarrollo, mostrar el código en consola
                        console.log("\uD83D\uDD11 C\u00F3digo de recuperaci\u00F3n para ".concat(email, ": ").concat(code, " (expira en 10 minutos)"));
                        _a.label = 11;
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Verificar código de recuperación
     */
    AuthService.prototype.verifyResetCode = function (email, code) {
        return __awaiter(this, void 0, void 0, function () {
            var user, resetToken;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, UserRepository_1.default.findByEmail(email)];
                    case 1:
                        user = _a.sent();
                        if (!user) {
                            return [2 /*return*/, false];
                        }
                        return [4 /*yield*/, PasswordResetRepository_1.default.findByToken(code)];
                    case 2:
                        resetToken = _a.sent();
                        if (!resetToken || resetToken.usuario_id !== user.id) {
                            return [2 /*return*/, false];
                        }
                        return [2 /*return*/, true];
                }
            });
        });
    };
    /**
     * Resetear contraseña con código verificado
     */
    AuthService.prototype.resetPassword = function (email, code, newPassword) {
        return __awaiter(this, void 0, void 0, function () {
            var user, resetToken, passwordValidation, password_hash;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, UserRepository_1.default.findByEmail(email)];
                    case 1:
                        user = _a.sent();
                        if (!user) {
                            throw new Error('Usuario no encontrado');
                        }
                        return [4 /*yield*/, PasswordResetRepository_1.default.findByToken(code)];
                    case 2:
                        resetToken = _a.sent();
                        if (!resetToken || resetToken.usuario_id !== user.id) {
                            throw new Error('Código de recuperación inválido o expirado');
                        }
                        passwordValidation = (0, password_1.validatePasswordStrength)(newPassword);
                        if (!passwordValidation.valid) {
                            throw new Error(passwordValidation.errors.join(', '));
                        }
                        return [4 /*yield*/, (0, password_1.hashPassword)(newPassword)];
                    case 3:
                        password_hash = _a.sent();
                        // Actualizar contraseña
                        return [4 /*yield*/, UserRepository_1.default.updatePassword(user.id, password_hash)];
                    case 4:
                        // Actualizar contraseña
                        _a.sent();
                        // Marcar código como usado
                        return [4 /*yield*/, PasswordResetRepository_1.default.markAsUsed(code)];
                    case 5:
                        // Marcar código como usado
                        _a.sent();
                        // Revocar todas las sesiones (por seguridad)
                        return [4 /*yield*/, RefreshTokenRepository_1.default.revokeAllForUser(user.id)];
                    case 6:
                        // Revocar todas las sesiones (por seguridad)
                        _a.sent();
                        // Log del evento
                        return [4 /*yield*/, AuthLogRepository_1.default.create({
                                usuario_id: user.id,
                                email: user.email,
                                event_type: 'password_reset_completed',
                                success: true
                            })];
                    case 7:
                        // Log del evento
                        _a.sent();
                        console.log("\u2705 Contrase\u00F1a restablecida exitosamente para ".concat(email));
                        return [2 /*return*/, true];
                }
            });
        });
    };
    /**
     * Obtener perfil de usuario
     */
    AuthService.prototype.getProfile = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var user, password_hash, userWithoutPassword;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, UserRepository_1.default.findById(userId)];
                    case 1:
                        user = _a.sent();
                        if (!user) {
                            throw new Error('Usuario no encontrado');
                        }
                        password_hash = user.password_hash, userWithoutPassword = __rest(user, ["password_hash"]);
                        return [2 /*return*/, userWithoutPassword];
                }
            });
        });
    };
    /**
     * Actualizar perfil de usuario
     */
    AuthService.prototype.updateProfile = function (userId, data) {
        return __awaiter(this, void 0, void 0, function () {
            var existingUser, emailExists, updateData, updatedUser, password_hash, userWithoutPassword;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, UserRepository_1.default.findById(userId)];
                    case 1:
                        existingUser = _a.sent();
                        if (!existingUser) {
                            throw new Error('Usuario no encontrado');
                        }
                        if (!(data.email && data.email !== existingUser.email)) return [3 /*break*/, 3];
                        return [4 /*yield*/, UserRepository_1.default.findByEmail(data.email)];
                    case 2:
                        emailExists = _a.sent();
                        if (emailExists && emailExists.id !== userId) {
                            throw new Error('El email ya está en uso por otro usuario');
                        }
                        _a.label = 3;
                    case 3:
                        updateData = {};
                        if (data.nombre !== undefined) {
                            updateData.nombre = data.nombre.trim();
                        }
                        if (data.apellidos !== undefined) {
                            updateData.apellido = data.apellidos.trim(); // Mapear apellidos -> apellido
                        }
                        if (data.email !== undefined) {
                            updateData.email = data.email.toLowerCase().trim();
                        }
                        if (data.telefono !== undefined) {
                            updateData.telefono = data.telefono.trim();
                        }
                        return [4 /*yield*/, UserRepository_1.default.update(userId, updateData)];
                    case 4:
                        updatedUser = _a.sent();
                        if (!updatedUser) {
                            throw new Error('Error al actualizar el perfil');
                        }
                        password_hash = updatedUser.password_hash, userWithoutPassword = __rest(updatedUser, ["password_hash"]);
                        return [2 /*return*/, userWithoutPassword];
                }
            });
        });
    };
    /**
     * Obtener sesiones activas
     */
    AuthService.prototype.getActiveSessions = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, RefreshTokenRepository_1.default.getActiveSessions(userId)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Obtener historial de autenticación
     */
    AuthService.prototype.getAuthHistory = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, limit) {
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, AuthLogRepository_1.default.findByUserId(userId, limit)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return AuthService;
}());
exports.AuthService = AuthService;
exports.default = new AuthService();
