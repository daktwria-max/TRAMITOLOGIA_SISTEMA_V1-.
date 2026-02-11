const { Worker } = require('worker_threads');
const path = require('path');
const os = require('os');
const fs = require('fs');

// ==================== OPTIMIZADOR DE RENDIMIENTO ====================

class PerformanceOptimizer {
    constructor() {
        this.cpuCount = os.cpus().length;
        this.workers = [];
        this.taskQueue = [];
        this.isProcessing = false;
        this.cache = new Map();
        this.cacheMaxSize = 1000;
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }

    // ==================== PROCESAMIENTO POR LOTES ====================

    async procesarPorLotes(items, procesador, opcionesLote = {}) {
        const {
            tamañoLote = 10,
            concurrencia = this.cpuCount,
            onProgreso = null,
            onError = null
        } = opcionesLote;

        console.log(`⚡ Procesando ${items.length} items en lotes de ${tamañoLote}`);
        console.log(`🔧 Usando ${concurrencia} hilos de procesamiento`);

        const resultados = [];
        const errores = [];
        let procesados = 0;

        // Dividir en lotes
        const lotes = [];
        for (let i = 0; i < items.length; i += tamañoLote) {
            lotes.push(items.slice(i, i + tamañoLote));
        }

        // Procesar lotes con concurrencia limitada
        for (let i = 0; i < lotes.length; i += concurrencia) {
            const lotesActuales = lotes.slice(i, i + concurrencia);

            const promesas = lotesActuales.map(async (lote) => {
                try {
                    const resultadosLote = [];

                    for (const item of lote) {
                        try {
                            const resultado = await procesador(item);
                            resultadosLote.push(resultado);
                            procesados++;

                            if (onProgreso) {
                                onProgreso(procesados, items.length);
                            }
                        } catch (error) {
                            errores.push({ item, error: error.message });
                            if (onError) {
                                onError(item, error);
                            }
                        }
                    }

                    return resultadosLote;
                } catch (error) {
                    console.error('Error procesando lote:', error);
                    return [];
                }
            });

            const resultadosLotes = await Promise.all(promesas);
            resultadosLotes.forEach(r => resultados.push(...r));
        }

        console.log(`✅ Procesamiento completado: ${resultados.length} exitosos, ${errores.length} errores`);

        return {
            exitosos: resultados,
            errores: errores,
            total: items.length,
            procesados: procesados
        };
    }

    // ==================== CACHÉ INTELIGENTE ====================

    obtenerDeCache(clave) {
        if (this.cache.has(clave)) {
            this.cacheHits++;
            const item = this.cache.get(clave);

            // Actualizar timestamp de acceso
            item.ultimoAcceso = Date.now();

            return item.valor;
        }

        this.cacheMisses++;
        return null;
    }

    guardarEnCache(clave, valor, ttl = 3600000) { // TTL por defecto: 1 hora
        // Limpiar caché si está lleno
        if (this.cache.size >= this.cacheMaxSize) {
            this.limpiarCacheAntiguo();
        }

        this.cache.set(clave, {
            valor: valor,
            timestamp: Date.now(),
            ultimoAcceso: Date.now(),
            ttl: ttl
        });
    }

    limpiarCacheAntiguo() {
        const ahora = Date.now();
        const items = Array.from(this.cache.entries());

        // Ordenar por último acceso (más antiguo primero)
        items.sort((a, b) => a[1].ultimoAcceso - b[1].ultimoAcceso);

        // Eliminar el 20% más antiguo
        const aEliminar = Math.floor(items.length * 0.2);
        for (let i = 0; i < aEliminar; i++) {
            this.cache.delete(items[i][0]);
        }

        console.log(`🧹 Caché limpiado: ${aEliminar} items eliminados`);
    }

    limpiarCacheExpirado() {
        const ahora = Date.now();
        let eliminados = 0;

        for (const [clave, item] of this.cache.entries()) {
            if (ahora - item.timestamp > item.ttl) {
                this.cache.delete(clave);
                eliminados++;
            }
        }

        if (eliminados > 0) {
            console.log(`🧹 Caché expirado limpiado: ${eliminados} items`);
        }
    }

