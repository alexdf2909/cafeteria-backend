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
import {inArray} from "drizzle-orm/sql/expressions/conditions";

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
        getInventoryUtilization(dateFrom, dateTo),
        getObsolescenceRate(dateFrom, dateTo),
        getAvailabilityLevel(dateFrom, dateTo),
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
    // Consumo en período
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

    // Compras en período
    const purchases = await db
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

    // Obsoletos en período
    const obsolete = await db
        .select({
            total: sql<number>`coalesce(sum(${inventoryMovement.quantity}), 0)`,
        })
        .from(inventoryMovement)
        .where(
            and(
                inArray(inventoryMovement.movementType, ["expiration", "damage"]),
                gte(inventoryMovement.movementDate, dateFrom),
                lte(inventoryMovement.movementDate, dateTo)
            )
        );

    // Stock final actual
    const currentStock = await db
        .select({
            total: sql<number>`coalesce(sum(${lotBalance.quantity}), 0)`,
        })
        .from(lotBalance);

    const totalConsumed = Number(consumed[0]?.total ?? 0);
    const totalPurchases = Number(purchases[0]?.total ?? 0);
    const totalObsolete = Number(obsolete[0]?.total ?? 0);
    const stockFinal = Number(currentStock[0]?.total ?? 0);

    // Stock inicial = stock final - compras + consumo + obsoletos
    const stockInicial = stockFinal - totalPurchases + totalConsumed + totalObsolete;

    // Inventario promedio = (stock inicial + stock final) / 2
    const inventarioPromedio = (stockInicial + stockFinal) / 2;

    return inventarioPromedio > 0
        ? Number((totalConsumed / inventarioPromedio).toFixed(2))
        : 0;
}

// Exactitud — filtrar conteos por fecha
async function getInventoryAccuracy(dateFrom: Date, dateTo: Date) {
    const countLines = await db
        .select({
            systemQuantity: inventoryCountLine.systemQuantity,
            countedQuantity: inventoryCountLine.countedQuantity,
        })
        .from(inventoryCountLine)
        .innerJoin(inventoryCount, eq(inventoryCountLine.inventoryCountId, inventoryCount.id))
        .where(
            and(
                gte(inventoryCount.countDate, dateFrom),
                lte(inventoryCount.countDate, dateTo)
            )
        );

    if (countLines.length === 0) return null;

    const validLines = countLines.filter(l => Number(l.systemQuantity) > 0);
    if (validLines.length === 0) return null;

    const totalAccuracy = validLines.reduce((sum, line) => {
        return sum + (Number(line.countedQuantity) / Number(line.systemQuantity)) * 100;
    }, 0);

    return Number((totalAccuracy / validLines.length).toFixed(2));
}

async function getInventoryUtilization(dateFrom: Date, dateTo: Date) {
    // Consumo = sum movimientos tipo consumption en el período
    const consumption = await db
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

    // Stock inicial = stock actual + consumo - compras (en el período)
    const purchases = await db
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

    const currentStock = await db
        .select({
            total: sql<number>`coalesce(sum(${lotBalance.quantity}), 0)`,
        })
        .from(lotBalance);

    const stockFinal = Number(currentStock[0]?.total ?? 0);
    const totalPurchases = Number(purchases[0]?.total ?? 0);
    const totalConsumption = Number(consumption[0]?.total ?? 0);

    // Inventario disponible = Stock inicial + Compras - Stock final
    // Stock inicial = Stock final - Compras + Consumo
    const stockInicial = stockFinal - totalPurchases + totalConsumption;
    const inventarioDisponible = stockInicial + totalPurchases - stockFinal;

    // Inventario disponible = Consumo (simplificado)
    // En realidad: disponible = stockInicial + compras
    const disponible = stockInicial + totalPurchases;

    return disponible > 0
        ? Number(((totalConsumption / disponible) * 100).toFixed(2))
        : 0;
}

