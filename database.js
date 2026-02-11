const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Configuración de rutas
const isPackaged = app && app.isPackaged;
let dbPath;

function setDatabasePath(customPath) {
  dbPath = customPath;
  console.log(`📂 Database Path configurado: ${dbPath}`);
}

function getDefaultDatabasePath() {
  const dataPath = isPackaged
    ? path.join(app.getPath('userData'), 'data')
    : path.join(__dirname, 'data');
  return path.join(dataPath, 'database.db');
}

// Variables globales para la conexión
let dbInstance = null;
let SQL = null;

// ==================== ADAPTADOR SQL.JS ====================
// Simula la API de better-sqlite3 para el resto de la app
class DatabaseAdapter {
  constructor(db, filePath) {
    this.db = db;
    this.filePath = filePath;
    this.pendingSave = null;
    this.isDirty = false;
  }

  // Guardar cambios en disco con Debounce (Optimización I/O)
  save() {
    this.isDirty = true;
    if (this.pendingSave) return;

    // Guardar máx una vez cada 2 segundos o al cerrar
    this.pendingSave = setTimeout(() => {
      this.forceSave();
    }, 2000);
  }

  forceSave() {
    if (!this.isDirty) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.filePath, buffer);
      this.isDirty = false;
      this.pendingSave = null;
      // console.log('💾 BD Sincronizada');
    } catch (e) {
      console.error('❌ Error guardando BD:', e);
    }
  }

  prepare(sql) {
    const stmt = this.db.prepare(sql);
    const adapter = this;

    return {
      run: function (params = []) {
        // Convertir params a formato sql.js (array o object)
        stmt.bind(Array.isArray(params) ? params : [params]);
        stmt.step();
        stmt.free(); // Liberar memoria del statement
        adapter.save(); // Programar guardado
        return { changes: this.db.getRowsModified() || 1, lastInsertRowid: -1 };
      }.bind({ db: this.db }),

      get: function (params = []) {
        stmt.bind(Array.isArray(params) ? params : [params]);
        let result = undefined;
        if (stmt.step()) {
          result = stmt.getAsObject();
        }
        stmt.free();
        return result;
      },

      all: function (params = []) {
        stmt.bind(Array.isArray(params) ? params : [params]);
        const results = [];
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      }
    };
  }

  exec(sql) {
    this.db.run(sql);
    this.save();
  }

  // Transacciones simuladas 
  transaction(fn) {
    return (...args) => {
      // No implementamos transacciones reales en sql.js simple, 
      // solo ejecutamos la función
      const result = fn(...args);
      this.save();
      return result;
    };
  }

  pragma(sql) {
    // Ignorar pragmas o ejecutarlos si son compatibles
    try {
      this.db.run('PRAGMA ' + sql);
    } catch (e) { }
  }
}

// ==================== INICIALIZACIÓN ====================
let dbWrapper = null;

async function initDatabase() {
  console.log('🔄 Inicializando base de datos (SQL.js Pure JS)...');

  if (!dbPath) {
    dbPath = getDefaultDatabasePath();
  }

  const dataPath = path.dirname(dbPath);
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }

  // Cargar WASM/JS
  SQL = await initSqlJs();

  let buffer = null;
  if (fs.existsSync(dbPath)) {
    console.log(`📂 Cargando base de datos existente: ${dbPath}`);
    buffer = fs.readFileSync(dbPath);
  } else {
    console.log('✨ Creando nueva base de datos vacía');
  }

  // Crear instancia
  const db = new SQL.Database(buffer);
  dbInstance = new DatabaseAdapter(db, dbPath);

  // Guardar inicial para crear el archivo si no existe
  if (!fs.existsSync(dbPath)) {
    dbInstance.save();
  }

  // Crear tablas
  crearTablas(dbInstance);

  // Configurar wrapper global
  dbWrapper = {
    get: (...args) => dbInstance.prepare(args[0]).get(args.slice(1)),
    all: (...args) => dbInstance.prepare(args[0]).all(args.slice(1)),
    run: (...args) => dbInstance.prepare(args[0]).run(args.slice(1)),
    exec: (...args) => dbInstance.exec(args[0]),
    prepare: (...args) => dbInstance.prepare(...args),
    transaction: (fn) => dbInstance.transaction(fn)
  };

  console.log('✅ Base de datos Pure-JS lista y configurada');

  // Inicializar módulos secundarios
  inicializarModulosSecundarios();
}

function creatingTable(db, sql) {
  db.exec(sql);
}

