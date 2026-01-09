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
exports.TwoFactorController = void 0;
var TwoFactorService_1 = require("../services/TwoFactorService");
var TwoFactorController = /** @class */ (function () {
    function TwoFactorController() {
    }
    /**
     * POST /api/auth/2fa/setup
     * Configurar 2FA (genera QR y códigos de respaldo)
     */
    TwoFactorController.prototype.setup = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var userId, result, error_1;
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
                        return [4 /*yield*/, TwoFactorService_1.default.setup(userId)];
                    case 1:
                        result = _b.sent();
                        res.json({
                            message: 'Escanea el código QR con tu app de autenticación (Google Authenticator, Authy, etc.)',
                            qrCodeUrl: result.qrCodeUrl,
                            secret: result.secret,
                            backupCodes: result.backupCodes,
                            note: 'Guarda los códigos de respaldo en un lugar seguro. Después debes verificar el código para habilitar 2FA.'
                        });
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _b.sent();
                        res.status(400).json({
                            error: 'Error al configurar 2FA',
                            message: error_1.message
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * POST /api/auth/2fa/enable
     * Habilitar 2FA (verificar código después de setup)
     */
    TwoFactorController.prototype.enable = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var userId, code, error_2;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                        code = req.body.code;
                        if (!userId) {
                            res.status(401).json({ error: 'No autenticado' });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, TwoFactorService_1.default.enable(userId, code)];
                    case 1:
                        _b.sent();
                        res.json({
                            message: '2FA habilitado exitosamente',
                            enabled: true
                        });
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _b.sent();
                        res.status(400).json({
                            error: 'Error al habilitar 2FA',
                            message: error_2.message
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * POST /api/auth/2fa/disable
     * Deshabilitar 2FA
     */
    TwoFactorController.prototype.disable = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var userId, password, error_3;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                        password = req.body.password;
                        if (!userId) {
                            res.status(401).json({ error: 'No autenticado' });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, TwoFactorService_1.default.disable(userId, password)];
                    case 1:
                        _b.sent();
                        res.json({
                            message: '2FA deshabilitado',
                            enabled: false
                        });
                        return [3 /*break*/, 3];
                    case 2:
                        error_3 = _b.sent();
                        res.status(400).json({
                            error: 'Error al deshabilitar 2FA',
                            message: error_3.message
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * POST /api/auth/2fa/verify
     * Verificar código 2FA durante login
     */
    TwoFactorController.prototype.verify = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var userId, code, isValid, error_4;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                        code = req.body.code;
                        if (!userId) {
                            res.status(401).json({ error: 'No autenticado' });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, TwoFactorService_1.default.verifyCode(userId, code)];
                    case 1:
                        isValid = _b.sent();
                        if (!isValid) {
                            res.status(401).json({
                                error: 'Código inválido',
                                message: 'El código 2FA es incorrecto'
                            });
                            return [2 /*return*/];
                        }
                        res.json({
                            message: '2FA verificado',
                            verified: true
                        });
                        return [3 /*break*/, 3];
                    case 2:
                        error_4 = _b.sent();
                        res.status(400).json({
                            error: 'Error al verificar 2FA',
                            message: error_4.message
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * POST /api/auth/2fa/verify-backup
     * Verificar código de respaldo
     */
    TwoFactorController.prototype.verifyBackup = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var userId, code, isValid, error_5;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                        code = req.body.code;
                        if (!userId) {
                            res.status(401).json({ error: 'No autenticado' });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, TwoFactorService_1.default.verifyBackupCode(userId, code)];
                    case 1:
                        isValid = _b.sent();
                        if (!isValid) {
                            res.status(401).json({
                                error: 'Código inválido',
                                message: 'El código de respaldo es incorrecto o ya fue usado'
                            });
                            return [2 /*return*/];
                        }
                        res.json({
                            message: 'Código de respaldo verificado',
                            verified: true,
                            warning: 'Este código de respaldo ya no se puede usar de nuevo'
                        });
                        return [3 /*break*/, 3];
                    case 2:
                        error_5 = _b.sent();
                        res.status(400).json({
                            error: 'Error al verificar código de respaldo',
                            message: error_5.message
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * POST /api/auth/2fa/regenerate-backup-codes
     * Regenerar códigos de respaldo
     */
    TwoFactorController.prototype.regenerateBackupCodes = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var userId, password, newCodes, error_6;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                        password = req.body.password;
                        if (!userId) {
                            res.status(401).json({ error: 'No autenticado' });
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, TwoFactorService_1.default.regenerateBackupCodes(userId, password)];
                    case 1:
                        newCodes = _b.sent();
                        res.json({
                            message: 'Códigos de respaldo regenerados',
                            backupCodes: newCodes,
                            warning: 'Los códigos anteriores ya no son válidos. Guarda estos nuevos códigos en un lugar seguro.'
                        });
                        return [3 /*break*/, 3];
                    case 2:
                        error_6 = _b.sent();
                        res.status(400).json({
                            error: 'Error al regenerar códigos',
                            message: error_6.message
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * GET /api/auth/2fa/status
     * Obtener estado de 2FA
     */
    TwoFactorController.prototype.getStatus = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var userId, info, error_7;
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
                        return [4 /*yield*/, TwoFactorService_1.default.getInfo(userId)];
                    case 1:
                        info = _b.sent();
                        res.json({
                            enabled: info.enabled,
                            backupCodesCount: info.backupCodesCount,
                            lastUsedAt: info.lastUsedAt
                        });
                        return [3 /*break*/, 3];
                    case 2:
                        error_7 = _b.sent();
                        res.status(400).json({
                            error: 'Error al obtener estado',
                            message: error_7.message
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return TwoFactorController;
}());
exports.TwoFactorController = TwoFactorController;
exports.default = new TwoFactorController();
