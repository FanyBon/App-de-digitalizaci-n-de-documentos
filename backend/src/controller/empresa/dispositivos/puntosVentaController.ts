// src/controllers/empresa/dispositivos/puntosVentaController.ts
import { Request, Response } from 'express';
import { PuntoVenta } from '../../../models/empresa/dispositivos/PuntoVenta';
import { RowDataPacket } from 'mysql2';  // ⭐ AGREGAR ESTA LÍNEA

/** Helper: Extraer contexto de auditoría */
function getAuditoriaContext(req: Request) {
    return {
        usuario_id: req.user!.id,
        usuario_nombre: req.user!.nombre_usuario,
        ip: req.ip || req.socket.remoteAddress,
        user_agent: req.get('user-agent')
    };
}

/**
 * GET /api/puntos-venta
 * Listar todos los puntos de venta
 */
export const getPuntosVenta = async (req: Request, res: Response): Promise<void> => {
    try {
        const filters: any = {};

        if (req.query.empresa_id) {
            filters.empresa_id = Number(req.query.empresa_id);
        }

        if (req.query.ubicacion_id) {
            filters.ubicacion_id = Number(req.query.ubicacion_id);
        }

        // ⭐ CAMBIADO: de 'tipo' a 'tipo_id'
        if (req.query.tipo_id) {
            filters.tipo_id = Number(req.query.tipo_id);
        }

        if (req.query.activo !== undefined) {
            filters.activo = req.query.activo === 'true';
        }

        const puntosVenta = await PuntoVenta.getAll(filters);

        res.status(200).json({
            total: puntosVenta.length,
            data: puntosVenta
        });
    } catch (error: any) {
        console.error('Error en getPuntosVenta:', error);
        res.status(500).json({ error: 'Error al obtener puntos de venta' });
    }
};

/**
 * GET /api/puntos-venta/ubicacion/:ubicacionId
 * Listar puntos de venta por ubicación
 */
export const getPuntosVentaByUbicacion = async (req: Request, res: Response): Promise<void> => {
    try {
        const ubicacionId = Number(req.params.ubicacionId);

        if (isNaN(ubicacionId)) {
            res.status(400).json({ error: 'Ubicación ID inválido' });
            return;
        }

        const puntosVenta = await PuntoVenta.getByUbicacion(ubicacionId);

        res.status(200).json({
            ubicacion_id: ubicacionId,
            total: puntosVenta.length,
            data: puntosVenta
        });
    } catch (error: any) {
        console.error('Error en getPuntosVentaByUbicacion:', error);
        res.status(500).json({ error: 'Error al obtener puntos de venta de la ubicación' });
    }
};

/**
 * GET /api/puntos-venta/empresa/:empresaId
 * Listar puntos de venta por empresa
 */
export const getPuntosVentaByEmpresa = async (req: Request, res: Response): Promise<void> => {
    try {
        const empresaId = Number(req.params.empresaId);

        if (isNaN(empresaId)) {
            res.status(400).json({ error: 'Empresa ID inválido' });
            return;
        }

        const puntosVenta = await PuntoVenta.getByEmpresa(empresaId);

        res.status(200).json({
            empresa_id: empresaId,
            total: puntosVenta.length,
            data: puntosVenta
        });
    } catch (error: any) {
        console.error('Error en getPuntosVentaByEmpresa:', error);
        res.status(500).json({ error: 'Error al obtener puntos de venta de la empresa' });
    }
};

/**
 * GET /api/puntos-venta/:id
 * Obtener un punto de venta por ID
 */
export const getPuntoVenta = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.id);

        if (isNaN(id)) {
            res.status(400).json({ error: 'ID inválido' });
            return;
        }

        const puntoVenta = await PuntoVenta.getById(id);

        if (!puntoVenta) {
            res.status(404).json({ error: 'Punto de venta no encontrado' });
            return;
        }

        const stats = await PuntoVenta.getStats(id);

        res.status(200).json({
            ...puntoVenta,
            stats
        });
    } catch (error: any) {
        console.error('Error en getPuntoVenta:', error);
        res.status(500).json({ error: 'Error al obtener punto de venta' });
    }
};

/**
 * GET /api/puntos-venta/codigo/:codigo
 * Obtener un punto de venta por código
 */