function crearTablas(db) {
  // Tabla de Proyectos
  db.exec(`
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
      presupuesto REAL,
      creado_en TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Tabla de Tareas
  db.exec(`
    CREATE TABLE IF NOT EXISTS tareas (
      id TEXT PRIMARY KEY,
      proyecto_id TEXT,
      titulo TEXT NOT NULL,
      descripcion TEXT,
      prioridad TEXT DEFAULT 'media',
      estado TEXT DEFAULT 'pendiente',
      fecha_vencimiento TEXT,
      tiempo_estimado INTEGER,
      tiempo_real INTEGER DEFAULT 0,
      etiquetas TEXT,
      creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
      completado_en TEXT,
      FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE
    );
  `);

  // Tabla de Registro de Tiempo
  db.exec(`
    CREATE TABLE IF NOT EXISTS registro_tiempo (
      id TEXT PRIMARY KEY,
      tarea_id TEXT NOT NULL,
      proyecto_id TEXT,
      descripcion TEXT,
      tiempo_minutos INTEGER NOT NULL,
      fecha TEXT NOT NULL,
      hora_inicio TEXT,
      hora_fin TEXT,
      creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tarea_id) REFERENCES tareas(id) ON DELETE CASCADE,
      FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE
    );
  `);

  // Tabla de Documentos
  db.exec(`
    CREATE TABLE IF NOT EXISTS documentos (
      id TEXT PRIMARY KEY,
      proyecto_id TEXT NOT NULL,
      nombre TEXT NOT NULL,
      tipo TEXT,
      ruta TEXT NOT NULL,
      tamanio INTEGER,
      fecha_vencimiento TEXT,
      notas TEXT,
      creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE
    );
  `);

  // Tabla de Alertas
  db.exec(`
    CREATE TABLE IF NOT EXISTS alertas (
      id TEXT PRIMARY KEY,
      proyecto_id TEXT,
      tipo TEXT NOT NULL,
      titulo TEXT NOT NULL,
      mensaje TEXT,
      fecha_alerta TEXT NOT NULL,
      estado TEXT DEFAULT 'pendiente',
      creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE
    );
  `);

  // Checklists
  db.exec(`
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
      observaciones TEXT,
      plan_accion TEXT,
      fecha_proxima_revision TEXT,
      creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
      actualizado_en TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
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
      orden INTEGER,
      creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (checklist_id) REFERENCES checklists_auditoria(id) ON DELETE CASCADE
    );
  `);
}

function inicializarModulosSecundarios() {
  try {
    // Enlazar referencias circulares para que los módulos tengan acceso a la DB
    const MarcoJuridicoUpdater = require('./marco-juridico-updater');
    module.exports.marcoJuridicoUpdater = new MarcoJuridicoUpdater(module.exports);

    const FileOrganizer = require('./file-organizer');
    module.exports.fileOrganizer = new FileOrganizer(module.exports);

    const LearningSystem = require('./learning-system');
    module.exports.learningSystem = new LearningSystem(module.exports);
  } catch (e) {
    console.warn('⚠️ Módulos secundarios (opcionales) no cargados:', e.message);
  }
}

// ==================== EXPORTS ====================

module.exports = {
  setDatabasePath,
  initDatabase,
  // Getter dinámico para que dbWrapper esté disponible cuando se inicialice
  get db() { return dbWrapper; },

  // Módulos
  marcoJuridicoUpdater: null,
  fileOrganizer: null,
  learningSystem: null,

  // Métodos Helper (compatibilidad)
  crearProyecto: (p) => dbWrapper.run(
    'INSERT INTO proyectos (id, nombre, descripcion, cliente, clasificacion, direccion, fecha_inicio, fecha_fin, estado, presupuesto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [p.id, p.nombre, p.descripcion, p.cliente, p.clasificacion, p.direccion, p.fecha_inicio, p.fecha_fin, p.estado, p.presupuesto]
  ),
  obtenerProyectos: async (f = {}) => {
    let q = 'SELECT * FROM proyectos WHERE 1=1';
    let p = [];
    if (f.estado) { q += ' AND estado = ?'; p.push(f.estado); }
    // sql.js all devuelve array directo
    return dbWrapper.all(q + ' ORDER BY creado_en DESC', p);
  },
  obtenerProyectoPorId: (id) => dbWrapper.get('SELECT * FROM proyectos WHERE id = ?', [id]),

  crearTarea: (t) => dbWrapper.run(
    'INSERT INTO tareas (id, proyecto_id, titulo, descripcion, prioridad, estado, fecha_vencimiento, tiempo_estimado, etiquetas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [t.id, t.proyecto_id, t.titulo, t.descripcion, t.prioridad, t.estado, t.fecha_vencimiento, t.tiempo_estimado, t.etiquetas ? JSON.stringify(t.etiquetas) : null]
  ),
  obtenerTareas: (f = {}) => {
    let q = 'SELECT t.*, p.nombre as proyecto_nombre FROM tareas t LEFT JOIN proyectos p ON t.proyecto_id = p.id WHERE 1=1';
    let p = [];
    if (f.proyecto_id) { q += ' AND t.proyecto_id = ?'; p.push(f.proyecto_id); }
    return dbWrapper.all(q + ' ORDER BY t.creado_en DESC', p);
  },

  agregarDocumento: (d) => dbWrapper.run(
    'INSERT INTO documentos (id, proyecto_id, nombre, tipo, ruta, tamanio, fecha_vencimiento, notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [d.id, d.proyecto_id, d.nombre, d.tipo, d.ruta, d.tamanio, d.fecha_vencimiento, d.notas]
  ),
  obtenerDocumentos: (pid) => dbWrapper.all('SELECT * FROM documentos WHERE proyecto_id = ? ORDER BY creado_en DESC', [pid]),

  crearAlerta: (a) => dbWrapper.run(
    'INSERT INTO alertas (id, proyecto_id, tipo, titulo, mensaje, fecha_alerta) VALUES (?, ?, ?, ?, ?, ?)',
    [a.id, a.proyecto_id, a.tipo, a.titulo, a.mensaje, a.fecha_alerta]
  ),
  obtenerAlertasPendientes: () => dbWrapper.all("SELECT a.*, p.nombre as proyecto_nombre FROM alertas a LEFT JOIN proyectos p ON a.proyecto_id = p.id WHERE a.estado = 'pendiente' ORDER BY a.fecha_alerta ASC"),

  obtenerRegistrosTiempo: (f = {}) => {
    let q = 'SELECT * FROM registro_tiempo WHERE 1=1';
    let p = [];
    if (f.proyecto_id) { q += ' AND proyecto_id = ?'; p.push(f.proyecto_id); }
    return dbWrapper.all(q, p);
  },

  obtenerChecklist: (id) => dbWrapper.get('SELECT * FROM checklists_auditoria WHERE id = ?', [id]),
  obtenerItemsChecklist: (cid) => dbWrapper.all('SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY orden ASC', [cid]),
  obtenerTodosChecklists: () => dbWrapper.all('SELECT * FROM checklists_auditoria ORDER BY fecha_auditoria DESC'),

  // Agregador de actividad real para Dashboard
  obtenerActividadReciente: () => {
    const actividad = [];

    // 1. Proyectos recientes
    const proyectos = dbWrapper.all("SELECT nombre, creado_en FROM proyectos ORDER BY creado_en DESC LIMIT 3");
    proyectos.forEach(p => actividad.push({
      tipo: 'proyecto',
      titulo: `Nuevo proyecto: ${p.nombre}`,
      fecha: p.creado_en,
      icon: '📁'
    }));

    // 2. Tareas recientes
    const tareas = dbWrapper.all("SELECT titulo, estado, creado_en FROM tareas ORDER BY creado_en DESC LIMIT 3");
    tareas.forEach(t => actividad.push({
      tipo: 'tarea',
      titulo: `Tarea creada: ${t.titulo}`,
      fecha: t.creado_en,
      icon: '✅'
    }));

    // 3. Documentos recientes
    const docs = dbWrapper.all("SELECT nombre, creado_en FROM documentos ORDER BY creado_en DESC LIMIT 3");
    docs.forEach(d => actividad.push({
      tipo: 'documento',
      titulo: `Documento subido: ${d.nombre}`,
      fecha: d.creado_en,
      icon: '📄'
    }));

    // Ordenar por fecha y tomar los ultimos 5
    return actividad.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 5);
  },

  // Obtener TODOS los datos de un proyecto para el reporte
  obtenerDatosCompletosProyecto: (id) => {
    const proyecto = dbWrapper.get("SELECT * FROM proyectos WHERE id = ?", [id]);
    if (!proyecto) return null;

    // Obtener tareas
    const tareas = dbWrapper.all("SELECT * FROM tareas WHERE proyecto_id = ?", [id]);

    // Obtener documentos
    const documentos = dbWrapper.all("SELECT * FROM documentos WHERE proyecto_id = ?", [id]);

    // Obtener tiempos (si existe la tabla)
    let tiempos = [];
    try { tiempos = dbWrapper.all("SELECT * FROM registro_tiempo WHERE proyecto_id = ?", [id]); } catch (e) { }

    return {
      ...proyecto,
      tareas_asociadas: tareas || [],
      documentos_asociados: documentos || [],
      registros_tiempo: tiempos || []
    };
  }
};
