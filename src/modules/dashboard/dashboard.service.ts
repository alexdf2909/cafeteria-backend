import { GetDashboardQuery } from "./dashboard.dto";
import { checkExpiredLots } from "../inventoryMovement/inventoryMovement.service";
import {
    inventoryMovement,
    inventoryLot,
    lotBalance,
    item,
    sale,
    purchase,
    restockAlert,
    expirationAlert,
    inventoryCount,
    inventoryCountLine,
} from "../../db/schema";
import { and, avg, count, eq, gte, isNull, isNotNull, lt, lte, sql, sum } from "drizzle-orm";
import { db } from "../../db";

function getDefaultPeriod() {
    const now = new Date();
    const dateFrom = new Date(now.getFullYear(), now.getMonth(), 1); // inicio del mes
    const dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0); // fin del mes
    return { dateFrom, dateTo };
}

export async function getDashboardService(query: GetDashboardQuery) {
    checkExpiredLots();

    const { dateFrom, dateTo } = query.dateFrom && query.dateTo
        ? { dateFrom: query.dateFrom, dateTo: query.dateTo }
        : getDefaultPeriod();

    const [indicators, alerts, summary] = await Promise.all([
        getIndicators(dateFrom, dateTo),
        getAlerts(),
        getSummary(dateFrom, dateTo),
    ]);

    return {
        period: { dateFrom, dateTo },
        indicators,
        alerts,
        summary,
    };
}

// ─── Indicadores ─────────────────────────────────────────────────────────────

async function getIndicators(dateFrom: Date, dateTo: Date) {
    const [
        inventoryRotation,
        inventoryAccuracy,
        inventoryUtilization,
        obsolescenceRate,
        availabilityLevel,
        avgRestockTime,
    ] = await Promise.all([
        getInventoryRotation(dateFrom, dateTo),
        getInventoryAccuracy(dateFrom, dateTo),
        getInventoryUtilization(),
        getObsolescenceRate(dateFrom, dateTo),
        getAvailabilityLevel(),
        getAvgRestockTime(dateFrom, dateTo),
    ]);

    return {
        inventoryRotation,
        inventoryAccuracy,
        inventoryUtilization,
        obsolescenceRate,
        availabilityLevel,
        avgRestockTime,
    };
}

// Rotación = unidades consumidas / stock promedio
async function getInventoryRotation(dateFrom: Date, dateTo: Date) {
    const consumed = await db
        .select({
            total: sql<number>`coalesce(sum(${inventoryMovement.quantity}), 0)`,
        })
        .from(inventoryMovement)
        .where(
            and(
                eq(inventoryMovement.movementType, "consumption"),
                gte(inventoryMovement.movementDate, dateFrom),
                lte(inventoryMovement.movementDate, dateTo)
            )
        );

    const currentStock = await db
        .select({
            total: sql<number>`coalesce(sum(${lotBalance.quantity}), 0)`,
        })
        .from(lotBalance);

    const totalConsumed = Number(consumed[0]?.total ?? 0);
    const totalStock = Number(currentStock[0]?.total ?? 0);

    return totalStock > 0
        ? Number((totalConsumed / totalStock).toFixed(2))
        : 0;
}

// Exactitud = líneas sin diferencia / total líneas contadas en el período
async function getInventoryAccuracy(dateFrom: Date, dateTo: Date) {
    const total = await db
        .select({ count: count() })
        .from(inventoryCountLine)
        .innerJoin(inventoryCount, eq(inventoryCountLine.inventoryCountId, inventoryCount.id))
        .where(
            and(
                gte(inventoryCount.countDate, dateFrom),
                lte(inventoryCount.countDate, dateTo)
            )
        );

    const exact = await db
        .select({ count: count() })
        .from(inventoryCountLine)
        .innerJoin(inventoryCount, eq(inventoryCountLine.inventoryCountId, inventoryCount.id))
        .where(
            and(
                gte(inventoryCount.countDate, dateFrom),
                lte(inventoryCount.countDate, dateTo),
                sql`${inventoryCountLine.systemQuantity} = ${inventoryCountLine.countedQuantity}`
            )
        );

    const totalCount = Number(total[0]?.count ?? 0);
    const exactCount = Number(exact[0]?.count ?? 0);

    return totalCount > 0
        ? Number(((exactCount / totalCount) * 100).toFixed(2))
        : null; // null si no hay conteos en el período
}

// Utilización = stock usado / maxStock total
async function getInventoryUtilization() {
    const currentStock = await db
        .select({
            total: sql<number>`coalesce(sum(${lotBalance.quantity}), 0)`,
        })
        .from(lotBalance);

    const maxStock = await db
        .select({
            total: sql<number>`coalesce(sum(${item.maxStock}), 0)`,
        })
        .from(item)
        .where(eq(item.status, "active"));

    const totalStock = Number(currentStock[0]?.total ?? 0);
    const totalMax = Number(maxStock[0]?.total ?? 0);

    return totalMax > 0
        ? Number(((totalStock / totalMax) * 100).toFixed(2))
        : 0;
}

// Obsolescencia = unidades vencidas o dañadas / total unidades ingresadas
async function getObsolescenceRate(dateFrom: Date, dateTo: Date) {
    const lost = await db
        .select({
            total: sql<number>`coalesce(sum(${inventoryMovement.quantity}), 0)`,
        })
        .from(inventoryMovement)
        .where(
            and(
                sql`${inventoryMovement.movementType} IN ('expiration', 'damage')`,
                gte(inventoryMovement.movementDate, dateFrom),
                lte(inventoryMovement.movementDate, dateTo)
            )
        );

    const received = await db
        .select({
            total: sql<number>`coalesce(sum(${inventoryMovement.quantity}), 0)`,
        })
        .from(inventoryMovement)
        .where(
            and(
                eq(inventoryMovement.movementType, "purchase"),
                gte(inventoryMovement.movementDate, dateFrom),
                lte(inventoryMovement.movementDate, dateTo)
            )
        );

    const totalLost = Number(lost[0]?.total ?? 0);
    const totalReceived = Number(received[0]?.total ?? 0);

    return totalReceived > 0
        ? Number(((totalLost / totalReceived) * 100).toFixed(2))
        : 0;
}

