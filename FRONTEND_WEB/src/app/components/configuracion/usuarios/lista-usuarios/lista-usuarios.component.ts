// src/app/components/configuracion/usuarios/lista-usuarios/lista-usuarios.component.ts
// VERSION INTEGRADA - TODO EN UN COMPONENTE
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UsuariosService, Usuario, FiltrosUsuarios } from '../../../../services/usuarios_plataforma/usuarios.service';
import { UbicacionesService, Ubicacion } from '../../../../services/empresas/ubicaciones.service';
import { RolesService, Role } from '../../../../services/usuarios_plataforma/roles.service';
import { PerfilesService, Perfil } from '../../../../services/usuarios_plataforma/perfiles.service';
import { EmpresasService } from '../../../../services/empresas/empresas.service';

@Component({
  selector: 'app-lista-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './lista-usuarios.component.html',
  styleUrls: ['./lista-usuarios.component.css']
})
export class ListaUsuariosComponent implements OnInit {
  
  // ============================================
  // DATOS DE LA TABLA
  // ============================================
  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];
  loading: boolean = false;
  
  // ============================================
  // BÚSQUEDA Y FILTROS
  // ============================================
  searchTerm: string = '';
  filtroActivo: string = 'todos';
  
  // ============================================
  // PAGINACIÓN
  // ============================================
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;
  Math = Math;

  // ============================================
  // MODAL DE DETALLES
  // ============================================
  mostrarModalDetalle: boolean = false;
  usuarioDetalle: Usuario | null = null;

  // ============================================
  // MODAL DE FORMULARIO (CREAR/EDITAR)
  // ============================================
  mostrarModalForm: boolean = false;
  modoForm: 'crear' | 'editar' = 'crear';
  formulario!: FormGroup;
  guardando: boolean = false;

  // Datos para selects (SE CARGAN DESDE SERVICIOS)
  empresas: any[] = [];
  ubicaciones: Ubicacion[] = [];
  roles: Role[] = [];
  perfiles: Perfil[] = [];

  constructor(
    private usuariosService: UsuariosService,
    private ubicacionesService: UbicacionesService,
    private rolesService: RolesService,
    private perfilesService: PerfilesService,
    private empresasService: EmpresasService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.inicializarFormulario();
    this.cargarDatosIniciales();
    this.cargarUsuarios();
  }

  // ============================================
  // CARGAR DATOS INICIALES
  // ============================================
  
  cargarDatosIniciales(): void {
    // Cargar empresas
    this.empresasService.listarEmpresas().subscribe({
      next: (response: any) => {
        // Manejar tanto array directo como objeto con data
        this.empresas = Array.isArray(response) ? response : (response.data || []);
        console.log('✅ Empresas cargadas:', this.empresas.length);
      },
      error: (error) => {
        console.error('❌ Error al cargar empresas:', error);
        this.empresas = [];
      }
    });

    // Cargar todas las ubicaciones (se filtrarán por empresa en el getter)
    this.ubicacionesService.getUbicaciones().subscribe({
      next: (response) => {
        this.ubicaciones = response.data || [];
        console.log('✅ Ubicaciones cargadas:', this.ubicaciones.length);
      },
      error: (error) => {
        console.error('❌ Error al cargar ubicaciones:', error);
        this.ubicaciones = [];
      }
    });

    // Cargar roles
    this.rolesService.listarRoles().subscribe({
      next: (response: any) => {
        // Asegurar que sea un array
        this.roles = Array.isArray(response) ? response : (response.data || []);
        console.log('✅ Roles cargados:', this.roles.length, this.roles);
      },
      error: (error) => {
        console.error('❌ Error al cargar roles:', error);
        this.roles = [];
      }
    });

    // Cargar perfiles
    this.perfilesService.listarPerfiles().subscribe({
      next: (response: any) => {
        // Asegurar que sea un array
        this.perfiles = Array.isArray(response) ? response : (response.data || []);
        console.log('✅ Perfiles cargados:', this.perfiles.length, this.perfiles);
      },
      error: (error) => {
        console.error('❌ Error al cargar perfiles:', error);
        this.perfiles = [];
      }
    });
  }

  // ============================================
  // FORMULARIO
  // ============================================
  
  inicializarFormulario(): void {
    this.formulario = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      nombre_usuario: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      empresa_id: ['', Validators.required],
      ubicacion_id: [{ value: '', disabled: true }], // Deshabilitado inicialmente
      roles: [[]],
      perfiles: [[]]
    });
  }

  // ============================================
  // CARGAR DATOS
  // ============================================
  
  cargarUsuarios(): void {
    this.loading = true;
    const filtros: FiltrosUsuarios = {};

    if (this.filtroActivo === 'activos') {
      filtros.activo = true;
    } else if (this.filtroActivo === 'inactivos') {
      filtros.activo = false;
    }

    this.usuariosService.listarUsuarios(filtros).subscribe({
      next: (data) => {
        this.usuarios = data;
        this.totalItems = data.length;
        this.aplicarFiltros();
        this.loading = false;
        console.log('✅ Usuarios cargados:', this.usuarios.length);
      },
      error: (error) => {
        console.error('❌ Error al cargar usuarios:', error);
        this.loading = false;
        alert('Error al cargar usuarios');
      }
    });
  }

  aplicarFiltros(): void {
    let filtered = [...this.usuarios];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(u => 
        u.nombre_usuario.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.empresa_nombre && u.empresa_nombre.toLowerCase().includes(term)) ||
        (u.ubicacion_nombre && u.ubicacion_nombre.toLowerCase().includes(term))
      );
    }

    this.usuariosFiltrados = filtered;
    this.totalItems = filtered.length;
    this.currentPage = 1;
  }

  buscarUsuarios(): void {
    this.aplicarFiltros();
  }

  cambiarFiltroActivo(filtro: string): void {
    this.filtroActivo = filtro;
    this.cargarUsuarios();
  }

  // ============================================
  // PAGINACIÓN
  // ============================================
  
  get paginatedUsuarios(): Usuario[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.usuariosFiltrados.slice(start, end);
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  // ============================================
  // MODAL DE DETALLES
  // ============================================
  
  verUsuario(usuario: Usuario): void {
    this.usuarioDetalle = usuario;
    this.mostrarModalDetalle = true;
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle = false;
    this.usuarioDetalle = null;
  }

  getRolesTexto(roles?: Array<{ id: number; nombre: string }>): string {
    if (!roles || roles.length === 0) return 'Sin roles asignados';
    return roles.map(r => r.nombre).join(', ');
  }

  getPerfilesTexto(perfiles?: Array<{ id: number; nombre: string }>): string {
    if (!perfiles || perfiles.length === 0) return 'Sin perfiles asignados';
    return perfiles.map(p => p.nombre).join(', ');
  }

  // ============================================
  // MODAL DE FORMULARIO (CREAR/EDITAR)
  // ============================================
  
  abrirModalCrear(): void {
    this.modoForm = 'crear';
    this.formulario.reset();
    this.formulario.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.formulario.get('password')?.updateValueAndValidity();
    this.mostrarModalForm = true;
  }

  abrirModalEditar(usuario: Usuario): void {
  this.modoForm = 'editar';
  this.usuarioDetalle = usuario;
  
  // Primero cargar datos básicos
  this.formulario.patchValue({
    email: usuario.email,
    nombre_usuario: usuario.nombre_usuario,
    empresa_id: usuario.empresa_id,
    roles: usuario.roles?.map(r => r.id) || [],
    perfiles: usuario.perfiles?.map(p => p.id) || []
  });

  // Password opcional en modo editar
  this.formulario.get('password')?.clearValidators();
  this.formulario.get('password')?.updateValueAndValidity();
  
  // Luego cargar ubicaciones de la empresa y establecer la ubicación
  if (usuario.empresa_id) {
    this.ubicacionesService.getUbicaciones(Number(usuario.empresa_id)).subscribe({
      next: (response) => {
        const ubicaciones = response.data || [];
        this.ubicaciones = [
          ...this.ubicaciones.filter(u => u.empresa_id !== Number(usuario.empresa_id)),
          ...ubicaciones
        ];
        
        // Habilitar y establecer ubicación
        this.formulario.get('ubicacion_id')?.enable();
        this.formulario.patchValue({ ubicacion_id: usuario.ubicacion_id || '' });
        
        console.log('✅ Ubicaciones cargadas para edición');
      },
      error: (error) => {
        console.error('❌ Error al cargar ubicaciones para editar:', error);
      }
    });
  }
  
  this.mostrarModalForm = true;
}

  cerrarModalForm(): void {
    this.mostrarModalForm = false;
    this.usuarioDetalle = null;
    this.formulario.reset();
  }

  guardarUsuario(): void {
    if (this.formulario.invalid) {
      this.marcarCamposComoTocados();
      return;
    }

    this.guardando = true;
    const datos = this.formulario.value;

    if (this.modoForm === 'editar' && !datos.password) {
      delete datos.password;
    }

    const operacion = this.modoForm === 'crear'
      ? this.usuariosService.crearUsuario(datos)
      : this.usuariosService.actualizarUsuarioCompleto(this.usuarioDetalle!.id, datos);

    operacion.subscribe({
      next: (response) => {
        console.log('✅ Usuario guardado:', response);
        alert(`Usuario ${this.modoForm === 'crear' ? 'creado' : 'actualizado'} exitosamente`);
        this.guardando = false;
        this.cerrarModalForm();
        this.cargarUsuarios();
      },
      error: (error) => {
        console.error('❌ Error al guardar usuario:', error);
        alert(error.error?.error || 'Error al guardar usuario');
        this.guardando = false;
      }
    });
  }

  marcarCamposComoTocados(): void {
    Object.keys(this.formulario.controls).forEach(key => {
      this.formulario.get(key)?.markAsTouched();
    });
  }

  tieneError(campo: string): boolean {
    const control = this.formulario.get(campo);
    return !!(control && control.invalid && control.touched);
  }

  getMensajeError(campo: string): string {
    const control = this.formulario.get(campo);
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'Este campo es obligatorio';
    if (control.errors['email']) return 'Email inválido';
    if (control.errors['minlength']) {
      const minLength = control.errors['minlength'].requiredLength;
      return `Mínimo ${minLength} caracteres`;
    }

    return 'Campo inválido';
  }

  get ubicacionesFiltradas(): Ubicacion[] {
  const empresaId = this.formulario.get('empresa_id')?.value;
  
  if (!empresaId) {
    console.log('⚠️ No hay empresa seleccionada');
    return [];
  }
  
  const filtradas = this.ubicaciones.filter(u => {
    const coincideEmpresa = u.empresa_id === Number(empresaId);
    const estaActiva = u.activo === true;
    return coincideEmpresa && estaActiva;
  });
  
  console.log(`📍 Filtrando ubicaciones para empresa ${empresaId}:`, filtradas);
  return filtradas;
}

  onEmpresaChange(): void {
  const ubicacionControl = this.formulario.get('ubicacion_id');
  const empresaId = this.formulario.get('empresa_id')?.value;
  
  // Limpiar ubicación
  ubicacionControl?.setValue('');
  
  if (empresaId) {
    // Habilitar el select
    ubicacionControl?.enable();
    
    // Cargar ubicaciones de esta empresa específica
    this.ubicacionesService.getUbicaciones(Number(empresaId)).subscribe({
      next: (response) => {
        // Guardar TODAS las ubicaciones (no filtrar aquí)
        const todasUbicaciones = response.data || [];
        console.log('📍 Ubicaciones recibidas:', todasUbicaciones);
        
        // Reemplazar solo las de esta empresa en el array
        this.ubicaciones = [
          ...this.ubicaciones.filter(u => u.empresa_id !== Number(empresaId)),
          ...todasUbicaciones
        ];
        
        console.log('✅ Total ubicaciones en memoria:', this.ubicaciones.length);
        console.log('✅ Ubicaciones filtradas disponibles:', this.ubicacionesFiltradas.length);
      },
      error: (error) => {
        console.error('❌ Error al cargar ubicaciones:', error);
      }
    });
  } else {
    ubicacionControl?.disable();
  }
}

  isRolSelected(rolId: number): boolean {
    const rolesSeleccionados = this.formulario.get('roles')?.value || [];
    return rolesSeleccionados.includes(rolId);
  }

  toggleRol(rolId: number): void {
    const rolesControl = this.formulario.get('roles');
    const rolesActuales = rolesControl?.value || [];
    
    if (rolesActuales.includes(rolId)) {
      rolesControl?.setValue(rolesActuales.filter((id: number) => id !== rolId));
    } else {
      rolesControl?.setValue([...rolesActuales, rolId]);
    }
  }

  isPerfilSelected(perfilId: number): boolean {
    const perfilesSeleccionados = this.formulario.get('perfiles')?.value || [];
    return perfilesSeleccionados.includes(perfilId);
  }

  togglePerfil(perfilId: number): void {
    const perfilesControl = this.formulario.get('perfiles');
    const perfilesActuales = perfilesControl?.value || [];
    
    if (perfilesActuales.includes(perfilId)) {
      perfilesControl?.setValue(perfilesActuales.filter((id: number) => id !== perfilId));
    } else {
      perfilesControl?.setValue([...perfilesActuales, perfilId]);
    }
  }

  get tituloModal(): string {
    return this.modoForm === 'crear' ? 'Nuevo Usuario' : 'Editar Usuario';
  }

  get iconoModal(): string {
    return this.modoForm === 'crear' ? 'fa-user-plus' : 'fa-user-edit';
  }

  // ============================================
  // ACCIONES CRUD
  // ============================================
  
  cambiarEstatus(usuario: Usuario): void {
    const nuevoEstatus = !usuario.activo;
    const mensaje = nuevoEstatus ? 'activar' : 'inactivar';
    
    if (!confirm(`¿Estás seguro de ${mensaje} al usuario ${usuario.nombre_usuario}?`)) {
      return;
    }

    this.usuariosService.cambiarEstatus(usuario.id, nuevoEstatus).subscribe({
      next: (response) => {
        console.log('✅ Estatus cambiado:', response);
        alert(`Usuario ${mensaje}do exitosamente`);
        this.cargarUsuarios();
      },
      error: (error) => {
        console.error('❌ Error al cambiar estatus:', error);
        alert(error.error?.error || 'Error al cambiar estatus');
      }
    });
  }

  eliminarUsuario(usuario: Usuario): void {
    if (!confirm(`¿Estás seguro de eliminar al usuario ${usuario.nombre_usuario}? Esta acción no se puede deshacer.`)) {
      return;
    }

    this.usuariosService.eliminarUsuario(usuario.id).subscribe({
      next: (response) => {
        console.log('✅ Usuario eliminado:', response);
        alert('Usuario eliminado exitosamente');
        this.cargarUsuarios();
      },
      error: (error) => {
        console.error('❌ Error al eliminar usuario:', error);
        alert(error.error?.error || 'Error al eliminar usuario');
      }
    });
  }

  exportarCSV(): void {
    alert('Funcionalidad de exportación CSV próximamente');
  }

  exportarExcel(): void {
    alert('Funcionalidad de exportación Excel próximamente');
  }

  // ============================================
  // HELPERS
  // ============================================
  
  getRolBadgeClass(roles?: Array<{ id: number; nombre: string }>): string {
    if (!roles || roles.length === 0) return 'bg-gray-100 text-gray-800';
    
    const rolNombre = roles[0].nombre.toLowerCase();
    
    if (rolNombre.includes('super') || rolNombre.includes('administrador')) {
      return 'bg-purple-100 text-purple-800';
    } else if (rolNombre.includes('admin')) {
      return 'bg-blue-100 text-blue-800';
    } else if (rolNombre.includes('cajero') || rolNombre.includes('operador')) {
      return 'bg-green-100 text-green-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  }

  getRolTexto(roles?: Array<{ id: number; nombre: string }>): string {
    if (!roles || roles.length === 0) return 'Sin rol';
    return roles[0].nombre;
  }
}