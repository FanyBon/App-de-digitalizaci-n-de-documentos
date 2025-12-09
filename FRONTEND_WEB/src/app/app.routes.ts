// app.routes.ts
import { importProvidersFrom } from '@angular/core';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Importación de componentes generales
import { CuentaComponent } from './components/cuenta/cuenta.component';
import { AjustesComponent } from './components/ajustes/ajustes.component';
import { CerrarSesionComponent } from './components/cerrar-sesion/cerrar-sesion.component';
import { NotificacionesComponent } from './components/notificaciones/notificaciones.component';
import { LoginComponent } from './components/login/login.component';
import { ConsultaSaldoComponent } from './components/consulta-saldo/consulta-saldo.component';
import { SessionSetupGuard } from './guards/session-setup.guard';
import { ConfiguracionComponent } from './components/configuracion/configuracion.component';
import { UbicacionesComponent } from './components/configuracion/ubicaciones/ubicaciones.component';
import { DispositivosComponent } from './components/configuracion/dispositivos/dispositivos.component';

// ⭐ Componentes de session setup
import { SeleccionUbicacionComponent } from './components/session-setup/seleccion-ubicacion/seleccion-ubicacion.component';
import { SeleccionPdvComponent } from './components/session-setup/seleccion-pdv/seleccion-pdv.component';
import { PermisosComponent } from './components/configuracion/permisos/permisos.component';

// ⭐ NUEVO: Componente Sin Permisos
import { SinPermisosComponent } from './components/sin-permisos/sin-permisos.component';

// Componentes de PROCOMIN
import { CrudUsuariosComponent } from './modulos/procomin/crud-usuarios/crud-usuarios.component';
import { CrudPerfilesComponent } from './modulos/procomin/crud-perfiles/crud-perfiles.component';
import { RolesPerfilesComponent } from './modulos/procomin/roles-perfiles/roles-perfiles.component';
import { UsuariosComponentt } from './components/configuracion/usuarios/usuarios.component';


// Componentes de COMEDORES
import { ControlComidasComponent } from './modulos/procomin/comedores/control-comidas/control-comidas.component';
import { UsuariosComponent } from './modulos/procomin/comedores/usuarios/usuarios.component';
import { EmpresasComponent } from './modulos/procomin/comedores/empresas/empresas.component';
import { EmpleadosComponent } from './modulos/procomin/comedores/empleados/empleados.component';
import { AsistenciasComponent } from './modulos/procomin/comedores/asistencias/asistencias.component';
import { LoginControlComidasComponent } from './modulos/procomin/comedores/logincontrolcomidas/login.component';
import { ImprecionTarjetasComponent } from './modulos/procomin/comedores/imprecion-tarjetas/imprecion-tarjetas.component';
import { ReporteComidasComponent } from './modulos/procomin/comedores/reporte-comidas/reporte-comidas.component';
import { ImportEmpleadosComponent } from './modulos/procomin/import-empleados/import-empleados.component';
import { EmpleadosComponent as EmpleadosConfiguracionComponent } from './components/configuracion/empleados/empleados.component';

// Componentes de PDV
import { DetalleVentaComponent } from './modulos/pdv/detalle-venta/detalle-venta.component';
import { ProductosComponent } from './modulos/pdv/productos/productos.component';
import { ConfiguracionImpresoraComponent } from './modulos/pdv/configuracion-impresora/configuracion-impresora.component';
import { ClientesComponent } from './modulos/pdv/clientes/clientes.component';
import { VentaComponent } from './modulos/pdv/venta/venta.component';
import { VentaAutomaticaComponent } from './modulos/pdv/venta-automatica/venta-automatica.component';

// Guards e Interceptors
import { AuthGuard } from './guards/auth.guard';
import { ModulosGuard } from './guards/modulos.guard';
import { AuthInterceptor } from './interceptors/auth.interceptor';

// Bootstrap
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { Routes, provideRouter, withHashLocation } from '@angular/router';