    obtenerEstadisticasCache() {
        const total = this.cacheHits + this.cacheMisses;
        const tasaAcierto = total > 0 ? (this.cacheHits / total) * 100 : 0;

        return {
            tamaño: this.cache.size,
            maxTamaño: this.cacheMaxSize,
            aciertos: this.cacheHits,
            fallos: this.cacheMisses,
            tasaAcierto: tasaAcierto.toFixed(2) + '%'
        };
    }

    // ==================== DEBOUNCING Y THROTTLING ====================

    debounce(func, espera) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, espera);
        };
    }

    throttle(func, limite) {
        let enEspera = false;
        return function (...args) {
            if (!enEspera) {
                func.apply(this, args);
                enEspera = true;
                setTimeout(() => {
                    enEspera = false;
                }, limite);
            }
        };
    }

    // ==================== COMPRESIÓN DE DATOS ====================

    comprimirTexto(texto) {
        // Implementación simple de compresión
        // En producción, usar zlib o similar
        try {
            return Buffer.from(texto).toString('base64');
        } catch (error) {
            console.error('Error comprimiendo texto:', error);
            return texto;
        }
    }

    descomprimirTexto(textoComprimido) {
        try {
            return Buffer.from(textoComprimido, 'base64').toString('utf-8');
        } catch (error) {
            console.error('Error descomprimiendo texto:', error);
            return textoComprimido;
        }
    }

    // ==================== ÍNDICES DE BASE DE DATOS ====================

    crearIndices(db) {
        console.log('📊 Creando índices para optimizar consultas...');

        try {
            // Índices para conocimiento_aprendido
            db.exec(`
        CREATE INDEX IF NOT EXISTS idx_conocimiento_relevancia 
        ON conocimiento_aprendido(relevancia DESC);
      `);

            db.exec(`
        CREATE INDEX IF NOT EXISTS idx_conocimiento_categoria 
        ON conocimiento_aprendido(categoria);
      `);

            db.exec(`
        CREATE INDEX IF NOT EXISTS idx_conocimiento_tipo 
        ON conocimiento_aprendido(tipo);
      `);

            db.exec(`
        CREATE INDEX IF NOT EXISTS idx_conocimiento_usado 
        ON conocimiento_aprendido(veces_usado DESC);
      `);

            // Índices para documentos_analizados
            db.exec(`
        CREATE INDEX IF NOT EXISTS idx_documentos_tipo 
        ON documentos_analizados(tipo_documento);
      `);

            db.exec(`
        CREATE INDEX IF NOT EXISTS idx_documentos_calidad 
        ON documentos_analizados(calidad_extraccion DESC);
      `);

            db.exec(`
        CREATE INDEX IF NOT EXISTS idx_documentos_relevancia 
        ON documentos_analizados(relevancia DESC);
      `);

            // Índices para datos_extraidos
            db.exec(`
        CREATE INDEX IF NOT EXISTS idx_datos_tipo 
        ON datos_extraidos(tipo_dato);
      `);

            db.exec(`
        CREATE INDEX IF NOT EXISTS idx_datos_documento 
        ON datos_extraidos(documento_id);
      `);

            db.exec(`
        CREATE INDEX IF NOT EXISTS idx_datos_confianza 
        ON datos_extraidos(confianza DESC);
      `);

            // Índices para conversaciones
            db.exec(`
        CREATE INDEX IF NOT EXISTS idx_conversaciones_fecha 
        ON conversaciones_analizadas(fecha_analisis DESC);
      `);

            // Índices para patrones
            db.exec(`
        CREATE INDEX IF NOT EXISTS idx_patrones_frecuencia 
        ON patrones_identificados(frecuencia DESC);
      `);

            db.exec(`
        CREATE INDEX IF NOT EXISTS idx_patrones_confianza 
        ON patrones_identificados(confianza DESC);
      `);

            console.log('✅ Índices creados exitosamente');

        } catch (error) {
            console.error('Error creando índices:', error);
        }
    }

    // ==================== OPTIMIZACIÓN DE CONSULTAS ====================

    optimizarConsulta(db, consulta) {
        try {
            // Analizar plan de ejecución
            const plan = db.prepare(`EXPLAIN QUERY PLAN ${consulta}`).all();

            console.log('📊 Plan de ejecución:', plan);

            // Verificar si usa índices
            const usaIndice = plan.some(p => p.detail && p.detail.includes('USING INDEX'));

            if (!usaIndice) {
                console.warn('⚠️ Consulta no usa índices, considerar optimización');
            }

            return {
                usaIndice: usaIndice,
                plan: plan
            };

        } catch (error) {
            console.error('Error analizando consulta:', error);
            return null;
        }
    }

    // ==================== LIMPIEZA DE MEMORIA ====================

    limpiarMemoria() {
        if (global.gc) {
            console.log('🧹 Ejecutando recolección de basura...');
            global.gc();
        }

        // Limpiar caché expirado
        this.limpiarCacheExpirado();
    }

    // ==================== MONITOREO DE RENDIMIENTO ====================

    async medirRendimiento(nombre, funcion) {
        const inicio = Date.now();
        const memoriaInicio = process.memoryUsage();

        try {
            const resultado = await funcion();

            const duracion = Date.now() - inicio;
            const memoriaFin = process.memoryUsage();
            const memoriaUsada = (memoriaFin.heapUsed - memoriaInicio.heapUsed) / 1024 / 1024;

            console.log(`⏱️ ${nombre}:`);
            console.log(`   Duración: ${duracion}ms`);
            console.log(`   Memoria: ${memoriaUsada.toFixed(2)}MB`);

            return {
                resultado: resultado,
                metricas: {
                    duracion: duracion,
                    memoriaUsada: memoriaUsada
                }
            };

        } catch (error) {
            console.error(`❌ Error en ${nombre}:`, error);
            throw error;
        }
    }

    // ==================== ESTADÍSTICAS ====================

    obtenerEstadisticas() {
        return {
            cpu: {
                nucleos: this.cpuCount,
                uso: process.cpuUsage()
            },
            memoria: {
                total: os.totalmem() / 1024 / 1024 / 1024,
                libre: os.freemem() / 1024 / 1024 / 1024,
                proceso: process.memoryUsage().heapUsed / 1024 / 1024
            },
            cache: this.obtenerEstadisticasCache(),
            workers: this.workers.length
        };
    }

    // ==================== MANTENIMIENTO DE BASE DE DATOS ====================

    async realizarBackup(dbPath, backupDir) {
        console.log('💾 Iniciando backup de base de datos...');
        const fse = require('fs-extra');

        try {
            // Asegurar directorio
            await fse.ensureDir(backupDir);

            // Nombre archivo: backup_YYYY-MM-DD_HH-mm.db
            const now = new Date();
            const timestamp = now.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
            const backupFilename = `backup_${timestamp}.db`;
            const backupPath = path.join(backupDir, backupFilename);

            // Copiar archivo (funciona bien con SQL.js db adapter que guarda en disco)
            await fse.copy(dbPath, backupPath);
            console.log(`✅ Backup creado: ${backupFilename}`);

            // Rotación de backups (Configurable)
            this.limpiarBackupsAntiguos(backupDir, 5); // Mantener últimos 5

            return {
                exito: true,
                ruta: backupPath,
                timestamp: now
            };
        } catch (error) {
            console.error('❌ Error en backup:', error.message);
            return { exito: false, error: error.message };
        }
    }

    limpiarBackupsAntiguos(backupDir, maxBackups) {
        const fs = require('fs');
        try {
            const archivos = fs.readdirSync(backupDir)
                .filter(f => f.startsWith('backup_') && f.endsWith('.db'))
                .map(f => ({
                    nombre: f,
                    path: path.join(backupDir, f),
                    tiempo: fs.statSync(path.join(backupDir, f)).mtime.getTime()
                }))
                .sort((a, b) => b.tiempo - a.tiempo); // Más recientes primero

            if (archivos.length > maxBackups) {
                const aBorrar = archivos.slice(maxBackups);
                console.log(`🧹 Eliminando ${aBorrar.length} backups antiguos...`);

                aBorrar.forEach(f => {
                    fs.unlinkSync(f.path);
                    console.log(`   🗑️ Eliminado: ${f.nombre}`);
                });
            }
        } catch (error) {
            console.warn('⚠️ Error limpiando backups antiguos:', error.message);
        }
    }
}

module.exports = PerformanceOptimizer;
