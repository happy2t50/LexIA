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
exports.EmailVerificationRepository = void 0;
var database_1 = require("../config/database");
var EmailVerificationRepository = /** @class */ (function () {
    function EmailVerificationRepository() {
        this.pool = database_1.default;
    }
    /**
     * Crear token de verificación de email
     */
    EmailVerificationRepository.prototype.create = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var query, values, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            INSERT INTO email_verification_tokens (\n                usuario_id, token, expires_at, ip_address\n            )\n            VALUES ($1, $2, $3, $4)\n            RETURNING *\n        ";
                        values = [data.usuario_id, data.token, data.expires_at, data.ip_address || null];
                        return [4 /*yield*/, this.pool.query(query, values)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0]];
                }
            });
        });
    };
    /**
     * Buscar token por string
     */
    EmailVerificationRepository.prototype.findByToken = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            SELECT * FROM email_verification_tokens\n            WHERE token = $1 AND verified_at IS NULL AND expires_at > NOW()\n        ";
                        return [4 /*yield*/, this.pool.query(query, [token])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0] || null];
                }
            });
        });
    };
    /**
     * Marcar token como verificado
     */
    EmailVerificationRepository.prototype.markAsVerified = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            UPDATE email_verification_tokens\n            SET verified_at = NOW()\n            WHERE token = $1\n        ";
                        return [4 /*yield*/, this.pool.query(query, [token])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount ? result.rowCount > 0 : false];
                }
            });
        });
    };
    /**
     * Incrementar intentos de verificación
     */
    EmailVerificationRepository.prototype.incrementAttempts = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            UPDATE email_verification_tokens\n            SET attempts = attempts + 1\n            WHERE token = $1\n        ";
                        return [4 /*yield*/, this.pool.query(query, [token])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount ? result.rowCount > 0 : false];
                }
            });
        });
    };
    /**
     * Invalidar tokens anteriores de un usuario
     */
    EmailVerificationRepository.prototype.invalidateUserTokens = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            UPDATE email_verification_tokens\n            SET verified_at = NOW()\n            WHERE usuario_id = $1 AND verified_at IS NULL\n        ";
                        return [4 /*yield*/, this.pool.query(query, [userId])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount || 0];
                }
            });
        });
    };
    /**
     * Eliminar tokens expirados
     */
    EmailVerificationRepository.prototype.cleanupExpired = function () {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            DELETE FROM email_verification_tokens\n            WHERE expires_at < NOW() - INTERVAL '7 days'\n        ";
                        return [4 /*yield*/, this.pool.query(query)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount || 0];
                }
            });
        });
    };
    return EmailVerificationRepository;
}());
exports.EmailVerificationRepository = EmailVerificationRepository;
exports.default = new EmailVerificationRepository();
