import { BaseRepository } from "../../common/db/base.repository";
import { itemSupplier, NewItemSupplier } from "../../db/schema";
import { UpdateItemSupplierDto } from "./itemSupplier.dto";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";

export class ItemSupplierRepository extends BaseRepository <
typeof itemSupplier,
    NewItemSupplier,
    UpdateItemSupplierDto,
    number
> {
    constructor() {
        super(itemSupplier, itemSupplier.id, "ItemSupplier");
    }

    async findBySupplierAndPackage(supplierId: number, itemPackageId: number) {
        return this.findOne(
            and(
                eq(itemSupplier.supplierId, supplierId),
                eq(itemSupplier.itemPackageId, itemPackageId)
            )!
        );
    }

    async deactivateBySupplier(supplierId: number) {
        await db
            .update(itemSupplier)
            .set({ active: false })
            .where(eq(itemSupplier.supplierId, supplierId));
    }
}

export const itemSupplierRepository = new ItemSupplierRepository();