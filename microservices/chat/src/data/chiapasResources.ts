/**
 * RECURSOS Y LUGARES DE CHIAPAS
 * Información de contacto y ubicaciones para asistencia legal de tránsito
 */

export interface LugarRecurso {
  nombre: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  horario: string;
  googleMapsUrl?: string;
  tipo: 'gobierno' | 'legal' | 'emergencia' | 'derechos_humanos' | 'seguro';
  servicios: string[];
}

export const LUGARES_CHIAPAS: LugarRecurso[] = [
  // === GOBIERNO Y TRÁNSITO ===
  {
    nombre: 'Secretaría de Movilidad y Transporte',
    direccion: 'Blvd. Belisario Domínguez 1641, Col. Xamaipak',
    ciudad: 'Tuxtla Gutiérrez, Chiapas',
    telefono: '961 617 9800',
    horario: 'Lunes a Viernes 9:00 AM - 5:00 PM',
    googleMapsUrl: 'https://maps.google.com/?q=Secretaria+Movilidad+Transporte+Tuxtla',
    tipo: 'gobierno',
    servicios: ['Licencias', 'Multas', 'Verificación', 'Trámites vehiculares']
  },
  {
    nombre: 'Dirección de Tránsito Municipal',
    direccion: '2a. Calle Oriente Norte 246, Col. Centro',
    ciudad: 'Tuxtla Gutiérrez, Chiapas',
    telefono: '961 612 5511',
    horario: 'Lunes a Viernes 8:00 AM - 4:00 PM',
    googleMapsUrl: 'https://maps.google.com/?q=Transito+Municipal+Tuxtla',
    tipo: 'gobierno',
    servicios: ['Infracciones', 'Accidentes', 'Corralón', 'Reportes']
  },
  {
    nombre: 'Corralón Municipal',
    direccion: 'Libramiento Norte Oriente Km 3.5',
    ciudad: 'Tuxtla Gutiérrez, Chiapas',
    telefono: '961 614 7820',
    horario: 'Lunes a Domingo 8:00 AM - 8:00 PM',
    googleMapsUrl: 'https://maps.google.com/?q=Corralon+Municipal+Tuxtla',
    tipo: 'gobierno',
    servicios: ['Recuperación de vehículos', 'Pago de pensión', 'Liberación']
  },
  
  // === DERECHOS HUMANOS Y QUEJAS ===
  {
    nombre: 'Comisión Estatal de Derechos Humanos Chiapas',
    direccion: '1a. Poniente Sur 154, Col. Centro',
    ciudad: 'Tuxtla Gutiérrez, Chiapas',
    telefono: '961 602 8990',
    horario: 'Lunes a Viernes 8:00 AM - 4:00 PM',
    googleMapsUrl: 'https://maps.google.com/?q=CEDH+Chiapas+Tuxtla',
    tipo: 'derechos_humanos',
    servicios: ['Quejas contra autoridades', 'Asesoría', 'Denuncias de abuso']
  },
  {
    nombre: 'Contraloría General del Estado',
    direccion: 'Palacio de Gobierno, 1er Piso',
    ciudad: 'Tuxtla Gutiérrez, Chiapas',
    telefono: '961 618 8300',
    horario: 'Lunes a Viernes 9:00 AM - 3:00 PM',
    googleMapsUrl: 'https://maps.google.com/?q=Palacio+Gobierno+Tuxtla',
    tipo: 'gobierno',
    servicios: ['Denuncias de corrupción', 'Quejas administrativas']
  },

  // === SERVICIOS LEGALES ===
  {
    nombre: 'Defensoría Pública del Estado',
    direccion: '5a. Avenida Norte Poniente 2104',
    ciudad: 'Tuxtla Gutiérrez, Chiapas',
    telefono: '961 613 2478',
    horario: 'Lunes a Viernes 8:00 AM - 4:00 PM',
    googleMapsUrl: 'https://maps.google.com/?q=Defensoria+Publica+Tuxtla',
    tipo: 'legal',
    servicios: ['Asesoría legal gratuita', 'Defensa penal', 'Orientación jurídica']
  },
  {
    nombre: 'Centro de Justicia para Mujeres',
    direccion: 'Blvd. Ángel Albino Corzo 2150',
    ciudad: 'Tuxtla Gutiérrez, Chiapas',
    telefono: '961 617 5544',
    horario: '24 horas',
    googleMapsUrl: 'https://maps.google.com/?q=Centro+Justicia+Mujeres+Tuxtla',
    tipo: 'legal',
    servicios: ['Asesoría legal', 'Apoyo psicológico', 'Denuncias']
  },

  // === EMERGENCIAS ===
  {
    nombre: 'Cruz Roja Mexicana - Tuxtla',
    direccion: '4a. Oriente Norte 370, Col. Centro',
    ciudad: 'Tuxtla Gutiérrez, Chiapas',
    telefono: '961 612 0809 / 065',
    horario: '24 horas',
    googleMapsUrl: 'https://maps.google.com/?q=Cruz+Roja+Tuxtla',
    tipo: 'emergencia',
    servicios: ['Ambulancias', 'Primeros auxilios', 'Traslados']
  },
  {
    nombre: 'Hospital Regional de Alta Especialidad',
    direccion: 'Blvd. Manuel J. Clouthier 855',
    ciudad: 'Tuxtla Gutiérrez, Chiapas',
    telefono: '961 617 0700',
    horario: '24 horas',
    googleMapsUrl: 'https://maps.google.com/?q=Hospital+Regional+Tuxtla',
    tipo: 'emergencia',
    servicios: ['Urgencias', 'Hospitalización', 'Especialidades']
  },

  // === MINISTERIO PÚBLICO ===
  {
    nombre: 'Fiscalía General del Estado - Agencia de Tránsito',
    direccion: 'Av. Central Poniente 455',
    ciudad: 'Tuxtla Gutiérrez, Chiapas',
    telefono: '961 617 2366',
    horario: '24 horas',
    googleMapsUrl: 'https://maps.google.com/?q=Fiscalia+Chiapas+Tuxtla',
    tipo: 'legal',
    servicios: ['Denuncias penales', 'Accidentes graves', 'Homicidio culposo']
  }
];

// Números de emergencia
export const NUMEROS_EMERGENCIA = {
  emergencias: '911',
  cruzRoja: '065',
  bomberos: '068',
  policia: '060',
  denuncia_anonima: '089',
  proteccion_civil: '961 617 9700'
};

// Función para obtener lugares por tipo
export function getLugaresPorTipo(tipo: LugarRecurso['tipo']): LugarRecurso[] {
  return LUGARES_CHIAPAS.filter(l => l.tipo === tipo);
}

// Función para obtener lugares por servicio
export function getLugaresPorServicio(servicio: string): LugarRecurso[] {
  return LUGARES_CHIAPAS.filter(l => 
    l.servicios.some(s => s.toLowerCase().includes(servicio.toLowerCase()))
  );
}

// Función para formatear lugar para respuesta
export function formatearLugar(lugar: LugarRecurso): string {
  return `📍 **${lugar.nombre}**
   ${lugar.direccion}, ${lugar.ciudad}
   📞 ${lugar.telefono}
   🕐 ${lugar.horario}
   ${lugar.googleMapsUrl ? `[Ver en Google Maps](${lugar.googleMapsUrl})` : ''}`;
}