// Obsolescencia = unidades vencidas o dañadas / total unidades ingresadas
async function getObsolescenceRate(dateFrom: Date, dateTo: Date) {
    // Inventario obsoleto = vencidos + dañados en el período
    const obsolete = await db
        .select({
            total: sql<number>`coalesce(sum(${inventoryMovement.quantity}), 0)`,
        })
        .from(inventoryMovement)
        .where(
            and(
                inArray(inventoryMovement.movementType, ["expiration", "damage"]),
                gte(inventoryMovement.movementDate, dateFrom),
                lte(inventoryMovement.movementDate, dateTo)
            )
        );

    // Stock inicial + Stock final para promedio
    const currentStock = await db
        .select({
            total: sql<number>`coalesce(sum(${lotBalance.quantity}), 0)`,
        })
        .from(lotBalance);

    const purchases = await db
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

    const consumption = await db
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

    const stockFinal = Number(currentStock[0]?.total ?? 0);
    const totalPurchases = Number(purchases[0]?.total ?? 0);
    const totalConsumption = Number(consumption[0]?.total ?? 0);
    const totalObsolete = Number(obsolete[0]?.total ?? 0);

    const stockInicial = stockFinal - totalPurchases + totalConsumption + totalObsolete;
    const inventarioPromedio = (stockInicial + stockFinal) / 2;

    return inventarioPromedio > 0
        ? Number(((totalObsolete / inventarioPromedio) * 100).toFixed(2))
        : 0;
}

