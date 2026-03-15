import { Router } from "express";
import { authorize } from "../../middlewares/authorize";
import {
    createUnitController,
    deleteUnitController,
    getUnitByIdController,
    getUnitsController,
    updateUnitController,
} from "./unit.controller";

const router = Router();

router.use(authorize()); // aplica a todas las rutas del módulo

router.get("/", getUnitsController);
router.post("/", createUnitController);
router.get("/:id", getUnitByIdController);
router.patch("/:id", updateUnitController);
router.delete("/:id", deleteUnitController);

export default router;