// src/app/components/session-setup/seleccion-ubicacion/seleccion-ubicacion.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

interface UbicacionDisponible {
  id: number;
  nombre: string;
  codigo: string;
  activo: boolean;
}

@Component({
  selector: 'app-seleccion-ubicacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './seleccion-ubicacion.component.html',
  styleUrls: ['./seleccion-ubicacion.component.css']
})
export class SeleccionUbicacionComponent implements OnInit {
  ubicaciones: UbicacionDisponible[] = [];
  username: string = '';
  loading: boolean = false;

  constructor(private router: Router) {}

  ngOnInit() {
    // Verificar que el usuario esté logueado
    const token = localStorage.getItem('tokencontrolcomidas');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    // Obtener ubicaciones desde localStorage (las que trajo el login)
    const ubicacionesString = localStorage.getItem('ubicaciones_disponibles');
    if (ubicacionesString) {
      try {
        this.ubicaciones = JSON.parse(ubicacionesString);
        console.log('📍 Ubicaciones cargadas:', this.ubicaciones);
      } catch (error) {
        console.error('Error al parsear ubicaciones:', error);
        this.ubicaciones = [];
      }
    }

    // Obtener username
    this.username = localStorage.getItem('username') || 'Usuario';

    // Si no hay ubicaciones, mostrar mensaje
    if (this.ubicaciones.length === 0) {
      alert('No tienes ubicaciones disponibles. Contacta al administrador.');
      this.router.navigate(['/login']);
    }
  }

  /**
   * Selecciona una ubicación y avanza al siguiente paso
   */
  seleccionarUbicacion(ubicacion: UbicacionDisponible) {
    // Guardar la ubicación seleccionada en localStorage
    localStorage.setItem('ubicacion_seleccionada', JSON.stringify({
      id: ubicacion.id,
      nombre: ubicacion.nombre,
      codigo: ubicacion.codigo
    }));

    console.log('✅ Ubicación seleccionada:', ubicacion.nombre);

    // Navegar a la selección de PDV
    this.router.navigate(['/seleccion-pdv']);
  }

  /**
   * Cierra sesión y vuelve al login
   */
  cerrarSesion() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      localStorage.clear();
      this.router.navigate(['/login']);
    }
  }
}