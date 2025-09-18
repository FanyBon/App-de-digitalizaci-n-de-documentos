import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { forkJoin } from 'rxjs';
import * as XLSX from 'xlsx';
import { ProductosService, Producto } from '../../../services/productos/productos.service';
import { FamiliaProductoService, FamiliaProducto } from '../../../services/productos/familias-productos.service';
import { CategoriaService, CategoriaArticulo } from '../../../services/productos/categoria.service';
import { SubsidiosService, Subsidio } from '../../../services/ventas/subsidios.service';
import { EmpresasService } from '../../../services/sistemas/control_comidas/empresas.service';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.css']
})
export class ProductosComponent implements OnInit {

  pageSizeOptions = [10, 50, 100, 200];
  // Productos
  pageSize       = 10;
  currentPage    = 1;
  // Familias
  familyPageSize    = 10;
  familyCurrentPage = 1;
  // Categorías
  pageSizeCat        = 10;
  currentCategoriaPage = 1;
  // Subsidios: paginado y filtro
  subsidioPageSize      = 10;
  subsidioCurrentPage   = 1;

  empresas: any[] = [];           // aquí guardamos la lista
  // Listados y filtros
  productos: Producto[] = [];
  productosFiltrados: Producto[] = [];
  terminoBusqueda = '';
  familias: FamiliaProducto[] = [];
  categorias: CategoriaArticulo[] = [];
  // Estados de UI
  cargando = false;
  error: string | null = null;
  // Modales
  mostrarModalCrear = false;
  mostrarModalEditar = false;
  mostrarModalEliminar = false;
  mostrarModalExito = false;
  mostrarTabla: boolean = false;
  mostrarDatos = false;
  filterFamilia = '';
  filterCategoria = '';
  filterSubsidio = '';
  // Estados del dropdown
  dropdownOpen: 'familia' | 'categoria' | 'subsidio' | null = null;
  filterFamiliaTerm = '';
  filterCategoriaTerm = '';
  filterSubsidioTerm = '';
  subsidios: Subsidio[] = [];
  selectedFamilia?: FamiliaProducto | null = null;
  selectedCategoria?: CategoriaArticulo | null = null;
  selectedSubsidio?: Partial<Subsidio> | null = null;
  // Modelos para formularios
  nuevoProducto: Partial<Producto> = {};
  productoAEditar!: Producto;
  productoAEliminar!: Producto;
  productoEliminado!: Producto;
  // Modal Crear Familia
  mostrarModalCrearFamilia = false;
  allFamilias: FamiliaProducto[] = [];
  searchTerm: string = '';
  mostrarFamilias = false;
  terminoBusquedaFamilias = '';
  nuevaFamilia: Partial<FamiliaProducto> = {
    nombre: '',
    descripcion: '',
    parent_id: null,
    empresa_id: 0
  };
  mostrarModalEliminacionExito = false;
  lastDeletedFamilyName  = '';
  searchTermFamilias = '';                // texto de búsqueda
  parentMap: { [id: number]: string } = {};
  mostrarModalEditarFamilia = false;
  mostrarModalEliminarFamilia = false;
  familiaAEditar: Partial<FamiliaProducto> = {};
  familiaAEliminar!: FamiliaProducto;
  mostrarModalCrearCategoria = false;
  nuevaCategoria: Partial<CategoriaArticulo> = {
    nombre: '',
    descripcion: '',
    tipo: 'pdv',
    empresa_id: 0
  };
  mostrarModalEliminacionCategoriaExito = false;
  lastDeletedCategoriaName          = '';
  mostrarCategorias        = false;
  searchTermCategorias     = '';
  cargandoCategorias = false;
  errorCategorias: string | null = null;
  mostrarModalEditarCategoria = false;
  mostrarModalEliminarCategoria = false;
  categoriaAEditar: Partial<CategoriaArticulo> = {};
  categoriaAEliminar!: CategoriaArticulo;
  // Modal Crear Subsidio
  mostrarModalCrearSubsidio = false;
  mostrarModalEliminacionSubsidioExito = false;
  lastDeletedSubsidioName = '';
  searchTermSubsidios = '';
  mostrarSubsidios = false;
  nuevoSubsidio: Partial<Subsidio> = {
    nombre: '',
    porcentaje: 0,
    descripcion: '',
    empresa_id: 0,
    activo: true
  };
  // Propiedades al nivel de la clase
  mostrarModalEditarSubsidio = false;
  mostrarModalEliminarSubsidio = false;
  subsidioAEditar: Partial<Subsidio> = {};
  subsidioAEliminar!: Subsidio;

