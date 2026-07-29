import { relations } from "drizzle-orm";
import {
    integer,
    pgEnum,
    pgTable,
    text,
    timestamp,
    varchar, boolean, numeric, index, uniqueIndex
} from "drizzle-orm/pg-core";
import {user} from "./auth";

const timestamps = {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
};

export const unitTypeEnum = pgEnum("unit_type", ["mass", "volume", "count"]);
export const locationEnum = pgEnum("location", ["warehouse", "sales_module"]);
export const movementTypeEnum = pgEnum("movement_type", ["purchase", "transfer", "consumption", "adjustment", "expiration", "damage","count" ]);
export const optionalTypeEnum = pgEnum("optional_type", ["exclude","extra"]);
export const itemStatusEnum = pgEnum("item_status", ["active", "inactive", "archived"]);

export const unit = pgTable("unit", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name", { length: 20 }).notNull(),
    symbol: varchar("symbol", { length: 10 }).notNull().unique(),
    unitType: unitTypeEnum("unit_type").notNull(),
    toBaseFactor: numeric('to_base_factor', { precision: 12, scale: 6 }).$type<number>().notNull(),
    isBase: boolean("is_base").notNull().default(false),
    ...timestamps
    },
    (table) => {
        return {
            namePerTypeUnique: uniqueIndex("unit_name_unit_type_unique")
                .on(table.name, table.unitType),
            unitTypeIndex: index("unit_unit_type_index")
                .on(table.unitType),
        };
    }
);

export const itemCategory = pgTable("item_category", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name", { length: 50 }).notNull(),

    ...timestamps
})

export const item = pgTable("item", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    sku: varchar("sku", { length: 12 }).notNull().unique(),
    name: varchar("name", { length: 50 }).notNull(),
    description: text("description"),
    categoryId: integer("category_id").notNull().references(() => itemCategory.id, { onDelete: "restrict"}),
    baseUnitId: integer("base_unit_id").notNull().references(() => unit.id, { onDelete: "restrict"}),
    minStock: numeric('min_stock', { precision: 12, scale: 4 }).$type<number>().notNull(),
    reorderPoint: numeric('reorder_point', { precision: 12, scale: 4 }).$type<number>().notNull(),
    maxStock: numeric('max_stock', { precision: 12, scale: 4 }).$type<number>().notNull(),
    isPerishable: boolean("is_perishable").notNull(),
    shelfLifeDays: integer("shelf_life_days"),
    status: itemStatusEnum("status").notNull().default("active"),

    ...timestamps,
});

export const itemPackage = pgTable("item_package", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    itemId: integer("item_id").notNull().references(() => item.id, { onDelete: "restrict" }),
    packageName: varchar("package_name", { length: 50 }),
    packageUnitId: integer("package_unit_id").notNull().references(() => unit.id, { onDelete: "restrict"}),
    packageQuantity: numeric('package_quantity', { precision: 10, scale: 2 }).$type<number>().notNull(),
    baseUnitQuantity: numeric('base_unit_quantity', { precision: 10, scale: 2 }).$type<number>().notNull(),
    barcode: varchar('barcode', { length: 50 }).notNull().unique(),

    ...timestamps,
});

export const supplier = pgTable("supplier", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name", { length: 50 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    email: varchar("email", { length: 50 }).notNull().unique(),
    contactInfo: text("contact_info"),
    active: boolean("active").notNull().default(true),
    ...timestamps,
});

export const itemSupplier = pgTable("item_supplier", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    itemPackageId: integer("item_package_id").notNull().references(() => itemPackage.id, { onDelete: "restrict" }),
    supplierId: integer("supplier_id").notNull().references(() => supplier.id, { onDelete: "restrict" }),
    supplierCode: varchar("supplier_code", { length: 50 }),
    preferred: boolean("preferred").notNull(),
    lastUnitCost: numeric('last_unit_cost', { precision: 10, scale: 2 }).$type<number>().notNull(),
    active: boolean("active").notNull().default(true),
    ...timestamps,
});

