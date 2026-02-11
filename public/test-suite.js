// ==================== SUITE DE PRUEBAS ====================

class TestSuite {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            errors: []
        };
    }

    // ==================== AGREGAR TESTS ====================

    test(nombre, funcion) {
        this.tests.push({ nombre, funcion });
    }

    // ==================== EJECUTAR TESTS ====================

    async ejecutar() {
        console.log('🧪 Iniciando Suite de Pruebas...\n');

        for (const test of this.tests) {
            try {
                await test.funcion();
                this.results.passed++;
                console.log(`✅ ${test.nombre}`);
            } catch (error) {
                this.results.failed++;
                this.results.errors.push({
                    test: test.nombre,
                    error: error.message,
                    stack: error.stack
                });
                console.error(`❌ ${test.nombre}`);
                console.error(`   Error: ${error.message}`);
            }
            this.results.total++;
        }

        this.mostrarResumen();
    }

    mostrarResumen() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 RESUMEN DE PRUEBAS');
        console.log('='.repeat(50));
        console.log(`Total: ${this.results.total}`);
        console.log(`✅ Pasadas: ${this.results.passed}`);
        console.log(`❌ Fallidas: ${this.results.failed}`);
        console.log(`📈 Tasa de éxito: ${((this.results.passed / this.results.total) * 100).toFixed(2)}%`);

        if (this.results.errors.length > 0) {
            console.log('\n❌ ERRORES DETALLADOS:');
            this.results.errors.forEach((err, i) => {
                console.log(`\n${i + 1}. ${err.test}`);
                console.log(`   ${err.error}`);
            });
        }

        console.log('\n' + '='.repeat(50));
    }

    // ==================== UTILIDADES DE TESTING ====================

    assert(condicion, mensaje) {
        if (!condicion) {
            throw new Error(mensaje || 'Assertion falló');
        }
    }

    assertEqual(actual, esperado, mensaje) {
        if (actual !== esperado) {
            throw new Error(
                mensaje || `Se esperaba ${esperado}, pero se obtuvo ${actual}`
            );
        }
    }

    assertNotNull(valor, mensaje) {
        if (valor === null || valor === undefined) {
            throw new Error(mensaje || 'El valor no debe ser null o undefined');
        }
    }

    assertType(valor, tipo, mensaje) {
        if (typeof valor !== tipo) {
            throw new Error(
                mensaje || `Se esperaba tipo ${tipo}, pero se obtuvo ${typeof valor}`
            );
        }
    }

    assertArrayLength(array, longitud, mensaje) {
        if (!Array.isArray(array)) {
            throw new Error('El valor no es un array');
        }
        if (array.length !== longitud) {
            throw new Error(
                mensaje || `Se esperaba longitud ${longitud}, pero se obtuvo ${array.length}`
            );
        }
    }

    async assertAsync(promesa, mensaje) {
        try {
            await promesa;
        } catch (error) {
            throw new Error(mensaje || `Promesa rechazada: ${error.message}`);
        }
    }
}

// ==================== TESTS DE BASE DE DATOS ====================

