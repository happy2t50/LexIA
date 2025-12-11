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
exports.OAuthRepository = void 0;
var database_1 = require("../config/database");
var OAuthRepository = /** @class */ (function () {
    function OAuthRepository() {
        this.pool = database_1.default;
    }
    /**
     * Crear o actualizar cuenta OAuth
     */
    OAuthRepository.prototype.upsert = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var query, values, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            INSERT INTO oauth_accounts (\n                usuario_id, provider, provider_account_id,\n                access_token, refresh_token, token_expires_at, profile_data\n            )\n            VALUES ($1, $2, $3, $4, $5, $6, $7)\n            ON CONFLICT (provider, provider_account_id)\n            DO UPDATE SET\n                usuario_id = EXCLUDED.usuario_id,\n                access_token = EXCLUDED.access_token,\n                refresh_token = EXCLUDED.refresh_token,\n                token_expires_at = EXCLUDED.token_expires_at,\n                profile_data = EXCLUDED.profile_data,\n                updated_at = NOW()\n            RETURNING *\n        ";
                        values = [
                            data.usuario_id,
                            data.provider,
                            data.provider_account_id,
                            data.access_token || null,
                            data.refresh_token || null,
                            data.token_expires_at || null,
                            data.profile_data ? JSON.stringify(data.profile_data) : null
                        ];
                        return [4 /*yield*/, this.pool.query(query, values)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0]];
                }
            });
        });
    };
    /**
     * Buscar cuenta OAuth por provider y provider_account_id
     */
    OAuthRepository.prototype.findByProvider = function (provider, providerAccountId) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            SELECT * FROM oauth_accounts\n            WHERE provider = $1 AND provider_account_id = $2\n        ";
                        return [4 /*yield*/, this.pool.query(query, [provider, providerAccountId])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0] || null];
                }
            });
        });
    };
    /**
     * Buscar todas las cuentas OAuth de un usuario
     */
    OAuthRepository.prototype.findByUserId = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = 'SELECT * FROM oauth_accounts WHERE usuario_id = $1';
                        return [4 /*yield*/, this.pool.query(query, [userId])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows];
                }
            });
        });
    };
    /**
     * Verificar si un usuario tiene cuenta OAuth vinculada
     */
    OAuthRepository.prototype.hasOAuthAccount = function (userId, provider) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            SELECT COUNT(*) as count\n            FROM oauth_accounts\n            WHERE usuario_id = $1 AND provider = $2\n        ";
                        return [4 /*yield*/, this.pool.query(query, [userId, provider])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, parseInt(result.rows[0].count, 10) > 0];
                }
            });
        });
    };
    /**
     * Actualizar tokens de OAuth
     */
    OAuthRepository.prototype.updateTokens = function (provider, providerAccountId, accessToken, refreshToken, expiresAt) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            UPDATE oauth_accounts\n            SET access_token = $3,\n                refresh_token = COALESCE($4, refresh_token),\n                token_expires_at = $5,\n                updated_at = NOW()\n            WHERE provider = $1 AND provider_account_id = $2\n        ";
                        return [4 /*yield*/, this.pool.query(query, [
                                provider,
                                providerAccountId,
                                accessToken,
                                refreshToken || null,
                                expiresAt || null
                            ])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount ? result.rowCount > 0 : false];
                }
            });
        });
    };
    /**
     * Eliminar cuenta OAuth
     */
    OAuthRepository.prototype.delete = function (provider, providerAccountId) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            DELETE FROM oauth_accounts\n            WHERE provider = $1 AND provider_account_id = $2\n        ";
                        return [4 /*yield*/, this.pool.query(query, [provider, providerAccountId])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount ? result.rowCount > 0 : false];
                }
            });
        });
    };
    /**
     * Eliminar todas las cuentas OAuth de un usuario
     */
    OAuthRepository.prototype.deleteAllForUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = 'DELETE FROM oauth_accounts WHERE usuario_id = $1';
                        return [4 /*yield*/, this.pool.query(query, [userId])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount || 0];
                }
            });
        });
    };
    return OAuthRepository;
}());
exports.OAuthRepository = OAuthRepository;
exports.default = new OAuthRepository();
