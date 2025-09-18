// src/app/modulos/procomin/usuarios/usuarios.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuariosService } from '../../../../services/usuarios_plataforma/usuarios.service';
import { AuthControlComidasService, UserContext } from '../../../../services/sistemas/control_comidas/auth-control-comidas.service';
import { RolesService, Role } from '../../../../services/usuarios_plataforma/roles.service';
import { PerfilesService, Perfil } from '../../../../services/usuarios_plataforma/perfiles.service';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';


@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css']
})
export class UsuariosComponent implements OnInit {
  usuarios: any[] = [];
  roles: Role[] = [];
  perfiles: Perfil[] = [];
  userContext: UserContext | null = null;
  errorMessage = '';
  // Estados y datos del modal de creación
  showCreateModal = false;
  newUser: any = {
    email: '',
    nombre_usuario: '',
    password: '',
    empresa_id: null,
    rolId: null,
    perfilId: null
  };
  showSuccessModal = false;
  createdUser: any = null;
  // Para edición
  showEditModal = false;
  selectedUser: any = null;
  // Autocomplete roles/perfiles
  roleSearch = '';
  searchTerm = '';
  perfilSearch = '';
  filteredRoles: Role[] = [];
  filteredPerfiles: Perfil[] = [];
  filteredUsuarios: any[] = [];
  showRoleDropdown = false;
  showPerfilDropdown = false;
  // listado de roles y perfiles para los <select>
  allRoles: Role[] = [];
  allPerfiles: Perfil[] = [];

  // usuario seleccionado y copia original para comparar cambios
  originalUser: any = null;

  // flags para controlar modales y mensajes
  showErrorModal = false;

  // mensaje de error a mostrar
  errorMsg = '';
  loadingRoles = false;
  loadingPerfiles = false;

  showSuccessEditModal = false;
  editedUser: any = null;

  showDeleteConfirmModal = false;
  userToDelete: any = null;

  showDeleteSuccessModal = false;

  constructor(
    private usuariosService: UsuariosService,
    private perfilesService: PerfilesService,
    private rolesService: RolesService,
    private authService: AuthControlComidasService
  ) { }

  ngOnInit(): void {
    // 1) Obtener contexto SÍNCRONO
    this.userContext = this.authService.getUser();

    // 2) Inicializar empresa fija para el modal
    this.newUser.empresa_id = this.userContext?.empresaId ?? null;

    // 3) Precargar roles y perfiles
    this.rolesService.listarRoles().subscribe({
      next: data => this.roles = data
    });
    this.perfilesService.listarPerfiles().subscribe({
      next: data => this.perfiles = data
    });

    this.loadUsers();
  }

  loadRoles(): void {
    this.errorMessage = '';
    this.rolesService.listarRoles().subscribe({
      next: data => this.roles = data,
      error: err => this.errorMessage = 'No se pudieron cargar los roles.'
    });
  }

  loadPerfiles(): void {
    this.errorMessage = '';
    this.perfilesService.listarPerfiles().subscribe({
      next: data => this.perfiles = data,
      error: () => this.errorMessage = 'No se pudieron cargar los perfiles.'
    });
  }

  // 1) Carga todos los usuarios desde el servicio
  loadUsers(): void {
    this.errorMessage = '';
    this.usuariosService.listarUsuarios().subscribe({
      next: data => {
        this.usuarios = data;
        this.filteredUsuarios = [...data];
      },
      error: err => {
        console.error('Error al cargar usuarios', err);
        this.errorMessage = 'No se pudieron cargar los usuarios.';
      }
    });
  }

  // 2) Lee el contexto actual del usuario (rol, perfiles, token…)
  loadUserContext(): void {
    this.errorMessage = '';
    this.userContext = this.authService.getUser();
  }

