"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AuthService_1 = require("../services/AuthService");
/**
 * Controlador para funcionalidad de administración
 */
class AdminController {
    /**
     * Obtener estadísticas generales del sistema
     * @route GET /api/auth/admin/stats
     */
    async getAdminStats(req, res, next) {
        try {
            const user = req.user;
            // Verificar que el usuario es administrador
            if (user.rol !== 'admin' && user.rol !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para acceder a esta funcionalidad'
                });
                return;
            }
            const authService = new AuthService_1.AuthService();
            const stats = await authService.getAdminStats();
            res.status(200).json({
                success: true,
                data: stats
            });
        }
        catch (error) {
            console.error('Error al obtener estadísticas de admin:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener estadísticas'
            });
        }
    }
    /**
     * Obtener lista de usuarios del sistema
     * @route GET /api/auth/admin/users
     */
    async getUsers(req, res, next) {
        try {
            const user = req.user;
            // Verificar permisos de administrador
            if (user.rol !== 'admin' && user.rol !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para acceder a esta funcionalidad'
                });
                return;
            }
            const authService = new AuthService_1.AuthService();
            const { page = 1, limit = 20, role, status } = req.query;
            const users = await authService.getUsers({
                page: Number(page),
                limit: Number(limit),
                role: role,
                status: status
            });
            res.status(200).json({
                success: true,
                data: users
            });
        }
        catch (error) {
            console.error('Error al obtener usuarios:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener usuarios'
            });
        }
    }
    /**
     * Obtener perfiles pendientes de validación
     * @route GET /api/auth/admin/pending-profiles
     */
    async getPendingProfiles(req, res, next) {
        try {
            const user = req.user;
            if (user.rol !== 'admin' && user.rol !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para acceder a esta funcionalidad'
                });
                return;
            }
            const authService = new AuthService_1.AuthService();
            const pendingProfiles = await authService.getPendingProfiles();
            res.status(200).json({
                success: true,
                data: pendingProfiles
            });
        }
        catch (error) {
            console.error('Error al obtener perfiles pendientes:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener perfiles pendientes'
            });
        }
    }
    /**
     * Validar o rechazar perfil de abogado
     * @route POST /api/auth/admin/validate-profile
     */
    async validateProfile(req, res, next) {
        try {
            const user = req.user;
            if (user.rol !== 'admin' && user.rol !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para acceder a esta funcionalidad'
                });
                return;
            }
            const { profileId, approved, motivo } = req.body;
            if (!profileId || approved === undefined) {
                res.status(400).json({
                    success: false,
                    message: 'profileId y approved son requeridos'
                });
                return;
            }
            const authService = new AuthService_1.AuthService();
            const result = await authService.validateProfile(profileId, approved, motivo);
            res.status(200).json({
                success: true,
                message: approved ? 'Perfil aprobado exitosamente' : 'Perfil rechazado',
                data: result
            });
        }
        catch (error) {
            console.error('Error al validar perfil:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al validar perfil'
            });
        }
    }
    /**
     * Suspender o reactivar cuenta de usuario
     * @route POST /api/auth/admin/suspend-user
     */
    async suspendUser(req, res, next) {
        try {
            const user = req.user;
            if (user.rol !== 'admin' && user.rol !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para acceder a esta funcionalidad'
                });
                return;
            }
            const { userId, suspended, motivo } = req.body;
            if (!userId || suspended === undefined) {
                res.status(400).json({
                    success: false,
                    message: 'userId y suspended son requeridos'
                });
                return;
            }
            const authService = new AuthService_1.AuthService();
            const result = await authService.suspendUser(userId, suspended, motivo);
            res.status(200).json({
                success: true,
                message: suspended ? 'Usuario suspendido exitosamente' : 'Usuario reactivado',
                data: result
            });
        }
        catch (error) {
            console.error('Error al suspender/reactivar usuario:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al procesar solicitud'
            });
        }
    }
    /**
     * Obtener detalles de un usuario específico
     * @route GET /api/auth/admin/users/:userId
     */
    async getUserDetails(req, res, next) {
        try {
            const user = req.user;
            if (user.rol !== 'admin' && user.rol !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para acceder a esta funcionalidad'
                });
                return;
            }
            const { userId } = req.params;
            const authService = new AuthService_1.AuthService();
            const userDetails = await authService.getUserDetails(userId);
            res.status(200).json({
                success: true,
                data: userDetails
            });
        }
        catch (error) {
            console.error('Error al obtener detalles de usuario:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener detalles de usuario'
            });
        }
    }
    /**
     * Obtener reportes pendientes de moderación
     * @route GET /api/auth/admin/pending-reports
     */
    async getPendingReports(req, res, next) {
        try {
            const user = req.user;
            if (user.rol !== 'admin' && user.rol !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para acceder a esta funcionalidad'
                });
                return;
            }
            // Por ahora retornamos datos mock
            // En el futuro esto se conectará con el servicio de chat/moderación
            const mockReports = [
                {
                    id: 'rep_001',
                    tipo: 'contenido_inapropiado',
                    prioridad: 'alta',
                    estado: 'pendiente',
                    titulo: 'Contenido inapropiado en publicación',
                    descripcion: 'Este abogado es un fraude, me robó $5,000 pesos y nunca resolvió mi caso.',
                    reportadoPor: 'Luis Ramírez',
                    fecha: new Date().toISOString(),
                },
                {
                    id: 'rep_002',
                    tipo: 'spam',
                    prioridad: 'media',
                    estado: 'pendiente',
                    titulo: 'Publicación repetitiva con promociones',
                    descripcion: '¡OFERTA ESPECIAL! Divorcios express en 24 horas.',
                    reportadoPor: 'Carlos Jiménez',
                    fecha: new Date().toISOString(),
                }
            ];
            res.status(200).json({
                success: true,
                data: mockReports
            });
        }
        catch (error) {
            console.error('Error al obtener reportes pendientes:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al obtener reportes pendientes'
            });
        }
    }
    /**
     * Moderar contenido reportado
     * @route POST /api/auth/admin/moderate-content
     */
    async moderateContent(req, res, next) {
        try {
            const user = req.user;
            if (user.rol !== 'admin' && user.rol !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para acceder a esta funcionalidad'
                });
                return;
            }
            const { contentId, action, motivo } = req.body;
            if (!contentId || !action) {
                res.status(400).json({
                    success: false,
                    message: 'contentId y action son requeridos'
                });
                return;
            }
            // Por ahora solo simulamos la moderación
            // En el futuro esto se conectará con el servicio de chat
            res.status(200).json({
                success: true,
                message: `Contenido ${action === 'approve' ? 'aprobado' : 'rechazado'} exitosamente`
            });
        }
        catch (error) {
            console.error('Error al moderar contenido:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al moderar contenido'
            });
        }
    }
}
exports.default = new AdminController();