async function testearBaseDatos() {
    const suite = new TestSuite();

    // Test 1: Crear Proyecto
    suite.test('DB: Crear proyecto', async () => {
        const proyecto = {
            nombre: 'Test Proyecto',
            cliente: 'Test Cliente',
            clasificacion: 'BAJO_IMPACTO',
            estado: 'activo',
            direccion: 'Test Dirección',
            descripcion: 'Test Descripción'
        };

        const resultado = await window.electronAPI.crearProyecto(proyecto);
        suite.assert(resultado.success, 'Debe crear el proyecto exitosamente');
        suite.assertNotNull(resultado.data, 'Debe retornar datos del proyecto');
        suite.assertType(resultado.data.id, 'string', 'El ID debe ser string');
    });

    // Test 2: Obtener Proyectos
    suite.test('DB: Obtener proyectos', async () => {
        const resultado = await window.electronAPI.obtenerProyectos({});
        suite.assert(resultado.success, 'Debe obtener proyectos exitosamente');
        suite.assert(Array.isArray(resultado.data), 'Debe retornar un array');
    });

    // Test 3: Actualizar Proyecto
    suite.test('DB: Actualizar proyecto', async () => {
        const proyectos = await window.electronAPI.obtenerProyectos({});
        if (proyectos.data.length > 0) {
            const proyectoId = proyectos.data[0].id;
            const resultado = await window.electronAPI.actualizarProyecto(proyectoId, {
                nombre: 'Proyecto Actualizado'
            });
            suite.assert(resultado.success, 'Debe actualizar el proyecto');
        }
    });

    // Test 4: Crear Tarea
    suite.test('DB: Crear tarea', async () => {
        const proyectos = await window.electronAPI.obtenerProyectos({});
        if (proyectos.data.length > 0) {
            const tarea = {
                titulo: 'Test Tarea',
                descripcion: 'Test Descripción',
                proyecto_id: proyectos.data[0].id,
                estado: 'pendiente',
                prioridad: 'media'
            };

            const resultado = await window.electronAPI.crearTarea(tarea);
            suite.assert(resultado.success, 'Debe crear la tarea exitosamente');
        }
    });

    // Test 5: Obtener Tareas
    suite.test('DB: Obtener tareas', async () => {
        const resultado = await window.electronAPI.obtenerTareas({});
        suite.assert(resultado.success, 'Debe obtener tareas exitosamente');
        suite.assert(Array.isArray(resultado.data), 'Debe retornar un array');
    });

    // Test 6: Actualizar Tarea
    suite.test('DB: Actualizar tarea', async () => {
        const tareas = await window.electronAPI.obtenerTareas({});
        if (tareas.data.length > 0) {
            const tareaId = tareas.data[0].id;
            const resultado = await window.electronAPI.actualizarTarea(tareaId, {
                estado: 'completada'
            });
            suite.assert(resultado.success, 'Debe actualizar la tarea');
        }
    });

    await suite.ejecutar();
    return suite.results;
}

// ==================== TESTS DE CONFIGURACIÓN ====================

async function testearConfiguracion() {
    const suite = new TestSuite();

    // Test 1: Obtener configuración
    suite.test('Config: Obtener configuración', () => {
        const config = configManager.obtenerConfiguracion();
        suite.assertNotNull(config, 'Debe retornar configuración');
        suite.assertType(config, 'object', 'Debe ser un objeto');
    });

    // Test 2: Actualizar configuración
    suite.test('Config: Actualizar configuración', () => {
        const resultado = configManager.actualizarConfiguracion('tema', {
            modo: 'oscuro'
        });
        suite.assert(resultado, 'Debe actualizar la configuración');
    });

    // Test 3: Obtener configuración específica
    suite.test('Config: Obtener configuración específica', () => {
        const tema = configManager.obtenerConfiguracion('tema');
        suite.assertNotNull(tema, 'Debe retornar configuración de tema');
        suite.assertType(tema.modo, 'string', 'El modo debe ser string');
    });

    // Test 4: Aplicar tema
    suite.test('Config: Aplicar tema', () => {
        configManager.aplicarTema();
        const body = document.body;
        suite.assert(
            body.classList.contains('tema-oscuro') || body.classList.contains('tema-claro'),
            'Debe aplicar una clase de tema'
        );
    });

    // Test 5: Módulos activos
    suite.test('Config: Módulos activos', () => {
        const config = configManager.obtenerConfiguracion();
        suite.assert(Array.isArray(config.modulos_activos), 'Módulos activos debe ser array');
        suite.assert(config.modulos_activos.length > 0, 'Debe tener al menos un módulo activo');
    });

    await suite.ejecutar();
    return suite.results;
}

// ==================== TESTS DE NOTIFICACIONES ====================

