import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getPool, checkPool } from './src/config/db_controlcomidas';
import axios from 'axios';
import { startMaintenanceJobs } from './src/scripts/maintenance/cleanupJobs';

// rutas control_comidas
import empleadosRoutes from './src/routes/empleados/empleadosRoutes';
import empresasRoutes from './src/routes/empresas/empresasRoutes';
import asistenciasRoutes from './src/routes/reportes/asistenciasRoutes';
import usuariosRoutes from './src/routes/usuarios_plataforma/usuariosRoutes';
import reportesRoutes from './src/routes/reportes/reportesRoutes';
import authRoutescontrolcomidas from './src/routes/loggin/authRoutescontrolcomidas';
import inventarioRoutes from './src/routes/inventario/inventarioRoutes';
import chipsRoutes from './src/routes/inventario/chipsRoutes';
import monederosRoutes from './src/routes/recargas/monederosRoutes';
import recargasRoutes from './src/routes/recargas/recargasRoutes';
import metodosPagoRoutes from './src/routes/metodo_pago/metodosPagoRoutes';
import familiasProductosRoutes from './src/routes/productos/familiasProductosRoutes';
import productosRoutes from './src/routes/productos/productosRoutes';
import categoriasArticulosRoutes from './src/routes/productos/categoriasArticulosRoutes';
import subsidiosRoutes from './src/routes/productos/subsidiosRoutes';
import subsidiosUtilizadosRoutes from './src/routes/productos/subsidiosUtilizadosRoutes';
import ventasPDVRoutes from './src/routes/ventas/ventasPDVRoutes';
import detalleVentaRoutes from './src/routes/ventas/detalleVentaRoutes';
import transaccionesRoutes from './src/routes/ventas/transaccionesRoutes';
import pagosRoutes from './src/routes/ventas/pagosRoutes';
import rolesRoutes from './src/routes/usuarios_plataforma/roles';
import perfilesroutes from './src/routes/usuarios_plataforma/perfiles';
import usuarioRolesRoutes from './src/routes/usuarios_plataforma/usuarioRolesRoutes';
import usuarioPerfilRoutes from './src/routes/usuarios_plataforma/usuarioPerfilRoutes';
import importsRoutes from './src/routes/imports/importsRoutes';
import impuestosRoutes from './src/routes/ventas/impuestosRoutes';
import nipRoutes from './src/routes/ventas/nipRoutes';
import previewRoutes from './src/routes/ventas/previewRoutes';
import ventaAutoRoutes from './src/routes/ventas/ventaAutoRouutes';
import ubicacionesRoutes from './src/routes/empresas/ubicacionesRoutes';
import usuarioUbicacionesRoutes from './src/routes/usuarios_plataforma/usuario_ubicacion/usuarioUbicacionesRoutes';
import puntosVentaRoutes from './src/routes/empresas/dispositivos/puntosVentaRoutes';
import sesionesRoutes from './src/routes/sesiones/sesionesRoutes';
import tiposPuntoVentaRoutes from './src/routes/empresas/tipo_dispositivos/tiposPuntoVentaRoutes';
import permisosRoutes from './src/routes/permisos/permisosRoutes';
import rolPermisosRoutes from './src/routes/permisos/rolPermisosRoutes';
import modulosFrontendRoutes from './src/routes/permisos/modulosFrontendRoutes';
import perfilModulosRoutes from './src/routes/permisos/perfilModulosRoutes';


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

// Verificación de la conexión a la base de datos usando el pool singleton
async function checkDatabaseConnection() {
  try {
    // Forzar inicialización del pool local y verificar
    getPool('local');
    await checkPool('local'); // realiza SELECT 1 desde el pool
    console.log('Conexión a la base de datos exitosa (pool)');
  } catch (error) {
    console.error('Fallo al conectar a la base de datos (pool):', error);
    throw error;
  }
}

// Inicializar DB y luego los jobs de mantenimiento; no duplicar startMaintenanceJobs
checkDatabaseConnection()
  .then(() => {
    startMaintenanceJobs();
  })
  .catch((err) => {
    console.error('Error inicializando DB o maintenance jobs', err);
    // opcional: process.exit(1);
  });

// Rutas
app.use('/api', empleadosRoutes);
app.use('/api', empresasRoutes);
app.use('/api', asistenciasRoutes);
app.use('/api', usuariosRoutes);
app.use('/api', reportesRoutes);
app.use('/api', authRoutescontrolcomidas);

app.use('/api', monederosRoutes);
app.use('/api', recargasRoutes);
app.use('/api', metodosPagoRoutes);
app.use('/api', familiasProductosRoutes);
app.use('/api', productosRoutes);
app.use('/api', categoriasArticulosRoutes);
app.use('/api', subsidiosRoutes);
app.use('/api', subsidiosUtilizadosRoutes);
app.use('/api', ventasPDVRoutes);
app.use('/api', detalleVentaRoutes);
app.use('/api', transaccionesRoutes);
app.use('/api', pagosRoutes);
app.use('/api', rolesRoutes);
app.use('/api', perfilesroutes);
app.use('/api', usuarioRolesRoutes);
app.use('/api', usuarioPerfilRoutes);
app.use('/api/imports', importsRoutes);
app.use('/api/impuestos', impuestosRoutes);
app.use('/api', nipRoutes);
app.use('/api', previewRoutes);
app.use('/api', ventaAutoRoutes);
app.use('/api', ubicacionesRoutes);
app.use('/api', usuarioUbicacionesRoutes);
app.use('/api', puntosVentaRoutes);
app.use('/api', sesionesRoutes);
app.use('/api', tiposPuntoVentaRoutes);
app.use('/api', permisosRoutes);
app.use('/api', rolPermisosRoutes);
app.use('/api', modulosFrontendRoutes);
app.use('/api', perfilModulosRoutes);

app.use('/api', inventarioRoutes);
app.use('/api', chipsRoutes);

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log("JWT_SECRET cargado:", process.env.JWT_SECRET || 'No configurado');
});
