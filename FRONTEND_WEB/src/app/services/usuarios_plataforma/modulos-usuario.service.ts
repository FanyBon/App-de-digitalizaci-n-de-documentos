// src/app/services/modulos-usuario.service.ts
import { Injectable } from '@angular/core';

// Interfaz para módulo hijo
export interface ModuloHijo {
  id: number;
  codigo: string;
  nombre: string;
  icono: string;
  ruta: string;
  orden: number;
}

// Interfaz para módulo padre con hijos
export interface ModuloPermitido {
  id: number;
  codigo: string;
  nombre: string;
  icono: string;
  orden: number;
  hijos: ModuloHijo[];
}

const MODULOS_KEY = 'modulos_permitidos';

@Injectable({ providedIn: 'root' })
export class ModulosUsuarioService {

  constructor() {}

  // ============================================
  // GUARDAR MÓDULOS (llamar después del login)
  // ============================================
  guardarModulos(modulos: ModuloPermitido[]): void {
    localStorage.setItem(MODULOS_KEY, JSON.stringify(modulos));
    console.log('✅ Módulos guardados:', modulos.length);
  }

  // ============================================
  // OBTENER TODOS LOS MÓDULOS PERMITIDOS
  // ============================================
  getModulosPermitidos(): ModuloPermitido[] {
    const raw = localStorage.getItem(MODULOS_KEY);
    if (!raw) return [];
    
    try {
      return JSON.parse(raw) as ModuloPermitido[];
    } catch {
      return [];
    }
  }

  // ============================================
  // VERIFICAR ACCESO POR CÓDIGO DE MÓDULO
  // ============================================
  tieneAccesoModulo(codigo: string): boolean {
    const modulos = this.getModulosPermitidos();
    
    // Buscar en módulos padre
    const moduloPadre = modulos.find(m => m.codigo === codigo);
    if (moduloPadre) return true;

    // Buscar en módulos hijos
    for (const modulo of modulos) {
      const hijo = modulo.hijos.find(h => h.codigo === codigo);
      if (hijo) return true;
    }

    return false;
  }

  // ============================================
  // VERIFICAR ACCESO POR RUTA
  // ============================================
  tieneAccesoRuta(ruta: string): boolean {
    const modulos = this.getModulosPermitidos();
    
    // Normalizar ruta (quitar / inicial si existe)
    const rutaNormalizada = ruta.startsWith('/') ? ruta : '/' + ruta;

    // Buscar en todos los módulos y sus hijos
    for (const modulo of modulos) {
      // Buscar en hijos
      for (const hijo of modulo.hijos) {
        if (hijo.ruta === rutaNormalizada) {
          return true;
        }
      }
    }

    return false;
  }

  // ============================================
  // OBTENER MÓDULO PADRE POR CÓDIGO
  // ============================================
  getModuloPadre(codigo: string): ModuloPermitido | null {
    const modulos = this.getModulosPermitidos();
    return modulos.find(m => m.codigo === codigo) || null;
  }

  // ============================================
  // OBTENER HIJOS DE UN MÓDULO
  // ============================================
  getHijosDeModulo(codigoPadre: string): ModuloHijo[] {
    const moduloPadre = this.getModuloPadre(codigoPadre);
    return moduloPadre ? moduloPadre.hijos : [];
  }

  // ============================================
  // OBTENER TODAS LAS RUTAS PERMITIDAS
  // ============================================
  getRutasPermitidas(): string[] {
    const modulos = this.getModulosPermitidos();
    const rutas: string[] = [];

    for (const modulo of modulos) {
      for (const hijo of modulo.hijos) {
        if (hijo.ruta) {
          rutas.push(hijo.ruta);
        }
      }
    }

    return rutas;
  }

  // ============================================
  // LIMPIAR MÓDULOS (llamar en logout)
  // ============================================
  limpiarModulos(): void {
    localStorage.removeItem(MODULOS_KEY);
  }

  // ============================================
  // VERIFICAR SI HAY MÓDULOS CARGADOS
  // ============================================
  hayModulosCargados(): boolean {
    const modulos = this.getModulosPermitidos();
    return modulos.length > 0;
  }

  // ============================================
  // DEBUG: Imprimir módulos en consola
  // ============================================
  debug(): void {
    const modulos = this.getModulosPermitidos();
    console.log('🔍 Módulos permitidos:', modulos);
    console.log('🔍 Rutas permitidas:', this.getRutasPermitidas());
  }
}