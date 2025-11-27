-- Seed de documentos legales del Código Nacional de Tránsito Terrestre de Colombia
-- Ley 769 de 2002 y sus modificaciones

-- Insertar documentos legales principales
INSERT INTO documentos_legales (titulo, contenido, fuente, categoria, cluster_relacionado, activo)
VALUES
-- CLUSTER C1: Infracciones Graves (Alcohol, Drogas, Velocidad Excesiva)
(
    'Artículo 120 - Embriaguez y Alcoholemia',
    'Todo conductor que sea sorprendido en estado de embriaguez o bajo el efecto de sustancias alucinógenas será sancionado con multa equivalente a 30 salarios mínimos legales diarios vigentes (SMLDV), suspensión de la licencia de conducción de 1 a 3 años e inmovilización del vehículo.

Si el grado de alcoholemia es superior a 40 miligramos de etanol por 100 mililitros de sangre (0.4 g/L), o de 0.4 miligramos de alcohol por litro de aire espirado, constituye falta gravísima. En caso de reincidencia, la suspensión será definitiva.

Parágrafo: Los conductores de vehículos de transporte público, de carga o de servicio especial, no podrán presentar ningún grado de alcoholemia.',
    'Ley 769 de 2002',
    'Infracciones Graves',
    'C1',
    true
),
(
    'Artículo 107 - Conducción bajo efectos de sustancias psicoactivas',
    'Conducir bajo la influencia de sustancias psicoactivas, estupefacientes o alucinógenas será sancionado con multa de 30 SMLDV, suspensión de licencia de 1 a 3 años, e inmovilización del vehículo por 20 días hábiles.

La autoridad de tránsito deberá realizar exámenes de alcoholemia o de sustancias psicoactivas cuando exista motivo fundado. El conductor que se niegue a realizar la prueba será sancionado como si estuviera bajo efectos de alcohol o drogas.',
    'Ley 769 de 2002',
    'Infracciones Graves',
    'C1',
    true
),
(
    'Artículo 106 - Exceso de velocidad',
    'El exceso de velocidad será sancionado de acuerdo con el porcentaje de exceso sobre el límite permitido:

- Hasta 20%: Multa de 15 SMLDV
- Entre 20% y 40%: Multa de 30 SMLDV
- Superior a 40%: Multa de 45 SMLDV y suspensión de licencia de 3 a 6 meses

En zonas escolares, hospitalarias o residenciales, las sanciones se incrementan en un 50%. La reincidencia en menos de 6 meses conlleva suspensión de la licencia.',
    'Ley 769 de 2002',
    'Infracciones Graves',
    'C1',
    true
),
(
    'Artículo 109 - Conducción temeraria',
    'Quien conduzca un vehículo en forma temeraria, poniendo en peligro la vida de las personas o causando daño a la propiedad, será sancionado con multa de 30 SMLDV, suspensión de licencia de 1 a 2 años e inmovilización del vehículo.

Se considera conducción temeraria: adelantar en curvas o puentes, invadir carril contrario, hacer zigzag entre vehículos, o participar en competencias no autorizadas en vías públicas.',
    'Ley 769 de 2002',
    'Infracciones Graves',
    'C1',
    true
),

