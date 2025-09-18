import { Router } from "express";
import { listarChips, crearChip, editarChip, eliminarChip } from "../../controller/inventario/chipsController";

const router = Router();

// CRUD para los detalles de chips
router.get("/inventario/chips", listarChips);
router.post("/inventario/chips", crearChip);
router.put("/inventario/chips/:id", editarChip);
router.delete("/inventario/chips/:id", eliminarChip);

export default router;
