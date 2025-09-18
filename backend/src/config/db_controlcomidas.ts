// src/config/db_controlcomidas.ts
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Función para crear la conexión con la base de datos
// Retorna una conexión individual, la que se usará para transacciones.
export const getConnection = async (tipo: 'local' | 'nube' = 'nube') => {  
  let pool;

  // La conexión a AWS está deshabilitada temporalmente.
  /*
  if (tipo === 'nube') {
    try {
      pool = mysql.createPool({
        host: process.env.DB_HOST,       // Variables de AWS
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: Number(process.env.DB_PORT),
      });
      await pool.query('SELECT 1');
      console.log('Conectado a la base de datos de AWS');
    } catch (error) {
      console.error('No se pudo conectar a AWS, intentando conexión local...');
    }
  }
  */

  // Se fuerza la conexión local
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST_LOCALPL,
      user: process.env.DB_USER_LOCALPL,
      password: process.env.DB_PASSWORD_LOCALPL,
      database: process.env.DB_NAMEPL,
      port: Number(process.env.DB_PORT_LOCALPL),
    });
    await pool.query('SELECT 1');
    console.log('Conectado a la base de datos local');
  } catch (localError) {
    console.error('No se pudo conectar a la base de datos local:', localError);
    throw new Error('No se pudo establecer conexión con la base de datos local.');
  }

  // Retorna una conexión individual para poder utilizar transacciones.
  return pool.getConnection();
};
