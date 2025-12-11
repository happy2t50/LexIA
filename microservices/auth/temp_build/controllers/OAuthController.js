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
exports.OAuthController = void 0;
var OAuthService_1 = require("../services/OAuthService");
var OAuthController = /** @class */ (function () {
    function OAuthController() {
    }
    /**
     * GET /api/auth/google
     * Iniciar login con Google
     */
    OAuthController.prototype.googleLogin = function (req, res, next) {
        return __awaiter(this, void 0, void 0, function () {
            var passport;
            return __generator(this, function (_a) {
                passport = OAuthService_1.default.getPassport();
                passport.authenticate('google', {
                    scope: ['profile', 'email']
                })(req, res, next);
                return [2 /*return*/];
            });
        });
    };
    /**
     * GET /api/auth/google/callback
     * Callback de Google OAuth
     */
    OAuthController.prototype.googleCallback = function (req, res, next) {
        return __awaiter(this, void 0, void 0, function () {
            var passport;
            return __generator(this, function (_a) {
                passport = OAuthService_1.default.getPassport();
                passport.authenticate('google', { session: false }, function (err, user) {
                    if (err || !user) {
                        // Redirigir al frontend con error
                        var frontendUrl_1 = process.env.FRONTEND_URL || 'http://localhost:3000';
                        res.redirect("".concat(frontendUrl_1, "/login?error=oauth_failed"));
                        return;
                    }
                    // Redirigir al frontend con tokens en la URL (o usar cookies)
                    var frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                    var params = new URLSearchParams({
                        accessToken: user.tokens.accessToken,
                        refreshToken: user.tokens.refreshToken,
                        isNewUser: user.isNewUser.toString()
                    });
                    res.redirect("".concat(frontendUrl, "/auth/callback?").concat(params.toString()));
                })(req, res, next);
                return [2 /*return*/];
            });
        });
    };
    /**
     * POST /api/auth/google/link
     * Vincular cuenta Google a usuario actual
     */
    OAuthController.prototype.linkGoogle = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var userId;
            var _a;
            return __generator(this, function (_b) {
                try {
                    userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                    if (!userId) {
                        res.status(401).json({ error: 'No autenticado' });
                        return [2 /*return*/];
                    }
                    // Aquí normalmente usarías un flujo OAuth similar al login
                    // Por simplicidad, asumimos que ya tienes los tokens
                    res.json({
                        message: 'Usa el flujo de OAuth normal para vincular Google',
                        note: 'Implementación completa requiere manejo de estado OAuth'
                    });
                }
                catch (error) {
                    res.status(400).json({
                        error: 'Error al vincular Google',
                        message: error.message
                    });
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * POST /api/auth/google/unlink
     * Desvincular cuenta Google
     */
    OAuthController.prototype.unlinkGoogle = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var userId, error_1;
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
                        return [4 /*yield*/, OAuthService_1.default.unlinkGoogleAccount(userId)];
                    case 1:
                        _b.sent();
                        res.json({
                            message: 'Cuenta Google desvinculada exitosamente'
                        });
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _b.sent();
                        res.status(400).json({
                            error: 'Error al desvincular Google',
                            message: error_1.message
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * GET /api/auth/linked-accounts
     * Obtener cuentas vinculadas
     */
    OAuthController.prototype.getLinkedAccounts = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var userId, accounts, error_2;
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
                        return [4 /*yield*/, OAuthService_1.default.getLinkedAccounts(userId)];
                    case 1:
                        accounts = _b.sent();
                        res.json({ accounts: accounts });
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _b.sent();
                        res.status(400).json({
                            error: 'Error al obtener cuentas vinculadas',
                            message: error_2.message
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * POST /api/auth/google/verify
     * Verificar token de Google (para apps móviles y web)
     * Acepta tanto idToken (móvil) como accessToken (web)
     */
    OAuthController.prototype.verifyGoogleToken = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, idToken, accessToken, token, result, error_3;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        _a = req.body, idToken = _a.idToken, accessToken = _a.accessToken;
                        token = idToken || accessToken;
                        if (!token) {
                            res.status(400).json({
                                error: 'Token requerido',
                                message: 'El campo idToken o accessToken es obligatorio'
                            });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, OAuthService_1.default.verifyGoogleToken(token)];
                    case 1:
                        result = _b.sent();
                        res.json({
                            message: result.isNewUser ? 'Usuario registrado exitosamente' : 'Login exitoso',
                            accessToken: result.tokens.accessToken,
                            refreshToken: result.tokens.refreshToken,
                            expiresIn: result.tokens.accessTokenExpiresIn,
                            user: {
                                id: result.user.id,
                                email: result.user.email,
                                nombre: result.user.nombre,
                                apellido: result.user.apellido,
                                rol: result.user.rol,
                                emailVerified: result.user.email_verified
                            },
                            isNewUser: result.isNewUser
                        });
                        return [3 /*break*/, 3];
                    case 2:
                        error_3 = _b.sent();
                        console.error('Error en verifyGoogleToken:', error_3);
                        res.status(401).json({
                            error: 'Error de autenticación',
                            message: error_3.message || 'Token de Google inválido o expirado'
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return OAuthController;
}());
exports.OAuthController = OAuthController;
exports.default = new OAuthController();
