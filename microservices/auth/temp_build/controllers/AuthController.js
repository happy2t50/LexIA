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
exports.AuthController = void 0;
var AuthService_1 = require("../services/AuthService");
var AuthController = /** @class */ (function () {
    function AuthController() {
    }
    /**
     * POST /api/auth/register
     * Registrar nuevo usuario
     */
    AuthController.prototype.register = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, email, password, nombre, apellidoRaw, apellidos, telefono, apellido, ipAddress, result, isProd, hasSmtp, error_1;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        _a = req.body, email = _a.email, password = _a.password, nombre = _a.nombre, apellidoRaw = _a.apellido, apellidos = _a.apellidos, telefono = _a.telefono;
                        apellido = ((_b = apellidoRaw !== null && apellidoRaw !== void 0 ? apellidoRaw : apellidos) !== null && _b !== void 0 ? _b : '').toString().trim();
                        ipAddress = req.ip || req.socket.remoteAddress;
                        return [4 /*yield*/, AuthService_1.default.register({ email: email, password: password, nombre: nombre, apellido: apellido, telefono: telefono }, ipAddress)];
                    case 1:
                        result = _c.sent();
                        isProd = process.env.NODE_ENV === 'production';
                        hasSmtp = !!process.env.SMTP_USER;
                        res.status(201).json(__assign({ message: 'Usuario registrado exitosamente. Revisa tu email para verificar tu cuenta.', user: {
                                id: result.user.id,
                                email: result.user.email,
                                nombre: result.user.nombre,
                                apellido: result.user.apellido
                            } }, (isProd || hasSmtp
                            ? {}
                            : { devVerificationUrl: "".concat(req.protocol, "://").concat(req.get('host'), "/api/auth/verify-email?token=").concat(result.verificationToken) })));
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _c.sent();
                        res.status(400).json({
                            error: 'Error en el registro',
                            message: error_1.message
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * POST /api/auth/login
     * Iniciar sesión
     */
    AuthController.prototype.login = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, email, password, ipAddress, userAgent, result, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        _a = req.body, email = _a.email, password = _a.password;
                        ipAddress = req.ip || req.socket.remoteAddress;
                        userAgent = req.headers['user-agent'];
                        return [4 /*yield*/, AuthService_1.default.login({
                                email: email,
                                password: password,
                                ipAddress: ipAddress,
                                userAgent: userAgent
                            })];
                    case 1:
                        result = _b.sent();
                        // Si el usuario tiene 2FA habilitado, NO devolver tokens todavía
                        if (result.user.two_factor_enabled) {
                            res.json({
                                message: 'Código 2FA requerido',
                                requires2FA: true,
                                userId: result.user.id,
                                tempToken: result.tokens.accessToken // Token temporal para el paso de 2FA
                            });
                            return [2 /*return*/];
                        }
                        res.json({
                            message: 'Login exitoso',
                            user: {
                                id: result.user.id,
                                email: result.user.email,
                                nombre: result.user.nombre,
                                apellido: result.user.apellido,
                                rol: result.user.rol,
                                emailVerified: result.user.email_verified
                            },
                            accessToken: result.tokens.accessToken,
                            refreshToken: result.tokens.refreshToken,
                            expiresIn: result.tokens.accessTokenExpiresIn
                        });
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _b.sent();
                        res.status(401).json({
                            error: 'Error en el login',
                            message: error_2.message
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * POST /api/auth/refresh
     * Refrescar access token
     */
    AuthController.prototype.refresh = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var refreshToken, tokens, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        refreshToken = req.body.refreshToken;
                        return [4 /*yield*/, AuthService_1.default.refreshAccessToken(refreshToken)];
                    case 1:
                        tokens = _a.sent();
                        res.json({
                            accessToken: tokens.accessToken,
                            refreshToken: tokens.refreshToken,
                            expiresIn: tokens.accessTokenExpiresIn
                        });
                        return [3 /*break*/, 3];
                    case 2:
                        error_3 = _a.sent();
                        res.status(401).json({
                            error: 'Error al refrescar token',
                            message: error_3.message
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * POST /api/auth/logout
     * Cerrar sesión
     */
    AuthController.prototype.logout = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var refreshToken, userId, ipAddress, error_4;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        refreshToken = req.body.refreshToken;
                        userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                        ipAddress = req.ip || req.socket.remoteAddress;
                        if (!userId) {
                            res.status(401).json({ error: 'No autenticado' });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, AuthService_1.default.logout(refreshToken, userId, ipAddress)];
                    case 1:
                        _b.sent();
                        res.json({ message: 'Logout exitoso' });
                        return [3 /*break*/, 3];
                    case 2:
                        error_4 = _b.sent();
                        res.status(400).json({
                            error: 'Error en el logout',
                            message: error_4.message
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * POST /api/auth/logout-all
     * Cerrar todas las sesiones
     */
    AuthController.prototype.logoutAll = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var userId, ipAddress, error_5;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                        ipAddress = req.ip || req.socket.remoteAddress;
                        if (!userId) {
                            res.status(401).json({ error: 'No autenticado' });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, AuthService_1.default.logoutAll(userId, ipAddress)];
                    case 1:
                        _b.sent();
                        res.json({ message: 'Todas las sesiones cerradas' });
                        return [3 /*break*/, 3];
                    case 2:
                        error_5 = _b.sent();
                        res.status(400).json({
                            error: 'Error al cerrar sesiones',
                            message: error_5.message
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * POST /api/auth/verify-email
     * Verificar email (POST)
     */
    AuthController.prototype.verifyEmail = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var token, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        token = req.body.token;
                        return [4 /*yield*/, AuthService_1.default.verifyEmail(token)];
                    case 1:
                        _a.sent();
                        res.json({ message: 'Email verificado exitosamente' });
                        return [3 /*break*/, 3];
                    case 2:
                        error_6 = _a.sent();
                        res.status(400).json({
                            error: 'Error en la verificación',
                            message: error_6.message
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * GET /api/auth/verify-email
     * Verificar email desde enlace (GET)
     */
    AuthController.prototype.verifyEmailFromLink = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var token, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        token = req.query.token;
                        if (!token || typeof token !== 'string') {
                            res.status(400).json({
                                error: 'Token requerido',
                                message: 'El token de verificación es obligatorio'
                            });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, AuthService_1.default.verifyEmail(token)];
                    case 1:
                        _a.sent();
                        // Responder con HTML para mostrar en el navegador
                        res.send("\n                <html>\n                    <head>\n                        <title>Email Verificado - LexIA</title>\n                        <meta charset=\"utf-8\">\n                        <style>\n                            body { font-family: Arial, sans-serif; text-align: center; margin: 50px; }\n                            .success { color: #16a34a; }\n                            .container { max-width: 500px; margin: 0 auto; }\n                        </style>\n                    </head>\n                    <body>\n                        <div class=\"container\">\n                            <h1 class=\"success\">\u2705 Email Verificado</h1>\n                            <p>Tu correo electr\u00F3nico ha sido verificado exitosamente.</p>\n                            <p>Ya puedes cerrar esta ventana y continuar usando LexIA.</p>\n                        </div>\n                    </body>\n                </html>\n            ");
                        return [3 /*break*/, 3];
                    case 2:
                        error_7 = _a.sent();
                        res.status(400).send("\n                <html>\n                    <head>\n                        <title>Error de Verificaci\u00F3n - LexIA</title>\n                        <meta charset=\"utf-8\">\n                        <style>\n                            body { font-family: Arial, sans-serif; text-align: center; margin: 50px; }\n                            .error { color: #dc2626; }\n                            .container { max-width: 500px; margin: 0 auto; }\n                        </style>\n                    </head>\n                    <body>\n                        <div class=\"container\">\n                            <h1 class=\"error\">\u274C Error de Verificaci\u00F3n</h1>\n                            <p>No se pudo verificar tu correo electr\u00F3nico.</p>\n                            <p><strong>Error:</strong> ".concat(error_7.message, "</p>\n                            <p>El enlace puede haber expirado. Intenta solicitar un nuevo enlace de verificaci\u00F3n.</p>\n                        </div>\n                    </body>\n                </html>\n            "));
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * POST /api/auth/resend-verification
     * Reenviar email de verificación
     */
    AuthController.prototype.resendVerification = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var email, ipAddress, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        email = req.body.email;
                        ipAddress = req.ip || req.socket.remoteAddress;
                        return [4 /*yield*/, AuthService_1.default.resendVerificationEmail(email, ipAddress)];
                    case 1:
                        _a.sent();
                        res.json({ message: 'Email de verificación enviado' });
                        return [3 /*break*/, 3];
                    case 2:
                        error_8 = _a.sent();
                        res.status(400).json({
                            error: 'Error al reenviar verificación',
                            message: error_8.message
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * POST /api/auth/forgot-password
     * Solicitar recuperación de contraseña - envía código de 6 dígitos
     */
    AuthController.prototype.forgotPassword = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var email, ipAddress, error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        email = req.body.email;
                        ipAddress = req.ip || req.socket.remoteAddress;
                        return [4 /*yield*/, AuthService_1.default.requestPasswordReset(email, ipAddress)];
                    case 1:
                        _a.sent();
                        res.json({
                            message: 'Si el email existe, recibirás un código de verificación',
                            success: true
                        });
                        return [3 /*break*/, 3];
                    case 2:
                        error_9 = _a.sent();
                        res.status(400).json({
                            error: 'Error al solicitar recuperación',
                            message: error_9.message,
                            success: false
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * POST /api/auth/verify-reset-code
     * Verificar código de recuperación
     */
    AuthController.prototype.verifyResetCode = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, email, code, isValid, error_10;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        _a = req.body, email = _a.email, code = _a.code;
                        return [4 /*yield*/, AuthService_1.default.verifyResetCode(email, code)];
                    case 1:
                        isValid = _b.sent();
                        if (isValid) {
                            res.json({
                                message: 'Código válido',
                                success: true
                            });
                        }
                        else {
                            res.status(400).json({
                                error: 'Código inválido o expirado',
                                success: false
                            });
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_10 = _b.sent();
                        res.status(400).json({
                            error: 'Error al verificar código',
                            message: error_10.message,
                            success: false
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * POST /api/auth/reset-password
     * Resetear contraseña con código verificado
     */
    AuthController.prototype.resetPassword = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, email, code, newPassword, error_11;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        _a = req.body, email = _a.email, code = _a.code, newPassword = _a.newPassword;
                        return [4 /*yield*/, AuthService_1.default.resetPassword(email, code, newPassword)];
                    case 1:
                        _b.sent();
                        res.json({
                            message: 'Contraseña actualizada exitosamente',
                            success: true
                        });
                        return [3 /*break*/, 3];
                    case 2:
                        error_11 = _b.sent();
                        res.status(400).json({
                            error: 'Error al resetear contraseña',
                            message: error_11.message,
                            success: false
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * GET /api/auth/me
     * Obtener perfil del usuario autenticado
     */
    AuthController.prototype.getProfile = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var userId, user, error_12;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                        if (!userId) {
                            res.status(401).json({ error: 'No autenticado' });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, AuthService_1.default.getProfile(userId)];
                    case 1:
                        user = _b.sent();
                        res.json({ user: user });
                        return [3 /*break*/, 3];
                    case 2:
                        error_12 = _b.sent();
                        res.status(400).json({
                            error: 'Error al obtener perfil',
                            message: error_12.message
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * PUT /api/auth/me
     * Actualizar perfil del usuario autenticado
     */
    AuthController.prototype.updateProfile = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var userId, _a, nombre, apellidos, email, telefono, user, error_13;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.userId;
                        if (!userId) {
                            res.status(401).json({ error: 'No autenticado' });
                            return [2 /*return*/];
                        }
                        _a = req.body, nombre = _a.nombre, apellidos = _a.apellidos, email = _a.email, telefono = _a.telefono;
                        return [4 /*yield*/, AuthService_1.default.updateProfile(userId, {
                                nombre: nombre,
                                apellidos: apellidos,
                                email: email,
                                telefono: telefono
                            })];
                    case 1:
                        user = _c.sent();
                        res.json({
                            message: 'Perfil actualizado exitosamente',
                            user: user
                        });
                        return [3 /*break*/, 3];
                    case 2:
                        error_13 = _c.sent();
                        res.status(400).json({
                            error: 'Error al actualizar perfil',
                            message: error_13.message
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * GET /api/auth/sessions
     * Obtener sesiones activas
     */
    AuthController.prototype.getSessions = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var userId, sessions, error_14;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                        if (!userId) {
                            res.status(401).json({ error: 'No autenticado' });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, AuthService_1.default.getActiveSessions(userId)];
                    case 1:
                        sessions = _b.sent();
                        res.json({ sessions: sessions });
                        return [3 /*break*/, 3];
                    case 2:
                        error_14 = _b.sent();
                        res.status(400).json({
                            error: 'Error al obtener sesiones',
                            message: error_14.message
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * GET /api/auth/history
     * Obtener historial de autenticación
     */
    AuthController.prototype.getHistory = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var userId, limit, history_1, error_15;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                        limit = parseInt(req.query.limit) || 50;
                        if (!userId) {
                            res.status(401).json({ error: 'No autenticado' });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, AuthService_1.default.getAuthHistory(userId, limit)];
                    case 1:
                        history_1 = _b.sent();
                        res.json({ history: history_1 });
                        return [3 /*break*/, 3];
                    case 2:
                        error_15 = _b.sent();
                        res.status(400).json({
                            error: 'Error al obtener historial',
                            message: error_15.message
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return AuthController;
}());
exports.AuthController = AuthController;
exports.default = new AuthController();
