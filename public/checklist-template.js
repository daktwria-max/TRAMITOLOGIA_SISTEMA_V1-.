// ==================== TEMPLATE DE CHECKLIST INVEA ====================

const CHECKLIST_INVEA_TEMPLATE = {
    secciones: [
        {
            id: 'SECCION_1',
            nombre: '1. INFORMACIÓN GENERAL DEL ESTABLECIMIENTO',
            items: [
                {
                    numero: '1.1',
                    descripcion: 'Nombre o razón social del establecimiento',
                    tipo: 'verificacion'
                },
                {
                    numero: '1.2',
                    descripcion: 'Domicilio completo del establecimiento',
                    tipo: 'verificacion'
                },
                {
                    numero: '1.3',
                    descripcion: 'Giro o actividad preponderante',
                    tipo: 'verificacion'
                },
                {
                    numero: '1.4',
                    descripcion: 'Clasificación de riesgo del establecimiento',
                    tipo: 'verificacion'
                },
                {
                    numero: '1.5',
                    descripcion: 'Horario de operación',
                    tipo: 'verificacion'
                }
            ]
        },
        {
            id: 'SECCION_2',
            nombre: '2. DOCUMENTACIÓN',
            items: [
                {
                    numero: '2.1',
                    descripcion: 'Aviso de Funcionamiento vigente',
                    tipo: 'cumplimiento',
                    critico: true
                },
                {
                    numero: '2.2',
                    descripcion: 'Póliza de seguro de responsabilidad civil vigente',
                    tipo: 'cumplimiento',
                    critico: true
                },
                {
                    numero: '2.3',
                    descripcion: 'Programa Interno de Protección Civil',
                    tipo: 'cumplimiento',
                    critico: true
                },
                {
                    numero: '2.4',
                    descripcion: 'Dictamen técnico de seguridad estructural',
                    tipo: 'cumplimiento'
                },
                {
                    numero: '2.5',
                    descripcion: 'Dictamen técnico de instalaciones eléctricas',
                    tipo: 'cumplimiento'
                },
                {
                    numero: '2.6',
                    descripcion: 'Dictamen técnico de instalaciones de gas',
                    tipo: 'cumplimiento'
                },
                {
                    numero: '2.7',
                    descripcion: 'Constancia de capacitación del personal',
                    tipo: 'cumplimiento'
                }
            ]
        },
        {
            id: 'SECCION_3',
            nombre: '3. SEÑALIZACIÓN Y RUTAS DE EVACUACIÓN',
            items: [
                {
                    numero: '3.1',
                    descripcion: 'Señalización de salidas de emergencia',
                    tipo: 'cumplimiento',
                    critico: true
                },
                {
                    numero: '3.2',
                    descripcion: 'Señalización de rutas de evacuación',
                    tipo: 'cumplimiento',
                    critico: true
                },
                {
                    numero: '3.3',
                    descripcion: 'Señalización de equipos contra incendio',
                    tipo: 'cumplimiento',
                    critico: true
                },
                {
                    numero: '3.4',
                    descripcion: 'Señalización de zonas de seguridad',
                    tipo: 'cumplimiento'
                },
                {
                    numero: '3.5',
                    descripcion: 'Señalización de áreas restringidas',
                    tipo: 'cumplimiento'
                },
                {
                    numero: '3.6',
                    descripcion: 'Croquis de ubicación visible',
                    tipo: 'cumplimiento'
                },
                {
                    numero: '3.7',
                    descripcion: 'Rutas de evacuación libres de obstáculos',
                    tipo: 'cumplimiento',
                    critico: true
                }
            ]
        },
        {
            id: 'SECCION_4',
            nombre: '4. EQUIPOS CONTRA INCENDIO',
            items: [
                {
                    numero: '4.1',
                    descripcion: 'Extintores en cantidad suficiente',
                    tipo: 'cumplimiento',
                    critico: true
                },
                {
                    numero: '4.2',
                    descripcion: 'Extintores con carga vigente',
                    tipo: 'cumplimiento',
                    critico: true
                },
                {
                    numero: '4.3',
                    descripcion: 'Extintores correctamente ubicados',
                    tipo: 'cumplimiento',
                    critico: true
                },
                {
                    numero: '4.4',
                    descripcion: 'Sistema de detección de humo',
                    tipo: 'cumplimiento'
                },
                {
                    numero: '4.5',
                    descripcion: 'Sistema de alarma contra incendio',
                    tipo: 'cumplimiento',
                    critico: true
                },
                {
                    numero: '4.6',
                    descripcion: 'Hidrantes y tomas siamesas (si aplica)',
                    tipo: 'cumplimiento'
                },
                {
                    numero: '4.7',
                    descripcion: 'Rociadores automáticos (si aplica)',
                    tipo: 'cumplimiento'
                }
            ]
        },
        {
            id: 'SECCION_5',
            nombre: '5. INSTALACIONES ELÉCTRICAS',
            items: [
                {
                    numero: '5.1',
                    descripcion: 'Instalación eléctrica en buen estado',
                    tipo: 'cumplimiento',
                    critico: true
                },
                {
                    numero: '5.2',
                    descripcion: 'Tableros eléctricos identificados',
                    tipo: 'cumplimiento'
                },
                {
                    numero: '5.3',
                    descripcion: 'Sistema de tierra física',
                    tipo: 'cumplimiento',
                    critico: true
                },
                {
                    numero: '5.4',
                    descripcion: 'Protecciones termomagneticas',
                    tipo: 'cumplimiento',
                    critico: true
                },
                {
                    numero: '5.5',
                    descripcion: 'Iluminación de emergencia',
                    tipo: 'cumplimiento',
                    critico: true
                },
                {
                    numero: '5.6',
                    descripcion: 'Planta de emergencia (si aplica)',
                    tipo: 'cumplimiento'
                }
            ]
        },
        {
            id: 'SECCION_6',
            nombre: '6. INSTALACIONES DE GAS',
            items: [
                {
                    numero: '6.1',
                    descripcion: 'Instalación de gas en buen estado',
                    tipo: 'cumplimiento',
                    critico: true
                },
                {
                    numero: '6.2',
                    descripcion: 'Válvulas de paso identificadas',
                    tipo: 'cumplimiento',
                    critico: true
                },
                {
                    numero: '6.3',
                    descripcion: 'Detectores de gas (si aplica)',
                    tipo: 'cumplimiento'
                },
                {
                    numero: '6.4',
                    descripcion: 'Ventilación adecuada en áreas de gas',
                    tipo: 'cumplimiento',
                    critico: true
                },
                {
                    numero: '6.5',
                    descripcion: 'Tanques de gas ubicados correctamente',
                    tipo: 'cumplimiento',
                    critico: true
                }
            ]
        },
        {
            id: 'SECCION_7',
            nombre: '7. BRIGADAS Y CAPACITACIÓN',
            items: [
                {
                    numero: '7.1',
                    descripcion: 'Brigada de evacuación conformada',
                    tipo: 'cumplimiento',
                    critico: true
                },
                {
                    numero: '7.2',
                    descripcion: 'Brigada de primeros auxilios conformada',
                    tipo: 'cumplimiento',
                    critico: true
                },
                {
                    numero: '7.3',
                    descripcion: 'Brigada contra incendio conformada',
                    tipo: 'cumplimiento',
                    critico: true
                },
                {
                    numero: '7.4',
                    descripcion: 'Personal capacitado en protección civil',
                    tipo: 'cumplimiento',
                    critico: true
                },
                {
                    numero: '7.5',
                    descripcion: 'Simulacros realizados periódicamente',
                    tipo: 'cumplimiento',
                    critico: true
                },
                {
                    numero: '7.6',
                    descripcion: 'Bitácora de simulacros actualizada',
                    tipo: 'cumplimiento'
                }
            ]
        },
        {
            id: 'SECCION_8',
            nombre: '8. BOTIQUÍN Y PRIMEROS AUXILIOS',
            items: [
                {
                    numero: '8.1',
                    descripcion: 'Botiquín de primeros auxilios completo',
                    tipo: 'cumplimiento',
                    critico: true
                },
                {
                    numero: '8.2',
                    descripcion: 'Medicamentos y material vigente',
                    tipo: 'cumplimiento'
                },
                {
                    numero: '8.3',
                    descripcion: 'Directorio de emergencias visible',
                    tipo: 'cumplimiento',
                    critico: true
                },
                {
                    numero: '8.4',
                    descripcion: 'Camilla o equipo de traslado (si aplica)',
                    tipo: 'cumplimiento'
                }
            ]
        },
        {
            id: 'SECCION_9',
            nombre: '9. CONDICIONES GENERALES DE SEGURIDAD',
            items: [
                {
                    numero: '9.1',
                    descripcion: 'Puertas de emergencia operables',
                    tipo: 'cumplimiento',
                    critico: true
                },
                {
                    numero: '9.2',
                    descripcion: 'Escaleras en buen estado',
                    tipo: 'cumplimiento',
                    critico: true
                },
                {
                    numero: '9.3',
                    descripcion: 'Pasillos libres de obstáculos',
                    tipo: 'cumplimiento',
                    critico: true
                },
                {
                    numero: '9.4',
                    descripcion: 'Almacenamiento adecuado de materiales',
                    tipo: 'cumplimiento'
                },
                {
                    numero: '9.5',
                    descripcion: 'Áreas de trabajo limpias y ordenadas',
                    tipo: 'cumplimiento'
                },
                {
                    numero: '9.6',
                    descripcion: 'Ventilación e iluminación adecuadas',
                    tipo: 'cumplimiento'
                }
            ]
        },
        {
            id: 'SECCION_10',
            nombre: '10. CUMPLIMIENTO NORMATIVO',
            items: [
                {
                    numero: '10.1',
                    descripcion: 'Cumplimiento de NOM-002-STPS-2010',
                    tipo: 'cumplimiento'
                },
                {
                    numero: '10.2',
                    descripcion: 'Cumplimiento de normas locales CDMX',
                    tipo: 'cumplimiento',
                    critico: true
                },
                {
                    numero: '10.3',
                    descripcion: 'Cumplimiento de reglamento de construcción',
                    tipo: 'cumplimiento'
                },
                {
                    numero: '10.4',
                    descripcion: 'Actualización periódica de medidas',
                    tipo: 'cumplimiento'
                }
            ]
        }
    ]
};

// ==================== FUNCIONES DE UTILIDAD ====================

function obtenerTemplateCompleto() {
    return CHECKLIST_INVEA_TEMPLATE;
}

function obtenerSeccion(seccionId) {
    return CHECKLIST_INVEA_TEMPLATE.secciones.find(s => s.id === seccionId);
}

function contarItemsCriticos() {
    let count = 0;
    CHECKLIST_INVEA_TEMPLATE.secciones.forEach(seccion => {
        seccion.items.forEach(item => {
            if (item.critico) count++;
        });
    });
    return count;
}

function contarItemsTotales() {
    let count = 0;
    CHECKLIST_INVEA_TEMPLATE.secciones.forEach(seccion => {
        count += seccion.items.length;
    });
    return count;
}

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CHECKLIST_INVEA_TEMPLATE,
        obtenerTemplateCompleto,
        obtenerSeccion,
        contarItemsCriticos,
        contarItemsTotales
    };
}
