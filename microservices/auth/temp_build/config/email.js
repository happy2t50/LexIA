"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailTemplates = exports.transporter = void 0;
var nodemailer_1 = require("nodemailer");
// Configuración de Nodemailer
var emailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true para puerto 465, false para otros
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASSWORD || '',
    },
};
exports.transporter = nodemailer_1.default.createTransport(emailConfig);
// Verificar configuración al iniciar
if (emailConfig.auth.user && emailConfig.auth.pass) {
    exports.transporter.verify(function (error, success) {
        if (error) {
            console.error('❌ Error en configuración de email:', error);
        }
        else {
            console.log('✅ Servidor de email listo para enviar mensajes');
        }
    });
}
else {
    console.warn('⚠️  Configuración de email no encontrada. Funciones de email deshabilitadas.');
}
// Templates de email
exports.emailTemplates = {
    verification: function (token, nombre) { return ({
        subject: 'Verifica tu cuenta - LexIA',
        html: "\n            <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n                <h2 style=\"color: #2563eb;\">\u00A1Bienvenido a LexIA, ".concat(nombre, "!</h2>\n                <p>Gracias por registrarte. Para completar tu registro, por favor verifica tu correo electr\u00F3nico.</p>\n                <div style=\"text-align: center; margin: 30px 0;\">\n                    <a href=\"").concat(process.env.API_URL || 'http://localhost', "/api/auth/verify-email?token=").concat(token, "\"\n                       style=\"background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;\">\n                        Verificar Email\n                    </a>\n                </div>\n                <p style=\"color: #666; font-size: 14px;\">\n                    O copia y pega este enlace en tu navegador:<br>\n                    <a href=\"").concat(process.env.API_URL || 'http://localhost', "/api/auth/verify-email?token=").concat(token, "\">\n                        ").concat(process.env.API_URL || 'http://localhost', "/api/auth/verify-email?token=").concat(token, "\n                    </a>\n                </p>\n                <p style=\"color: #666; font-size: 12px; margin-top: 30px;\">\n                    Este enlace expira en 24 horas. Si no solicitaste esta verificaci\u00F3n, ignora este correo.\n                </p>\n            </div>\n        ")
    }); },
    passwordReset: function (code, nombre) { return ({
        subject: 'Código de Recuperación de Contraseña - LexIA',
        html: "\n            <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n                <h2 style=\"color: #dc2626;\">Recuperaci\u00F3n de Contrase\u00F1a</h2>\n                <p>Hola ".concat(nombre, ",</p>\n                <p>Recibimos una solicitud para restablecer tu contrase\u00F1a. Usa el siguiente c\u00F3digo de 6 d\u00EDgitos:</p>\n                <div style=\"text-align: center; margin: 30px 0;\">\n                    <div style=\"background-color: #f3f4f6; padding: 20px; border-radius: 10px; display: inline-block;\">\n                        <span style=\"font-size: 32px; font-weight: bold; color: #dc2626; letter-spacing: 8px;\">").concat(code, "</span>\n                    </div>\n                </div>\n                <p style=\"color: #666; font-size: 14px;\">\n                    Ingresa este c\u00F3digo en la aplicaci\u00F3n para continuar con el restablecimiento de tu contrase\u00F1a.\n                </p>\n                <p style=\"color: #666; font-size: 12px; margin-top: 30px;\">\n                    Este c\u00F3digo expira en 10 minutos. Si no solicitaste este cambio, ignora este correo y tu contrase\u00F1a permanecer\u00E1 igual.\n                </p>\n            </div>\n        ")
    }); },
    twoFactorEnabled: function (nombre) { return ({
        subject: 'Autenticación de Dos Factores Activada - LexIA',
        html: "\n            <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n                <h2 style=\"color: #16a34a;\">Seguridad Mejorada</h2>\n                <p>Hola ".concat(nombre, ",</p>\n                <p>La autenticaci\u00F3n de dos factores (2FA) ha sido <strong>activada</strong> en tu cuenta LexIA.</p>\n                <p>A partir de ahora, necesitar\u00E1s tu aplicaci\u00F3n de autenticaci\u00F3n para iniciar sesi\u00F3n.</p>\n                <p style=\"color: #666; font-size: 14px; margin-top: 30px;\">\n                    Aseg\u00FArate de guardar tus c\u00F3digos de respaldo en un lugar seguro.\n                </p>\n                <p style=\"color: #666; font-size: 12px; margin-top: 30px;\">\n                    Si no activaste la autenticaci\u00F3n de dos factores, contacta a soporte inmediatamente.\n                </p>\n            </div>\n        ")
    }); },
    loginAlert: function (nombre, ip, userAgent) { return ({
        subject: 'Nuevo inicio de sesión detectado - LexIA',
        html: "\n            <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n                <h2 style=\"color: #2563eb;\">Nuevo Inicio de Sesi\u00F3n</h2>\n                <p>Hola ".concat(nombre, ",</p>\n                <p>Detectamos un nuevo inicio de sesi\u00F3n en tu cuenta:</p>\n                <ul style=\"color: #666;\">\n                    <li><strong>IP:</strong> ").concat(ip, "</li>\n                    <li><strong>Dispositivo:</strong> ").concat(userAgent, "</li>\n                    <li><strong>Fecha:</strong> ").concat(new Date().toLocaleString('es-MX'), "</li>\n                </ul>\n                <p style=\"color: #666; font-size: 12px; margin-top: 30px;\">\n                    Si no fuiste t\u00FA, cambia tu contrase\u00F1a inmediatamente y contacta a soporte.\n                </p>\n            </div>\n        ")
    }); }
};
exports.default = exports.transporter;
