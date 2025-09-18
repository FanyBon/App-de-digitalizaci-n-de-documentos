// app.routes.ts
import { importProvidersFrom } from '@angular/core';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { CommonModule } from '@angular/common'; // Importa CommonModule para directivas como *ngIf y *ngFor
import { FormsModule } from '@angular/forms'; // Importa FormsModule para [(ngModel)]
import { RouterModule } from '@angular/router';
// Importación de componentes
import { CuentaComponent } from './components/cuenta/cuenta.component';
import { AjustesComponent } from './components/ajustes/ajustes.component';
import { CerrarSesionComponent } from './components/cerrar-sesion/cerrar-sesion.component';
import { NotificacionesComponent } from './components/notificaciones/notificaciones.component';
import { LoginComponent } from './components/login/login.component';
import { ConsultaSaldoComponent }  from './components/consulta-saldo/consulta-saldo.component';// Importación de componentes protegidos de epos
import { CrudUsuariosComponent } from './modulos/procomin/crud-usuarios/crud-usuarios.component';
import { CrudPerfilesComponent } from './modulos/procomin/crud-perfiles/crud-perfiles.component';
import { RolesPerfilesComponent } from './modulos/procomin/roles-perfiles/roles-perfiles.component';
// Importación del guard y el interceptor
import { AuthGuard } from './guards/auth.guard';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { ControlComidasComponent } from './modulos/procomin/comedores/control-comidas/control-comidas.component';
import { UsuariosComponent } from './modulos/procomin/comedores/usuarios/usuarios.component';
import { EmpresasComponent } from './modulos/procomin/comedores/empresas/empresas.component';
import { EmpleadosComponent } from './modulos/procomin/comedores/empleados/empleados.component';
import { AsistenciasComponent } from './modulos/procomin/comedores/asistencias/asistencias.component';
import { LoginControlComidasComponent } from './modulos/procomin/comedores/logincontrolcomidas/login.component';
import { ImprecionTarjetasComponent } from './modulos/procomin/comedores/imprecion-tarjetas/imprecion-tarjetas.component';
import { ReporteComidasComponent } from './modulos/procomin/comedores/reporte-comidas/reporte-comidas.component';
import { DetalleVentaComponent } from './modulos/pdv/detalle-venta/detalle-venta.component';
import { ImportEmpleadosComponent } from './modulos/procomin/import-empleados/import-empleados.component';

import { ProductosComponent } from './modulos/pdv/productos/productos.component';
import { ConfiguracionImpresoraComponent } from './modulos/pdv/configuracion-impresora/configuracion-impresora.component';

// Configuración de bootstrap para incluir HttpClientModule, FormsModule, CommonModule y RouterModule en providers
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { Routes, provideRouter, withHashLocation } from '@angular/router';
import { ClientesComponent } from './modulos/pdv/clientes/clientes.component';
import { VentaComponent } from './modulos/pdv/venta/venta.component';  // ①

export const routes: Routes = [

  // 🔁 redirección root
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  // 🌐 públicas
  { path: 'login', component: LoginComponent, data: { showLayout: false } },
  {
    path: 'consulta-saldo',
    loadComponent: () => import('./components/consulta-saldo/consulta-saldo.component')
      .then(m => m.ConsultaSaldoComponent),
    data: { showLayout: false }
  },

  // 🔐 protegidas
  {
    path: '',
    canActivateChild: [AuthGuard],
    children: [
      { path: 'cuenta', component: CuentaComponent },
      { path: 'ajustes', component: AjustesComponent },
      { path: 'cerrar-sesion', component: CerrarSesionComponent },
      { path: 'notificaciones', component: NotificacionesComponent },

      // PROCOMIN
      { path: 'procomin/crud-usuarios', component: CrudUsuariosComponent },
      { path: 'procomin/crud-perfiles', component: CrudPerfilesComponent },
      { path: 'procomin/roles-perfiles', component: RolesPerfilesComponent },

      // COMEDORES (ahora sí todos con guard)
      { path: 'comedores/control-comidas', component: ControlComidasComponent },
      { path: 'comedores/usuarios', component: UsuariosComponent },
      { path: 'comedores/empresas', component: EmpresasComponent },
      { path: 'comedores/empleados', component: EmpleadosComponent },
      { path: 'comedores/asistencias', component: AsistenciasComponent },
      { path: 'comedores/logincontrolcomidas', component: LoginControlComidasComponent },
      { path: 'comedores/imprecion-tarjetas', component: ImprecionTarjetasComponent },
      { path: 'comedores/reporte-comidas', component: ReporteComidasComponent },
      { path: 'comedores/importar-empleados', component: ImportEmpleadosComponent },

      // PDV
      { path: 'pdv/informe-ventas', component: DetalleVentaComponent },
      { path: 'pdv/venta', component: VentaComponent },
      { path: 'pdv/clientes', component: ClientesComponent },
      { path: 'pdv/productos', component: ProductosComponent },
      { path: 'pdv/configuracion-impresora', component: ConfiguracionImpresoraComponent },

      // wildcard protegida
      { path: '**', redirectTo: '/login' }
    ]
  }
];


bootstrapApplication(AppComponent, {
  providers: [
    // Importa los módulos necesarios
    importProvidersFrom(HttpClientModule, FormsModule, CommonModule),
    // Configura el router usando provideRouter con withHashLocation para usar hashes en la URL.
    provideRouter(routes, withHashLocation()),
    // El interceptor de HTTP
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ]
}).catch(err => console.error(err));