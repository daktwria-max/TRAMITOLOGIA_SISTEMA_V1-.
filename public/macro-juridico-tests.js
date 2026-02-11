
// ==================== TESTS DE MARCO JURÍDICO ====================

async function testearMarcoJuridico() {
    const suite = new TestSuite();

    // Test 1: Buscar actualizaciones
    suite.test('Marco Jurídico: Buscar actualizaciones', async () => {
        const resultado = await window.electronAPI.buscarActualizacionesMarcoJuridico();
        suite.assert(resultado.success !== undefined, 'Debe retornar un resultado');
    });

    // Test 2: Obtener normativas
    suite.test('Marco Jurídico: Obtener normativas', async () => {
        const resultado = await window.electronAPI.obtenerMarcoJuridico({});
        suite.assert(resultado.success, 'Debe obtener normativas exitosamente');
        suite.assert(Array.isArray(resultado.data), 'Debe retornar un array');
    });

    // Test 3: Obtener alertas
    suite.test('Marco Jurídico: Obtener alertas', async () => {
        const resultado = await window.electronAPI.obtenerAlertasNormativas();
        suite.assert(resultado.success, 'Debe obtener alertas exitosamente');
        suite.assert(Array.isArray(resultado.data), 'Debe retornar un array');
    });

    // Test 4: Obtener estadísticas
    suite.test('Marco Jurídico: Obtener estadísticas', async () => {
        const resultado = await window.electronAPI.obtenerEstadisticasMarcoJuridico();
        suite.assert(resultado.success, 'Debe obtener estadísticas');
        suite.assertType(resultado.data.total, 'number', 'Total debe ser número');
    });

    // Test 5: Obtener historial
    suite.test('Marco Jurídico: Obtener historial', async () => {
        const resultado = await window.electronAPI.obtenerHistorialActualizaciones(10);
        suite.assert(resultado.success, 'Debe obtener historial');
        suite.assert(Array.isArray(resultado.data), 'Debe retornar un array');
    });

    // Test 6: Programar búsqueda automática
    suite.test('Marco Jurídico: Programar búsqueda', async () => {
        const resultado = await window.electronAPI.programarBusquedaAutomatica('08:00');
        suite.assert(resultado.success, 'Debe programar búsqueda');
    });

    await suite.ejecutar();
    return suite.results;
}
