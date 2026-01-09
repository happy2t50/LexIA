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
const emailConfig: EmailConfig & { logger?: boolean; debug?: boolean } = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true para puerto 465, false para otros
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASSWORD || '',
    },
    logger: true,
    debug: true,
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
        subject: 'Código de Verificación - LexIA',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">¡Bienvenido a LexIA, ${nombre}!</h2>
                <p>Gracias por registrarte. Para completar tu registro, usa el siguiente código de 6 dígitos:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 10px; display: inline-block;">
                        <span style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px;">${token}</span>
                    </div>
                </div>
                <p style="color: #666; font-size: 14px;">
                    Ingresa este código en la aplicación para verificar tu cuenta.
                </p>
                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                    Este código expira en 24 horas. Si no solicitaste esta verificación, ignora este correo.
                </p>
            </div>
        `
    }),

    passwordReset: (code: string, nombre: string) => ({
        subject: 'Código de Recuperación de Contraseña - LexIA',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc2626;">Recuperación de Contraseña</h2>
                <p>Hola ${nombre},</p>
                <p>Recibimos una solicitud para restablecer tu contraseña. Usa el siguiente código de 6 dígitos:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 10px; display: inline-block;">
                        <span style="font-size: 32px; font-weight: bold; color: #dc2626; letter-spacing: 8px;">${code}</span>
                    </div>
                </div>
                <p style="color: #666; font-size: 14px;">
                    Ingresa este código en la aplicación para continuar con el restablecimiento de tu contraseña.
                </p>
                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                    Este código expira en 10 minutos. Si no solicitaste este cambio, ignora este correo y tu contraseña permanecerá igual.
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