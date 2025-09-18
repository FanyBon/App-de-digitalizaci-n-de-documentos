// src/app/guards/auth.guard.ts

import { Injectable } from '@angular/core';
import {
  CanActivate,
  CanActivateChild,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
  UrlTree
} from '@angular/router';
import { AuthControlComidasService } from '../services/sistemas/control_comidas/auth-control-comidas.service';

@Injectable({
  providedIn: 'root'
})

export class AuthGuard implements CanActivate, CanActivateChild {
  constructor(
    private authService: AuthControlComidasService,
    private router: Router
  ) {}

  private checkLogin(state?: RouterStateSnapshot): boolean | UrlTree {
    const logueado = this.authService.isLoggedIn();

    console.log('[AuthGuard] Estado actual:', logueado);
    console.log('[AuthGuard] URL solicitada:', state?.url);

    if (logueado) {
      return true;
    }

    // Redirige a /login con returnUrl
    return this.router.createUrlTree(
      ['/login'],
      { queryParams: { returnUrl: state?.url } }
    );
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {
    return this.checkLogin(state);
  }

  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {
    return this.checkLogin(state);
  }
}