  constructor(
    private productosSvc: ProductosService,
    private familiasSvc: FamiliaProductoService,
    private categoriasSvc: CategoriaService,
    private subsidiosSvc: SubsidiosService,
    private empresasSvc: EmpresasService,
  ) { }

  ngOnInit(): void {
    this.cargarDatosIniciales();
    this.cargarCategorias();
    this.cargarSubsidios();    // ← Invocación corregida
    this.cargarEmpresas();
    this.loadFamilias();
    this.familiasSvc.listar().subscribe(data => {
      this.familias = data;
    });
  }

  private cargarEmpresas(): void {
    this.empresasSvc.listarEmpresas()
      .subscribe({
        next: lista => this.empresas = lista,
        error: err => console.error('Error al cargar empresas:', err)
      });
  }

  verProductos(): void {
    this.mostrarTabla = !this.mostrarTabla;
    // la primera vez que abro, cargo datos
    if (this.mostrarTabla && this.productosFiltrados.length === 0) {
      this.cargarProductos();
    }
  }

  private cargarDatosIniciales(): void {
    this.cargando = true;
    forkJoin({
      prods: this.productosSvc.getProductos(),
      fams: this.familiasSvc.listar(),
      cats: this.categoriasSvc.listar()
    }).subscribe({
      next: ({ prods, fams, cats }) => {
        this.productos = prods;
        this.productosFiltrados = [...prods];
        this.familias = fams;
        this.buildParentMap();
        this.categorias = cats;
        this.cargando = false;
      },
      error: err => {
        console.error(err);
        this.error = 'Error al cargar datos iniciales';
        this.cargando = false;
      }
    });
  }

  private cargarProductos(): void {
    this.cargando = true;
    this.error = null;
    this.productosSvc.getProductos().subscribe({
      next: (lista) => {
        this.productosFiltrados = lista;
        this.cargando = false;
      },
      error: (err) => {
        this.error = 'Error al cargar productos';
        console.error(err);
        this.cargando = false;
      }
    });
  }

  private buildParentMap(): void {
    this.parentMap = this.familias
      .reduce((map, fam) => {
        map[fam.id] = fam.nombre;
        return map;
      }, {} as Record<number, string>);
  }

  filtrar(): void {
    const term = this.terminoBusqueda.toLowerCase().trim();
    // Si el campo está vacío, restauramos el listado original
    if (!term) {
      this.productosFiltrados = [...this.productos];
      return;
    }
    this.productosFiltrados = this.productos.filter(p =>
      p.nombre.toLowerCase().includes(term) ||
      p.codigo_barras.toLowerCase().includes(term)
    );
  }