export const purchase = pgTable("purchase", {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        userId: text("user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
        supplierId: integer("supplier_id").notNull().references(() => supplier.id, { onDelete: "restrict" }),
        purchaseDate: timestamp("purchase_date").notNull(),
        totalCost: numeric('total_cost', { precision: 10, scale: 2 }).$type<number>().notNull(),
        notes: text("notes"), // ← útil para observaciones de la compra
        ...timestamps,
    },
    (table) => ({
        idxSupplier: index("idx_purchase_supplier").on(table.supplierId),
        idxDate: index("idx_purchase_date").on(table.purchaseDate),
    }));

export const purchaseItem = pgTable("purchase_item", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    purchaseId: integer("purchase_id").notNull().references(() => purchase.id, { onDelete: "restrict" }),
    itemPackageId: integer("item_package_id").notNull().references(() => itemPackage.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    unitCost: numeric('unit_cost', { precision: 10, scale: 2 }).$type<number>().notNull(),

    ...timestamps,
    },
    (table) => ({
        idxPurchase: index("idx_purchase_item_purchase")
            .on(table.purchaseId),
    })
);

export const productCategory = pgTable("product_category", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name", { length: 50 }).notNull(),

    ...timestamps
})

export const product = pgTable("product", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    sku: varchar("sku", { length: 20 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    categoryId: integer("category_id").notNull().references(() => productCategory.id, { onDelete: "restrict" }),
    isAvailable: boolean("is_available").notNull(),

    ...timestamps
})

export const productPresentation = pgTable("product_presentation", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    productId: integer("product_id").notNull().references(() => product.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 30 }).notNull(),
    price: numeric('price', { precision: 10, scale: 2 }).$type<number>().notNull(),
    isAvailable: boolean("is_available").notNull(),

    ...timestamps,
});

export const recipe = pgTable("recipe", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    productPresentationId: integer("product_presentation_id")
        .notNull()
        .references(() => productPresentation.id, { onDelete: "restrict" }),

    version: integer("version").notNull(),
    isActive: boolean("is_active").notNull().default(true),

    ...timestamps,
    },
    (table) => ({
        idxRecipeProductPresentation: index("idx_recipe_product_presentation")
            .on(table.productPresentationId),
    })
);

export const recipeItem = pgTable("recipe_item", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    recipeId: integer("recipe_id").notNull().references(() => recipe.id, { onDelete: "restrict" }),
    itemId: integer("item_id").notNull().references(() => item.id, { onDelete: "restrict" }),
    quantity: numeric('quantity', { precision: 12, scale: 4 }).$type<number>().notNull(),
    isOptional: boolean("is_optional").notNull(),
    optionalType: optionalTypeEnum("optional_type"),
    extraPrice: numeric('extra_price', { precision: 10, scale: 2 }).$type<number>(),

    ...timestamps,
});

export const sale = pgTable("sale", {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        registeredBy: text("registered_by")
            .notNull()
            .references(() => user.id, { onDelete: "restrict" }),
        saleDate: timestamp("sale_date").notNull(),
        totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).$type<number>().notNull(),
        notes: text("notes"),
        ...timestamps,
    },
    (table) => ({
        idxDate: index("idx_sale_date").on(table.saleDate),
    }));

export const saleProduct = pgTable("sale_product", {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        saleId: integer("sale_id").notNull().references(() => sale.id, { onDelete: "restrict" }),
        recipeId: integer("recipe_id").notNull().references(() => recipe.id, { onDelete: "restrict" }),
        quantity: integer("quantity").notNull(),
        unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).$type<number>().notNull(),
        totalLineAmount: numeric('total_line_amount', { precision: 10, scale: 2 }).$type<number>().notNull(),
        ...timestamps,
    },
    (table) => ({
        idxSale: index("idx_sale_product_sale").on(table.saleId),
        idxRecipe: index("idx_sale_product_recipe").on(table.recipeId),
    }));

