import { Router } from "express";
import { authorize } from "../../middlewares/authorize";
import {
    getMovementsController,
    getStockByItemController,
    getExpiredAlertsController,
    transferStockController,
    adjustStockController,
    damageStockController,
    resolveExpirationController, getLotsByItemController, manualExpirationController,
} from "./inventoryMovement.controller";

const router = Router();

router.use(authorize());

// ─── Queries ─────────────────────────────────────────────────────────────────
router.get("/", getMovementsController);
router.get("/expired-alerts", getExpiredAlertsController);
router.get("/stock/:id", getStockByItemController);
router.get("/lots/:id", getLotsByItemController);

// ─── Mutations ───────────────────────────────────────────────────────────────
router.post("/transfer", transferStockController);
router.post("/adjustment", adjustStockController);
router.post("/damage", damageStockController);
router.post("/expiration", resolveExpirationController);
router.post("/expiration-manual", manualExpirationController);

export default router;