// Disponibilidad — filtrar stock al final del período
async function getAvailabilityLevel(dateFrom: Date, dateTo: Date) {
    const items = await db
        .select({
            id: item.id,
            reorderPoint: item.reorderPoint,
        })
        .from(item)
        .where(eq(item.status, "active"));

    if (items.length === 0) return 0;

    const itemsAvailability = await Promise.all(
        items.map(async (i) => {
            // Stock al final del período
            const stock = await db
                .select({
                    total: sql<number>`coalesce(sum(${lotBalance.quantity}), 0)`,
                })
                .from(lotBalance)
                .innerJoin(inventoryLot, eq(lotBalance.lotId, inventoryLot.id))
                .where(eq(inventoryLot.itemId, i.id));

            const totalStock = Number(stock[0]?.total ?? 0);
            const reorderPoint = Number(i.reorderPoint);

            return reorderPoint > 0
                ? Math.min((totalStock / reorderPoint) * 100, 100)
                : 100;
        })
    );

    const avg = itemsAvailability.reduce((sum, a) => sum + a, 0) / items.length;
    return Number(avg.toFixed(2));
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

export async function getIndicatorsByItemService(query?: { dateFrom?: Date; dateTo?: Date }) {
    const { dateFrom, dateTo } = query?.dateFrom && query?.dateTo
        ? { dateFrom: query.dateFrom, dateTo: query.dateTo }
        : getDefaultPeriod();

    const items = await db
        .select({
            id: item.id,
            name: item.name,
            sku: item.sku,
            reorderPoint: item.reorderPoint,
            minStock: item.minStock,
            maxStock: item.maxStock,
        })
        .from(item)
        .where(eq(item.status, "active"));

    const result = await Promise.all(
        items.map(async (i) => {
            // Stock actual
            const stockResult = await db
                .select({ total: sql<number>`coalesce(sum(${lotBalance.quantity}), 0)` })
                .from(lotBalance)
                .innerJoin(inventoryLot, eq(lotBalance.lotId, inventoryLot.id))
                .where(eq(inventoryLot.itemId, i.id));
            const stockActual = Number(stockResult[0]?.total ?? 0);

            // Consumo en período
            const consumptionResult = await db
                .select({ total: sql<number>`coalesce(sum(${inventoryMovement.quantity}), 0)` })
                .from(inventoryMovement)
                .innerJoin(inventoryLot, eq(inventoryMovement.lotId, inventoryLot.id))
                .where(
                    and(
                        eq(inventoryLot.itemId, i.id),
                        eq(inventoryMovement.movementType, "consumption"),
                        gte(inventoryMovement.movementDate, dateFrom),
                        lte(inventoryMovement.movementDate, dateTo)
                    )
                );
            const consumo = Number(consumptionResult[0]?.total ?? 0);

            // Compras en período
            const purchasesResult = await db
                .select({ total: sql<number>`coalesce(sum(${inventoryMovement.quantity}), 0)` })
                .from(inventoryMovement)
                .innerJoin(inventoryLot, eq(inventoryMovement.lotId, inventoryLot.id))
                .where(
                    and(
                        eq(inventoryLot.itemId, i.id),
                        eq(inventoryMovement.movementType, "purchase"),
                        gte(inventoryMovement.movementDate, dateFrom),
                        lte(inventoryMovement.movementDate, dateTo)
                    )
                );
            const compras = Number(purchasesResult[0]?.total ?? 0);

            // Obsoletos en período
            const obsoleteResult = await db
                .select({ total: sql<number>`coalesce(sum(${inventoryMovement.quantity}), 0)` })
                .from(inventoryMovement)
                .innerJoin(inventoryLot, eq(inventoryMovement.lotId, inventoryLot.id))
                .where(
                    and(
                        eq(inventoryLot.itemId, i.id),
                        inArray(inventoryMovement.movementType, ["expiration", "damage"]),
                        gte(inventoryMovement.movementDate, dateFrom),
                        lte(inventoryMovement.movementDate, dateTo)
                    )
                );
            const obsoletos = Number(obsoleteResult[0]?.total ?? 0);

            // Exactitud — conteos del item
            const countLinesResult = await db
                .select({
                    systemQuantity: inventoryCountLine.systemQuantity,
                    countedQuantity: inventoryCountLine.countedQuantity,
                })
                .from(inventoryCountLine)
                .where(eq(inventoryCountLine.itemId, i.id));

            const validCountLines = countLinesResult.filter(l => Number(l.systemQuantity) > 0);
            const exactitud = validCountLines.length > 0
                ? Number((validCountLines.reduce((sum, l) =>
                    sum + (Number(l.countedQuantity) / Number(l.systemQuantity)) * 100, 0
                ) / validCountLines.length).toFixed(2))
                : null;

            // Cálculos
            const stockInicial = stockActual - compras + consumo + obsoletos;
            const inventarioDisponible = stockInicial + compras;
            const inventarioPromedio = (stockInicial + stockActual) / 2;

            const rotacion = inventarioPromedio > 0
                ? Number((consumo / inventarioPromedio).toFixed(2))
                : 0;

            const utilizacion = inventarioDisponible > 0
                ? Number(((consumo / inventarioDisponible) * 100).toFixed(2))
                : 0;

            const obsolescencia = inventarioPromedio > 0
                ? Number(((obsoletos / inventarioPromedio) * 100).toFixed(2))
                : 0;

            const disponibilidad = Number(i.reorderPoint) > 0
                ? Number((Math.min(stockActual / Number(i.reorderPoint), 1) * 100).toFixed(2))
                : 100;

            // Tiempo de reposición del item
            const restockResult = await db
                .select({
                    alertDate: restockAlert.alertDate,
                    resolvedAt: restockAlert.resolvedAt,
                })
                .from(restockAlert)
                .where(
                    and(
                        eq(restockAlert.itemId, i.id),
                        isNotNull(restockAlert.resolvedAt),
                        gte(restockAlert.alertDate, dateFrom),
                        lte(restockAlert.alertDate, dateTo)
                    )
                );

            const tiempoReposicion = restockResult.length > 0
                ? Number((restockResult.reduce((sum, r) => {
                    const days = (new Date(r.resolvedAt!).getTime() - new Date(r.alertDate).getTime())
                        / (1000 * 60 * 60 * 24);
                    return sum + days;
                }, 0) / restockResult.length).toFixed(2))
                : null;

            return {
                id: i.id,
                name: i.name,
                sku: i.sku,
                stockActual,
                rotacion,
                exactitud,
                utilizacion,
                obsolescencia,
                disponibilidad,
                tiempoReposicion,
            };
        })
    );

    return result;
}