export const routes: Routes = [
  // 🔁 Redirección root
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  // ==========================================
  // 🌐 RUTAS PÚBLICAS (sin layout, sin guards)
  // ==========================================
  { 
    path: 'login', 
    component: LoginComponent, 
    data: { showLayout: false } 
  },
  {
    path: 'consulta-saldo',
    loadComponent: () => import('./components/consulta-saldo/consulta-saldo.component')
      .then(m => m.ConsultaSaldoComponent),
    data: { showLayout: false }
  },
  // ⭐ NUEVO: Página de sin permisos
  {
    path: 'sin-permisos',
    component: SinPermisosComponent,
    data: { showLayout: false }
  },

  // ==========================================
  // ⭐ RUTAS DE SETUP (requieren token pero NO módulos)
  // ==========================================
  { 
    path: 'seleccion-ubicacion', 
    component: SeleccionUbicacionComponent,
    canActivate: [AuthGuard],
    data: { showLayout: false }
  },
  { 
    path: 'seleccion-pdv', 
    component: SeleccionPdvComponent,
    canActivate: [AuthGuard, SessionSetupGuard],
    data: { showLayout: false }
  },

  // ==========================================
  // 🔐 RUTAS PROTEGIDAS (con layout completo)
  // AuthGuard: verifica token
  // ModulosGuard: verifica permisos de módulos
  // ==========================================
  {
    path: '',
    canActivateChild: [AuthGuard, ModulosGuard],
    children: [
      // ==========================================
      // RUTAS GENERALES
      // ==========================================
      { path: 'cuenta', component: CuentaComponent },
      { path: 'ajustes', component: AjustesComponent },
      { path: 'cerrar-sesion', component: CerrarSesionComponent },
      { path: 'notificaciones', component: NotificacionesComponent },

      // ==========================================
      // CONFIGURACIÓN
      // ==========================================
      { path: 'configuracion', component: ConfiguracionComponent },
      { path: 'configuracion/ubicaciones', component: UbicacionesComponent },
      { path: 'configuracion/dispositivos', component: DispositivosComponent },
      { path: 'configuracion/permisos', component: PermisosComponent },
      {path: 'configuracion/usuarios', component: UsuariosComponentt },
      { path: 'configuracion/empleados', component: EmpleadosConfiguracionComponent },


      // ==========================================
      // PROCOMIN / SISTEMAS
      // ==========================================
      { path: 'procomin/crud-usuarios', component: CrudUsuariosComponent },
      { path: 'procomin/crud-perfiles', component: CrudPerfilesComponent },
      { path: 'procomin/roles-perfiles', component: RolesPerfilesComponent },

      // ==========================================
      // COMEDORES
      // ==========================================
      { path: 'comedores/control-comidas', component: ControlComidasComponent },
      { path: 'comedores/usuarios', component: UsuariosComponent },
      { path: 'comedores/empresas', component: EmpresasComponent },
      { path: 'comedores/empleados', component: EmpleadosComponent },
      { path: 'comedores/asistencias', component: AsistenciasComponent },
      { path: 'comedores/logincontrolcomidas', component: LoginControlComidasComponent },
      { path: 'comedores/imprecion-tarjetas', component: ImprecionTarjetasComponent },
      { path: 'comedores/reporte-comidas', component: ReporteComidasComponent },
      { path: 'comedores/importar-empleados', component: ImportEmpleadosComponent },

      // ==========================================
      // PDV
      // ==========================================
      { path: 'pdv/venta', component: VentaComponent },
      { path: 'pdv/venta-automatica', component: VentaAutomaticaComponent },
      { path: 'pdv/clientes', component: ClientesComponent },
      { path: 'pdv/informe-ventas', component: DetalleVentaComponent },
      { path: 'pdv/productos', component: ProductosComponent },
      { path: 'pdv/configuracion-impresora', component: ConfiguracionImpresoraComponent },

      // ==========================================
      // WILDCARD - Redirigir rutas no encontradas
      // ==========================================
      { path: '**', redirectTo: '/login' }
    ]
  }
];

// Bootstrap de la aplicación
bootstrapApplication(AppComponent, {
  providers: [
    // Módulos necesarios
    importProvidersFrom(HttpClientModule, FormsModule, CommonModule),
    // Router con hash location
    provideRouter(routes, withHashLocation()),
    // Interceptor HTTP
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ]
}).catch(err => console.error(err));