export const saleRecipeOptional = pgTable("sale_recipe_optional", {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        saleProductId: integer("sale_product_id")
            .notNull()
            .references(() => saleProduct.id, { onDelete: "restrict" }),
        recipeItemId: integer("recipe_item_id")
            .notNull()
            .references(() => recipeItem.id, { onDelete: "restrict" }),
        quantity: integer("quantity").notNull().default(1),
        unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).$type<number>().notNull(),
        totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).$type<number>().notNull(),
        ...timestamps,
    },
    (table) => ({
        idxSaleProduct: index("idx_sale_recipe_optional_sale_product").on(table.saleProductId),
        idxRecipeItem: index("idx_sale_recipe_optional_recipe_item").on(table.recipeItemId),
    }));

export const inventoryLot = pgTable("inventory_lot", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    itemId: integer("item_id").notNull().references(() => item.id, { onDelete: "restrict" }),
    batchNumber: varchar("batch_number").notNull(),
    expirationDate: timestamp("expiration_date"),
    receivedAt: timestamp("received_at").notNull(),

    ...timestamps,
    },
    (table) => ({
        idxItemExpiration: index("idx_inventory_lot_item_exp")
            .on(table.itemId, table.expirationDate),
    })
);

export const lotBalance = pgTable("lot_balance", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    lotId: integer("lot_id").notNull().references(() => inventoryLot.id, { onDelete: "restrict" }),
    location: locationEnum("location").notNull().default("warehouse"),
    quantity: numeric('quantity', { precision: 12, scale: 4 }).$type<number>().notNull(),

    ...timestamps,
    },
    (table) => ({
        uqLotLocation: uniqueIndex("uq_lot_location")
            .on(table.lotId, table.location),

        idxLocation: index("idx_lot_balance_location")
            .on(table.location),
    })
);

export const inventoryCount = pgTable("inventory_count", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    countDate: timestamp("count_date").notNull(),
    location: locationEnum("location").notNull(),
    countedBy: text("counted_by")
        .notNull()
        .references(() => user.id, { onDelete: "restrict" }),
    ...timestamps,
});

export const inventoryCountLine = pgTable("inventory_count_line", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    inventoryCountId: integer("inventory_count_id").notNull().references(() => inventoryCount.id, { onDelete: "restrict" }),
    itemId: integer("item_id").notNull().references(() => item.id, { onDelete: "restrict" }),
    systemQuantity: numeric('system_quantity', { precision: 12, scale: 4 }).$type<number>().notNull(),
    countedQuantity: numeric('counted_quantity', { precision: 12, scale: 4 }).$type<number>().notNull(),

    ...timestamps,
    },
    (table) => ({
        idxCountItem: index("idx_count_line_count_item")
            .on(table.inventoryCountId, table.itemId),
    })
);


export const inventoryMovement = pgTable("inventory_movement", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    lotId: integer("lot_id").notNull().references(() => inventoryLot.id, { onDelete: "restrict" }),
    movementType: movementTypeEnum("movement_type").notNull(),
    quantity: numeric('quantity', { precision: 12, scale: 4 }).$type<number>().notNull(),
    locationFrom: locationEnum("location_from"),
    locationTo: locationEnum("location_to"),
    purchaseItemId: integer("purchase_item_id").references(() => purchaseItem.id, { onDelete: "restrict" }),
    saleProductId: integer("sale_product_id").references(() => saleProduct.id, { onDelete: "restrict" }),
    saleRecipeOptionalId: integer("sale_recipe_optional_id")
        .references(() => saleRecipeOptional.id, { onDelete: "restrict" }),
    inventoryCountLineId: integer("inventory_count_line_id").references(() => inventoryCountLine.id, { onDelete: "restrict" }),
    performedBy: text("performed_by").notNull().references(() => user.id, { onDelete: "restrict" }),
    movementDate: timestamp("movement_date").notNull(),
    notes: text("notes"),

    ...timestamps,
    },
    (table) => ({
        idxLot: index("idx_movements_lot").on(table.lotId),
        idxDate: index("idx_movements_date").on(table.movementDate),
        idxTypeDate: index("idx_movements_type_date")
            .on(table.movementType, table.movementDate),
    })
);

