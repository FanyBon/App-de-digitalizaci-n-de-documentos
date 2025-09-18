"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SidebarComponent = void 0;
const core_1 = require("@angular/core");
const common_1 = require("@angular/common");
const router_1 = require("@angular/router");
let SidebarComponent = (() => {
    let _classDecorators = [(0, core_1.Component)({
            selector: 'app-sidebar',
            standalone: true,
            imports: [common_1.CommonModule, router_1.RouterModule],
            templateUrl: './sidebar.component.html',
            styleUrls: ['./sidebar.component.css']
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var SidebarComponent = _classThis = class {
        constructor(authService, router) {
            this.authService = authService;
            this.router = router;
            // Control de menús desplegables
            this.openSubmenu = {};
            this.isSidebarExpanded = false;
            // Variable de autenticación (usando el token específico para Control Comidas)
            this.isAuthenticated = false;
            // Variable para controlar la visualización del modal de confirmación de logout
            this.showLogoutModal = false;
        }
        ngOnInit() {
            // Se verifica si existe el token 'tokencontrolcomidas'
            const token = localStorage.getItem('tokencontrolcomidas');
            this.isAuthenticated = !!token;
        }
        toggleSubmenu(menu) {
            this.openSubmenu[menu] = !this.openSubmenu[menu];
        }
        isSubmenuOpen(menu) {
            return this.openSubmenu[menu] || false;
        }
        toggleSidebar() {
            this.isSidebarExpanded = !this.isSidebarExpanded;
        }
        // Abre el modal de confirmación para cerrar sesión
        abrirModalLogout() {
            this.showLogoutModal = true;
        }
        // Muestra confirmación antes de cerrar sesión
        confirmLogout() {
            const confirmation = confirm('¿Estás seguro de que deseas cerrar sesión?');
            if (confirmation) {
                this.logout();
            }
        }
        // Se llama si el usuario confirma el cierre de sesión.
        confirmarLogoutcontrolcoidas() {
            localStorage.removeItem('tokencontrolcomidas');
            this.isAuthenticated = false;
            // Cambia la ruta de redirección al login principal
            this.router.navigate(['/login']);
            this.showLogoutModal = false;
        }
        logout() {
            this.authService.logout();
            this.router.navigate(['/login']);
        }
        // Cancela el cierre de sesión y oculta el modal.
        cancelarLogout() {
            this.showLogoutModal = false;
        }
    };
    __setFunctionName(_classThis, "SidebarComponent");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        SidebarComponent = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return SidebarComponent = _classThis;
})();
exports.SidebarComponent = SidebarComponent;
//# sourceMappingURL=sidebar.component.js.map