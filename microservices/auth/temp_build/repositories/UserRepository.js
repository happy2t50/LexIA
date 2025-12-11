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
exports.UserRepository = void 0;
var database_1 = require("../config/database");
var UserRepository = /** @class */ (function () {
    function UserRepository() {
        this.pool = database_1.default;
    }
    /**
     * Crear un nuevo usuario
     */
    UserRepository.prototype.create = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var query, values, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            INSERT INTO usuarios (\n                email, nombre, apellido, telefono, password_hash, rol, account_type\n            )\n            VALUES ($1, $2, $3, $4, $5, $6, $7)\n            RETURNING *\n        ";
                        values = [
                            data.email,
                            data.nombre,
                            data.apellido,
                            data.telefono || null,
                            data.password_hash || null,
                            data.rol || 'user',
                            data.account_type || 'local'
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
     * Buscar usuario por ID
     */
    UserRepository.prototype.findById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = 'SELECT * FROM usuarios WHERE id = $1';
                        return [4 /*yield*/, this.pool.query(query, [id])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0] || null];
                }
            });
        });
    };
    /**
     * Buscar usuario por email
     */
    UserRepository.prototype.findByEmail = function (email) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = 'SELECT * FROM usuarios WHERE email = $1';
                        return [4 /*yield*/, this.pool.query(query, [email])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0] || null];
                }
            });
        });
    };
    /**
     * Actualizar usuario
     */
    UserRepository.prototype.update = function (id, data) {
        return __awaiter(this, void 0, void 0, function () {
            var fields, values, paramCount, query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        fields = [];
                        values = [];
                        paramCount = 1;
                        // Construir query dinámica
                        Object.keys(data).forEach(function (key) {
                            if (key !== 'id' && key !== 'created_at') {
                                fields.push("".concat(key, " = $").concat(paramCount));
                                values.push(data[key]);
                                paramCount++;
                            }
                        });
                        if (!(fields.length === 0)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.findById(id)];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        // No establecer updated_at aquí, ya que la columna puede no existir en la tabla `usuarios`.
                        // Si se requiere auditoría de actualizaciones, usar una columna existente o un trigger a futuro.
                        values.push(id);
                        query = "\n            UPDATE usuarios\n            SET ".concat(fields.join(', '), "\n            WHERE id = $").concat(paramCount, "\n            RETURNING *\n        ");
                        return [4 /*yield*/, this.pool.query(query, values)];
                    case 3:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0] || null];
                }
            });
        });
    };
    /**
     * Verificar email del usuario
     */
    UserRepository.prototype.verifyEmail = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            UPDATE usuarios\n            SET email_verified = true,\n                email_verified_at = NOW()\n            WHERE id = $1\n        ";
                        return [4 /*yield*/, this.pool.query(query, [userId])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount ? result.rowCount > 0 : false];
                }
            });
        });
    };
    /**
     * Incrementar intentos fallidos de login
     */
    UserRepository.prototype.incrementFailedAttempts = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var query;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            UPDATE usuarios\n            SET failed_login_attempts = failed_login_attempts + 1,\n                locked_until = CASE\n                    WHEN failed_login_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes'\n                    ELSE locked_until\n                END\n            WHERE id = $1\n        ";
                        return [4 /*yield*/, this.pool.query(query, [userId])];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Resetear intentos fallidos de login (después de login exitoso)
     */
    UserRepository.prototype.resetFailedAttempts = function (userId, ipAddress) {
        return __awaiter(this, void 0, void 0, function () {
            var query;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            UPDATE usuarios\n            SET failed_login_attempts = 0,\n                locked_until = NULL,\n                last_login_at = NOW(),\n                last_login_ip = $2\n            WHERE id = $1\n        ";
                        return [4 /*yield*/, this.pool.query(query, [userId, ipAddress || null])];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Verificar si el usuario está bloqueado
     */
    UserRepository.prototype.isLocked = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.findById(userId)];
                    case 1:
                        user = _a.sent();
                        if (!user || !user.locked_until) {
                            return [2 /*return*/, false];
                        }
                        return [2 /*return*/, new Date(user.locked_until) > new Date()];
                }
            });
        });
    };
    /**
     * Habilitar 2FA
     */
    UserRepository.prototype.enable2FA = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            UPDATE usuarios\n            SET two_factor_enabled = true\n            WHERE id = $1\n        ";
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
    UserRepository.prototype.disable2FA = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            UPDATE usuarios\n            SET two_factor_enabled = false\n            WHERE id = $1\n        ";
                        return [4 /*yield*/, this.pool.query(query, [userId])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount ? result.rowCount > 0 : false];
                }
            });
        });
    };
    /**
     * Eliminar usuario (soft delete)
     */
    UserRepository.prototype.delete = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            UPDATE usuarios\n            SET activo = false\n            WHERE id = $1\n        ";
                        return [4 /*yield*/, this.pool.query(query, [id])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount ? result.rowCount > 0 : false];
                }
            });
        });
    };
    /**
     * Eliminar usuario permanentemente
     */
    UserRepository.prototype.hardDelete = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = 'DELETE FROM usuarios WHERE id = $1';
                        return [4 /*yield*/, this.pool.query(query, [id])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount ? result.rowCount > 0 : false];
                }
            });
        });
    };
    /**
     * Listar usuarios con paginación
     */
    UserRepository.prototype.list = function () {
        return __awaiter(this, arguments, void 0, function (page, limit) {
            var offset, countQuery, countResult, total, query, result;
            if (page === void 0) { page = 1; }
            if (limit === void 0) { limit = 10; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        offset = (page - 1) * limit;
                        countQuery = 'SELECT COUNT(*) FROM usuarios WHERE activo = true';
                        return [4 /*yield*/, this.pool.query(countQuery)];
                    case 1:
                        countResult = _a.sent();
                        total = parseInt(countResult.rows[0].count, 10);
                        query = "\n            SELECT * FROM usuarios\n            WHERE activo = true\n            ORDER BY created_at DESC\n            LIMIT $1 OFFSET $2\n        ";
                        return [4 /*yield*/, this.pool.query(query, [limit, offset])];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, {
                                users: result.rows,
                                total: total
                            }];
                }
            });
        });
    };
    /**
     * Buscar usuarios por rol
     */
    UserRepository.prototype.findByRole = function (rol) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = 'SELECT * FROM usuarios WHERE rol = $1 AND activo = true';
                        return [4 /*yield*/, this.pool.query(query, [rol])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows];
                }
            });
        });
    };
    /**
     * Actualizar contraseña
     */
    UserRepository.prototype.updatePassword = function (userId, newPasswordHash) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n            UPDATE usuarios\n            SET password_hash = $1\n            WHERE id = $2\n        ";
                        return [4 /*yield*/, this.pool.query(query, [newPasswordHash, userId])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount ? result.rowCount > 0 : false];
                }
            });
        });
    };
    return UserRepository;
}());
exports.UserRepository = UserRepository;
exports.default = new UserRepository();