async function testearNotificaciones() {
    const suite = new TestSuite();

    // Test 1: Sistema de notificaciones existe
    suite.test('Notif: Sistema existe', () => {
        suite.assertNotNull(sistemaNotificaciones, 'Sistema de notificaciones debe existir');
    });

    // Test 2: Crear notificación de éxito
    suite.test('Notif: Crear notificación éxito', () => {
        const id = sistemaNotificaciones.notificarExito('Test', 'Mensaje de prueba');
        suite.assertType(id, 'string', 'Debe retornar un ID');
    });

    // Test 3: Crear notificación de error
    suite.test('Notif: Crear notificación error', () => {
        const id = sistemaNotificaciones.notificarError('Test Error', 'Mensaje de error');
        suite.assertType(id, 'string', 'Debe retornar un ID');
    });

    // Test 4: Obtener todas las notificaciones
    suite.test('Notif: Obtener todas', () => {
        const notificaciones = sistemaNotificaciones.obtenerTodas();
        suite.assert(Array.isArray(notificaciones), 'Debe retornar un array');
        suite.assert(notificaciones.length >= 2, 'Debe tener al menos 2 notificaciones');
    });

    // Test 5: Marcar como leída
    suite.test('Notif: Marcar como leída', () => {
        const notificaciones = sistemaNotificaciones.obtenerTodas();
        if (notificaciones.length > 0) {
            sistemaNotificaciones.marcarComoLeida(notificaciones[0].id);
            const notif = sistemaNotificaciones.obtenerTodas().find(n => n.id === notificaciones[0].id);
            suite.assert(notif.leida, 'La notificación debe estar marcada como leída');
        }
    });

    // Test 6: Eliminar notificación
    suite.test('Notif: Eliminar notificación', () => {
        const notificaciones = sistemaNotificaciones.obtenerTodas();
        const cantidadInicial = notificaciones.length;
        if (cantidadInicial > 0) {
            sistemaNotificaciones.eliminar(notificaciones[0].id);
            const nuevaCantidad = sistemaNotificaciones.obtenerTodas().length;
            suite.assertEqual(nuevaCantidad, cantidadInicial - 1, 'Debe eliminar una notificación');
        }
    });

    await suite.ejecutar();
    return suite.results;
}

// ==================== TESTS DE UI ====================

async function testearUI() {
    const suite = new TestSuite();

    // Test 1: Elementos principales existen
    suite.test('UI: Elementos principales', () => {
        suite.assertNotNull(document.getElementById('sidebar'), 'Sidebar debe existir');
        suite.assertNotNull(document.getElementById('contentArea'), 'Content area debe existir');
        suite.assertNotNull(document.getElementById('topbar'), 'Topbar debe existir');
    });

    // Test 2: Navegación funciona
    suite.test('UI: Cambiar vista', async () => {
        cambiarVista('proyectos');
        await new Promise(resolve => setTimeout(resolve, 500));
        const contentArea = document.getElementById('contentArea');
        suite.assert(contentArea.innerHTML.includes('Proyectos'), 'Debe mostrar vista de proyectos');
    });

    // Test 3: Sidebar toggle
    suite.test('UI: Toggle sidebar', () => {
        const sidebar = document.getElementById('sidebar');
        const estaColapsado = sidebar.classList.contains('collapsed');

        document.getElementById('sidebarToggle').click();

        const nuevoEstado = sidebar.classList.contains('collapsed');
        suite.assert(nuevoEstado !== estaColapsado, 'El estado del sidebar debe cambiar');
    });

    // Test 4: Búsqueda global
    suite.test('UI: Búsqueda global existe', () => {
        const searchInput = document.getElementById('globalSearch');
        suite.assertNotNull(searchInput, 'Input de búsqueda debe existir');
    });

    // Test 5: Botones de acción
    suite.test('UI: Botones principales', () => {
        const btnNotifications = document.getElementById('btnNotifications');
        const btnSettings = document.getElementById('btnSettings');

        suite.assertNotNull(btnNotifications, 'Botón de notificaciones debe existir');
        suite.assertNotNull(btnSettings, 'Botón de configuración debe existir');
    });

    await suite.ejecutar();
    return suite.results;
}

