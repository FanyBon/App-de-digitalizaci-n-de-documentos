// src/app/guards/modulos.guard.ts
import { Injectable } from '@angular/core';
import { 
  CanActivate, 
  CanActivateChild, 
  ActivatedRouteSnapshot, 
  RouterStateSnapshot, 
  Router 
} from '@angular/router';
import { ModulosUsuarioService } from '../services/usuarios_plataforma/modulos-usuario.service';

@Injectable({ providedIn: 'root' })
export class ModulosGuard implements CanActivate, CanActivateChild {

  // ============================================
  // RUTAS DEL SISTEMA (no requieren validación de módulos)
  // Estas rutas siempre están permitidas si el usuario tiene token
  // ============================================
  private rutasSistema: string[] = [
    '/login',
    '/consulta-saldo',
    '/seleccion-ubicacion',
    '/seleccion-pdv',
    '/sin-permisos',
    '/cuenta',
    '/cerrar-sesion',
    '/notificaciones',
    '/ajustes'
  ];

  constructor(
    private modulosUsuarioService: ModulosUsuarioService,
    private router: Router
  ) {}

  // ============================================
  // CAN ACTIVATE (para rutas individuales)
  // ============================================
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.verificarAcceso(state.url);
  }

  // ============================================
  // CAN ACTIVATE CHILD (para rutas hijas)
  // ============================================
  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.verificarAcceso(state.url);
  }

  // ============================================
  // VERIFICAR ACCESO
  // ============================================
  private verificarAcceso(ruta: string): boolean {
    console.log(`[ModulosGuard] Verificando acceso a: ${ruta}`);

    // 1. Verificar si el usuario tiene token
    const token = localStorage.getItem('tokencontrolcomidas');
    if (!token) {
      console.warn('[ModulosGuard] 🔒 Sin token, redirigiendo a login');
      this.router.navigate(['/login']);
      return false;
    }

    // 2. Verificar si es una ruta del sistema (siempre permitida)
    if (this.esRutaSistema(ruta)) {
      console.log(`[ModulosGuard] ✅ Ruta del sistema permitida: ${ruta}`);
      return true;
    }

    // 3. Verificar si hay módulos cargados
    const modulos = this.modulosUsuarioService.getModulosPermitidos();
    
    if (modulos.length === 0) {
      // Si no hay módulos cargados, puede ser:
      // - Un super admin que tiene acceso a todo
      // - Un error en la carga de módulos
      // Permitimos el acceso y dejamos que el backend valide
      console.warn(`[ModulosGuard] ⚠️ Sin módulos cargados, permitiendo acceso a: ${ruta}`);
      return true;
    }

    // 4. Verificar si tiene acceso a la ruta específica
    const tieneAcceso = this.modulosUsuarioService.tieneAccesoRuta(ruta);

    if (!tieneAcceso) {
      console.warn(`[ModulosGuard] 🚫 Sin acceso a la ruta: ${ruta}`);
      console.log('[ModulosGuard] 📋 Rutas permitidas:', this.modulosUsuarioService.getRutasPermitidas());
      
      // Redirigir a página de sin permisos
      this.router.navigate(['/sin-permisos'], {
        queryParams: { ruta: ruta }
      });
      return false;
    }

    console.log(`[ModulosGuard] ✅ Acceso permitido a: ${ruta}`);
    return true;
  }

  // ============================================
  // VERIFICAR SI ES RUTA DEL SISTEMA
  // ============================================
  private esRutaSistema(ruta: string): boolean {
    // Normalizar ruta (quitar query params y hash)
    const rutaLimpia = ruta.split('?')[0].split('#')[0];
    
    // Verificar si coincide con alguna ruta del sistema
    return this.rutasSistema.some(rutaSistema => 
      rutaLimpia === rutaSistema || rutaLimpia.startsWith(rutaSistema + '/')
    );
  }
}