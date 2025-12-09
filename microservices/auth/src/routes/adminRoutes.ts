import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { requireAuth, requireAdmin } from '../middleware/authenticate';

const router = Router();

/**
 * @route GET /api/admin/stats
 * @desc Obtener estadísticas generales del sistema (solo admin)
 * @access Private (Admin only)
 */
router.get('/stats', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        // Contar usuarios activos
        const usuariosResult = await pool.query(
            `SELECT COUNT(*) as total FROM usuarios WHERE activo = true`
        );
        const usuariosActivos = parseInt(usuariosResult.rows[0].total);

        // Contar abogados verificados
        const abogadosResult = await pool.query(
            `SELECT COUNT(*) as total FROM abogados WHERE verificado = true`
        );
        const abogadosVerificados = parseInt(abogadosResult.rows[0].total);

        // Contar anunciantes activos
        const anunciantesResult = await pool.query(
            `SELECT COUNT(DISTINCT n.usuario_id) as total 
             FROM negocios n 
             JOIN usuarios u ON u.id = n.usuario_id 
             WHERE u.activo = true`
        );
        const anunciantesActivos = parseInt(anunciantesResult.rows[0].total);

        // Contar consultas del mes actual
        const consultasResult = await pool.query(
            `SELECT COUNT(*) as total 
             FROM consultas 
             WHERE DATE_TRUNC('month', fecha_consulta) = DATE_TRUNC('month', NOW())`
        );
        const consultasDelMes = parseInt(consultasResult.rows[0].total);

        // Calcular crecimientos (comparar con mes anterior)
        const usuariosMesAnterior = await pool.query(
            `SELECT COUNT(*) as total 
             FROM usuarios 
             WHERE DATE_TRUNC('month', fecha_registro) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')`
        );
        const crecimientoUsuarios = usuariosMesAnterior.rows[0].total > 0 
            ? ((usuariosActivos - parseInt(usuariosMesAnterior.rows[0].total)) / parseInt(usuariosMesAnterior.rows[0].total) * 100).toFixed(1)
            : 0;

        const consultasMesAnterior = await pool.query(
            `SELECT COUNT(*) as total 
             FROM consultas 
             WHERE DATE_TRUNC('month', fecha_consulta) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')`
        );
        const crecimientoConsultas = consultasMesAnterior.rows[0].total > 0
            ? ((consultasDelMes - parseInt(consultasMesAnterior.rows[0].total)) / parseInt(consultasMesAnterior.rows[0].total) * 100).toFixed(1)
            : 0;

        res.json({
            usuarios_activos: usuariosActivos,
            abogados_verificados: abogadosVerificados,
            anunciantes_activos: anunciantesActivos,
            consultas_del_mes: consultasDelMes,
            crecimiento_usuarios: parseFloat(crecimientoUsuarios as string),
            crecimiento_abogados: 0, // TODO: calcular
            crecimiento_anunciantes: 0, // TODO: calcular
            crecimiento_consultas: parseFloat(crecimientoConsultas as string),
        });
    } catch (error: any) {
        console.error('Error al obtener estadísticas de admin:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: 'No se pudieron obtener las estadísticas'
        });
    }
});

/**
 * @route GET /api/admin/pending-profiles
 * @desc Obtener perfiles pendientes de validación
 * @access Private (Admin only)
 */
router.get('/pending-profiles', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT 
                a.usuario_id as id,
                u.nombre,
                u.email,
                a.cedula_profesional as cedula,
                a.fecha_registro as fecha_solicitud,
                a.verificado
             FROM abogados a
             JOIN usuarios u ON u.id = a.usuario_id
             WHERE a.verificado = false
             ORDER BY a.fecha_registro DESC
             LIMIT 50`
        );

        res.json(result.rows);
    } catch (error: any) {
        console.error('Error al obtener perfiles pendientes:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: 'No se pudieron obtener los perfiles pendientes'
        });
    }
});

/**
 * @route GET /api/admin/pending-reports
 * @desc Obtener reportes pendientes de moderación
 * @access Private (Admin only)
 */
router.get('/pending-reports', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        // Por ahora devolver array vacío, implementar cuando exista tabla de reportes
        res.json([]);
    } catch (error: any) {
        console.error('Error al obtener reportes pendientes:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: 'No se pudieron obtener los reportes'
        });
    }
});

/**
 * @route POST /api/admin/validate-profile
 * @desc Validar o rechazar un perfil de abogado
 * @access Private (Admin only)
 */
router.post('/validate-profile', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { profile_id, approved } = req.body;

        if (!profile_id) {
            return res.status(400).json({
                error: 'Datos incompletos',
                message: 'El ID del perfil es requerido'
            });
        }

        // Actualizar estado de verificación
        await pool.query(
            `UPDATE abogados SET verificado = $1 WHERE usuario_id = $2`,
            [approved, profile_id]
        );

        res.json({
            success: true,
            message: approved ? 'Perfil aprobado exitosamente' : 'Perfil rechazado'
        });
    } catch (error: any) {
        console.error('Error al validar perfil:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: 'No se pudo validar el perfil'
        });
    }
});

/**
 * @route POST /api/admin/moderate-content
 * @desc Moderar contenido (publicaciones, comentarios, etc.)
 * @access Private (Admin only)
 */
router.post('/moderate-content', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { content_id, action } = req.body;

        if (!content_id || !action) {
            return res.status(400).json({
                error: 'Datos incompletos',
                message: 'Se requieren content_id y action'
            });
        }

        // TODO: Implementar moderación según el tipo de contenido
        // Por ahora solo respondemos éxito

        res.json({
            success: true,
            message: 'Contenido moderado exitosamente'
        });
    } catch (error: any) {
        console.error('Error al moderar contenido:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: 'No se pudo moderar el contenido'
        });
    }
});

export default router;
