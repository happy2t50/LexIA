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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwoFactorService = void 0;
var speakeasy_1 = require("speakeasy");
var qrcode_1 = require("qrcode");
var TwoFactorRepository_1 = require("../repositories/TwoFactorRepository");
var UserRepository_1 = require("../repositories/UserRepository");
var AuthLogRepository_1 = require("../repositories/AuthLogRepository");
var tokens_1 = require("../utils/tokens");
var email_1 = require("../config/email");
var TwoFactorService = /** @class */ (function () {
    function TwoFactorService() {
    }
    /**
     * Configurar 2FA para un usuario (paso 1: generar secret y QR)
     */
    TwoFactorService.prototype.setup = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var user, existing2FA, secret, backupCodesPlain, backupCodesHashed, qrCodeUrl;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, UserRepository_1.default.findById(userId)];
                    case 1:
                        user = _a.sent();
                        if (!user) {
                            throw new Error('Usuario no encontrado');
                        }
                        return [4 /*yield*/, TwoFactorRepository_1.default.findByUserId(userId)];
                    case 2:
                        existing2FA = _a.sent();
                        if (existing2FA && existing2FA.enabled) {
                            throw new Error('2FA ya está habilitado. Deshabilítalo primero si quieres reconfigurarlo.');
                        }
                        secret = speakeasy_1.default.generateSecret({
                            name: "LexIA (".concat(user.email, ")"),
                            issuer: 'LexIA',
                            length: 32
                        });
                        backupCodesPlain = (0, tokens_1.generateBackupCodes)(8);
                        backupCodesHashed = backupCodesPlain.map(function (code) { return (0, tokens_1.hashBackupCode)(code); });
                        // Guardar en BD (pero no habilitar todavía)
                        return [4 /*yield*/, TwoFactorRepository_1.default.create({
                                usuario_id: userId,
                                secret: secret.base32,
                                backup_codes: backupCodesHashed
                            })];
                    case 3:
                        // Guardar en BD (pero no habilitar todavía)
                        _a.sent();
                        return [4 /*yield*/, qrcode_1.default.toDataURL(secret.otpauth_url || '')];
                    case 4:
                        qrCodeUrl = _a.sent();
                        return [2 /*return*/, {
                                secret: secret.base32,
                                qrCodeUrl: qrCodeUrl,
                                backupCodes: backupCodesPlain
                            }];
                }
            });
        });
    };
    /**
     * Habilitar 2FA después de verificar el código (paso 2)
     */
    TwoFactorService.prototype.enable = function (userId, code) {
        return __awaiter(this, void 0, void 0, function () {
            var twoFactor, isValid, user, emailContent, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, TwoFactorRepository_1.default.findByUserId(userId)];
                    case 1:
                        twoFactor = _a.sent();
                        if (!twoFactor) {
                            throw new Error('Primero debes configurar 2FA usando /setup-2fa');
                        }
                        if (twoFactor.enabled) {
                            throw new Error('2FA ya está habilitado');
                        }
                        isValid = speakeasy_1.default.totp.verify({
                            secret: twoFactor.secret,
                            encoding: 'base32',
                            token: code,
                            window: 2 // Permitir 2 intervalos de tiempo antes/después
                        });
                        if (!isValid) {
                            throw new Error('Código 2FA inválido');
                        }
                        // Habilitar 2FA
                        return [4 /*yield*/, TwoFactorRepository_1.default.enable(userId)];
                    case 2:
                        // Habilitar 2FA
                        _a.sent();
                        return [4 /*yield*/, UserRepository_1.default.enable2FA(userId)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, UserRepository_1.default.findById(userId)];
                    case 4:
                        user = _a.sent();
                        if (!user) return [3 /*break*/, 9];
                        return [4 /*yield*/, AuthLogRepository_1.default.create({
                                usuario_id: userId,
                                email: user.email,
                                event_type: '2fa_enabled',
                                success: true
                            })];
                    case 5:
                        _a.sent();
                        if (!process.env.SMTP_USER) return [3 /*break*/, 9];
                        _a.label = 6;
                    case 6:
                        _a.trys.push([6, 8, , 9]);
                        emailContent = email_1.emailTemplates.twoFactorEnabled(user.nombre);
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
                        console.error('Error al enviar email de 2FA:', error_1);
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/, true];
                }
            });
        });
    };
    /**
     * Deshabilitar 2FA
     */
    TwoFactorService.prototype.disable = function (userId, password) {
        return __awaiter(this, void 0, void 0, function () {
            var user, bcrypt, isPasswordValid;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, UserRepository_1.default.findById(userId)];
                    case 1:
                        user = _a.sent();
                        if (!user) {
                            throw new Error('Usuario no encontrado');
                        }
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('bcryptjs'); })];
                    case 2:
                        bcrypt = _a.sent();
                        if (!user.password_hash) {
                            throw new Error('Esta cuenta usa OAuth y no puede deshabilitar 2FA de esta forma');
                        }
                        return [4 /*yield*/, bcrypt.compare(password, user.password_hash)];
                    case 3:
                        isPasswordValid = _a.sent();
                        if (!isPasswordValid) {
                            throw new Error('Contraseña incorrecta');
                        }
                        // Deshabilitar 2FA
                        return [4 /*yield*/, TwoFactorRepository_1.default.disable(userId)];
                    case 4:
                        // Deshabilitar 2FA
                        _a.sent();
                        return [4 /*yield*/, UserRepository_1.default.disable2FA(userId)];
                    case 5:
                        _a.sent();
                        // Log del evento
                        return [4 /*yield*/, AuthLogRepository_1.default.create({
                                usuario_id: userId,
                                email: user.email,
                                event_type: '2fa_disabled',
                                success: true
                            })];
                    case 6:
                        // Log del evento
                        _a.sent();
                        return [2 /*return*/, true];
                }
            });
        });
    };
    /**
     * Verificar código TOTP
     */
    TwoFactorService.prototype.verifyCode = function (userId, code) {
        return __awaiter(this, void 0, void 0, function () {
            var twoFactor, isValid;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, TwoFactorRepository_1.default.findByUserId(userId)];
                    case 1:
                        twoFactor = _a.sent();
                        if (!twoFactor || !twoFactor.enabled) {
                            throw new Error('2FA no está habilitado');
                        }
                        isValid = speakeasy_1.default.totp.verify({
                            secret: twoFactor.secret,
                            encoding: 'base32',
                            token: code,
                            window: 2
                        });
                        if (!isValid) return [3 /*break*/, 3];
                        // Actualizar timestamp de último uso
                        return [4 /*yield*/, TwoFactorRepository_1.default.updateLastUsed(userId)];
                    case 2:
                        // Actualizar timestamp de último uso
                        _a.sent();
                        return [2 /*return*/, true];
                    case 3: return [2 /*return*/, false];
                }
            });
        });
    };
    /**
     * Verificar código de respaldo
     */
    TwoFactorService.prototype.verifyBackupCode = function (userId, code) {
        return __awaiter(this, void 0, void 0, function () {
            var twoFactor, _i, _a, hashedCode, user;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, TwoFactorRepository_1.default.findByUserId(userId)];
                    case 1:
                        twoFactor = _b.sent();
                        if (!twoFactor || !twoFactor.enabled) {
                            throw new Error('2FA no está habilitado');
                        }
                        _i = 0, _a = twoFactor.backup_codes;
                        _b.label = 2;
                    case 2:
                        if (!(_i < _a.length)) return [3 /*break*/, 9];
                        hashedCode = _a[_i];
                        if (!(0, tokens_1.verifyBackupCode)(code, hashedCode)) return [3 /*break*/, 8];
                        // Código válido, removerlo para que no se pueda usar de nuevo
                        return [4 /*yield*/, TwoFactorRepository_1.default.removeBackupCode(userId, hashedCode)];
                    case 3:
                        // Código válido, removerlo para que no se pueda usar de nuevo
                        _b.sent();
                        // Actualizar timestamp
                        return [4 /*yield*/, TwoFactorRepository_1.default.updateLastUsed(userId)];
                    case 4:
                        // Actualizar timestamp
                        _b.sent();
                        return [4 /*yield*/, UserRepository_1.default.findById(userId)];
                    case 5:
                        user = _b.sent();
                        if (!user) return [3 /*break*/, 7];
                        return [4 /*yield*/, AuthLogRepository_1.default.create({
                                usuario_id: userId,
                                email: user.email,
                                event_type: '2fa_backup_code_used',
                                success: true
                            })];
                    case 6:
                        _b.sent();
                        _b.label = 7;
                    case 7: return [2 /*return*/, true];
                    case 8:
                        _i++;
                        return [3 /*break*/, 2];
                    case 9: return [2 /*return*/, false];
                }
            });
        });
    };
    /**
     * Regenerar códigos de respaldo
     */
    TwoFactorService.prototype.regenerateBackupCodes = function (userId, password) {
        return __awaiter(this, void 0, void 0, function () {
            var user, bcrypt, isPasswordValid, backupCodesPlain, backupCodesHashed;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, UserRepository_1.default.findById(userId)];
                    case 1:
                        user = _a.sent();
                        if (!user) {
                            throw new Error('Usuario no encontrado');
                        }
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('bcryptjs'); })];
                    case 2:
                        bcrypt = _a.sent();
                        if (!user.password_hash) {
                            throw new Error('Esta cuenta usa OAuth');
                        }
                        return [4 /*yield*/, bcrypt.compare(password, user.password_hash)];
                    case 3:
                        isPasswordValid = _a.sent();
                        if (!isPasswordValid) {
                            throw new Error('Contraseña incorrecta');
                        }
                        backupCodesPlain = (0, tokens_1.generateBackupCodes)(8);
                        backupCodesHashed = backupCodesPlain.map(function (code) { return (0, tokens_1.hashBackupCode)(code); });
                        // Actualizar en BD
                        return [4 /*yield*/, TwoFactorRepository_1.default.regenerateBackupCodes(userId, backupCodesHashed)];
                    case 4:
                        // Actualizar en BD
                        _a.sent();
                        // Log del evento
                        return [4 /*yield*/, AuthLogRepository_1.default.create({
                                usuario_id: userId,
                                email: user.email,
                                event_type: '2fa_backup_codes_regenerated',
                                success: true
                            })];
                    case 5:
                        // Log del evento
                        _a.sent();
                        return [2 /*return*/, backupCodesPlain];
                }
            });
        });
    };
    /**
     * Obtener cantidad de códigos de respaldo restantes
     */
    TwoFactorService.prototype.getBackupCodesCount = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, TwoFactorRepository_1.default.countBackupCodes(userId)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Verificar si el usuario tiene 2FA habilitado
     */
    TwoFactorService.prototype.isEnabled = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, TwoFactorRepository_1.default.isEnabled(userId)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Obtener información de 2FA (sin el secret)
     */
    TwoFactorService.prototype.getInfo = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var twoFactor;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, TwoFactorRepository_1.default.findByUserId(userId)];
                    case 1:
                        twoFactor = _a.sent();
                        if (!twoFactor) {
                            return [2 /*return*/, {
                                    enabled: false,
                                    backupCodesCount: 0
                                }];
                        }
                        return [2 /*return*/, {
                                enabled: twoFactor.enabled,
                                backupCodesCount: twoFactor.backup_codes.length,
                                lastUsedAt: twoFactor.last_used_at
                            }];
                }
            });
        });
    };
    return TwoFactorService;
}());
exports.TwoFactorService = TwoFactorService;
exports.default = new TwoFactorService();
