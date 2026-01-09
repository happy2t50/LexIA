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
exports.TwoFactorRepository = void 0;
var database_1 = require("../config/database");
var TwoFactorRepository = /** @class */ (function () {
    function TwoFactorRepository() {
        this.pool = database_1.default;
    }
    /**
     * Crear configuración 2FA
     */
    TwoFactorRepository.prototype.create = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var query, values, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            INSERT INTO two_factor_auth (usuario_id, secret, backup_codes, enabled)\n            VALUES ($1, $2, $3, false)\n            ON CONFLICT (usuario_id)\n            DO UPDATE SET\n                secret = EXCLUDED.secret,\n                backup_codes = EXCLUDED.backup_codes,\n                enabled = false\n            RETURNING *\n        ";
                        values = [data.usuario_id, data.secret, data.backup_codes];
                        return [4 /*yield*/, this.pool.query(query, values)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0]];
                }
            });
        });
    };
    /**
     * Buscar configuración 2FA por usuario
     */
    TwoFactorRepository.prototype.findByUserId = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = 'SELECT * FROM two_factor_auth WHERE usuario_id = $1';
                        return [4 /*yield*/, this.pool.query(query, [userId])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0] || null];
                }
            });
        });
    };
    /**
     * Habilitar 2FA
     */
    TwoFactorRepository.prototype.enable = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            UPDATE two_factor_auth\n            SET enabled = true,\n                enabled_at = NOW()\n            WHERE usuario_id = $1\n        ";
                        return [4 /*yield*/, this.pool.query(query, [userId])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount ? result.rowCount > 0 : false];
                }
            });
        });
    };
    /**
     * Deshabilitar 2FA
     */
    TwoFactorRepository.prototype.disable = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            UPDATE two_factor_auth\n            SET enabled = false\n            WHERE usuario_id = $1\n        ";
                        return [4 /*yield*/, this.pool.query(query, [userId])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount ? result.rowCount > 0 : false];
                }
            });
        });
    };
    /**
     * Actualizar timestamp de último uso
     */
    TwoFactorRepository.prototype.updateLastUsed = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            UPDATE two_factor_auth\n            SET last_used_at = NOW()\n            WHERE usuario_id = $1\n        ";
                        return [4 /*yield*/, this.pool.query(query, [userId])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount ? result.rowCount > 0 : false];
                }
            });
        });
    };
    /**
     * Remover un código de respaldo usado
     */
    TwoFactorRepository.prototype.removeBackupCode = function (userId, usedCode) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            UPDATE two_factor_auth\n            SET backup_codes = array_remove(backup_codes, $2)\n            WHERE usuario_id = $1\n        ";
                        return [4 /*yield*/, this.pool.query(query, [userId, usedCode])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount ? result.rowCount > 0 : false];
                }
            });
        });
    };
    /**
     * Regenerar códigos de respaldo
     */
    TwoFactorRepository.prototype.regenerateBackupCodes = function (userId, newCodes) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            UPDATE two_factor_auth\n            SET backup_codes = $2\n            WHERE usuario_id = $1\n        ";
                        return [4 /*yield*/, this.pool.query(query, [userId, newCodes])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount ? result.rowCount > 0 : false];
                }
            });
        });
    };
    /**
     * Verificar si 2FA está habilitado
     */
    TwoFactorRepository.prototype.isEnabled = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        query = "\n            SELECT enabled\n            FROM two_factor_auth\n            WHERE usuario_id = $1\n        ";
                        return [4 /*yield*/, this.pool.query(query, [userId])];
                    case 1:
                        result = _b.sent();
                        return [2 /*return*/, ((_a = result.rows[0]) === null || _a === void 0 ? void 0 : _a.enabled) || false];
                }
            });
        });
    };
    /**
     * Eliminar configuración 2FA
     */
    TwoFactorRepository.prototype.delete = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = 'DELETE FROM two_factor_auth WHERE usuario_id = $1';
                        return [4 /*yield*/, this.pool.query(query, [userId])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount ? result.rowCount > 0 : false];
                }
            });
        });
    };
    /**
     * Contar códigos de respaldo restantes
     */
    TwoFactorRepository.prototype.countBackupCodes = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        query = "\n            SELECT array_length(backup_codes, 1) as count\n            FROM two_factor_auth\n            WHERE usuario_id = $1\n        ";
                        return [4 /*yield*/, this.pool.query(query, [userId])];
                    case 1:
                        result = _b.sent();
                        return [2 /*return*/, ((_a = result.rows[0]) === null || _a === void 0 ? void 0 : _a.count) || 0];
                }
            });
        });
    };
    return TwoFactorRepository;
}());
exports.TwoFactorRepository = TwoFactorRepository;
exports.default = new TwoFactorRepository();
