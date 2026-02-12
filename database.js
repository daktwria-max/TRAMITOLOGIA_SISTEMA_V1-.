/**
 * DATABASE MODULE - SQL.JS ADAPTER
 * Sistema de base de datos optimizado con manejo robusto de errores
 * @version 2.0.0
 */

const initSqlJs = require('sql.js');
const fs = require('fs-extra');
const path = require('path');
const { app } = require('electron');
const crypto = require('crypto');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
  SAVE_DEBOUNCE_MS: 2000,
  BACKUP_ON_SAVE: true,
  MAX_QUERY_LOG: 100,
  ENABLE_QUERY_LOG: false,
  WAL_MODE: false // sql.js no soporta WAL, pero lo dejamos para futuro
};

// ==================== LOGGER ====================
class DatabaseLogger {
  constructor() {
    this.queryLog = [];
    this.errorLog = [];
  }

  logQuery(sql, params, duration) {
    if (!CONFIG.ENABLE_QUERY_LOG) return;

    this.queryLog.push({
      timestamp: new Date().toISOString(),
      sql: sql.substring(0, 200),
      params: params?.length || 0,
      duration
    });

    if (this.queryLog.length > CONFIG.MAX_QUERY_LOG) {
      this.queryLog.shift();
    }
  }

  logError(context, error, sql = null) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      context,
      error: error.message,
      stack: error.stack,
      sql: sql?.substring(0, 200)
    };

    this.errorLog.push(errorEntry);
    console.error(`[DB Error] ${context}:`, error.message);

    if (sql) {
      console.error(`[DB SQL]:`, sql.substring(0, 200));
    }
  }

  getStatistics() {
    return {
      totalQueries: this.queryLog.length,
      totalErrors: this.errorLog.length,
      recentErrors: this.errorLog.slice(-10)
    };
  }
}

const logger = new DatabaseLogger();

// ==================== GESTOR DE RUTAS ====================
class PathManager {
  constructor() {
    this.isPackaged = app && app.isPackaged;
    this.dbPath = null;
  }

  setDatabasePath(customPath) {
    if (!customPath || typeof customPath !== 'string') {
      throw new Error('Ruta de base de datos inválida');
    }
    this.dbPath = customPath;
    console.log(`📂 Database Path configurado: ${this.dbPath}`);
  }

  getDefaultDatabasePath() {
    const dataPath = this.isPackaged
      ? path.join(app.getPath('userData'), 'data')
      : path.join(__dirname, 'data');
    return path.join(dataPath, 'database.db');
  }

  getDatabasePath() {
    return this.dbPath || this.getDefaultDatabasePath();
  }

  async ensureDirectoryExists() {
    const dbPath = this.getDatabasePath();
    const directory = path.dirname(dbPath);

    try {
      await fs.ensureDir(directory);
      return true;
    } catch (error) {
      logger.logError('ensureDirectoryExists', error);
      throw new Error(`No se pudo crear el directorio: ${directory}`);
    }
  }
}

const pathManager = new PathManager();

// ==================== ADAPTADOR DE BASE DE DATOS ====================
class DatabaseAdapter {
  constructor(db, filePath) {
    this.db = db;
    this.filePath = filePath;
    this.pendingSave = null;
    this.isDirty = false;
    this.isSaving = false;
    this.saveCount = 0;
    this.lastSaveTime = null;
    this.statementCache = new Map();
  }

  /**
   * Guarda cambios en disco con debounce optimizado
   */
  save() {
    this.isDirty = true;

    if (this.pendingSave) {
      clearTimeout(this.pendingSave);
    }

    this.pendingSave = setTimeout(() => {
      this.forceSave();
    }, CONFIG.SAVE_DEBOUNCE_MS);
  }

  /**
   * Fuerza el guardado inmediato
   */
  async forceSave() {
    if (!this.isDirty || this.isSaving) return;

    this.isSaving = true;
    const startTime = Date.now();

    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);

      // Crear backup antes de guardar (opcional)
      if (CONFIG.BACKUP_ON_SAVE && this.saveCount % 10 === 0) {
        await this._createQuickBackup();
      }

