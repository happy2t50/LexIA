function requireAdmin(req, res, next) {
    authenticate(req, res, () => {
        if (!req.user) {
            res.status(401).json({
                error: 'No autenticado',
                message: 'Debes estar autenticado'
            });
            return;
        }
        if (req.user.rol !== 'admin') {
            res.status(403).json({
                error: 'Acceso denegado',
                message: 'Se requiere rol de administrador'
            });
            return;
        }
        next();
    });
}
