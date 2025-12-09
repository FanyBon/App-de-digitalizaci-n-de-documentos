import mysql, { PoolConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const LOCAL = 'local';
const NUBE = 'nube';

// Pools singleton
const poolLocal = mysql.createPool({
  host: process.env.DB_HOST_LOCALPL,
  user: process.env.DB_USER_LOCALPL,
  password: process.env.DB_PASSWORD_LOCALPL,
  database: process.env.DB_NAMEPL,
  port: Number(process.env.DB_PORT_LOCALPL) || 3306,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_LIMIT_LOCAL ?? 20),
  queueLimit: 0,
  timezone: '-06:00'
});

const poolNube = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_LIMIT_NUBE ?? 10),
  queueLimit: 0,
  timezone: '-06:00'
});

// Instrumentación temporal para detectar leaks
let activeConns = 0;

function instrumentConn(conn: PoolConnection) {
  const origRelease = conn.release.bind(conn);
  activeConns++;
  // Captura la pila después de incrementar el contador para identificar el origen
  const stack = new Error().stack?.split('\n').slice(2, 9).join('\n') || '';
  console.log('DB activeConns ++', activeConns, '\nSTACK:\n', stack);

  conn.release = () => {
    try {
      return origRelease();
    } finally {
      activeConns--;
      console.log('DB activeConns --', activeConns);
    }
  };

  return conn;
}

// Exportar acceso al pool (para operaciones sencillas pool.query)
export const getPool = (tipo: 'local' | 'nube' = LOCAL) => (tipo === NUBE ? poolNube : poolLocal);

// Devuelve una conexión del pool; debe liberarse con conn.release() en finally
export const getConnection = async (tipo: 'local' | 'nube' = LOCAL) => {
  const pool = getPool(tipo);
  const conn = await pool.getConnection();
  return instrumentConn(conn);
};

// Utilitario de salud
export const checkPool = async (tipo: 'local' | 'nube' = LOCAL) => {
  const pool = getPool(tipo);
  return pool.query('SELECT 1');
};