-- CLUSTER C2: Multas Menores (Estacionamiento, Señalización, Documentación)
(
    'Artículo 135 - Estacionamiento en sitio prohibido',
    'Estacionar un vehículo en sitios prohibidos será sancionado con multa de 15 SMLDV. Se considera estacionamiento prohibido:

- Frente a hidrantes, entradas de garajes o rampas de discapacitados
- En zonas de carga y descarga sin autorización
- En andenes, separadores o zonas verdes
- A menos de 5 metros de una esquina
- En vías de alto flujo vehicular señalizadas como tales
- En zonas exclusivas para vehículos de emergencia

El vehículo podrá ser inmovilizado y trasladado a patios. Los costos del traslado y almacenamiento correrán por cuenta del propietario.',
    'Ley 769 de 2002',
    'Multas Menores',
    'C2',
    true
),
(
    'Artículo 131 - No respetar señales de tránsito',
    'No obedecer las señales de tránsito (semáforos, pare, ceda el paso, etc.) será sancionado con multa de 15 SMLDV.

Pasarse un semáforo en rojo constituye falta grave con multa de 30 SMLDV. Si este comportamiento causa accidente, la sanción incluye suspensión de licencia de 6 meses a 1 año.',
    'Ley 769 de 2002',
    'Multas Menores',
    'C2',
    true
),
(
    'Artículo 140 - Conducir sin documentos',
    'Conducir un vehículo sin portar los documentos reglamentarios será sancionado así:

- Sin licencia de conducción (pero poseyéndola): 15 SMLDV e inmovilización
- Sin SOAT vigente: 30 SMLDV e inmovilización
- Sin revisión tecnicomecánica vigente: 15 SMLDV e inmovilización
- Sin tarjeta de propiedad: 8 SMLDV

El vehículo permanecerá inmovilizado hasta que se presenten los documentos faltantes.',
    'Ley 769 de 2002',
    'Multas Menores',
    'C2',
    true
),
(
    'Artículo 133 - Uso inadecuado de dispositivos móviles',
    'Usar dispositivos móviles mientras se conduce, sin sistema de manos libres, será sancionado con multa de 15 SMLDV e inmovilización del vehículo.

Está prohibido hablar por teléfono, enviar mensajes de texto o manipular cualquier dispositivo electrónico mientras el vehículo está en movimiento. Solo se permite el uso de dispositivos con tecnología manos libres o bluetooth.',
    'Ley 1811 de 2016',
    'Multas Menores',
    'C2',
    true
),

-- CLUSTER C3: Accidentes de Tránsito
(
    'Artículo 110 - Fuga del lugar del accidente',
    'Quien conduzca un vehículo y cause daño a personas o bienes y se fugue del lugar será sancionado con:

- Multa de 60 SMLDV
- Suspensión de licencia de 3 a 5 años
- Responsabilidad penal si hay lesionados o muertos

El conductor está obligado a:
1. Detenerse inmediatamente
2. Prestar auxilio a los heridos
3. Avisar a las autoridades
4. Suministrar información de identificación y del vehículo',
    'Ley 769 de 2002',
    'Accidentes',
    'C3',
    true
),
(
    'Artículo 111 - Procedimiento en caso de accidente',
    'En caso de accidente de tránsito, los conductores involucrados deberán:

1. Detener inmediatamente el vehículo
2. Activar las señales de emergencia
3. Colocar señales reflectivas a 30 metros antes y después
4. Prestar primeros auxilios si hay heridos
5. Llamar a las autoridades (línea 123)
6. No mover el vehículo excepto si obstruye totalmente la vía
7. Intercambiar información de seguros y documentos
8. Tomar fotografías del lugar si es posible

Si solo hay daños materiales menores y hay acuerdo, se puede llenar el IPART (Informe Policial de Accidente de Tránsito) sin esperar autoridades.',
    'Ley 769 de 2002',
    'Accidentes',
    'C3',
    true
),

-- CLUSTER C4: Vehículos y Modificaciones
(
    'Artículo 28 - Modificaciones al vehículo',
    'Toda modificación al vehículo debe ser aprobada por el organismo de tránsito. Se prohíbe:

- Modificar el sistema de escape para aumentar ruido
- Instalar vidrios polarizados excediendo el 28% de opacidad
- Modificar la placa o insignias del vehículo
- Instalar torretas o sirenas (excepto vehículos autorizados)
- Modificar el chasis o carrocería sin aprobación

Sanción: 15 SMLDV e inmovilización hasta corregir la irregularidad.',
    'Ley 769 de 2002',
    'Vehículos',
    'C4',
    true
),
(
    'Artículo 50 - Revisión Técnico-mecánica obligatoria',
    'Todo vehículo debe someterse a revisión técnico-mecánica y de gases en los centros autorizados:

Vehículos particulares:
- Menos de 2 años: no requiere
- 2 a 4 años: cada 2 años
- 5 a 8 años: cada año
- Más de 8 años: cada año

Vehículos de servicio público:
- Cada año sin excepción

No presentar la revisión vigente: multa de 15 SMLDV e inmovilización.',
    'Ley 769 de 2002',
    'Vehículos',
    'C4',
    true
),