// ==================== TESTS DE ESTADO GLOBAL ====================

async function testearEstadoGlobal() {
    const suite = new TestSuite();

    // Test 1: Estado global existe
    suite.test('Estado: Existe', () => {
        suite.assertNotNull(estadoActual, 'Estado global debe existir');
        suite.assertType(estadoActual, 'object', 'Debe ser un objeto');
    });

    // Test 2: Propiedades del estado
    suite.test('Estado: Propiedades', () => {
        suite.assert(Array.isArray(estadoActual.proyectos), 'Proyectos debe ser array');
        suite.assert(Array.isArray(estadoActual.tareas), 'Tareas debe ser array');
        suite.assertType(estadoActual.vistaActual, 'string', 'Vista actual debe ser string');
    });

    // Test 3: Cargar datos
    suite.test('Estado: Cargar datos', async () => {
        await cargarDatos();
        suite.assert(true, 'Debe cargar datos sin errores');
    });

    await suite.ejecutar();
    return suite.results;
}

// ==================== EJECUTAR TODOS LOS TESTS ====================

async function ejecutarTodosLosTests() {
    console.clear();
    console.log('🚀 INICIANDO SUITE COMPLETA DE PRUEBAS\n');

    const resultados = {
        baseDatos: null,
        configuracion: null,
        notificaciones: null,
        ui: null,
        estado: null,
        marcoJuridico: null
    };

    try {
        console.log('📦 Testeando Base de Datos...');
        resultados.baseDatos = await testearBaseDatos();

        console.log('\n⚙️ Testeando Configuración...');
        resultados.configuracion = await testearConfiguracion();

        console.log('\n🔔 Testeando Notificaciones...');
        resultados.notificaciones = await testearNotificaciones();

        console.log('\n🎨 Testeando UI...');
        resultados.ui = await testearUI();

        console.log('\n📊 Testeando Estado Global...');
        resultados.estado = await testearEstadoGlobal();

        console.log('\n⚖️ Testeando Marco Jurídico...');
        resultados.marcoJuridico = await testearMarcoJuridico();

        // Resumen final
        mostrarResumenFinal(resultados);

    } catch (error) {
        console.error('❌ Error ejecutando tests:', error);
    }

    return resultados;
}

function mostrarResumenFinal(resultados) {
    console.log('\n' + '='.repeat(60));
    console.log('🏆 RESUMEN FINAL DE TODAS LAS PRUEBAS');
    console.log('='.repeat(60));

    let totalPasadas = 0;
    let totalFallidas = 0;
    let totalTests = 0;

    Object.entries(resultados).forEach(([categoria, resultado]) => {
        if (resultado) {
            totalPasadas += resultado.passed;
            totalFallidas += resultado.failed;
            totalTests += resultado.total;

            const emoji = resultado.failed === 0 ? '✅' : '⚠️';
            console.log(`${emoji} ${categoria}: ${resultado.passed}/${resultado.total} pasadas`);
        }
    });

    console.log('\n' + '-'.repeat(60));
    console.log(`📊 TOTAL: ${totalPasadas}/${totalTests} pruebas pasadas`);
    console.log(`📈 Tasa de éxito global: ${((totalPasadas / totalTests) * 100).toFixed(2)}%`);

    if (totalFallidas === 0) {
        console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE!');
    } else {
        console.log(`\n⚠️ ${totalFallidas} prueba(s) fallaron. Revisar errores arriba.`);
    }

    console.log('='.repeat(60));
}

// ==================== EXPORTAR ====================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TestSuite,
        ejecutarTodosLosTests,
        testearBaseDatos,
        testearConfiguracion,
        testearNotificaciones,
        testearUI,
        testearEstadoGlobal
    };
}

// Hacer disponible globalmente
window.ejecutarTests = ejecutarTodosLosTests;