// Disponibilidad = items con stock >= minStock / total items activos
async function getAvailabilityLevel() {
    const activeItems = await db
        .select({
            id: item.id,
            minStock: item.minStock,
        })
        .from(item)
        .where(eq(item.status, "active"));

    if (activeItems.length === 0) return 0;

    let available = 0;

    for (const activeItem of activeItems) {
        const stock = await db
            .select({
                total: sql<number>`coalesce(sum(${lotBalance.quantity}), 0)`,
            })
            .from(inventoryLot)
            .innerJoin(lotBalance, eq(inventoryLot.id, lotBalance.lotId))
            .where(eq(inventoryLot.itemId, activeItem.id));

        if (Number(stock[0]?.total ?? 0) >= Number(activeItem.minStock)) {
            available++;
        }
    }

    return Number(((available / activeItems.length) * 100).toFixed(2));
}

// Tiempo de reposición = promedio de días entre alerta y compra
async function getAvgRestockTime(dateFrom: Date, dateTo: Date) {
    const result = await db
        .select({
            avgDays: sql<number>`
                avg(extract(epoch from (${restockAlert.resolvedAt} - ${restockAlert.alertDate})) / 86400)
            `,
        })
        .from(restockAlert)
        .where(
            and(
                isNotNull(restockAlert.resolvedAt),
                gte(restockAlert.alertDate, dateFrom),
                lte(restockAlert.alertDate, dateTo)
            )
        );

    return result[0]?.avgDays
        ? Number(Number(result[0].avgDays).toFixed(1))
        : null;
}

// ─── Alertas ──────────────────────────────────────────────────────────────────

async function getAlerts() {
    const soonDate = new Date();
    soonDate.setDate(soonDate.getDate() + 7);

    const [restock, expiration, expiringSoon] = await Promise.all([
        // Items bajo reorderPoint sin resolver
        db.select({
            id: restockAlert.id,
            itemId: restockAlert.itemId,
            alertDate: restockAlert.alertDate,
            stockAtAlert: restockAlert.stockAtAlert,
            itemName: item.name,
        })
            .from(restockAlert)
            .innerJoin(item, eq(restockAlert.itemId, item.id))
            .where(isNull(restockAlert.resolvedAt)),

        // Lotes vencidos sin retirar
        db.select({
            id: expirationAlert.id,
            lotId: expirationAlert.lotId,
            alertDate: expirationAlert.alertDate,
            batchNumber: inventoryLot.batchNumber,
            expirationDate: inventoryLot.expirationDate,
            itemName: item.name,
        })
            .from(expirationAlert)
            .innerJoin(inventoryLot, eq(expirationAlert.lotId, inventoryLot.id))
            .innerJoin(item, eq(inventoryLot.itemId, item.id))
            .where(isNull(expirationAlert.resolvedAt)),

        // Lotes por vencer en los próximos 7 días con stock > 0
        db.select({
            lotId: inventoryLot.id,
            batchNumber: inventoryLot.batchNumber,
            expirationDate: inventoryLot.expirationDate,
            itemName: item.name,
            quantity: sql<number>`sum(${lotBalance.quantity})`,
        })
            .from(inventoryLot)
            .innerJoin(lotBalance, eq(inventoryLot.id, lotBalance.lotId))
            .innerJoin(item, eq(inventoryLot.itemId, item.id))
            .where(
                and(
                    isNotNull(inventoryLot.expirationDate),
                    gte(inventoryLot.expirationDate, new Date()),
                    lte(inventoryLot.expirationDate, soonDate),
                    sql`${lotBalance.quantity} > 0`
                )
            )
            .groupBy(inventoryLot.id, item.name),
    ]);

    return { restock, expiration, expiringSoon };
}

// ─── Resumen ──────────────────────────────────────────────────────────────────

async function getSummary(dateFrom: Date, dateTo: Date) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const [salesToday, purchasesInPeriod, itemsBelowReorder] = await Promise.all([
        // Ventas del día
        db.select({ count: count(), total: sql<number>`coalesce(sum(${sale.totalAmount}), 0)` })
            .from(sale)
            .where(
                and(
                    gte(sale.saleDate, startOfDay),
                    lte(sale.saleDate, endOfDay)
                )
            ),

        // Compras del período
        db.select({ count: count(), total: sql<number>`coalesce(sum(${purchase.totalCost}), 0)` })
            .from(purchase)
            .where(
                and(
                    gte(purchase.purchaseDate, dateFrom),
                    lte(purchase.purchaseDate, dateTo)
                )
            ),

        // Items bajo reorderPoint en warehouse
        db.select({ count: count() })
            .from(restockAlert)
            .where(isNull(restockAlert.resolvedAt)),
    ]);

    return {
        salesToday: {
            count: Number(salesToday[0]?.count ?? 0),
            total: Number(salesToday[0]?.total ?? 0),
        },
        purchasesInPeriod: {
            count: Number(purchasesInPeriod[0]?.count ?? 0),
            total: Number(purchasesInPeriod[0]?.total ?? 0),
        },
        itemsBelowReorder: Number(itemsBelowReorder[0]?.count ?? 0),
    };
}