export const restockAlert = pgTable("restock_alert", {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        itemId: integer("item_id")
            .notNull()
            .references(() => item.id, { onDelete: "restrict" }),
        alertDate: timestamp("alert_date").notNull(),
        resolvedAt: timestamp("resolved_at"),
        purchaseId: integer("purchase_id")
            .references(() => purchase.id, { onDelete: "restrict" }),
        stockAtAlert: numeric("stock_at_alert", { precision: 12, scale: 4 })
            .$type<number>()
            .notNull(),

        ...timestamps,
    },
    (table) => ({
        idxItemResolved: index("idx_restock_alert_item_resolved")
            .on(table.itemId, table.resolvedAt),
    }));

export const expirationAlert = pgTable("expiration_alert", {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        lotId: integer("lot_id")
            .notNull()
            .references(() => inventoryLot.id, { onDelete: "restrict" }),
        alertDate: timestamp("alert_date").notNull(),
        resolvedAt: timestamp("resolved_at"),
        resolvedBy: text("resolved_by")
            .references(() => user.id, { onDelete: "restrict" }),
        ...timestamps,
    },
    (table) => ({
        idxLotResolved: index("idx_expiration_alert_lot_resolved")
            .on(table.lotId, table.resolvedAt),
    }));

export const unitRelations = relations(unit, ({ many }) => ({
    items: many(item),
    itemPackages: many(itemPackage),
}));

export const itemCategoryRelations = relations(itemCategory, ({ many }) => ({
    items: many(item),
}));

export const itemRelations = relations(item, ({ one, many }) => ({
    unit: one(unit, {
        fields: [item.baseUnitId],
        references: [unit.id],
    }),
    category: one(itemCategory, {
        fields: [item.categoryId],
        references: [itemCategory.id],
    }),
    itemPackages: many(itemPackage),
    recipeItems: many(recipeItem),
    inventoryLots: many(inventoryLot),
    inventoryCountLines: many(inventoryCountLine),
    restockAlerts: many(restockAlert),
}));

export const itemPackageRelations = relations(itemPackage, ({ one, many }) => ({
    item: one(item, {
        fields: [itemPackage.itemId],
        references: [item.id],
    }),
    unit: one(unit, {
        fields: [itemPackage.packageUnitId],
        references: [unit.id],
    }),
    itemSuppliers: many(itemSupplier),
    purchaseItems: many(purchaseItem),
}));

export const supplierRelations = relations(supplier, ({ many }) => ({
    itemSuppliers: many(itemSupplier),
    purchases: many(purchase),
}));

export const itemSupplierRelations = relations(itemSupplier, ({ one }) => ({
    itemPackage: one(itemPackage, {
        fields: [itemSupplier.itemPackageId],
        references: [itemPackage.id],
    }),
    supplier: one(supplier, {
        fields: [itemSupplier.supplierId],
        references: [supplier.id],
    }),
}));

export const purchaseRelations = relations(purchase, ({ one, many }) => ({
    user: one(user, {
        fields: [purchase.userId],
        references: [user.id],
    }),
    supplier: one(supplier, {
        fields: [purchase.supplierId],
        references: [supplier.id],
    }),
    purchaseItems: many(purchaseItem),
    restockAlerts: many(restockAlert),
}));

export const purchaseItemRelations = relations(purchaseItem, ({ one, many }) => ({
    purchase: one(purchase, {
        fields: [purchaseItem.purchaseId],
        references: [purchase.id],
    }),
    itemPackage: one(itemPackage, {
        fields: [purchaseItem.itemPackageId],
        references: [itemPackage.id],
    }),
    inventoryMovements: many(inventoryMovement),
}));

export const productCategoryRelations = relations(productCategory, ({ many }) => ({
    products: many(product),
}));