export const getPuntoVentaByCodigo = async (req: Request, res: Response): Promise<void> => {
    try {
        const codigo = req.params.codigo;

        const puntoVenta = await PuntoVenta.getByCodigo(codigo);

        if (!puntoVenta) {
            res.status(404).json({ error: 'Punto de venta no encontrado' });
            return;
        }

        res.status(200).json(puntoVenta);
    } catch (error: any) {
        console.error('Error en getPuntoVentaByCodigo:', error);
        res.status(500).json({ error: 'Error al obtener punto de venta' });
    }
};

/**
 * POST /api/puntos-venta
 * Crear nuevo punto de venta
 */
export const createPuntoVenta = async (req: Request, res: Response): Promise<void> => {
    try {
        // ⭐ CAMBIADO: de 'tipo' a 'tipo_id'
        const { codigo, nombre, ubicacion_id, empresa_id, tipo_id, activo } = req.body;

        // ⭐ CAMBIADO: validar 'tipo_id' en lugar de 'tipo'
        if (!codigo || !nombre || !ubicacion_id || !empresa_id || !tipo_id) {
            res.status(400).json({
                error: 'Campos obligatorios: codigo, nombre, ubicacion_id, empresa_id, tipo_id'
            });
            return;
        }

        const puntoVentaId = await PuntoVenta.create(
            {
                codigo,
                nombre,
                ubicacion_id,
                empresa_id,
                tipo_id,  // ⭐ CAMBIADO
                activo,
                creado_por: req.user!.id
            },
            getAuditoriaContext(req)
        );

        const nuevoPuntoVenta = await PuntoVenta.getById(puntoVentaId);

        res.status(201).json({
            mensaje: 'Punto de venta creado exitosamente',
            data: nuevoPuntoVenta
        });
    } catch (error: any) {
        console.error('Error en createPuntoVenta:', error);

        if (error.message === 'Empresa no encontrada') {
            res.status(404).json({ error: error.message });
        } else if (error.message === 'Ubicación no encontrada o inactiva') {
            res.status(404).json({ error: error.message });
        } else if (error.message === 'El código de punto de venta ya existe') {
            res.status(409).json({ error: error.message });
        } else if (error.message === 'Tipo de punto de venta no encontrado o inactivo') {  // ⭐ NUEVO
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Error al crear punto de venta' });
        }
    }
};

/**
 * PUT /api/puntos-venta/:id
 * Actualizar punto de venta
 */
export const updatePuntoVenta = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.id);

        if (isNaN(id)) {
            res.status(400).json({ error: 'ID inválido' });
            return;
        }

        // ✅ AHORA SÍ ACEPTA empresa_id y ubicacion_id
        const { codigo, nombre, tipo_id, empresa_id, ubicacion_id, activo } = req.body;

        // ⭐ VALIDACIÓN: Si se actualiza empresa Y ubicación, validar que coincidan
        if (empresa_id !== undefined && ubicacion_id !== undefined) {
            const { getPool } = await import('../../../config/db_controlcomidas');
            const pool = getPool('local');
            
            const [ubicacionRows] = await pool.query<RowDataPacket[]>(
                'SELECT id, empresa_id FROM ubicaciones WHERE id = ? AND activo = 1',
                [ubicacion_id]
            );

            if (ubicacionRows.length === 0) {
                res.status(400).json({ 
                    error: 'Ubicación no encontrada o inactiva' 
                });
                return;
            }

            if (ubicacionRows[0].empresa_id !== empresa_id) {
                res.status(400).json({ 
                    error: 'La ubicación no pertenece a la empresa seleccionada' 
                });
                return;
            }
        }

        // ⭐ Actualizar con todos los campos
        const updated = await PuntoVenta.update(
            id,
            { codigo, nombre, tipo_id, empresa_id, ubicacion_id, activo },  // ✅ Incluye empresa y ubicación
            getAuditoriaContext(req)
        );

        if (!updated) {
            res.status(404).json({ error: 'Punto de venta no encontrado o sin cambios' });
            return;
        }

        const puntoVentaActualizado = await PuntoVenta.getById(id);

        res.status(200).json({
            mensaje: 'Punto de venta actualizado exitosamente',
            data: puntoVentaActualizado
        });

        console.log(
            `✅ PUNTO_VENTA: Actualizado punto_venta_id=${id} ` +
            `por usuario_id=${req.user!.id}`
        );

    } catch (error: any) {
        console.error('Error en updatePuntoVenta:', error);

        if (error.message === 'Punto de venta no encontrado') {
            res.status(404).json({ error: error.message });
        } else if (error.message === 'El código de punto de venta ya existe') {
            res.status(409).json({ error: error.message });
        } else if (error.message === 'Tipo de punto de venta no encontrado o inactivo') {
            res.status(400).json({ error: error.message });
        } else if (error.message === 'Ubicación no encontrada o inactiva') {
            res.status(400).json({ error: error.message });
        } else if (error.message === 'Empresa no encontrada') {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Error al actualizar punto de venta' });
        }
    }
};