-- CLUSTER C5: Transporte Público y Carga
(
    'Artículo 97 - Normas para transporte público',
    'Los conductores de vehículos de transporte público de pasajeros deben:

- Portar la planilla del vehículo actualizada
- No recoger ni dejar pasajeros en sitios prohibidos
- Respetar los paraderos establecidos
- Mantener el vehículo en condiciones óptimas de aseo
- No transportar más pasajeros que la capacidad permitida
- No usar el vehículo para fines diferentes al autorizado

Infracciones: multa de 20 SMLDV e inmovilización del vehículo.',
    'Ley 769 de 2002',
    'Transporte Público',
    'C5',
    true
),
(
    'Artículo 99 - Transporte de carga',
    'El transporte de carga debe cumplir:

- No exceder el peso máximo permitido según tipo de vehículo
- Asegurar adecuadamente la carga
- No permitir que la carga sobresalga peligrosamente
- Portar los permisos especiales para carga extrapesada o extradimensionada
- Transitar por las rutas autorizadas
- No transportar personas en la zona de carga

Exceso de peso:
- Hasta 10%: multa de 15 SMLDV
- 10% a 20%: multa de 30 SMLDV
- Más de 20%: multa de 45 SMLDV e inmovilización',
    'Ley 769 de 2002',
    'Transporte Carga',
    'C5',
    true
),

-- Información adicional útil
(
    'Sistema de Puntos - Decreto 2251 de 2017',
    'Colombia implementó el sistema de puntos para la licencia de conducción:

Cada licencia inicia con 0 puntos. Las infracciones suman puntos:
- Infracciones muy graves: 8 puntos
- Infracciones graves: 6 puntos
- Infracciones leves: 2 puntos

Al acumular 12 puntos o más, la licencia se suspende por 6 meses. Durante la suspensión, el conductor debe tomar un curso de reentrenamiento.

Los puntos se eliminan después de 1 año si no se cometen nuevas infracciones.

Infracciones que suman 8 puntos:
- Conducir bajo efectos de alcohol o drogas
- Fuga del lugar de accidente
- Conducción temeraria

Infracciones que suman 6 puntos:
- Exceso de velocidad superior a 40%
- Pasarse semáforo en rojo
- Adelantar en sitio prohibido',
    'Decreto 2251 de 2017',
    'Sistema Puntos',
    'C2',
    true
),
(
    'Artículo 8 - Prioridad de vehículos de emergencia',
    'Los vehículos de emergencia (ambulancias, bomberos, policía) en servicio tienen prelación en el tránsito.

Todos los conductores deben:
- Ceder el paso inmediatamente
- Orillarse a la derecha de la vía
- Detenerse si es necesario
- No seguir a menos de 50 metros a vehículos de emergencia
- No estacionarse en zonas reservadas para emergencias

No ceder el paso: multa de 15 SMLDV.
Si esto causa retraso en la atención de emergencia: multa de 30 SMLDV y suspensión de licencia de 3 a 6 meses.',
    'Ley 769 de 2002',
    'Normas Generales',
    'C2',
    true
),
(
    'Artículo 82 - Uso del cinturón de seguridad',
    'Es obligatorio el uso del cinturón de seguridad para todos los ocupantes del vehículo, tanto en asientos delanteros como traseros.

Para menores de 10 años:
- Menores de 2 años: silla infantil mirando hacia atrás
- 2 a 4 años: silla infantil mirando hacia adelante
- 4 a 10 años: elevador con cinturón
- Siempre en el asiento trasero

No usar cinturón: multa de 8 SMLDV.
No llevar a menores en sistema de retención adecuado: multa de 15 SMLDV e inmovilización.',
    'Ley 1383 de 2010',
    'Seguridad Vial',
    'C2',
    true
);