export const productRelations = relations(product, ({ one, many }) => ({
    category: one(productCategory, {
        fields: [product.categoryId],
        references: [productCategory.id],
    }),
    productPresentations: many(productPresentation),
}));

export const productPresentationRelations = relations(productPresentation, ({ one, many }) => ({
    product: one(product, {
        fields: [productPresentation.productId],
        references: [product.id],
    }),
    recipes: many(recipe),
}));

export const recipeRelations = relations(recipe, ({ one, many }) => ({
    productPresentation: one(productPresentation, {
        fields: [recipe.productPresentationId],
        references: [productPresentation.id],
    }),
    recipeItems: many(recipeItem),
}));

export const recipeItemRelations = relations(recipeItem, ({ one, many }) => ({
    recipe: one(recipe, {
        fields: [recipeItem.recipeId],
        references: [recipe.id],
    }),
    item: one(item, {
        fields: [recipeItem.itemId],
        references: [item.id],
    }),
    saleRecipeOptionals: many(saleRecipeOptional),
}));

export const saleRelations = relations(sale, ({ one, many }) => ({
    registeredBy: one(user, {
        fields: [sale.registeredBy],
        references: [user.id],
    }),
    saleProducts: many(saleProduct),
}));

export const saleProductRelations = relations(saleProduct, ({ one, many }) => ({
    sale: one(sale, {
        fields: [saleProduct.saleId],
        references: [sale.id],
    }),
    recipe: one(recipe, {
        fields: [saleProduct.recipeId],
        references: [recipe.id],
    }),
    saleRecipeOptionals: many(saleRecipeOptional),
    inventoryMovements: many(inventoryMovement),
}));

export const saleRecipeOptionalRelations = relations(saleRecipeOptional, ({ one, many }) => ({
    saleProduct: one(saleProduct, {
        fields: [saleRecipeOptional.saleProductId],
        references: [saleProduct.id],
    }),
    recipeItem: one(recipeItem, {
        fields: [saleRecipeOptional.recipeItemId],
        references: [recipeItem.id],
    }),
    inventoryMovements: many(inventoryMovement),
}));

export const inventoryLotRelations = relations(inventoryLot, ({ one, many }) => ({
    item: one(item, {
        fields: [inventoryLot.itemId],
        references: [item.id],
    }),
    lotBalances: many(lotBalance),
    inventoryMovements: many(inventoryMovement),
    expirationAlerts: many(expirationAlert),
}));

export const lotBalanceRelations = relations(lotBalance, ({ one, many }) => ({
    lot: one(inventoryLot, {
        fields: [lotBalance.lotId],
        references: [inventoryLot.id],
    }),
}));

export const inventoryCountRelations = relations(inventoryCount, ({ one, many }) => ({
    countedBy: one(user, {
        fields: [inventoryCount.countedBy],
        references: [user.id],
    }),
    inventoryCountLines: many(inventoryCountLine),
}));

export const inventoryCountLineRelations = relations(inventoryCountLine, ({ one, many }) => ({
    inventoryCount: one(inventoryCount, {
        fields: [inventoryCountLine.inventoryCountId],
        references: [inventoryCount.id],
    }),
    item: one(item, {
        fields: [inventoryCountLine.itemId],
        references: [item.id],
    }),
    inventoryMovements: many(inventoryMovement),
}));

export const inventoryMovementRelations = relations(inventoryMovement, ({ one, many }) => ({
    lot: one(inventoryLot, {
        fields: [inventoryMovement.lotId],
        references: [inventoryLot.id],
    }),
    purchaseItem: one(purchaseItem, {
        fields: [inventoryMovement.purchaseItemId],
        references: [purchaseItem.id],
    }),
    saleProduct: one(saleProduct, {
        fields: [inventoryMovement.saleProductId],
        references: [saleProduct.id],
    }),
    saleRecipeOptional: one(saleRecipeOptional, {
        fields: [inventoryMovement.saleRecipeOptionalId],
        references: [saleRecipeOptional.id],
    }),
    inventoryCountLine: one(inventoryCountLine, {
        fields: [inventoryMovement.inventoryCountLineId],
        references: [inventoryCountLine.id],
    }),
    performedBy: one(user, {
        fields: [inventoryMovement.performedBy],
        references: [user.id],
    }),
}));