  filterUsuarios(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredUsuarios = [...this.usuarios];
      return;
    }
    this.filteredUsuarios = this.usuarios.filter(u =>
      u.nombre_usuario.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term)
    );
  }

  // 3) Oculta todas las salidas
  clear(): void {
    this.usuarios = [];
    this.userContext = null;
    this.errorMessage = '';
    this.roles = [];
    this.perfiles = [];
  }

  //creacion de usuario
  // Abrir modal: inicializa filtros y newUser
  openCreateModal(): void {
    this.errorMessage = '';
    this.newUser = {
      email: '',
      nombre_usuario: '',
      password: '',
      empresa_id: this.userContext?.empresaId ?? null,
      rolId: null,
      perfilId: null
    };
    this.roleSearch = '';
    this.perfilSearch = '';
    this.filteredRoles = [...this.roles];
    this.filteredPerfiles = [...this.perfiles];
    this.showRoleDropdown = false;
    this.showPerfilDropdown = false;
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  // Filtrar y seleccionar rol
  filterRoles(): void {
    const term = this.roleSearch.toLowerCase();
    this.filteredRoles = this.roles
      .filter(r => r.nombre.toLowerCase().includes(term));
  }

  selectRole(r: Role): void {
    this.newUser.rolId = r.id;
    this.roleSearch = r.nombre;
    this.showRoleDropdown = false;
  }

  // Filtrar y seleccionar perfil
  filterPerfiles(): void {
    const term = this.perfilSearch.toLowerCase();
    this.filteredPerfiles = this.perfiles
      .filter(p => p.nombre.toLowerCase().includes(term));
  }

  selectPerfil(p: Perfil): void {
    this.newUser.perfilId = p.id;
    this.perfilSearch = p.nombre;
    this.showPerfilDropdown = false;
  }

  confirmCreateUser(): void {
    this.errorMessage = '';
    this.usuariosService.crearUsuario(this.newUser).subscribe({
      next: user => {
        this.createdUser = user;
        this.showCreateModal = false;
        this.showSuccessModal = true;
      },
      error: err => {
        console.error('Error creando usuario', err);
        this.errorMessage = 'No se pudo crear el usuario.';
      }
    });
  }

  // Abre modal, clona usuario y dispara la carga de roles/perfiles
  openEditModal(user: any): void {
    // Clonar el usuario
    this.selectedUser = {
      ...user,
      rolId: user.roles?.length ? user.roles[0].id : null,
      perfilId: user.perfiles?.length ? user.perfiles[0].perfil_id : null,
      password: ''
    };
    this.originalUser = { ...this.selectedUser };

    // Cargar roles si no están
    this.loadingRoles = true;
    this.rolesService.listarRoles().subscribe({
      next: roles => {
        this.allRoles = roles;
        this.loadingRoles = false;
      },
      error: () => { this.loadingRoles = false; }
    });

    // Cargar perfiles si no están
    this.loadingPerfiles = true;
    this.perfilesService.listarPerfiles().subscribe({
      next: perfiles => {
        this.allPerfiles = perfiles;
        this.loadingPerfiles = false;
      },
      error: () => { this.loadingPerfiles = false; }
    });

    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedUser = null;
    this.originalUser = null;
    this.showSuccessEditModal = false;
    this.editedUser = null;
  }

  confirmEditUser(): void {
    if (!this.selectedUser?.id || !this.userContext) return;

    const payload: any = {};

    // Comparar campo a campo
    ['email', 'nombre_usuario'].forEach(f => {
      if (this.selectedUser[f] !== this.originalUser[f]) {
        payload[f] = this.selectedUser[f];
      }
    });

    // Contraseña
    if (this.selectedUser.password?.trim()) {
      payload.password = this.selectedUser.password.trim();
    }

    // Roles y perfiles
    if (this.selectedUser.rolId !== this.originalUser.rolId) {
      payload.rolId = this.selectedUser.rolId;
    }
    if (this.selectedUser.perfilId !== this.originalUser.perfilId) {
      payload.perfilId = this.selectedUser.perfilId;
    }

    // Empresa siempre
    payload.empresa_id = this.userContext.empresaId;

    // Si no hay cambios, cerramos modal
    if (!Object.keys(payload).length) {
      this.closeEditModal();
      return;
    }

    this.usuariosService
      .actualizarUsuarioCompleto(this.selectedUser.id, payload)
      .subscribe({
        next: ({ data, roles, perfiles }) => {
          this.loadUsers();
          this.closeEditModal();
          // Opcional: refrescar localmente la lista de usuarios con data/roles/perfiles devueltos
          // Guardar datos para mostrar en el modal de éxito
          this.editedUser = data;
          this.showSuccessEditModal = true;
        },
        error: err => {
          console.error('No se pudo editar:', err);
          this.closeEditModal();
          // Mostrar modal de error…
        }
      });
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.createdUser = null;
  }

  closeSuccessEditModal(): void {
    this.showSuccessEditModal = false;
    this.editedUser = null;
  }

  // Abrir modal confirmación eliminación
  openDeleteConfirm(user: any): void {
    this.userToDelete = user;
    this.showDeleteConfirmModal = true;
  }

  // Cancelar eliminación
  cancelDelete(): void {
    this.showDeleteConfirmModal = false;
    this.userToDelete = null;
  }

  // Confirmar y llamar al servicio
  confirmDelete(): void {
    if (!this.userToDelete) return;

    this.usuariosService
      .eliminarUsuario(this.userToDelete.id)
      .subscribe({
        next: () => {
          this.showDeleteConfirmModal = false;
          this.loadUsers();
          this.showDeleteSuccessModal = true;
        },
        error: err => {
          console.error('Error eliminando usuario', err);
          // Opcional: muestra un toast o modal de error
          this.showDeleteConfirmModal = false;
        }
      });
  }

  // Cerrar modal éxito eliminación
  closeDeleteSuccessModal(): void {
    this.showDeleteSuccessModal = false;
  }

  exportCsv(): void {
    const headers = ['ID', 'Email', 'Usuario', 'Empresa ID', 'Creado', 'Actualizado', 'Sincronizado'];
    const rows = this.filteredUsuarios.map(u => [
      u.id,
      u.email,
      u.nombre_usuario,
      u.empresa_id,
      new Date(u.created_at).toLocaleString(),
      new Date(u.updated_at).toLocaleString(),
      u.sincronizado ? 'Sí' : 'No'
    ]);

    // Construir CSV
    let csv = headers.join(',') + '\n';
    rows.forEach(r => {
      csv += r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    // Descargar
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'usuarios.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportExcel(): void {
    // Preparar datos
    const data = this.filteredUsuarios.map(u => ({
      ID: u.id,
      Email: u.email,
      Usuario: u.nombre_usuario,
      'Empresa ID': u.empresa_id,
      Creado: new Date(u.created_at).toLocaleString(),
      Actualizado: new Date(u.updated_at).toLocaleString(),
      Sincronizado: u.sincronizado ? 'Sí' : 'No'
    }));

    // Crear hoja de trabajo
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);

    // Crear libro de trabajo y agregar la hoja
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');

    // Generar buffer
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    // Descargar
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, 'usuarios.xlsx');
  }

}