      // Guardar de forma atómica
      const tempPath = this.filePath + '.tmp';
      await fs.writeFile(tempPath, buffer);
      await fs.rename(tempPath, this.filePath);

      this.isDirty = false;
      this.pendingSave = null;
      this.saveCount++;
      this.lastSaveTime = new Date();

      const duration = Date.now() - startTime;
      if (duration > 100) {
        console.log(`💾 BD Sincronizada (${duration}ms, ${(buffer.length / 1024).toFixed(2)}KB)`);
      }

    } catch (error) {
      logger.logError('forceSave', error);
      throw new Error(`Error guardando base de datos: ${error.message}`);
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Crea un backup rápido
   * @private
   */
  async _createQuickBackup() {
    try {
      const backupDir = path.join(path.dirname(this.filePath), 'backups');
      await fs.ensureDir(backupDir);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `db_backup_${timestamp}.db`);

      await fs.copy(this.filePath, backupPath);

      // Mantener solo los últimos 5 backups
      const backups = await fs.readdir(backupDir);
      if (backups.length > 5) {
        const sorted = backups
          .map(f => ({ name: f, path: path.join(backupDir, f) }))
          .sort((a, b) => fs.statSync(a.path).mtime - fs.statSync(b.path).mtime);

        await fs.remove(sorted[0].path);
      }
    } catch (error) {
      console.warn('⚠️ No se pudo crear backup rápido:', error.message);
    }
  }

  /**
   * Prepara una consulta SQL con caché de statements
   */
  prepare(sql) {
    const startTime = Date.now();

    try {
      const stmt = this.db.prepare(sql);
      const adapter = this;

      return {
        run: function (params = []) {
          try {
            const normalizedParams = adapter._normalizeParams(params);
            stmt.bind(normalizedParams);
            stmt.step();

            const changes = adapter.db.getRowsModified() || 0;
            stmt.reset();

            adapter.save();

            logger.logQuery(sql, normalizedParams, Date.now() - startTime);

            return {
              changes,
              lastInsertRowid: adapter._getLastInsertId()
            };
          } catch (error) {
            stmt.reset();
            logger.logError('prepare.run', error, sql);
            throw error;
          } finally {
            stmt.free();
          }
        },

        get: function (params = []) {
          try {
            const normalizedParams = adapter._normalizeParams(params);
            stmt.bind(normalizedParams);

            let result = undefined;
            if (stmt.step()) {
              result = stmt.getAsObject();
            }

            stmt.reset();
            logger.logQuery(sql, normalizedParams, Date.now() - startTime);

            return result;
          } catch (error) {
            stmt.reset();
            logger.logError('prepare.get', error, sql);
            throw error;
          } finally {
            stmt.free();
          }
        },

        all: function (params = []) {
          try {
            const normalizedParams = adapter._normalizeParams(params);
            stmt.bind(normalizedParams);

            const results = [];
            while (stmt.step()) {
              results.push(stmt.getAsObject());
            }

            stmt.reset();
            logger.logQuery(sql, normalizedParams, Date.now() - startTime);

            return results;
          } catch (error) {
            stmt.reset();
            logger.logError('prepare.all', error, sql);
            throw error;
          } finally {
            stmt.free();
          }
        }
      };
    } catch (error) {
      logger.logError('prepare', error, sql);
      throw new Error(`Error preparando consulta: ${error.message}`);
    }
  }

  /**
   * Ejecuta SQL directo
   */
  exec(sql) {
    const startTime = Date.now();

    try {
      this.db.run(sql);
      this.save();
      logger.logQuery(sql, [], Date.now() - startTime);
    } catch (error) {
      logger.logError('exec', error, sql);
      throw new Error(`Error ejecutando SQL: ${error.message}`);
    }
  }

  /**
   * Executes a query and returns all results
   */
  all(sql, params = []) {
    return this.prepare(sql).all(params);
  }

  /**
   * Executes a query and returns the first result
   */
  get(sql, params = []) {
    return this.prepare(sql).get(params);
  }

  /**
   * Executes a query and returns the changes
   */
  run(sql, params = []) {
    return this.prepare(sql).run(params);
  }

  /**
   * Simula transacciones (sql.js no tiene transacciones reales)
   */
  transaction(fn) {
    return (...args) => {
      try {
        this.exec('BEGIN TRANSACTION');
        const result = fn(...args);
        this.exec('COMMIT');
        return result;
      } catch (error) {
        this.exec('ROLLBACK');
        logger.logError('transaction', error);
        throw error;
      }
    };
  }

  /**
   * Normaliza parámetros para sql.js
   * @private
   */
  _normalizeParams(params) {
    if (Array.isArray(params)) {
      return params;
    }
    if (typeof params === 'object' && params !== null) {
      return Object.values(params);
    }
    return [params];
  }

  /**
   * Obtiene el último ID insertado
   * @private
   */
  _getLastInsertId() {
    try {
      const result = this.db.exec('SELECT last_insert_rowid() as id');
      return result[0]?.values[0]?.[0] || -1;
    } catch {
      return -1;
    }
  }

  /**
   * Cierra la base de datos de forma segura
   */
  async close() {
    if (this.pendingSave) {
      clearTimeout(this.pendingSave);
    }

    await this.forceSave();

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    console.log('🔒 Base de datos cerrada correctamente');
  }

  /**
   * Obtiene estadísticas de la base de datos
   */
  getStatistics() {
    try {
      const tables = this.db.exec("SELECT name FROM sqlite_master WHERE type='table'");
      const tableNames = tables[0]?.values.map(v => v[0]) || [];

      const stats = {
        tables: tableNames.length,
        saveCount: this.saveCount,
        lastSaveTime: this.lastSaveTime,
        isDirty: this.isDirty,
        fileSize: fs.existsSync(this.filePath)
          ? fs.statSync(this.filePath).size
          : 0
      };

      // Contar registros por tabla
      tableNames.forEach(table => {
        try {
          const result = this.db.exec(`SELECT COUNT(*) as count FROM ${table}`);
          stats[`${table}_count`] = result[0]?.values[0]?.[0] || 0;
        } catch { }
      });

      return stats;
    } catch (error) {
      logger.logError('getStatistics', error);
      return {};
    }
  }
}

