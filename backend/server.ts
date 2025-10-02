import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import axios from 'axios';

//rutas control_comidas
import empleadosRoutes from './src/routes/empleadosRoutes';
import empresasRoutes from './src/routes/empresasRoutes';
import asistenciasRoutes from './src/routes/asistenciasRoutes'; // Importamos las rutas de asistencias
import usuariosRoutes from './src/routes/usuarios_plataforma/usuariosRoutes'; // Importamos las rutas de usuarios
import reportesRoutes from './src/routes/reportesRoutes'; // Importamos las rutas de reportes
import authRoutescontrolcomidas from './src/routes/authRoutescontrolcomidas';
import inventarioRoutes from './src/routes/inventario/inventarioRoutes';
import chipsRoutes from './src/routes/inventario/chipsRoutes';
import monederosRoutes from './src/routes/recargas/monederosRoutes';
import recargasRoutes from './src/routes/recargas/recargasRoutes';
import metodosPagoRoutes from './src/routes/metodo_pago/metodosPagoRoutes';
import familiasProductosRoutes from './src/routes/productos/familiasProductosRoutes'; // Nueva ruta
import productosRoutes from './src/routes/productos/productosRoutes';
import categoriasArticulosRoutes from './src/routes/productos/categoriasArticulosRoutes';  // NUEVA RUTA
import subsidiosRoutes from './src/routes/productos/subsidiosRoutes';
import subsidiosUtilizadosRoutes from './src/routes/productos/subsidiosUtilizadosRoutes';
import ventasPDVRoutes from './src/routes/ventas/ventasPDVRoutes';
import detalleVentaRoutes from './src/routes/ventas/detalleVentaRoutes';
import transaccionesRoutes from './src/routes/ventas/transaccionesRoutes';
import pagosRoutes from './src/routes/ventas/pagosRoutes';
import rolesRoutes from './src/routes/usuarios_plataforma/roles';
import perfilesroutes from './src/routes/usuarios_plataforma/perfiles';
import usuarioRolesRoutes from './src/routes/usuarios_plataforma/usuarioRolesRoutes'
import usuarioPerfilRoutes from './src/routes/usuarios_plataforma/usuarioPerfilRoutes'
import importsRoutes from './src/routes/imports/importsRoutes';
import impuestosRoutes from './src/routes/ventas/impuestosRoutes';

dotenv.config();

// Inicializa `app`
const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de CORS
app.use(cors({
  origin: 'http://localhost:4200'
}));

// Middlewares
app.use(express.json());

// Configuración de conexión a la base de datos
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
};

// Verificación de la conexión a la base de datos
async function checkDatabaseConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.query('SELECT 1'); // Verifica la conexión
    console.log('Conexión a la base de datos exitosa');
    await connection.end();
  } catch (error) {
    console.error('Fallo al conectar a la base de datos:', error);
  }
}

// Ejecuta la verificación de conexión
checkDatabaseConnection();
// Usar las rutas
//rutas control_comidas
app.use('/api', empleadosRoutes);
app.use('/api', empresasRoutes); // Incluye las rutas de empresas
app.use('/api', asistenciasRoutes); // Añadimos las rutas de asistencias
app.use('/api', usuariosRoutes); // Añadimos las rutas de usuarios
app.use('/api', reportesRoutes); // Añadimos las rutas de reportes
app.use('/api', authRoutescontrolcomidas);

app.use('/api', monederosRoutes);
app.use('/api', recargasRoutes);
app.use('/api', metodosPagoRoutes);
app.use('/api', familiasProductosRoutes); // Agregada
app.use('/api', productosRoutes);
app.use('/api', categoriasArticulosRoutes);  // Se agrega aquí
app.use('/api', subsidiosRoutes);
app.use('/api', subsidiosUtilizadosRoutes);
app.use('/api', ventasPDVRoutes);
app.use('/api', detalleVentaRoutes);
app.use('/api', transaccionesRoutes);  // <- NUEVA RUTA
app.use('/api', pagosRoutes);
app.use('/api', rolesRoutes);
app.use('/api', perfilesroutes);
app.use('/api', usuarioRolesRoutes);
app.use('/api', usuarioPerfilRoutes)
app.use('/api/imports', importsRoutes);
app.use('/api/impuestos', impuestosRoutes);

app.use('/api', inventarioRoutes);
app.use('/api', chipsRoutes);

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log("JWT_SECRET cargado:", process.env.JWT_SECRET || 'No configurado');
});