import { CreateItemSupplierDto, UpdateItemSupplierDto } from "./itemSupplier.dto";
import { itemSupplierRepository } from "./itemSupplier.repository";
import { itemPackageRepository } from "../itemPackage/itemPackage.repository";
import { supplierRepository } from "../supplier/supplier.repository";
import { conflict } from "../../errors/error.helpers";
import {and, eq} from "drizzle-orm";
import {itemSupplier} from "../../db/schema";

export async function createItemSupplierService(data: CreateItemSupplierDto) {

    await supplierRepository.findByIdOrFail(data.supplierId);
    await itemPackageRepository.findByIdOrFail(data.itemPackageId);

    // Verificar que la relación no exista ya
    const existing = await itemSupplierRepository.findBySupplierAndPackage(
        data.supplierId,
        data.itemPackageId
    );

    if (existing) {
        if (!existing.active) {
            // Si existe pero está inactiva, reactivarla en vez de crear duplicado
            return itemSupplierRepository.update(existing.id, {
                ...data,
                active: true,
            });
        }
        throw conflict("This supplier already provides this package");
    }

    // Si se marca como preferred, verificar que no haya otro preferred activo
    if (data.preferred) {
        await ensureUniquePreferred(data.itemPackageId);
    }

    return itemSupplierRepository.create(data);
}

export async function updateItemSupplierService(
    itemSupplierId: number,
    data: UpdateItemSupplierDto
) {
    await itemSupplierRepository.findByIdOrFail(itemSupplierId);

    if (data.preferred === true) {
        const current = await itemSupplierRepository.findByIdOrFail(itemSupplierId);
        await ensureUniquePreferred(current.itemPackageId, itemSupplierId);
    }

    return itemSupplierRepository.update(itemSupplierId, data);
}

// funcion interna - solo un supplier puede ser preferred por itemPackage
async function ensureUniquePreferred(itemPackageId: number, excludeId?: number) {
    const preferred = await itemSupplierRepository.findOne(
        and(
            eq(itemSupplier.itemPackageId, itemPackageId),
            eq(itemSupplier.preferred, true),
            eq(itemSupplier.active, true)
        )!
    );

    if (preferred && preferred.id !== excludeId) {
        throw conflict("This package already has a preferred supplier");
    }
}