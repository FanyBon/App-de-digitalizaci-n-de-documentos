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
exports.HeaderComponent = void 0;
// src/app/components/header/header.component.ts
const core_1 = require("@angular/core");
const common_1 = require("@angular/common");
const router_1 = require("@angular/router");
let HeaderComponent = (() => {
    let _classDecorators = [(0, core_1.Component)({
            selector: 'app-header',
            standalone: true,
            imports: [common_1.CommonModule, router_1.RouterModule],
            templateUrl: './header.component.html',
            styleUrls: ['./header.component.css']
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var HeaderComponent = _classThis = class {
        constructor(router, authService) {
            this.router = router;
            this.authService = authService;
            this.userName = 'Usuario';
            this.showUserMenu = false;
            this.showNotifications = false;
            this.notificationCount = 1;
            // Modal de confirmación de cierre de sesión
            this.showLogoutConfirmModal = false;
        }
        ngOnInit() {
            // Obtener el nombre de usuario almacenado en el servicio de autenticación
            this.userName = this.authService.getUserName() || 'Usuario';
        }
        toggleUserMenu() {
            this.showUserMenu = !this.showUserMenu;
            this.showNotifications = false;
        }
        toggleNotificationsMenu() {
            this.showNotifications = !this.showNotifications;
            this.showUserMenu = false;
        }
        goToNotifications() {
            this.router.navigate(['/notificaciones']);
        }
        onUserInfo() {
            this.router.navigate(['/cuenta']);
        }
        onSettings() {
            this.router.navigate(['/ajustes']);
        }
        // Muestra el modal de confirmación de cierre de sesión
        confirmLogout() {
            this.showLogoutConfirmModal = true;
        }
        // Cierra sesión si el usuario confirma
        onLogoutConfirmed(confirm) {
            if (confirm) {
                this.authService.logout();
                this.router.navigate(['/login']);
            }
            this.showLogoutConfirmModal = false;
        }
    };
    __setFunctionName(_classThis, "HeaderComponent");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        HeaderComponent = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return HeaderComponent = _classThis;
})();
exports.HeaderComponent = HeaderComponent;
//# sourceMappingURL=header.component.js.map