// ==================== GESTOR DE ESQUEMA ====================
class SchemaManager {
  constructor(db) {
    this.db = db;
  }

  /**
   * Crea todas las tablas necesarias
   */
  createTables() {
    console.log('📋 Creando esquema de base de datos...');

    const tables = [
      this._getProyectosSchema(),
      this._getTareasSchema(),
      this._getRegistroTiempoSchema(),
      this._getDocumentosSchema(),
      this._getAlertasSchema(),
      this._getChecklistsSchema(),
      this._getChecklistItemsSchema(),
      this._getAuditoriaSchema(),
      this._getConfiguracionSchema()
    ];

    tables.forEach(schema => {
      try {
        this.db.exec(schema);
      } catch (error) {
        logger.logError('createTables', error, schema);
      }
    });

    this._createIndexes();
    this._migrateSchema();
    console.log('✅ Esquema de base de datos creado/verificado');
  }

  /**
   * Migra el esquema para soportar nuevas columnas
   * @private
   */
  _migrateSchema() {
    const migrations = [
      { table: 'proyectos', column: 'actualizado_en', type: 'TEXT DEFAULT CURRENT_TIMESTAMP' },
      { table: 'proyectos', column: 'progreso', type: 'INTEGER DEFAULT 0' },
      { table: 'proyectos', column: 'etiquetas', type: 'TEXT' },
      { table: 'tareas', column: 'actualizado_en', type: 'TEXT DEFAULT CURRENT_TIMESTAMP' },
      { table: 'tareas', column: 'progreso', type: 'INTEGER DEFAULT 0' },
      { table: 'tareas', column: 'etiquetas', type: 'TEXT' },
      { table: 'documentos', column: 'actualizado_en', type: 'TEXT DEFAULT CURRENT_TIMESTAMP' },
      { table: 'documentos', column: 'hash', type: 'TEXT' }
    ];

    migrations.forEach(m => {
      try {
        const columns = this.db.exec(`PRAGMA table_info(${m.table})`);
        const hasColumn = columns[0]?.values.some(c => c[1] === m.column);

        if (!hasColumn) {
          console.log(`🔄 Migrando: Agregando ${m.column} a ${m.table}`);
          this.db.exec(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.type}`);
        }
      } catch (error) {
        console.warn(`⚠️ Error en migración de ${m.table}.${m.column}:`, error.message);
      }
    });
  }

  /**
   * Crea índices para optimizar consultas
   * @private
   */
  _createIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_tareas_proyecto ON tareas(proyecto_id)',
      'CREATE INDEX IF NOT EXISTS idx_tareas_estado ON tareas(estado)',
      'CREATE INDEX IF NOT EXISTS idx_documentos_proyecto ON documentos(proyecto_id)',
      'CREATE INDEX IF NOT EXISTS idx_alertas_estado ON alertas(estado)',
      'CREATE INDEX IF NOT EXISTS idx_alertas_fecha ON alertas(fecha_alerta)',
      'CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist ON checklist_items(checklist_id)',
      'CREATE INDEX IF NOT EXISTS idx_registro_tiempo_tarea ON registro_tiempo(tarea_id)',
      'CREATE INDEX IF NOT EXISTS idx_registro_tiempo_fecha ON registro_tiempo(fecha)'
    ];

    indexes.forEach(index => {
      try {
        this.db.exec(index);
      } catch (error) {
        // Índice ya existe, ignorar
      }
    });
  }

  _getProyectosSchema() {
    return `
            CREATE TABLE IF NOT EXISTS proyectos (
                id TEXT PRIMARY KEY,
                nombre TEXT NOT NULL,
                descripcion TEXT,
                cliente TEXT,
                clasificacion TEXT,
                direccion TEXT,
                fecha_inicio TEXT,
                fecha_fin TEXT,
                estado TEXT DEFAULT 'activo',
                presupuesto REAL DEFAULT 0,
                progreso INTEGER DEFAULT 0,
                prioridad TEXT DEFAULT 'media',
                etiquetas TEXT,
                creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
                actualizado_en TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `;
  }

  _getTareasSchema() {
    return `
            CREATE TABLE IF NOT EXISTS tareas (
                id TEXT PRIMARY KEY,
                proyecto_id TEXT,
                titulo TEXT NOT NULL,
                descripcion TEXT,
                prioridad TEXT DEFAULT 'media',
                estado TEXT DEFAULT 'pendiente',
                fecha_vencimiento TEXT,
                tiempo_estimado INTEGER DEFAULT 0,
                tiempo_real INTEGER DEFAULT 0,
                progreso INTEGER DEFAULT 0,
                etiquetas TEXT,
                asignado_a TEXT,
                creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
                actualizado_en TEXT DEFAULT CURRENT_TIMESTAMP,
                completado_en TEXT,
                FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE
            );
        `;
  }

  _getRegistroTiempoSchema() {
    return `
            CREATE TABLE IF NOT EXISTS registro_tiempo (
                id TEXT PRIMARY KEY,
                tarea_id TEXT NOT NULL,
                proyecto_id TEXT,
                descripcion TEXT,
                tiempo_minutos INTEGER NOT NULL,
                fecha TEXT NOT NULL,
                hora_inicio TEXT,
                hora_fin TEXT,
                tipo TEXT DEFAULT 'manual',
                creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tarea_id) REFERENCES tareas(id) ON DELETE CASCADE,
                FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE
            );
        `;
  }

  _getDocumentosSchema() {
    return `
            CREATE TABLE IF NOT EXISTS documentos (
                id TEXT PRIMARY KEY,
                proyecto_id TEXT NOT NULL,
                nombre TEXT NOT NULL,
                tipo TEXT,
                ruta TEXT NOT NULL,
                tamanio INTEGER DEFAULT 0,
                hash TEXT,
                fecha_vencimiento TEXT,
                notas TEXT,
                etiquetas TEXT,
                version INTEGER DEFAULT 1,
                creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
                actualizado_en TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE
            );
        `;
  }

  _getAlertasSchema() {
    return `
            CREATE TABLE IF NOT EXISTS alertas (
                id TEXT PRIMARY KEY,
                proyecto_id TEXT,
                tipo TEXT NOT NULL,
                titulo TEXT NOT NULL,
                mensaje TEXT,
                prioridad TEXT DEFAULT 'media',
                fecha_alerta TEXT NOT NULL,
                estado TEXT DEFAULT 'pendiente',
                leida INTEGER DEFAULT 0,
                fecha_lectura TEXT,
                creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE
            );
        `;
  }

  _getChecklistsSchema() {
    return `
            CREATE TABLE IF NOT EXISTS checklists_auditoria (
                id TEXT PRIMARY KEY,
                proyecto_id TEXT NOT NULL,
                tipo_checklist TEXT NOT NULL,
                clasificacion TEXT NOT NULL,
                fecha_auditoria TEXT NOT NULL,
                auditor TEXT,
                estado TEXT DEFAULT 'en_proceso',
                puntuacion_total INTEGER DEFAULT 0,
                items_cumplidos INTEGER DEFAULT 0,
                items_totales INTEGER DEFAULT 0,
                porcentaje_cumplimiento REAL DEFAULT 0,
                observaciones TEXT,
                plan_accion TEXT,
                fecha_proxima_revision TEXT,
                creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
                actualizado_en TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE
            );
        `;
  }

  _getChecklistItemsSchema() {
    return `
            CREATE TABLE IF NOT EXISTS checklist_items (
                id TEXT PRIMARY KEY,
                checklist_id TEXT NOT NULL,
                seccion TEXT NOT NULL,
                item TEXT NOT NULL,
                descripcion TEXT,
                cumple INTEGER DEFAULT 0,
                no_aplica INTEGER DEFAULT 0,
                evidencia TEXT,
                observaciones TEXT,
                prioridad TEXT DEFAULT 'media',
                orden INTEGER DEFAULT 0,
                puntos INTEGER DEFAULT 1,
                creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
                actualizado_en TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (checklist_id) REFERENCES checklists_auditoria(id) ON DELETE CASCADE
            );
        `;
  }

  _getAuditoriaSchema() {
    return `
            CREATE TABLE IF NOT EXISTS auditoria (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                accion TEXT NOT NULL,
                entidad TEXT NOT NULL,
                entidad_id TEXT,
                usuario TEXT,
                detalles TEXT,
                ip TEXT,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `;
  }

  _getConfiguracionSchema() {
    return `
            CREATE TABLE IF NOT EXISTS configuracion (
                clave TEXT PRIMARY KEY,
                valor TEXT,
                tipo TEXT DEFAULT 'string',
                descripcion TEXT,
                actualizado_en TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `;
  }
}

// ==================== REPOSITORIOS DE DATOS ====================
class DataRepository {
  constructor(db) {
    this.db = db;
  }

  // --- PROYECTOS ---
  crearProyecto(proyecto) {
    const id = proyecto.id || crypto.randomUUID();

    return this.db.run(
      `INSERT INTO proyectos (
                id, nombre, descripcion, cliente, clasificacion, 
                direccion, fecha_inicio, fecha_fin, estado, presupuesto, 
                prioridad, etiquetas
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        proyecto.nombre,
        proyecto.descripcion || null,
        proyecto.cliente || null,
        proyecto.clasificacion || null,
        proyecto.direccion || null,
        proyecto.fecha_inicio || null,
        proyecto.fecha_fin || null,
        proyecto.estado || 'activo',
        proyecto.presupuesto || 0,
        proyecto.prioridad || 'media',
        proyecto.etiquetas ? JSON.stringify(proyecto.etiquetas) : null
      ]
    );
  }

  obtenerProyectos(filtros = {}) {
    let query = 'SELECT * FROM proyectos WHERE 1=1';
    const params = [];

    if (filtros.estado) {
      query += ' AND estado = ?';
      params.push(filtros.estado);
    }

    if (filtros.cliente) {
      query += ' AND cliente LIKE ?';
      params.push(`%${filtros.cliente}%`);
    }

    if (filtros.clasificacion) {
      query += ' AND clasificacion = ?';
      params.push(filtros.clasificacion);
    }

    query += ' ORDER BY actualizado_en DESC';

    if (filtros.limit) {
      query += ' LIMIT ?';
      params.push(filtros.limit);
    }

    return this.db.all(query, params);
  }

  obtenerProyectoPorId(id) {
    return this.db.get('SELECT * FROM proyectos WHERE id = ?', [id]);
  }

  actualizarProyecto(id, updates) {
    const campos = Object.keys(updates);
    const valores = Object.values(updates);

    const setClause = campos.map(c => `${c} = ?`).join(', ');

    return this.db.run(
      `UPDATE proyectos SET ${setClause}, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?`,
      [...valores, id]
    );
  }

  eliminarProyecto(id) {
    return this.db.run('DELETE FROM proyectos WHERE id = ?', [id]);
  }

  // --- TAREAS ---
  crearTarea(tarea) {
    const id = tarea.id || crypto.randomUUID();

    return this.db.run(
      `INSERT INTO tareas (
                id, proyecto_id, titulo, descripcion, prioridad, 
                estado, fecha_vencimiento, tiempo_estimado, etiquetas, asignado_a
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        tarea.proyecto_id,
        tarea.titulo,
        tarea.descripcion || null,
        tarea.prioridad || 'media',
        tarea.estado || 'pendiente',
        tarea.fecha_vencimiento || null,
        tarea.tiempo_estimado || 0,
        tarea.etiquetas ? JSON.stringify(tarea.etiquetas) : null,
        tarea.asignado_a || null
      ]
    );
  }

  obtenerTareas(filtros = {}) {
    let query = `
            SELECT t.*, p.nombre as proyecto_nombre 
            FROM tareas t 
            LEFT JOIN proyectos p ON t.proyecto_id = p.id 
            WHERE 1=1
        `;
    const params = [];

    if (filtros.proyecto_id) {
      query += ' AND t.proyecto_id = ?';
      params.push(filtros.proyecto_id);
    }

    if (filtros.estado) {
      query += ' AND t.estado = ?';
      params.push(filtros.estado);
    }

    if (filtros.prioridad) {
      query += ' AND t.prioridad = ?';
      params.push(filtros.prioridad);
    }

    query += ' ORDER BY t.actualizado_en DESC';

    return this.db.all(query, params);
  }

  // --- DOCUMENTOS ---
  agregarDocumento(doc) {
    const id = doc.id || crypto.randomUUID();

    return this.db.run(
      `INSERT INTO documentos (
                id, proyecto_id, nombre, tipo, ruta, tamanio, 
                hash, fecha_vencimiento, notas, etiquetas
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        doc.proyecto_id,
        doc.nombre,
        doc.tipo || null,
        doc.ruta,
        doc.tamanio || 0,
        doc.hash || null,
        doc.fecha_vencimiento || null,
        doc.notas || null,
        doc.etiquetas ? JSON.stringify(doc.etiquetas) : null
      ]
    );
  }

  obtenerDocumentos(proyectoId) {
    return this.db.all(
      'SELECT * FROM documentos WHERE proyecto_id = ? ORDER BY creado_en DESC',
      [proyectoId]
    );
  }

  // --- ALERTAS ---
  crearAlerta(alerta) {
    const id = alerta.id || crypto.randomUUID();

    return this.db.run(
      `INSERT INTO alertas (
                id, proyecto_id, tipo, titulo, mensaje, 
                prioridad, fecha_alerta
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        alerta.proyecto_id || null,
        alerta.tipo,
        alerta.titulo,
        alerta.mensaje || null,
        alerta.prioridad || 'media',
        alerta.fecha_alerta
      ]
    );
  }

  obtenerAlertasPendientes() {
    return this.db.all(`
            SELECT a.*, p.nombre as proyecto_nombre 
            FROM alertas a 
            LEFT JOIN proyectos p ON a.proyecto_id = p.id 
            WHERE a.estado = 'pendiente' AND a.leida = 0
            ORDER BY a.fecha_alerta ASC
        `);
  }

  // --- ACTIVIDAD RECIENTE ---
  obtenerActividadReciente(limite = 10) {
    const actividad = [];

    try {
      // Proyectos recientes
      const proyectos = this.db.all(
        'SELECT nombre, creado_en FROM proyectos ORDER BY creado_en DESC LIMIT 3'
      );
      proyectos.forEach(p => actividad.push({
        tipo: 'proyecto',
        titulo: `Nuevo proyecto: ${p.nombre}`,
        fecha: p.creado_en,
        icon: '📁'
      }));

      // Tareas recientes
      const tareas = this.db.all(
        'SELECT titulo, estado, creado_en FROM tareas ORDER BY creado_en DESC LIMIT 3'
      );
      tareas.forEach(t => actividad.push({
        tipo: 'tarea',
        titulo: `Tarea: ${t.titulo}`,
        fecha: t.creado_en,
        icon: '✅',
        estado: t.estado
      }));

      // Documentos recientes
      const docs = this.db.all(
        'SELECT nombre, creado_en FROM documentos ORDER BY creado_en DESC LIMIT 3'
      );
      docs.forEach(d => actividad.push({
        tipo: 'documento',
        titulo: `Documento: ${d.nombre}`,
        fecha: d.creado_en,
        icon: '📄'
      }));

      // Ordenar y limitar
      return actividad
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, limite);

    } catch (error) {
      logger.logError('obtenerActividadReciente', error);
      return [];
    }
  }

  // --- DATOS COMPLETOS DE PROYECTO ---
  obtenerDatosCompletosProyecto(id) {
    try {
      const proyecto = this.db.get('SELECT * FROM proyectos WHERE id = ?', [id]);
      if (!proyecto) return null;

      const tareas = this.db.all('SELECT * FROM tareas WHERE proyecto_id = ?', [id]);
      const documentos = this.db.all('SELECT * FROM documentos WHERE proyecto_id = ?', [id]);
      const alertas = this.db.all('SELECT * FROM alertas WHERE proyecto_id = ?', [id]);

      let registrosTiempo = [];
      try {
        registrosTiempo = this.db.all(
          'SELECT * FROM registro_tiempo WHERE proyecto_id = ?',
          [id]
        );
      } catch { }

      return {
        ...proyecto,
        tareas_asociadas: tareas || [],
        documentos_asociados: documentos || [],
        alertas_asociadas: alertas || [],
        registros_tiempo: registrosTiempo || []
      };
    } catch (error) {
      logger.logError('obtenerDatosCompletosProyecto', error);
      return null;
    }
  }

  // --- CHECKLISTS ---
  obtenerChecklist(id) {
    return this.db.get('SELECT * FROM checklists_auditoria WHERE id = ?', [id]);
  }

  obtenerItemsChecklist(checklistId) {
    return this.db.all(
      'SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY orden ASC',
      [checklistId]
    );
  }

  obtenerTodosChecklists() {
    return this.db.all(
      'SELECT * FROM checklists_auditoria ORDER BY fecha_auditoria DESC'
    );
  }

  // --- REGISTROS DE TIEMPO ---
  obtenerRegistrosTiempo(filtros = {}) {
    let query = 'SELECT * FROM registro_tiempo WHERE 1=1';
    const params = [];

    if (filtros.proyecto_id) {
      query += ' AND proyecto_id = ?';
      params.push(filtros.proyecto_id);
    }

    if (filtros.tarea_id) {
      query += ' AND tarea_id = ?';
      params.push(filtros.tarea_id);
    }

    query += ' ORDER BY fecha DESC';

    return this.db.all(query, params);
  }
}

// ==================== INICIALIZACIÓN ====================
let dbInstance = null;
let dbWrapper = null;
let repository = null;

async function initDatabase() {
  console.log('🔄 Inicializando base de datos (SQL.js)...');

  try {
    // Asegurar que el directorio existe
    await pathManager.ensureDirectoryExists();

    const dbPath = pathManager.getDatabasePath();

    // Cargar SQL.js
    const SQL = await initSqlJs();

    // Cargar base de datos existente o crear nueva
    let buffer = null;
    if (await fs.pathExists(dbPath)) {
      console.log(`📂 Cargando base de datos: ${dbPath}`);
      buffer = await fs.readFile(dbPath);
    } else {
      console.log('✨ Creando nueva base de datos');
    }

    // Crear instancia
    const db = new SQL.Database(buffer);
    dbInstance = new DatabaseAdapter(db, dbPath);

    // Crear esquema
    const schemaManager = new SchemaManager(dbInstance);
    schemaManager.createTables();

    // Guardar archivo inicial
    if (!await fs.pathExists(dbPath)) {
      await dbInstance.forceSave();
    }

    // Crear repositorio
    repository = new DataRepository(dbInstance);

    // Crear wrapper para compatibilidad
    dbWrapper = {
      get: (sql, params) => dbInstance.prepare(sql).get(params),
      all: (sql, params) => dbInstance.prepare(sql).all(params),
      run: (sql, params) => dbInstance.prepare(sql).run(params),
      exec: (sql) => dbInstance.exec(sql),
      prepare: (sql) => dbInstance.prepare(sql),
      transaction: (fn) => dbInstance.transaction(fn),
      close: () => dbInstance.close(),
      getStatistics: () => dbInstance.getStatistics()
    };

    console.log('✅ Base de datos inicializada correctamente');

    // Inicializar módulos secundarios
    await inicializarModulosSecundarios();

    return dbWrapper;

  } catch (error) {
    logger.logError('initDatabase', error);
    throw new Error(`Error crítico inicializando base de datos: ${error.message}`);
  }
}

async function inicializarModulosSecundarios() {
  try {
    const MarcoJuridicoUpdater = require('./marco-juridico-updater');
    module.exports.marcoJuridicoUpdater = new MarcoJuridicoUpdater(module.exports);

    const FileOrganizer = require('./file-organizer');
    module.exports.fileOrganizer = new FileOrganizer(module.exports);

    const LearningSystem = require('./learning-system');
    module.exports.learningSystem = new LearningSystem(module.exports);

    console.log('✅ Módulos secundarios inicializados');
  } catch (error) {
    console.warn('⚠️ Módulos secundarios no disponibles:', error.message);
  }
}

// ==================== EXPORTS ====================
module.exports = {
  // Configuración
  setDatabasePath: (path) => pathManager.setDatabasePath(path),
  initDatabase,

  // Acceso a instancias
  get db() { return dbWrapper; },
  get repository() { return repository; },
  get logger() { return logger; },

  // Módulos secundarios (se inicializan después)
  marcoJuridicoUpdater: null,
  fileOrganizer: null,
  learningSystem: null,

  // Métodos de repositorio (compatibilidad con código anterior)
  crearProyecto: (p) => repository?.crearProyecto(p),
  obtenerProyectos: (f) => repository?.obtenerProyectos(f) || [],
  obtenerProyectoPorId: (id) => repository?.obtenerProyectoPorId(id),
  actualizarProyecto: (id, u) => repository?.actualizarProyecto(id, u),
  eliminarProyecto: (id) => repository?.eliminarProyecto(id),

  crearTarea: (t) => repository?.crearTarea(t),
  obtenerTareas: (f) => repository?.obtenerTareas(f) || [],

  agregarDocumento: (d) => repository?.agregarDocumento(d),
  obtenerDocumentos: (pid) => repository?.obtenerDocumentos(pid) || [],

  crearAlerta: (a) => repository?.crearAlerta(a),
  obtenerAlertasPendientes: () => repository?.obtenerAlertasPendientes() || [],

  obtenerRegistrosTiempo: (f) => repository?.obtenerRegistrosTiempo(f) || [],

  obtenerChecklist: (id) => repository?.obtenerChecklist(id),
  obtenerItemsChecklist: (cid) => repository?.obtenerItemsChecklist(cid) || [],
  obtenerTodosChecklists: () => repository?.obtenerTodosChecklists() || [],

  obtenerActividadReciente: (l) => repository?.obtenerActividadReciente(l) || [],
  obtenerDatosCompletosProyecto: (id) => repository?.obtenerDatosCompletosProyecto(id),

  // Utilidades
  getStatistics: () => ({
    database: dbInstance?.getStatistics() || {},
    logger: logger.getStatistics()
  }),

  // Explicitly export path accessor for BackupManager compatibility
  getDatabasePath: () => pathManager.getDatabasePath()
};
