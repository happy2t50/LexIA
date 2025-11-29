import nodemailer from 'nodemailer';

export interface EmailConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
}

// Configuración de Nodemailer
const emailConfig: EmailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true para puerto 465, false para otros
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASSWORD || '',
    },
};

export const transporter = nodemailer.createTransport(emailConfig);

// Verificar configuración al iniciar
if (emailConfig.auth.user && emailConfig.auth.pass) {
    transporter.verify((error, success) => {
        if (error) {
            console.error('❌ Error en configuración de email:', error);
        } else {
            console.log('✅ Servidor de email listo para enviar mensajes');
        }
    });
} else {
    console.warn('⚠️  Configuración de email no encontrada. Funciones de email deshabilitadas.');
}

// Templates de email
export const emailTemplates = {
    verification: (token: string, nombre: string) => ({
        subject: 'Verifica tu cuenta - LexIA',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">¡Bienvenido a LexIA, ${nombre}!</h2>
                <p>Gracias por registrarte. Para completar tu registro, por favor verifica tu correo electrónico.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}"
                       style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Verificar Email
                    </a>
                </div>
                <p style="color: #666; font-size: 14px;">
                    O copia y pega este enlace en tu navegador:<br>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}">
                        ${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}
                    </a>
                </p>
                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                    Este enlace expira en 24 horas. Si no solicitaste esta verificación, ignora este correo.
                </p>
            </div>
        `
    }),

    passwordReset: (token: string, nombre: string) => ({
        subject: 'Recuperación de Contraseña - LexIA',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc2626;">Recuperación de Contraseña</h2>
                <p>Hola ${nombre},</p>
                <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para continuar:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}"
                       style="background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Restablecer Contraseña
                    </a>
                </div>
                <p style="color: #666; font-size: 14px;">
                    O copia y pega este enlace en tu navegador:<br>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}">
                        ${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}
                    </a>
                </p>
                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                    Este enlace expira en 1 hora. Si no solicitaste este cambio, ignora este correo y tu contraseña permanecerá igual.
                </p>
            </div>
        `
    }),

    twoFactorEnabled: (nombre: string) => ({
        subject: 'Autenticación de Dos Factores Activada - LexIA',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #16a34a;">Seguridad Mejorada</h2>
                <p>Hola ${nombre},</p>
                <p>La autenticación de dos factores (2FA) ha sido <strong>activada</strong> en tu cuenta LexIA.</p>
                <p>A partir de ahora, necesitarás tu aplicación de autenticación para iniciar sesión.</p>
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                    Asegúrate de guardar tus códigos de respaldo en un lugar seguro.
                </p>
                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                    Si no activaste la autenticación de dos factores, contacta a soporte inmediatamente.
                </p>
            </div>
        `
    }),

    loginAlert: (nombre: string, ip: string, userAgent: string) => ({
        subject: 'Nuevo inicio de sesión detectado - LexIA',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Nuevo Inicio de Sesión</h2>
                <p>Hola ${nombre},</p>
                <p>Detectamos un nuevo inicio de sesión en tu cuenta:</p>
                <ul style="color: #666;">
                    <li><strong>IP:</strong> ${ip}</li>
                    <li><strong>Dispositivo:</strong> ${userAgent}</li>
                    <li><strong>Fecha:</strong> ${new Date().toLocaleString('es-MX')}</li>
                </ul>
                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                    Si no fuiste tú, cambia tu contraseña inmediatamente y contacta a soporte.
                </p>
            </div>
        `
    })
};

export default transporter;