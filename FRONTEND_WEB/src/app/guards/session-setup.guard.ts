// src/app/guards/session-setup.guard.ts
import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { AuthControlComidasService } from '../services/sistemas/control_comidas/auth-control-comidas.service';

@Injectable({
  providedIn: 'root'
})
export class SessionSetupGuard implements CanActivate {
  
  constructor(
    private authService: AuthControlComidasService,
    private router: Router
  ) {}

  canActivate(): boolean {
    console.log('[SessionSetupGuard] Verificando acceso...');

    // 1. Verificar que esté logueado
    if (!this.authService.isLoggedIn()) {
      console.warn('[SessionSetupGuard] No autenticado → /login');
      this.router.navigate(['/login']);
      return false;
    }

    // 2. Si ya tiene sesión operativa completa, redirigir al módulo
    if (this.authService.hasOperativeSession()) {
      console.log('[SessionSetupGuard] Sesión operativa activa');
      
      const tipoCodigo = localStorage.getItem('punto_venta_tipo_codigo');
      
      const RUTAS: Record<string, string> = {
        'pdv': '/pdv/venta',
        'autocobro': '/pdv/venta-automatica',
        'kds': '/comedores/kds',
        'contador': '/comedores/control-comidas',
        'tablet_mesero': '/pdv/tablet-mesero',
        'kiosko': '/pdv/kiosko'
      };
      
      const rutaDestino = tipoCodigo ? RUTAS[tipoCodigo] : '/comedores/control-comidas';
      console.log(`[SessionSetupGuard] Redirigiendo a ${rutaDestino}`);
      this.router.navigate([rutaDestino]);
      return false;
    }

    // 3. Permitir acceso (no tiene sesión operativa)
    console.log('[SessionSetupGuard] Acceso permitido');
    return true;
  }
}