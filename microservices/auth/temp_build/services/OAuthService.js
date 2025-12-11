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
exports.OAuthService = void 0;
var passport_1 = require("passport");
var passport_google_oauth20_1 = require("passport-google-oauth20");
var google_auth_library_1 = require("google-auth-library");
var UserRepository_1 = require("../repositories/UserRepository");
var OAuthRepository_1 = require("../repositories/OAuthRepository");
var AuthLogRepository_1 = require("../repositories/AuthLogRepository");
var RefreshTokenRepository_1 = require("../repositories/RefreshTokenRepository");
var jwt_1 = require("../utils/jwt");
var GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
var GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
var GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost/api/auth/google/callback';
var OAuthService = /** @class */ (function () {
    function OAuthService() {
        this.initializeGoogleStrategy();
    }
    /**
     * Configurar estrategia de Google OAuth
     */
    OAuthService.prototype.initializeGoogleStrategy = function () {
        var _this = this;
        if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
            console.warn('⚠️  OAuth2 Google no configurado. Variables GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET faltantes.');
            return;
        }
        passport_1.default.use(new passport_google_oauth20_1.Strategy({
            clientID: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            callbackURL: GOOGLE_CALLBACK_URL,
            scope: ['profile', 'email']
        }, function (accessToken, refreshToken, profile, done) { return __awaiter(_this, void 0, void 0, function () {
            var result, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.handleGoogleCallback(accessToken, refreshToken, profile)];
                    case 1:
                        result = _a.sent();
                        done(null, result);
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        done(error_1);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); }));
        passport_1.default.serializeUser(function (user, done) {
            done(null, user);
        });
        passport_1.default.deserializeUser(function (user, done) {
            done(null, user);
        });
        console.log('✅ OAuth2 Google configurado correctamente');
    };
    /**
     * Manejar callback de Google OAuth
     */
    OAuthService.prototype.handleGoogleCallback = function (accessToken, refreshToken, profile) {
        return __awaiter(this, void 0, void 0, function () {
            var googleId, email, oauthAccount, user, isNewUser, names, nombre, apellido, userData, tokenPayload, tokens, password_hash, userWithoutPassword;
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            return __generator(this, function (_k) {
                switch (_k.label) {
                    case 0:
                        googleId = profile.id;
                        email = (_b = (_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value;
                        if (!email) {
                            throw new Error('No se pudo obtener el email de Google');
                        }
                        return [4 /*yield*/, OAuthRepository_1.default.findByProvider('google', googleId)];
                    case 1:
                        oauthAccount = _k.sent();
                        isNewUser = false;
                        if (!oauthAccount) return [3 /*break*/, 4];
                        return [4 /*yield*/, UserRepository_1.default.findById(oauthAccount.usuario_id)];
                    case 2:
                        // Usuario existente con cuenta Google
                        user = _k.sent();
                        if (!user) {
                            throw new Error('Usuario vinculado no encontrado');
                        }
                        // Actualizar tokens de OAuth
                        return [4 /*yield*/, OAuthRepository_1.default.updateTokens('google', googleId, accessToken, refreshToken, new Date(Date.now() + 3600 * 1000) // 1 hora
                            )];
                    case 3:
                        // Actualizar tokens de OAuth
                        _k.sent();
                        return [3 /*break*/, 14];
                    case 4: return [4 /*yield*/, UserRepository_1.default.findByEmail(email)];
                    case 5:
                        // Verificar si existe usuario con ese email
                        user = _k.sent();
                        if (!user) return [3 /*break*/, 9];
                        // Usuario existe pero nunca vinculó Google, crear vinculación
                        return [4 /*yield*/, OAuthRepository_1.default.upsert({
                                usuario_id: user.id,
                                provider: 'google',
                                provider_account_id: googleId,
                                access_token: accessToken,
                                refresh_token: refreshToken,
                                token_expires_at: new Date(Date.now() + 3600 * 1000),
                                profile_data: {
                                    name: profile.displayName,
                                    picture: (_d = (_c = profile.photos) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.value,
                                    locale: profile._json.locale
                                }
                            })];
                    case 6:
                        // Usuario existe pero nunca vinculó Google, crear vinculación
                        _k.sent();
                        if (!!user.email_verified) return [3 /*break*/, 8];
                        return [4 /*yield*/, UserRepository_1.default.verifyEmail(user.id)];
                    case 7:
                        _k.sent();
                        _k.label = 8;
                    case 8: return [3 /*break*/, 14];
                    case 9:
                        names = ((_e = profile.displayName) === null || _e === void 0 ? void 0 : _e.split(' ')) || ['', ''];
                        nombre = names[0] || ((_f = profile.name) === null || _f === void 0 ? void 0 : _f.givenName) || 'Usuario';
                        apellido = names.slice(1).join(' ') || ((_g = profile.name) === null || _g === void 0 ? void 0 : _g.familyName) || 'Google';
                        userData = {
                            email: email,
                            nombre: nombre,
                            apellido: apellido,
                            rol: 'user',
                            account_type: 'google'
                            // No password_hash para cuentas OAuth
                        };
                        return [4 /*yield*/, UserRepository_1.default.create(userData)];
                    case 10:
                        user = _k.sent();
                        // Marcar email como verificado inmediatamente
                        return [4 /*yield*/, UserRepository_1.default.verifyEmail(user.id)];
                    case 11:
                        // Marcar email como verificado inmediatamente
                        _k.sent();
                        // Crear vinculación OAuth
                        return [4 /*yield*/, OAuthRepository_1.default.upsert({
                                usuario_id: user.id,
                                provider: 'google',
                                provider_account_id: googleId,
                                access_token: accessToken,
                                refresh_token: refreshToken,
                                token_expires_at: new Date(Date.now() + 3600 * 1000),
                                profile_data: {
                                    name: profile.displayName,
                                    picture: (_j = (_h = profile.photos) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.value,
                                    locale: profile._json.locale
                                }
                            })];
                    case 12:
                        // Crear vinculación OAuth
                        _k.sent();
                        isNewUser = true;
                        // Log de registro
                        return [4 /*yield*/, AuthLogRepository_1.default.create({
                                usuario_id: user.id,
                                email: user.email,
                                event_type: 'oauth_register',
                                success: true,
                                metadata: { provider: 'google' }
                            })];
                    case 13:
                        // Log de registro
                        _k.sent();
                        _k.label = 14;
                    case 14:
                        tokenPayload = {
                            userId: user.id,
                            email: user.email,
                            rol: user.rol,
                            twoFactorEnabled: user.two_factor_enabled
                        };
                        tokens = (0, jwt_1.generateTokens)(tokenPayload);
                        // Guardar refresh token
                        return [4 /*yield*/, RefreshTokenRepository_1.default.create({
                                usuario_id: user.id,
                                token: tokens.refreshToken,
                                expires_at: new Date(Date.now() + tokens.refreshTokenExpiresIn * 1000)
                            })];
                    case 15:
                        // Guardar refresh token
                        _k.sent();
                        // Log de login exitoso
                        return [4 /*yield*/, AuthLogRepository_1.default.create({
                                usuario_id: user.id,
                                email: user.email,
                                event_type: 'oauth_login',
                                success: true,
                                metadata: { provider: 'google' }
                            })];
                    case 16:
                        // Log de login exitoso
                        _k.sent();
                        // Actualizar último login
                        return [4 /*yield*/, UserRepository_1.default.resetFailedAttempts(user.id)];
                    case 17:
                        // Actualizar último login
                        _k.sent();
                        password_hash = user.password_hash, userWithoutPassword = __rest(user, ["password_hash"]);
                        return [2 /*return*/, {
                                user: userWithoutPassword,
                                tokens: tokens,
                                isNewUser: isNewUser
                            }];
                }
            });
        });
    };
    /**
     * Vincular cuenta Google a usuario existente
     */
    OAuthService.prototype.linkGoogleAccount = function (userId, accessToken, refreshToken, profile) {
        return __awaiter(this, void 0, void 0, function () {
            var googleId, email, user, existing;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        googleId = profile.id;
                        email = (_b = (_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value;
                        if (!email) {
                            throw new Error('No se pudo obtener el email de Google');
                        }
                        return [4 /*yield*/, UserRepository_1.default.findById(userId)];
                    case 1:
                        user = _e.sent();
                        if (!user) {
                            throw new Error('Usuario no encontrado');
                        }
                        // Verificar que el email coincida
                        if (user.email !== email) {
                            throw new Error('El email de Google no coincide con el email de tu cuenta');
                        }
                        return [4 /*yield*/, OAuthRepository_1.default.hasOAuthAccount(userId, 'google')];
                    case 2:
                        existing = _e.sent();
                        if (existing) {
                            throw new Error('Esta cuenta ya tiene Google vinculado');
                        }
                        // Crear vinculación
                        return [4 /*yield*/, OAuthRepository_1.default.upsert({
                                usuario_id: userId,
                                provider: 'google',
                                provider_account_id: googleId,
                                access_token: accessToken,
                                refresh_token: refreshToken,
                                token_expires_at: new Date(Date.now() + 3600 * 1000),
                                profile_data: {
                                    name: profile.displayName,
                                    picture: (_d = (_c = profile.photos) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.value,
                                    locale: profile._json.locale
                                }
                            })];
                    case 3:
                        // Crear vinculación
                        _e.sent();
                        if (!!user.email_verified) return [3 /*break*/, 5];
                        return [4 /*yield*/, UserRepository_1.default.verifyEmail(userId)];
                    case 4:
                        _e.sent();
                        _e.label = 5;
                    case 5: 
                    // Log del evento
                    return [4 /*yield*/, AuthLogRepository_1.default.create({
                            usuario_id: userId,
                            email: user.email,
                            event_type: 'oauth_linked',
                            success: true,
                            metadata: { provider: 'google' }
                        })];
                    case 6:
                        // Log del evento
                        _e.sent();
                        return [2 /*return*/, true];
                }
            });
        });
    };
    /**
     * Desvincular cuenta Google
     */
    OAuthService.prototype.unlinkGoogleAccount = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var user, oauthAccounts, googleAccount;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, UserRepository_1.default.findById(userId)];
                    case 1:
                        user = _a.sent();
                        if (!user) {
                            throw new Error('Usuario no encontrado');
                        }
                        // Verificar que tenga contraseña (no puede quedarse sin forma de login)
                        if (!user.password_hash) {
                            throw new Error('Debes establecer una contraseña antes de desvincular Google');
                        }
                        return [4 /*yield*/, OAuthRepository_1.default.findByUserId(userId)];
                    case 2:
                        oauthAccounts = _a.sent();
                        googleAccount = oauthAccounts.find(function (acc) { return acc.provider === 'google'; });
                        if (!googleAccount) {
                            throw new Error('No hay cuenta Google vinculada');
                        }
                        // Eliminar vinculación
                        return [4 /*yield*/, OAuthRepository_1.default.delete('google', googleAccount.provider_account_id)];
                    case 3:
                        // Eliminar vinculación
                        _a.sent();
                        // Log del evento
                        return [4 /*yield*/, AuthLogRepository_1.default.create({
                                usuario_id: userId,
                                email: user.email,
                                event_type: 'oauth_unlinked',
                                success: true,
                                metadata: { provider: 'google' }
                            })];
                    case 4:
                        // Log del evento
                        _a.sent();
                        return [2 /*return*/, true];
                }
            });
        });
    };
    /**
     * Obtener cuentas OAuth vinculadas
     */
    OAuthService.prototype.getLinkedAccounts = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var accounts;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, OAuthRepository_1.default.findByUserId(userId)];
                    case 1:
                        accounts = _a.sent();
                        return [2 /*return*/, accounts.map(function (acc) { return ({
                                provider: acc.provider,
                                linkedAt: acc.created_at,
                                profileData: acc.profile_data
                            }); })];
                }
            });
        });
    };
    /**
     * Verificar Google Access Token (para web)
     * Recibe el access token de Google y obtiene información del perfil
     */
    OAuthService.prototype.verifyGoogleAccessToken = function (accessToken) {
        return __awaiter(this, void 0, void 0, function () {
            var response, data, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                                headers: {
                                    Authorization: "Bearer ".concat(accessToken)
                                }
                            })];
                    case 1:
                        response = _a.sent();
                        if (!response.ok) {
                            throw new Error('Access token inválido');
                        }
                        return [4 /*yield*/, response.json()];
                    case 2:
                        data = _a.sent();
                        if (!data.email || !data.id) {
                            throw new Error('Datos incompletos del usuario');
                        }
                        return [2 /*return*/, {
                                googleId: data.id,
                                email: data.email,
                                nombre: data.given_name || 'Usuario',
                                apellido: data.family_name || '',
                                picture: data.picture
                            }];
                    case 3:
                        error_2 = _a.sent();
                        console.error('Error al verificar Google Access Token:', error_2);
                        throw new Error('Access token de Google inválido o expirado');
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Verificar Google Token (idToken o accessToken)
     * Detecta automáticamente el tipo de token y lo procesa
     */
    OAuthService.prototype.verifyGoogleToken = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            var idTokenError_1, userData, accessTokenError_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 8]);
                        return [4 /*yield*/, this.verifyGoogleIdToken(token)];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        idTokenError_1 = _a.sent();
                        console.log('No es un idToken válido, intentando como accessToken...');
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 6, , 7]);
                        return [4 /*yield*/, this.verifyGoogleAccessToken(token)];
                    case 4:
                        userData = _a.sent();
                        return [4 /*yield*/, this.handleGoogleUser(userData, 'web')];
                    case 5: return [2 /*return*/, _a.sent()];
                    case 6:
                        accessTokenError_1 = _a.sent();
                        console.error('Token inválido tanto para idToken como accessToken:', { idTokenError: idTokenError_1, accessTokenError: accessTokenError_1 });
                        throw new Error('Token de Google inválido');
                    case 7: return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Procesar usuario de Google (común para idToken y accessToken)
     */
    OAuthService.prototype.handleGoogleUser = function (userData, platform) {
        return __awaiter(this, void 0, void 0, function () {
            var googleId, email, nombre, apellido, picture, oauthAccount, user, isNewUser, userData_1, tokenPayload, tokens, password_hash, userWithoutPassword;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        googleId = userData.googleId, email = userData.email, nombre = userData.nombre, apellido = userData.apellido, picture = userData.picture;
                        return [4 /*yield*/, OAuthRepository_1.default.findByProvider('google', googleId)];
                    case 1:
                        oauthAccount = _a.sent();
                        isNewUser = false;
                        if (!oauthAccount) return [3 /*break*/, 3];
                        return [4 /*yield*/, UserRepository_1.default.findById(oauthAccount.usuario_id)];
                    case 2:
                        // Usuario existente con cuenta Google
                        user = _a.sent();
                        if (!user) {
                            throw new Error('Usuario vinculado no encontrado');
                        }
                        return [3 /*break*/, 13];
                    case 3: return [4 /*yield*/, UserRepository_1.default.findByEmail(email)];
                    case 4:
                        // Verificar si existe usuario con ese email
                        user = _a.sent();
                        if (!user) return [3 /*break*/, 8];
                        // Usuario existe pero nunca vinculó Google, crear vinculación
                        return [4 /*yield*/, OAuthRepository_1.default.upsert({
                                usuario_id: user.id,
                                provider: 'google',
                                provider_account_id: googleId,
                                access_token: '',
                                refresh_token: '',
                                token_expires_at: new Date(Date.now() + 3600 * 1000),
                                profile_data: {
                                    name: "".concat(nombre, " ").concat(apellido),
                                    picture: picture,
                                    email: email
                                }
                            })];
                    case 5:
                        // Usuario existe pero nunca vinculó Google, crear vinculación
                        _a.sent();
                        if (!!user.email_verified) return [3 /*break*/, 7];
                        return [4 /*yield*/, UserRepository_1.default.verifyEmail(user.id)];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7: return [3 /*break*/, 13];
                    case 8:
                        userData_1 = {
                            email: email,
                            nombre: nombre,
                            apellido: apellido,
                            rol: 'user',
                            account_type: 'google'
                        };
                        return [4 /*yield*/, UserRepository_1.default.create(userData_1)];
                    case 9:
                        user = _a.sent();
                        // Marcar email como verificado inmediatamente
                        return [4 /*yield*/, UserRepository_1.default.verifyEmail(user.id)];
                    case 10:
                        // Marcar email como verificado inmediatamente
                        _a.sent();
                        // Crear vinculación OAuth
                        return [4 /*yield*/, OAuthRepository_1.default.upsert({
                                usuario_id: user.id,
                                provider: 'google',
                                provider_account_id: googleId,
                                access_token: '',
                                refresh_token: '',
                                token_expires_at: new Date(Date.now() + 3600 * 1000),
                                profile_data: {
                                    name: "".concat(nombre, " ").concat(apellido),
                                    picture: picture,
                                    email: email
                                }
                            })];
                    case 11:
                        // Crear vinculación OAuth
                        _a.sent();
                        isNewUser = true;
                        // Log de registro
                        return [4 /*yield*/, AuthLogRepository_1.default.create({
                                usuario_id: user.id,
                                email: user.email,
                                event_type: platform === 'mobile' ? 'oauth_register_mobile' : 'oauth_register_web',
                                success: true,
                                metadata: { provider: 'google', platform: platform }
                            })];
                    case 12:
                        // Log de registro
                        _a.sent();
                        _a.label = 13;
                    case 13:
                        tokenPayload = {
                            userId: user.id,
                            email: user.email,
                            rol: user.rol,
                            twoFactorEnabled: user.two_factor_enabled
                        };
                        tokens = (0, jwt_1.generateTokens)(tokenPayload);
                        // Guardar refresh token
                        return [4 /*yield*/, RefreshTokenRepository_1.default.create({
                                usuario_id: user.id,
                                token: tokens.refreshToken,
                                expires_at: new Date(Date.now() + tokens.refreshTokenExpiresIn * 1000)
                            })];
                    case 14:
                        // Guardar refresh token
                        _a.sent();
                        // Log de login exitoso
                        return [4 /*yield*/, AuthLogRepository_1.default.create({
                                usuario_id: user.id,
                                email: user.email,
                                event_type: platform === 'mobile' ? 'oauth_login_mobile' : 'oauth_login_web',
                                success: true,
                                metadata: { provider: 'google', platform: platform }
                            })];
                    case 15:
                        // Log de login exitoso
                        _a.sent();
                        // Actualizar último login
                        return [4 /*yield*/, UserRepository_1.default.resetFailedAttempts(user.id)];
                    case 16:
                        // Actualizar último login
                        _a.sent();
                        password_hash = user.password_hash, userWithoutPassword = __rest(user, ["password_hash"]);
                        return [2 /*return*/, {
                                user: userWithoutPassword,
                                tokens: tokens,
                                isNewUser: isNewUser
                            }];
                }
            });
        });
    };
    /**
     * Verificar Google ID Token (para apps móviles)
     * Recibe el ID token de Google Sign-In y retorna los datos del usuario
     */
    OAuthService.prototype.verifyGoogleIdToken = function (idToken) {
        return __awaiter(this, void 0, void 0, function () {
            var client, ticket, payload, googleId, email, nombre, apellido, picture, oauthAccount, user, isNewUser, userData, tokenPayload, tokens, password_hash, userWithoutPassword, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        client = new google_auth_library_1.OAuth2Client(GOOGLE_CLIENT_ID);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 19, , 20]);
                        return [4 /*yield*/, client.verifyIdToken({
                                idToken: idToken,
                                audience: GOOGLE_CLIENT_ID,
                            })];
                    case 2:
                        ticket = _a.sent();
                        payload = ticket.getPayload();
                        if (!payload || !payload.email || !payload.sub) {
                            throw new Error('Token inválido o datos incompletos');
                        }
                        googleId = payload.sub;
                        email = payload.email;
                        nombre = payload.given_name || 'Usuario';
                        apellido = payload.family_name || '';
                        picture = payload.picture;
                        return [4 /*yield*/, OAuthRepository_1.default.findByProvider('google', googleId)];
                    case 3:
                        oauthAccount = _a.sent();
                        user = void 0;
                        isNewUser = false;
                        if (!oauthAccount) return [3 /*break*/, 5];
                        return [4 /*yield*/, UserRepository_1.default.findById(oauthAccount.usuario_id)];
                    case 4:
                        // Usuario existente con cuenta Google
                        user = _a.sent();
                        if (!user) {
                            throw new Error('Usuario vinculado no encontrado');
                        }
                        return [3 /*break*/, 15];
                    case 5: return [4 /*yield*/, UserRepository_1.default.findByEmail(email)];
                    case 6:
                        // Verificar si existe usuario con ese email
                        user = _a.sent();
                        if (!user) return [3 /*break*/, 10];
                        // Usuario existe pero nunca vinculó Google, crear vinculación
                        return [4 /*yield*/, OAuthRepository_1.default.upsert({
                                usuario_id: user.id,
                                provider: 'google',
                                provider_account_id: googleId,
                                access_token: '', // No tenemos access token en este flujo
                                refresh_token: '',
                                token_expires_at: new Date(Date.now() + 3600 * 1000),
                                profile_data: {
                                    name: "".concat(nombre, " ").concat(apellido),
                                    picture: picture,
                                    email: email
                                }
                            })];
                    case 7:
                        // Usuario existe pero nunca vinculó Google, crear vinculación
                        _a.sent();
                        if (!!user.email_verified) return [3 /*break*/, 9];
                        return [4 /*yield*/, UserRepository_1.default.verifyEmail(user.id)];
                    case 8:
                        _a.sent();
                        _a.label = 9;
                    case 9: return [3 /*break*/, 15];
                    case 10:
                        userData = {
                            email: email,
                            nombre: nombre,
                            apellido: apellido,
                            rol: 'user',
                            account_type: 'google'
                            // No password_hash para cuentas OAuth
                        };
                        return [4 /*yield*/, UserRepository_1.default.create(userData)];
                    case 11:
                        user = _a.sent();
                        // Marcar email como verificado inmediatamente
                        return [4 /*yield*/, UserRepository_1.default.verifyEmail(user.id)];
                    case 12:
                        // Marcar email como verificado inmediatamente
                        _a.sent();
                        // Crear vinculación OAuth
                        return [4 /*yield*/, OAuthRepository_1.default.upsert({
                                usuario_id: user.id,
                                provider: 'google',
                                provider_account_id: googleId,
                                access_token: '',
                                refresh_token: '',
                                token_expires_at: new Date(Date.now() + 3600 * 1000),
                                profile_data: {
                                    name: "".concat(nombre, " ").concat(apellido),
                                    picture: picture,
                                    email: email
                                }
                            })];
                    case 13:
                        // Crear vinculación OAuth
                        _a.sent();
                        isNewUser = true;
                        // Log de registro
                        return [4 /*yield*/, AuthLogRepository_1.default.create({
                                usuario_id: user.id,
                                email: user.email,
                                event_type: 'oauth_register_mobile',
                                success: true,
                                metadata: { provider: 'google', platform: 'mobile' }
                            })];
                    case 14:
                        // Log de registro
                        _a.sent();
                        _a.label = 15;
                    case 15:
                        tokenPayload = {
                            userId: user.id,
                            email: user.email,
                            rol: user.rol,
                            twoFactorEnabled: user.two_factor_enabled
                        };
                        tokens = (0, jwt_1.generateTokens)(tokenPayload);
                        // Guardar refresh token
                        return [4 /*yield*/, RefreshTokenRepository_1.default.create({
                                usuario_id: user.id,
                                token: tokens.refreshToken,
                                expires_at: new Date(Date.now() + tokens.refreshTokenExpiresIn * 1000)
                            })];
                    case 16:
                        // Guardar refresh token
                        _a.sent();
                        // Log de login exitoso
                        return [4 /*yield*/, AuthLogRepository_1.default.create({
                                usuario_id: user.id,
                                email: user.email,
                                event_type: 'oauth_login_mobile',
                                success: true,
                                metadata: { provider: 'google', platform: 'mobile' }
                            })];
                    case 17:
                        // Log de login exitoso
                        _a.sent();
                        // Actualizar último login
                        return [4 /*yield*/, UserRepository_1.default.resetFailedAttempts(user.id)];
                    case 18:
                        // Actualizar último login
                        _a.sent();
                        password_hash = user.password_hash, userWithoutPassword = __rest(user, ["password_hash"]);
                        return [2 /*return*/, {
                                user: userWithoutPassword,
                                tokens: tokens,
                                isNewUser: isNewUser
                            }];
                    case 19:
                        error_3 = _a.sent();
                        console.error('Error al verificar Google ID Token:', error_3);
                        throw new Error('Token de Google inválido o expirado');
                    case 20: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Obtener instancia de passport configurada
     */
    OAuthService.prototype.getPassport = function () {
        return passport_1.default;
    };
    return OAuthService;
}());
exports.OAuthService = OAuthService;
exports.default = new OAuthService();