  // Total de páginas
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.productosFiltrados.length / this.pageSize));
  }

  //[1,2,3,...totalPages]
  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  /** Subconjunto de productos según página */
  get paginatedProducts(): Producto[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.productosFiltrados.slice(start, start + this.pageSize);
  }

  // Getter dinámico: siempre devuelve la lista filtrada
  get familiasFiltradas(): FamiliaProducto[] {
    const term = this.searchTermFamilias.trim().toLowerCase();
    if (!term) return this.familias;
    return this.familias.filter(f =>
      f.nombre.toLowerCase().includes(term) ||
      (f.descripcion ?? '').toLowerCase().includes(term)
    );
  }

  /** Índice de inicio para paginación de familias */
  get startIndex(): number {
    return (this.familyCurrentPage - 1) * this.familyPageSize;
  }

  /** Índice de fin para paginación de familias */
  get endIndex(): number {
    return Math.min(this.startIndex + this.familyPageSize, this.familiasFiltradas.length);
  }

  /** Resetea la página al cambiarel número de ítems por página */
  onFamilyPageSizeChange(): void {
    this.familyCurrentPage = 1;
  }

  get categoriasFiltradas(): CategoriaArticulo[] {
    const term = this.searchTermCategorias.trim().toLowerCase();
    return term
      ? this.categorias.filter(c =>
          c.nombre.toLowerCase().includes(term) ||
          (c.descripcion ?? '').toLowerCase().includes(term)
        )
      : this.categorias;
  }

  get subsidiosFiltrados(): Subsidio[] {
    const term = this.searchTermSubsidios.trim().toLowerCase();
    if (!term) return this.subsidios;
    return this.subsidios.filter(s =>
      s.nombre.toLowerCase().includes(term) ||
      (s.descripcion ?? '').toLowerCase().includes(term)
    );
  }

  get subsidiosTotal(): number {
    return this.subsidiosFiltrados.length;
  }

  get subsidiosTotalPages(): number {
    return Math.max(1, Math.ceil(this.subsidiosTotal / this.subsidioPageSize));
  }

  get subsidiosStartIndex(): number {
    return this.subsidiosTotal === 0
      ? 0
      : (this.subsidioCurrentPage - 1) * this.subsidioPageSize + 1;
  }

  get subsidiosEndIndex(): number {
    return Math.min(
      this.subsidioCurrentPage * this.subsidioPageSize,
      this.subsidiosTotal
    );
  }

  prevSubsidioPage(): void {
    if (this.subsidioCurrentPage > 1) {
      this.subsidioCurrentPage--;
    }
  }

  nextSubsidioPage(): void {
    if (this.subsidioCurrentPage < this.subsidiosTotalPages) {
      this.subsidioCurrentPage++;
    }
  }

  get subsidiosPaginated(): Subsidio[] {
    const start = (this.subsidioCurrentPage - 1) * this.subsidioPageSize;
    return this.subsidiosFiltrados.slice(start, start + this.subsidioPageSize);
  }

  get categoriasPaginadas(): CategoriaArticulo[] {
    const start = (this.currentCategoriaPage - 1) * this.pageSizeCat;
    return this.categoriasFiltradas.slice(start, start + this.pageSizeCat);
  }

  get categoriasTotal(): number {
    return this.categoriasFiltradas.length;
  }

  get categoriasTotalPages() {
    return Math.max(1, Math.ceil(this.categoriasTotal / this.pageSizeCat));
  }

  get categoriasPaginated(): CategoriaArticulo[] {
    const start = (this.currentCategoriaPage - 1) * this.pageSizeCat;
    return this.categoriasFiltradas.slice(start, start + this.pageSizeCat);
  }

  get categoriasEndIndex() {
    return Math.min(this.currentCategoriaPage * this.pageSizeCat, this.categoriasTotal);
  }

  get categoriasStartIndex() {
    return this.categoriasTotal
      ? (this.currentCategoriaPage - 1) * this.pageSizeCat + 1
      : 0;
  }

  // trackBy para ngFor
  prevCategoriaPage(): void {
    if (this.currentCategoriaPage > 1) {
      this.currentCategoriaPage--;
    }
  }

  nextCategoriaPage(): void {
    const totalPages = Math.max(
      1,
      Math.ceil(this.categoriasFiltradas.length / this.pageSizeCat)
    );
    if (this.currentCategoriaPage < totalPages) {
      this.currentCategoriaPage++;
    }
  }

  // 5) trackBy para ngFor
  trackByCategoria(_i: number, cat: CategoriaArticulo): number {
    return cat.id!;
  }

  toggleDropdown(type: 'familia' | 'categoria' | 'subsidio') {
    this.dropdownOpen = this.dropdownOpen === type ? null : type;
    if (this.dropdownOpen) {
      // reset text filter
      if (type === 'familia') this.filterFamiliaTerm = '';
      if (type === 'categoria') this.filterCategoriaTerm = '';
      if (type === 'subsidio') this.filterSubsidioTerm = '';
    }
  }

  selectFamilia(f: FamiliaProducto) {
    if (this.mostrarModalEditar) {
      this.productoAEditar.familia_id = f.id;
    } else {
      this.nuevoProducto.familia_id = f.id;
    }
    this.selectedFamilia = f;
    this.dropdownOpen = null;
  }

  selectCategoria(c: CategoriaArticulo) {
    if (this.mostrarModalEditar) {
      this.productoAEditar.categoria_id = c.id;
    } else {
      this.nuevoProducto.categoria_id = c.id;
    }
    this.selectedCategoria = c;
    this.dropdownOpen = null;
  }

  selectSubsidio(s: Partial<Subsidio>) {
    if (this.mostrarModalEditar) {
      this.productoAEditar.subsidio_id = s.id!;
    } else {
      this.nuevoProducto.subsidio_id = s.id!;
    }
    this.selectedSubsidio = s;
    this.dropdownOpen = null;
  }

  //CREAR 
  abrirModalCrear(): void {
    this.filterFamilia = '';
    this.filterCategoria = '';
    this.filterSubsidio = '';
    this.nuevoProducto = {
      nombre: '',
      codigo_barras: '',
      descripcion: '',
      aplica_subsidio: false,
      familia_id: this.familias[0]?.id ?? 0,
      categoria_id: this.categorias[0]?.id ?? 0,
      tipo_comedor: 'desayuno',
      precio_venta: 0,
      costo: 0,
      subsidio_id: this.subsidios.length > 0
        ? this.subsidios[0].id
        : 0,
      articulo_id: 0
    };
    this.mostrarModalCrear = true;
  }

  cerrarModalCrear() {
    this.mostrarModalCrear = false;
    // reiniciar modelo
    this.nuevoProducto = {};
    this.selectedFamilia = undefined;
    this.selectedCategoria = undefined;
    this.selectedSubsidio = undefined;
    this.dropdownOpen = null;
  }

  crearProducto(form: NgForm) {
    if (form.invalid) return;
    this.productosSvc.crearProducto(this.nuevoProducto).subscribe({
      next: (created: Producto) => {
        alert(`Producto creado:\n\n${JSON.stringify(created, null, 2)}`);
        this.cerrarModalCrear();
        // opcional: refresh tabla
      },
      error: err => {
        alert(`Error al crear producto:\n\n${err.error?.message || err.message}`);
      }
    });
  }

  // Llamar cuando el usuario hace clic en “Editar”
  abrirModalEditar(producto: Producto) {
    this.productoAEditar = { ...producto };
    this.selectedFamilia = this.familias.find(f => f.id === producto.familia_id) || null;
    this.selectedCategoria = this.categorias.find(c => c.id === producto.categoria_id) || null;
    this.selectedSubsidio =
      producto.subsidio_id === 0
        ? { id: 0, nombre: 'Sin Subsidio' }
        : this.subsidios.find(s => s.id === producto.subsidio_id) || null;
    this.filterFamiliaTerm = '';
    this.filterCategoriaTerm = '';
    this.filterSubsidioTerm = '';
    this.dropdownOpen = null;
    this.mostrarModalEditar = true;
  }

  cerrarModalEditar(): void {
    this.mostrarModalEditar = false;
  }

  actualizarProducto(form: NgForm) {
    if (form.invalid) return;
    const payload = { ...this.productoAEditar };
    delete (payload as any).created_at;
    (payload as any).updated_at = new Date().toISOString();
    console.log('[Editar Producto] Payload enviado:', payload);
    this.productosSvc.editarProducto(payload.id!, payload).subscribe({
      next: updated => {
        const idx = this.productos.findIndex(p => p.id === updated.id);
        if (idx > -1) this.productos[idx] = updated;
        this.filtrar();
        this.cargarProductos();       // ← refresca toda la lista desde el backend
        this.cerrarModalEditar();
        alert('Producto actualizado correctamente');
      },
      error: err => {
        alert(`Error al actualizar: ${err.error?.message || err.message}`);
      }
    });
  }

  // ELIMINAR 
  abrirModalEliminar(producto: Producto): void {
    this.productoAEliminar = producto;
    this.mostrarModalEliminar = true;
  }

  cerrarModalEliminar(): void {
    this.mostrarModalEliminar = false;
  }

  // cierra el modal de éxito
  cerrarModalExito() {
    this.mostrarModalExito = false;
  }

  // método que dispara la eliminación
  eliminarProducto() {
    const id = this.productoAEliminar.id!;
    this.productosSvc.eliminarProducto(id).subscribe({
      next: () => {
        this.productos = this.productos.filter(p => p.id !== id);
        this.productosFiltrados = this.productosFiltrados.filter(p => p.id !== id);
        this.productoEliminado = this.productoAEliminar;
        this.cerrarModalEliminar();
        this.mostrarModalExito = true;
      },
      error: err => {
        alert(`Error al eliminar: ${err.error?.message || err.message}`);
      }
    });
  }


  //------------------------------------------familias--------------------------------------------------------------
  verFamilias(): void {
    this.mostrarFamilias = !this.mostrarFamilias;
  }
  onSearchOrPageSizeChange(): void {
    this.currentPage = 1;
  }

  /** Devuelve el total de páginas para familias */
  get familyTotalPages(): number {
    return Math.max(1, Math.ceil(this.familiasFiltradas.length / this.familyPageSize));
  }

  // total de páginas para familias
  get familiasTotalPages(): number {
    return Math.max(1, Math.ceil(this.familiasFiltradas.length / this.pageSize));
  }

  // índice inicial (1-based) de reglas mostradas
  get familiasStartIndex(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  // índice final (1-based) de reglas mostradas
  get familiasEndIndex(): number {
    const end = this.currentPage * this.pageSize;
    return Math.min(this.currentPage * this.pageSize, this.familiasTotal);
  }

  // 3. Control para que currentPage siempre esté entre 1 y totalPages
  private adjustCurrentPage() {
    if (this.currentPage > this.familiasTotalPages) {
      this.currentPage = this.familiasTotalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }
  }

  // (opcional) array de números de página si quieres botones directos
  get familiasPages(): number[] {
    return Array.from({ length: this.familiasTotalPages }, (_, i) => i + 1);
  }

  /** Ir a la página anterior (si no estamos en la 1) */
  prevPage(): void {
    console.log('prevPage() antes =', this.currentPage);
    if (this.currentPage > 1) {
      this.currentPage--;
      console.log('prevPage() después =', this.currentPage);
    }
  }

  /** Ir a la página siguiente */
  nextPage() {
    if (this.currentPage < this.familiasTotalPages) this.currentPage++;
  }

  onFilterUpdate() {
    this.currentPage = 1;
    // si necesitas otras acciones al filtrar, van aquí
  }

  loadFamilias(): void {
    this.familiasSvc.listar().subscribe({
      next: data => {
        this.familias = data;
        this.allFamilias = [...data];
      },
      error: err => console.error('Error cargando familias', err)
    });
  }

  filterFamilias(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.allFamilias = term
      ? this.familias.filter(f =>
        f.nombre.toLowerCase().includes(term)
      )
      : [...this.familias];
    this.currentPage = 1;
  }

  /** Filtrado por nombre + paginado automático */
  get familiasPaginadas(): FamiliaProducto[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.familiasFiltradas.slice(start, start + this.pageSize);
  }

  get filteredFamilias(): FamiliaProducto[] {
    const term = this.searchTermFamilias.trim().toLowerCase();
    if (!term) {
      return this.familias;
    }
    return this.familias.filter(f =>
      f.nombre.toLowerCase().includes(term) ||
      (f.descripcion ?? '').toLowerCase().includes(term)
    );
  }

  /** Total de familias tras filtro */
  get familiasTotal(): number {
    return this.familiasFiltradas.length;
  }

  // Abrir modal de crear familia
  abrirModalCrearFamilia(): void {
    this.nuevaFamilia = {
      nombre: '',
      descripcion: '',
      parent_id: null,
      empresa_id: 0
    };
    this.mostrarModalCrearFamilia = true;
  }

  // Cerrar modal de crear familia
  cerrarModalCrearFamilia(): void {
    this.mostrarModalCrearFamilia = false;
  }

  // Llamar al servicio para crear
  crearFamilia(form: NgForm): void {
    if (form.invalid) return;
    this.familiasSvc.crearFamiliaProducto(this.nuevaFamilia)
      .subscribe({
        next: fam => {
          // Añade la nueva familia al arrary y cierra modal
          this.familias.unshift(fam);
          form.resetForm();
          this.cerrarModalCrearFamilia();
        },
        error: err => {
          console.error('Error al crear familia:', err);
          this.error = 'No se pudo crear la familia.';
        }
      });
  }

  /** Para optimizar ngFor en grandes listas */
  trackByFamilia(_i: number, f: FamiliaProducto): number {
    return f.id!;
  }

  obtenerFamilias(): void {
    this.familiasSvc.listar().subscribe((data: FamiliaProducto[]) => {
      this.familias = data;
      // Construimos el mapa id → nombre
      this.parentMap = {};
      this.familias.forEach(f => this.parentMap[f.id] = f.nombre);
    });
  }

  // Método para abrir el modal de edición
  abrirModalEditarFamilia(fam: FamiliaProducto): void {
    this.familiaAEditar = { ...fam };
    this.mostrarModalEditarFamilia = true;
  }

  // Cerrar modal edición
  cerrarModalEditarFamilia(): void {
    this.mostrarModalEditarFamilia = false;
  }

  // Enviar cambios al backend
  editarFamilia(form: NgForm): void {
    if (form.invalid) return;
    const id = this.familiaAEditar.id!;
    const payload: Partial<FamiliaProducto> = {
      nombre: this.familiaAEditar.nombre!,
      descripcion: this.familiaAEditar.descripcion!,
      parent_id: this.familiaAEditar.parent_id ?? null,
      empresa_id: this.familiaAEditar.empresa_id!
    };

    this.familiasSvc.editarFamiliaProducto(id, payload)
      .subscribe({
        next: updated => {
          // Reemplazar en el array
          const idx = this.familias.findIndex(f => f.id === id);
          if (idx > -1) this.familias[idx] = updated;
          this.buildParentMap();
          this.cerrarModalEditarFamilia();
        },
        error: err => this.error = 'No se pudo actualizar la familia.'
      });
  }

  // Método para abrir el modal de eliminación
  abrirModalEliminarFamilia(fam: FamiliaProducto): void {
    this.familiaAEliminar = fam;
    this.mostrarModalEliminarFamilia = true;
  }

  // Cerrar modal eliminación
  cerrarModalEliminarFamilia(): void {
    this.mostrarModalEliminarFamilia = false;
  }

  // Confirmar y eliminar
  eliminarFamilia(): void {
    const id   = this.familiaAEliminar.id!;
    const name = this.familiaAEliminar.nombre!;

    this.familiasSvc.eliminarFamiliaProducto(id).subscribe({
      next: () => {
        // Actualizar array y mapa
        this.familias = this.familias.filter(f => f.id !== id);
        this.buildParentMap();

        // Mostrar modal de éxito
        this.lastDeletedFamilyName        = name;
        this.mostrarModalEliminacionExito = true;

        // Cerrar confirmación previa
        this.cerrarModalEliminarFamilia();
      },
      error: err => {
        console.error('Error al eliminar familia:', err);
        this.error = 'No se pudo eliminar la familia.';
      }
    });
  }

  cerrarModalEliminacionExito(): void {
    this.mostrarModalEliminacionExito = false;
  }

  importarCSV() {
    const sheet = XLSX.utils.json_to_sheet(this.familiasFiltradas);
    const csv = XLSX.utils.sheet_to_csv(sheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'familias.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  //Exporta las familias filtradas a archivo Excel (.xlsx)
  importarExcel() {
    const sheet = XLSX.utils.json_to_sheet(this.familiasFiltradas);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Familias');
    XLSX.writeFile(workbook, 'familias.xlsx');
  }





  // -------------------------------------------------------CATEGORIAS--------------------------------------------------------
  abrirModalCrearCategoria(): void {
    this.nuevaCategoria = {
      nombre: '',
      descripcion: '',
      tipo: 'pdv',
      empresa_id: 0
    };
    this.mostrarModalCrearCategoria = true;
  }

  cerrarModalCrearCategoria(): void {
    this.mostrarModalCrearCategoria = false;
  }

  // 3. Llamar al servicio para crear
  crearCategoria(form: NgForm): void {
    if (form.invalid) return;

    this.categoriasSvc.crear(this.nuevaCategoria)
      .subscribe({
        next: cat => {
          // Insertamos al inicio del array y cerramos modal
          this.categorias.unshift(cat);
          form.resetForm();
          this.cerrarModalCrearCategoria();
        },
        error: () => {
          this.error = 'No se pudo crear la categoría.';
        }
      });
  }

  cargarCategorias(): void {
    this.cargandoCategorias = true;
    this.errorCategorias = null;

    this.categoriasSvc.listar()
      .subscribe({
        next: cats => this.categorias = cats,
        error: () => this.errorCategorias = 'Error al cargar categorías.',
        complete: () => this.cargandoCategorias = false
      });
  }

  verCategorias(): void {
    this.mostrarCategorias = !this.mostrarCategorias;
    if (this.mostrarCategorias) {
      this.searchTermCategorias = '';
      this.currentCategoriaPage = 1;
    }
  }

  // Abrir/Cerrar modal editar
  abrirModalEditarCategoria(cat: CategoriaArticulo): void {
    this.categoriaAEditar = { ...cat };
    this.mostrarModalEditarCategoria = true;
  }
  cerrarModalEditarCategoria(): void {
    this.mostrarModalEditarCategoria = false;
  }

  // Enviar edición
  editarCategoria(form: NgForm): void {
    if (form.invalid) return;

    const id = this.categoriaAEditar.id!;
    const payload: Partial<CategoriaArticulo> = {
      nombre: this.categoriaAEditar.nombre!,
      descripcion: this.categoriaAEditar.descripcion,
      tipo: this.categoriaAEditar.tipo!,
      empresa_id: this.categoriaAEditar.empresa_id!
    };

    this.categoriasSvc.editar(id, payload).subscribe({
      next: updated => {
        const idx = this.categorias.findIndex(c => c.id === id);
        if (idx > -1) this.categorias[idx] = updated;
        this.cerrarModalEditarCategoria();
      },
      error: () => this.error = 'No se pudo actualizar la categoría.'
    });
  }

  // Abrir/Cerrar modal eliminar
  abrirModalEliminarCategoria(cat: CategoriaArticulo): void {
    this.categoriaAEliminar = cat;
    this.mostrarModalEliminarCategoria = true;
  }
  cerrarModalEliminarCategoria(): void {
    this.mostrarModalEliminarCategoria = false;
  }

  // Confirmar eliminación
  eliminarCategoria(): void {
    const id   = this.categoriaAEliminar.id!;
    const name = this.categoriaAEliminar.nombre!;

    this.categoriasSvc.eliminar(id).subscribe({
      next: () => {
        // Quitar del array
        this.categorias = this.categorias.filter(c => c.id !== id);
        // Cerrar el modal de confirmación
        this.cerrarModalEliminarCategoria();

        // Guardar nombre y abrir modal de éxito
        this.lastDeletedCategoriaName            = name;
        this.mostrarModalEliminacionCategoriaExito = true;
      },
      error: () => {
        this.errorCategorias = 'No se pudo eliminar la categoría.';
      }
    });
  }

  cerrarModalEliminacionCategoriaExito(): void {
    this.mostrarModalEliminacionCategoriaExito = false;
  }

  exportarCategoriasCSV(): void {
    const sheet = XLSX.utils.json_to_sheet(this.categoriasFiltradas);
    const csv   = XLSX.utils.sheet_to_csv(sheet);
    const blob  = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href      = url;
    a.download  = 'categorias.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  exportarCategoriasExcel(): void {
    const sheet    = XLSX.utils.json_to_sheet(this.categoriasFiltradas);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Categorías');
    XLSX.writeFile(workbook, 'categorias.xlsx');
  }






  

  /** Trae todos los subsidios desde el backend */
  cargarSubsidios(): void {
    this.subsidiosSvc.listarSubsidios().subscribe({
      next: (data: Subsidio[]) => this.subsidios = data,
      error: err => {
        console.error('Error al cargar subsidios', err);
        this.error = 'Error al cargar subsidios';
      }
    });
  }

  verSubsidios(): void {
    this.mostrarSubsidios = !this.mostrarSubsidios;
    if (this.mostrarSubsidios) {
      this.searchTermSubsidios = '';
      this.subsidioCurrentPage = 1;
    }
  }

  // Abrir modal
  abrirModalCrearSubsidio(): void {
    this.nuevoSubsidio = {
      nombre: '',
      porcentaje: 0,
      descripcion: '',
      empresa_id: 0,
      activo: true
    };
    this.mostrarModalCrearSubsidio = true;
  }

  // Cerrar modal
  cerrarModalCrearSubsidio(): void {
    this.mostrarModalCrearSubsidio = false;
  }

  // Crear subsidio
  crearSubsidio(form: NgForm): void {
    if (form.invalid) return;

    this.subsidiosSvc.crearSubsidio(this.nuevoSubsidio)
      .subscribe({
        next: subs => {
          // 1) recarga la lista completa
          this.cargarSubsidios();
          // 2) cierra modal y reset
          this.cerrarModalCrearSubsidio();
          form.resetForm();
        },
        error: () => this.error = 'No se pudo crear el subsidio.'
      });
  }

  // Abre el modal de edición
  abrirModalEditarSubsidio(s: Subsidio): void {
    this.subsidioAEditar = { ...s };
    this.mostrarModalEditarSubsidio = true;
  }

  // Cierra el modal de edición
  cerrarModalEditarSubsidio(): void {
    this.mostrarModalEditarSubsidio = false;
  }

  // Guarda cambios en el servidor
  actualizarSubsidio(form: NgForm): void {
    if (form.invalid) return;

    const id = this.subsidioAEditar.id!;
    const payload: Partial<Subsidio> = {
      nombre: this.subsidioAEditar.nombre!,
      porcentaje: this.subsidioAEditar.porcentaje!,
      descripcion: this.subsidioAEditar.descripcion,
      empresa_id: this.subsidioAEditar.empresa_id!,
      activo: this.subsidioAEditar.activo!
    };

    this.subsidiosSvc.editarSubsidio(id, payload).subscribe({
      next: updated => {
        const idx = this.subsidios.findIndex(x => x.id === id);
        if (idx > -1) this.subsidios[idx] = updated;
        this.cargarSubsidios();
        this.cerrarModalEditarSubsidio();
      },
      error: () => this.error = 'No se pudo actualizar el subsidio.'
    });
  }

  // Abre el modal de eliminación
  abrirModalEliminarSubsidio(s: Subsidio): void {
    this.subsidioAEliminar = s;
    this.mostrarModalEliminarSubsidio = true;
  }

  // Cierra el modal de eliminación
  cerrarModalEliminarSubsidio(): void {
    this.mostrarModalEliminarSubsidio = false;
  }

  // Elimina el subsidio en el servidor
  eliminarSubsidio(): void {
    const id   = this.subsidioAEliminar.id!;
    const name = this.subsidioAEliminar.nombre!;

    this.subsidiosSvc.eliminarSubsidio(id).subscribe({
      next: () => {
        // 1) recargar lista
        this.cargarSubsidios();
        // 2) cerrar modal de confirmación
        this.cerrarModalEliminarSubsidio();
        // 3) guardar y abrir modal de éxito
        this.lastDeletedSubsidioName = name;
        this.mostrarModalEliminacionSubsidioExito = true;
      },
      error: () => this.error = 'No se pudo eliminar el subsidio.'
    });
  }

  cerrarModalEliminacionSubsidioExito(): void {
    this.mostrarModalEliminacionSubsidioExito = false;
  }

  exportarSubsidiosCSV(): void {
    const sheet = XLSX.utils.json_to_sheet(this.subsidiosFiltrados);
    const csv   = XLSX.utils.sheet_to_csv(sheet);
    const blob  = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href      = url;
    a.download  = 'subsidios.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // 6) Exportar Excel
  exportarSubsidiosExcel(): void {
    const sheet    = XLSX.utils.json_to_sheet(this.subsidiosFiltrados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Subsidios');
    XLSX.writeFile(workbook, 'subsidios.xlsx');
  }

  // 7) trackBy para mejorar el rendimiento del *ngFor
  trackBySubsidio(_i: number, s: Subsidio): number {
    return s.id!;
  }



  /** Exportar CSV */
  exportarCsvProductos(): void {
    const rows = this.productosFiltrados.map(p => ({
      ID: p.id,
      Nombre: p.nombre,
      Código: p.codigo_barras,
      Descripción: p.descripcion,
      Subsidio: p.aplica_subsidio ? 'Sí' : 'No',
      Familia: p.familia_id,
      Categoría: p.categoria_id,
      Tipo: p.tipo_comedor,
      PrecioVenta: p.precio_venta,
      Costo: p.costo
    }));

    // Generar contenido CSV
    const header = Object.keys(rows[0]).join(',') + '\r\n';
    const body = rows
      .map(r => Object.values(r).map(val => `"${val}"`).join(','))
      .join('\r\n');
    const csv = header + body;

    // Descargar
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'productos.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Exportar Excel (XLSX) */
  exportarExcelProductos(): void {
    // Convertir a hoja de cálculo
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.productosFiltrados);
    const wb: XLSX.WorkBook = {
      Sheets: { data: ws },
      SheetNames: ['data']
    };

    // Generar archivo y descargar
    XLSX.writeFile(wb, 'productos.xlsx');
  }


}