/**
 * DELETE /api/puntos-venta/:id
 * Desactivar punto de venta (soft delete)
 */
export const deletePuntoVenta = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.id);

        if (isNaN(id)) {
            res.status(400).json({ error: 'ID inválido' });
            return;
        }

        const deleted = await PuntoVenta.deactivate(id, getAuditoriaContext(req));

        if (!deleted) {
            res.status(404).json({ error: 'Punto de venta no encontrado' });
            return;
        }

        res.status(200).json({
            mensaje: 'Punto de venta desactivado exitosamente',
            nota: 'Para eliminarlo permanentemente usa DELETE /api/puntos-venta/:id/permanent'
        });
    } catch (error: any) {
        console.error('Error en deletePuntoVenta:', error);

        if (error.message === 'El punto de venta ya está inactivo') {
            res.status(400).json({ error: error.message });
        } else if (error.message.includes('No se puede desactivar')) {
            res.status(409).json({ error: error.message });
        } else if (error.message === 'Punto de venta no encontrado') {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Error al desactivar punto de venta' });
        }
    }
};

/**
 * DELETE /api/puntos-venta/:id/permanent
 * Eliminar permanentemente
 */
export const deletePuntoVentaPermanent = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.id);

        if (isNaN(id)) {
            res.status(400).json({ error: 'ID inválido' });
            return;
        }

        const deleted = await PuntoVenta.deletePermanently(id, getAuditoriaContext(req));

        if (!deleted) {
            res.status(404).json({ error: 'Punto de venta no encontrado' });
            return;
        }

        res.status(200).json({
            mensaje: '⚠️ Punto de venta eliminado PERMANENTEMENTE de la base de datos'
        });
    } catch (error: any) {
        console.error('Error en deletePuntoVentaPermanent:', error);

        if (error.message.includes('No se puede eliminar')) {
            res.status(409).json({ error: error.message });
        } else if (error.message === 'Punto de venta no encontrado') {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Error al eliminar punto de venta' });
        }
    }
};

/**
 * PATCH /api/puntos-venta/:id/reactivate
 * Reactivar punto de venta
 */
export const reactivatePuntoVenta = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.id);

        if (isNaN(id)) {
            res.status(400).json({ error: 'ID inválido' });
            return;
        }

        const reactivated = await PuntoVenta.reactivate(id, getAuditoriaContext(req));

        if (!reactivated) {
            res.status(404).json({ error: 'Punto de venta no encontrado' });
            return;
        }

        const puntoVenta = await PuntoVenta.getById(id);

        res.status(200).json({
            mensaje: 'Punto de venta reactivado exitosamente',
            data: puntoVenta
        });
    } catch (error: any) {
        console.error('Error en reactivatePuntoVenta:', error);

        if (error.message === 'El punto de venta ya está activo') {
            res.status(400).json({ error: error.message });
        } else if (error.message === 'Punto de venta no encontrado') {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Error al reactivar punto de venta' });
        }
    }
};

/**
 * GET /api/puntos-venta/:id/historial
 * Ver historial de auditoría
 */
export const getHistorialPuntoVenta = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.id);

        if (isNaN(id)) {
            res.status(400).json({ error: 'ID inválido' });
            return;
        }

        const historial = await PuntoVenta.getHistorial(id);

        res.status(200).json({
            punto_venta_id: id,
            total_registros: historial.length,
            historial
        });
    } catch (error: any) {
        console.error('Error en getHistorialPuntoVenta:', error);
        res.status(500).json({ error: 'Error al obtener historial' });
    }
};