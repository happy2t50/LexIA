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
exports.AuthLogRepository = void 0;
var database_1 = require("../config/database");
var AuthLogRepository = /** @class */ (function () {
    function AuthLogRepository() {
        this.pool = database_1.default;
    }
    /**
     * Crear log de evento de autenticación
     */
    AuthLogRepository.prototype.create = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var query, values, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            INSERT INTO auth_logs (\n                usuario_id, email, event_type, success,\n                ip_address, user_agent, device_info, failure_reason, metadata\n            )\n            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)\n            RETURNING *\n        ";
                        values = [
                            data.usuario_id || null,
                            data.email,
                            data.event_type,
                            data.success,
                            data.ip_address || null,
                            data.user_agent || null,
                            data.device_info || null,
                            data.failure_reason || null,
                            data.metadata ? JSON.stringify(data.metadata) : null
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
     * Obtener logs por usuario
     */
    AuthLogRepository.prototype.findByUserId = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, limit) {
            var query, result;
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            SELECT * FROM auth_logs\n            WHERE usuario_id = $1\n            ORDER BY created_at DESC\n            LIMIT $2\n        ";
                        return [4 /*yield*/, this.pool.query(query, [userId, limit])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows];
                }
            });
        });
    };
    /**
     * Obtener logs por email
     */
    AuthLogRepository.prototype.findByEmail = function (email_1) {
        return __awaiter(this, arguments, void 0, function (email, limit) {
            var query, result;
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            SELECT * FROM auth_logs\n            WHERE email = $1\n            ORDER BY created_at DESC\n            LIMIT $2\n        ";
                        return [4 /*yield*/, this.pool.query(query, [email, limit])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows];
                }
            });
        });
    };
    /**
     * Obtener logs por tipo de evento
     */
    AuthLogRepository.prototype.findByEventType = function (eventType_1) {
        return __awaiter(this, arguments, void 0, function (eventType, limit) {
            var query, result;
            if (limit === void 0) { limit = 100; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            SELECT * FROM auth_logs\n            WHERE event_type = $1\n            ORDER BY created_at DESC\n            LIMIT $2\n        ";
                        return [4 /*yield*/, this.pool.query(query, [eventType, limit])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows];
                }
            });
        });
    };
    /**
     * Contar intentos fallidos recientes desde una IP
     */
    AuthLogRepository.prototype.countFailedAttempts = function (email_1, ipAddress_1) {
        return __awaiter(this, arguments, void 0, function (email, ipAddress, minutesAgo) {
            var query, result;
            if (minutesAgo === void 0) { minutesAgo = 15; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            SELECT COUNT(*) as count\n            FROM auth_logs\n            WHERE email = $1\n              AND ip_address = $2\n              AND event_type = 'failed_login'\n              AND success = false\n              AND created_at > NOW() - INTERVAL '".concat(minutesAgo, " minutes'\n        ");
                        return [4 /*yield*/, this.pool.query(query, [email, ipAddress])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, parseInt(result.rows[0].count, 10)];
                }
            });
        });
    };
    /**
     * Detectar actividad sospechosa (múltiples IPs en poco tiempo)
     */
    AuthLogRepository.prototype.detectSuspiciousActivity = function (userId_1) {
        return __awaiter(this, arguments, void 0, function (userId, hoursAgo) {
            var query, result, ipCount;
            if (hoursAgo === void 0) { hoursAgo = 1; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            SELECT COUNT(DISTINCT ip_address) as ip_count\n            FROM auth_logs\n            WHERE usuario_id = $1\n              AND event_type IN ('login', 'successful_login')\n              AND created_at > NOW() - INTERVAL '".concat(hoursAgo, " hours'\n        ");
                        return [4 /*yield*/, this.pool.query(query, [userId])];
                    case 1:
                        result = _a.sent();
                        ipCount = parseInt(result.rows[0].ip_count, 10);
                        // Sospechoso si hay más de 3 IPs diferentes en 1 hora
                        return [2 /*return*/, ipCount > 3];
                }
            });
        });
    };
    /**
     * Obtener estadísticas de autenticación
     */
    AuthLogRepository.prototype.getStats = function () {
        return __awaiter(this, arguments, void 0, function (daysAgo) {
            var query, result;
            if (daysAgo === void 0) { daysAgo = 7; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            SELECT\n                COUNT(*) FILTER (WHERE event_type IN ('login', 'successful_login', 'failed_login')) as total_logins,\n                COUNT(*) FILTER (WHERE event_type IN ('login', 'successful_login') AND success = true) as successful_logins,\n                COUNT(*) FILTER (WHERE event_type = 'failed_login' AND success = false) as failed_logins,\n                COUNT(DISTINCT usuario_id) as unique_users\n            FROM auth_logs\n            WHERE created_at > NOW() - INTERVAL '".concat(daysAgo, " days'\n        ");
                        return [4 /*yield*/, this.pool.query(query)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0]];
                }
            });
        });
    };
    /**
     * Limpiar logs antiguos
     */
    AuthLogRepository.prototype.cleanupOld = function () {
        return __awaiter(this, arguments, void 0, function (daysAgo) {
            var query, result;
            if (daysAgo === void 0) { daysAgo = 90; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            DELETE FROM auth_logs\n            WHERE created_at < NOW() - INTERVAL '".concat(daysAgo, " days'\n        ");
                        return [4 /*yield*/, this.pool.query(query)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount || 0];
                }
            });
        });
    };
    return AuthLogRepository;
}());
exports.AuthLogRepository = AuthLogRepository;
exports.default = new AuthLogRepository();