export const restockAlertRelations = relations(restockAlert, ({ one }) => ({
    item: one(item, {
        fields: [restockAlert.itemId],
        references: [item.id],
    }),
    purchase: one(purchase, {
        fields: [restockAlert.purchaseId],
        references: [purchase.id],
    }),
}));

export const expirationAlertRelations = relations(expirationAlert, ({ one, many }) => ({
    user: one(user, {
        fields: [expirationAlert.resolvedBy],
        references: [user.id],
    }),
    inventoryLot: one(inventoryLot, {
        fields: [expirationAlert.lotId],
        references: [inventoryLot.id],
    })
}));

export type Unit = typeof unit.$inferSelect;
export type NewUnit = typeof unit.$inferInsert;

export type ItemCategory = typeof itemCategory.$inferSelect;
export type NewItemCategory = typeof itemCategory.$inferInsert;

export type Item = typeof item.$inferSelect;
export type NewItem = typeof item.$inferInsert;

export type ItemPackage = typeof itemPackage.$inferSelect;
export type NewItemPackage = typeof itemPackage.$inferInsert;

export type Supplier = typeof supplier.$inferSelect;
export type NewSupplier = typeof supplier.$inferInsert;

export type ItemSupplier = typeof itemSupplier.$inferSelect;
export type NewItemSupplier = typeof itemSupplier.$inferInsert;

export type Purchase = typeof purchase.$inferSelect;
export type NewPurchase = typeof purchase.$inferInsert;

export type PurchaseItem = typeof purchaseItem.$inferSelect;
export type NewPurchaseItem = typeof purchaseItem.$inferInsert;

export type ProductCategory = typeof productCategory.$inferSelect;
export type NewProductCategory = typeof productCategory.$inferInsert;

export type Product = typeof product.$inferSelect;
export type NewProduct = typeof product.$inferInsert;

export type ProductPresentation = typeof productPresentation.$inferSelect;
export type NewProductPresentation = typeof productPresentation.$inferInsert;

export type Recipe = typeof recipe.$inferSelect;
export type NewRecipe = typeof recipe.$inferInsert;

export type RecipeItem = typeof recipeItem.$inferSelect;
export type NewRecipeItem = typeof recipeItem.$inferInsert;

export type Sale = typeof sale.$inferSelect;
export type NewSale = typeof sale.$inferInsert;

export type SaleProduct = typeof saleProduct.$inferSelect;
export type NewSaleProduct = typeof saleProduct.$inferInsert;

export type SaleRecipeOptional = typeof saleRecipeOptional.$inferSelect;
export type NewSaleRecipeOptional = typeof saleRecipeOptional.$inferInsert;

export type InventoryLot = typeof inventoryLot.$inferSelect;
export type NewInventoryLot = typeof inventoryLot.$inferInsert;

export type LotBalance = typeof lotBalance.$inferSelect;
export type NewLotBalance = typeof lotBalance.$inferInsert;

export type InventoryCount = typeof inventoryCount.$inferSelect;
export type NewInventoryCount = typeof inventoryCount.$inferInsert;

export type InventoryCountLine = typeof inventoryCountLine.$inferSelect;
export type NewInventoryCountLine = typeof inventoryCountLine.$inferInsert;

export type InventoryMovement = typeof inventoryMovement.$inferSelect;
export type NewInventoryMovement = typeof inventoryMovement.$inferInsert;

export type RestockAlert = typeof restockAlert.$inferSelect;
export type NewRestockAlert = typeof restockAlert.$inferInsert;

export type ExpirationAlert = typeof expirationAlert.$inferSelect;
export type NewExpirationAlert = typeof expirationAlert.$inferInsert;