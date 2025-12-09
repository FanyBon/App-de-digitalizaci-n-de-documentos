// src/app/components/sin-permisos/sin-permisos.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ModulosUsuarioService } from '../../services/usuarios_plataforma/modulos-usuario.service';

@Component({
  selector: 'app-sin-permisos',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        
        <!-- Icono -->
        <div class="mb-6">
          <div class="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <i class="fas fa-lock text-red-500 text-4xl"></i>
          </div>
        </div>

        <!-- Título -->
        <h1 class="text-2xl font-bold text-gray-800 mb-2">Acceso Denegado</h1>
        
        <!-- Mensaje -->
        <p class="text-gray-600 mb-6">
          No tienes permisos para acceder a esta sección.
        </p>

        <!-- Ruta intentada -->
        <div *ngIf="rutaIntentada" class="bg-gray-100 rounded-lg p-3 mb-6">
          <p class="text-sm text-gray-500">Ruta solicitada:</p>
          <p class="font-mono text-sm text-gray-700">{{ rutaIntentada }}</p>
        </div>

        <!-- Información del usuario -->
        <div class="bg-blue-50 rounded-lg p-4 mb-6 text-left">
          <p class="text-sm text-blue-800 mb-2">
            <i class="fas fa-user mr-2"></i>
            <strong>Usuario:</strong> {{ username }}
          </p>
          <p class="text-sm text-blue-800">
            <i class="fas fa-id-badge mr-2"></i>
            <strong>Perfil:</strong> {{ perfil }}
          </p>
        </div>

        <!-- Sugerencia -->
        <p class="text-sm text-gray-500 mb-6">
          Si crees que deberías tener acceso, contacta al administrador del sistema.
        </p>

        <!-- Botones -->
        <div class="flex gap-4">
          <button (click)="volverAtras()" 
            class="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition">
            <i class="fas fa-arrow-left mr-2"></i>
            Volver
          </button>
          <button (click)="irAInicio()" 
            class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition">
            <i class="fas fa-home mr-2"></i>
            Inicio
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class SinPermisosComponent implements OnInit {
  rutaIntentada: string = '';
  username: string = '';
  perfil: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private modulosUsuarioService: ModulosUsuarioService
  ) {}

  ngOnInit() {
    // Obtener ruta intentada
    this.route.queryParams.subscribe(params => {
      this.rutaIntentada = params['ruta'] || '';
    });

    // Obtener información del usuario
    this.username = localStorage.getItem('username') || 'Desconocido';
    const perfiles = JSON.parse(localStorage.getItem('perfiles') || '[]');
    this.perfil = perfiles.join(', ') || 'Sin perfil';
  }

  volverAtras(): void {
    window.history.back();
  }

  irAInicio(): void {
    // Obtener primera ruta permitida
    const rutasPermitidas = this.modulosUsuarioService.getRutasPermitidas();
    
    if (rutasPermitidas.length > 0) {
      this.router.navigate([rutasPermitidas[0]]);
    } else {
      this.router.navigate(['/login']);
    }
  }
}