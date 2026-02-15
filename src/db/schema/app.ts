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
export const statusEnum = pgEnum("status", ["pending","completed","cancelled"]);
export const locationEnum = pgEnum("location", ["warehouse", "sales_module"]);
export const movementTypeEnum = pgEnum("movement_type", ["purchase", "transfer", "consumption", "adjustment", "expiration", "damage"]);
export const optionalTypeEnum = pgEnum("optional_type", ["exclude","extra"]);
export const promotionTypeEnum = pgEnum("promotion_type", ["combo", "buy_x_get_y", "percentage_discount", "fixed_discount"]);
export const rewardTypeEnum = pgEnum("reward_type", ["free", "percentage_discount", "fixed_price"]);

export const unit = pgTable("unit", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name", { length: 20 }).notNull(),
    symbol: varchar("symbol", { length: 10 }).notNull(),
    unitType: unitTypeEnum("unit_type").notNull().default("count"),
    toBaseFactor: numeric('to_base_factor', { precision: 12, scale: 6 }).notNull().default('1.000000'),

    ...timestamps
})

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
    minStock: numeric('min_stock', { precision: 12, scale: 4 }).notNull().default('0.00'),
    reorderPoint: numeric('reorder_point', { precision: 12, scale: 4 }).notNull().default('0.00'),
    maxStock: numeric('max_stock', { precision: 12, scale: 4 }).notNull().default('0.00'),
    isPerishable: boolean("is_perishable").notNull(),
    shelfLifeDays: integer("shelf_life_days"),
    image: text("image"),
    imageCldPubId: text("image_cld_pub_id"),

    ...timestamps,
});

export const itemPackage = pgTable("item_package", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    itemId: integer("item_id").notNull().references(() => item.id, { onDelete: "restrict" }),
    packageName: varchar("package_name", { length: 50 }),
    packageUnitId: integer("package_unit_id").notNull().references(() => unit.id, { onDelete: "restrict"}),
    packageQuantity: numeric('package_quantity', { precision: 10, scale: 2 }).notNull().default('0.00'),
    baseUnitQuantity: numeric('base_unit_quantity', { precision: 10, scale: 2 }).notNull().default('0.00'),
    barcode: varchar('barcode', { length: 50 }).notNull().unique(),

    ...timestamps,
});

export const supplier = pgTable("supplier", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name", { length: 50 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    email: varchar("email", { length: 50 }).notNull(),
    contactInfo: text("contact_info"),

    ...timestamps,
});

export const itemSupplier = pgTable("item_supplier", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    itemPackageId: integer("item_package_id").notNull().references(() => itemPackage.id, { onDelete: "restrict" }),
    supplierId: integer("supplier_id").notNull().references(() => supplier.id, { onDelete: "restrict" }),
    supplierCode: varchar("supplier_code", { length: 50 }),
    preferred: boolean("preferred").notNull(),
    lastUnitCost: numeric('last_unit_cost', { precision: 10, scale: 2 }).notNull().default('0.00'),

    ...timestamps,
});

export const purchase = pgTable("purchase", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
    supplierId: integer("supplier_id").notNull().references(() => supplier.id, { onDelete: "restrict" }),
    purchaseDate: timestamp("purchase_date").notNull(),
    totalCost: numeric('total_cost', { precision: 10, scale: 2 }).notNull().default('0.00'),
    status: statusEnum("status").notNull().default("pending"),

    ...timestamps,
    },
    (table) => ({
        idxSupplier: index("idx_purchase_supplier")
            .on(table.supplierId),

        idxDate: index("idx_purchase_date")
            .on(table.purchaseDate),
    })
);

export const purchaseItem = pgTable("purchase_item", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    purchaseId: integer("purchase_id").notNull().references(() => purchase.id, { onDelete: "restrict" }),
    itemPackageId: integer("item_package_id").notNull().references(() => itemPackage.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    unitCost: numeric('unit_cost', { precision: 10, scale: 2 }).notNull().default('0.00'),

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
    image: text("image"),
    imageCldPubId: text("image_cld_pub_id"),

    ...timestamps
})

export const productPresentation = pgTable("product_presentation", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    productId: integer("product_id").notNull().references(() => product.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 30 }).notNull(),
    price: numeric('price', { precision: 10, scale: 2 }).notNull().default('0.00'),
    isAvailable: boolean("is_available").notNull(),

    ...timestamps,
});

export const recipeItem = pgTable("recipe_item", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    productPresentationId: integer("product_presentation_id").notNull().references(() => productPresentation.id, { onDelete: "restrict" }),
    itemId: integer("item_id").notNull().references(() => item.id, { onDelete: "restrict" }),
    quantity: numeric('quantity', { precision: 12, scale: 4 }).notNull().default('0.00'),
    isOptional: boolean("is_optional").notNull(),
    optionalType: optionalTypeEnum("optional_type").notNull(),
    extraPrice: numeric('extra_price', { precision: 10, scale: 2 }).notNull().default('0.00'),

    ...timestamps,
});

export const sale = pgTable("sale", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    registeredBy: text("registered_by")
        .notNull()
        .references(() => user.id, { onDelete: "restrict" }),
    saleDate: timestamp("sale_date").notNull(),
    status: statusEnum("status").notNull().default("pending"),
    subtotalAmount: numeric('subtotal_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
    discountTotal: numeric('discount_total', { precision: 10, scale: 2 }).notNull().default('0.00'),
    taxAmount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
    totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),

    ...timestamps,
    },
    (table) => ({
        idxDateStatus: index("idx_sale_date_status")
            .on(table.saleDate, table.status),
    })
);

export const saleProduct = pgTable("sale_product", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    saleId: integer("sale_id").notNull().references(() => sale.id, { onDelete: "restrict" }),
    productPresentationId: integer("product_presentation_id").notNull().references(() => productPresentation.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull().default('0.00'),
    discountAmount: numeric('discount_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
    totalLineAmount: numeric('total_line_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
    ...timestamps,
    },
    (table) => ({
        idxSale: index("idx_sale_product_sale")
            .on(table.saleId),
    })
);

export const saleRecipeOptional = pgTable("sale_recipe_optional", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    saleProductId: integer("sale_product_id")
        .notNull()
        .references(() => saleProduct.id, { onDelete: "restrict" }),
    recipeItemId: integer("recipe_item_id")
        .notNull()
        .references(() => recipeItem.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: numeric('unit_price', { precision: 10, scale: 2 })
        .notNull()
        .default('0.00'),
    discountAmount: numeric('discount_amount', { precision: 10, scale: 2 })
        .notNull()
        .default('0.00'),
    totalAmount: numeric('total_amount', { precision: 10, scale: 2 })
        .notNull()
        .default('0.00'),

    ...timestamps,
});

export const promotion = pgTable("promotion", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    type: promotionTypeEnum("type").notNull(),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    isActive: boolean("is_active").notNull().default(true),

    ...timestamps,
});

export const promotionCondition = pgTable("promotion_condition", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    promotionId: integer("promotion_id")
        .notNull()
        .references(() => promotion.id, { onDelete: "restrict" }),
    productPresentationId: integer("product_presentation_id")
        .notNull()
        .references(() => productPresentation.id, { onDelete: "restrict" }),
    minQuantity: integer("min_quantity").notNull().default(1),

    ...timestamps,
});

export const promotionReward = pgTable("promotion_reward", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    promotionId: integer("promotion_id")
        .notNull()
        .references(() => promotion.id, { onDelete: "restrict" }),

    productPresentationId: integer("product_presentation_id")
        .references(() => productPresentation.id, { onDelete: "restrict" }),

    rewardType: rewardTypeEnum("reward_type").notNull(),

    value: numeric("value", { precision: 10, scale: 2 }).notNull(),

    quantity: integer("quantity").notNull().default(1),

    ...timestamps,
});

export const salePromotion = pgTable("sale_promotion", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    saleId: integer("sale_id")
        .notNull()
        .references(() => sale.id, { onDelete: "cascade" }),
    promotionId: integer("promotion_id")
        .notNull()
        .references(() => promotion.id, { onDelete: "restrict" }),
    discountAmount: numeric("discount_amount", {
        precision: 10,
        scale: 2,
    }).notNull(),

    ...timestamps,
});

export const inventoryLot = pgTable("inventory_lot", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    itemId: integer("item_id").notNull().references(() => item.id, { onDelete: "restrict" }),
    batchNumber: varchar("batch_number").notNull(),
    expirationDate: timestamp("expiration_date").notNull(),
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
    quantity: numeric('quantity', { precision: 12, scale: 4 }).notNull().default('0.00'),

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
    status: statusEnum("status").notNull().default("pending"),

    ...timestamps,
});

export const inventoryCountLine = pgTable("inventory_count_line", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    inventoryCountId: integer("inventory_count_id").notNull().references(() => inventoryCount.id, { onDelete: "restrict" }),
    itemId: integer("item_id").notNull().references(() => item.id, { onDelete: "restrict" }),
    systemQuantity: numeric('system_quantity', { precision: 12, scale: 4 }).notNull().default('0.00'),
    countedQuantity: numeric('counted_quantity', { precision: 12, scale: 4 }).notNull().default('0.00'),

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
    quantity: numeric('quantity', { precision: 12, scale: 4 }).notNull().default('0.00'),
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
    recipeItems: many(recipeItem),
    saleProducts: many(saleProduct),
    promotionConditions: many(promotionCondition),
    promotionRewards: many(promotionReward),
}));

export const recipeItemRelations = relations(recipeItem, ({ one, many }) => ({
    item: one(item, {
        fields: [recipeItem.itemId],
        references: [item.id],
    }),
    productPresentation: one(productPresentation, {
        fields: [recipeItem.productPresentationId],
        references: [productPresentation.id],
    }),
    saleRecipeOptionals: many(saleRecipeOptional),
}));

export const saleRelations = relations(sale, ({ one, many }) => ({
    registeredBy: one(user, {
        fields: [sale.registeredBy],
        references: [user.id],
    }),
    saleProducts: many(saleProduct),
    salePromotions: many(salePromotion),
}));

export const saleProductRelations = relations(saleProduct, ({ one, many }) => ({
    sale: one(sale, {
        fields: [saleProduct.saleId],
        references: [sale.id],
    }),
    productPresentation: one(productPresentation, {
        fields: [saleProduct.productPresentationId],
        references: [productPresentation.id],
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

export const promotionRelations = relations(promotion, ({ one, many }) => ({
    promotionConditions: many(promotionCondition),
    promotionRewards: many(promotionReward),
    salePromotions: many(salePromotion),
}));

export const promotionConditionRelations = relations(promotionCondition, ({ one, many }) => ({
    promotion: one(promotion, {
        fields: [promotionCondition.promotionId],
        references: [promotion.id],
    }),
    productPresentation: one(productPresentation, {
        fields: [promotionCondition.productPresentationId],
        references: [productPresentation.id],
    }),
}));

export const promotionRewardRelations = relations(promotionReward, ({ one, many }) => ({
    promotion: one(promotion, {
        fields: [promotionReward.promotionId],
        references: [promotion.id],
    }),
    productPresentation: one(productPresentation, {
        fields: [promotionReward.productPresentationId],
        references: [productPresentation.id],
    }),
}));

export const salePromotionRelations = relations(salePromotion, ({ one, many }) => ({
    sale: one(sale, {
        fields: [salePromotion.saleId],
        references: [sale.id],
    }),
    promotion: one(promotion, {
        fields: [salePromotion.promotionId],
        references: [promotion.id],
    }),
}));

export const inventoryLotRelations = relations(inventoryLot, ({ one, many }) => ({
    item: one(item, {
        fields: [inventoryLot.itemId],
        references: [item.id],
    }),
    lotBalances: many(lotBalance),
    inventoryMovements: many(inventoryMovement),
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

export type RecipeItem = typeof recipeItem.$inferSelect;
export type NewRecipeItem = typeof recipeItem.$inferInsert;

export type Sale = typeof sale.$inferSelect;
export type NewSale = typeof sale.$inferInsert;

export type SaleProduct = typeof saleProduct.$inferSelect;
export type NewSaleProduct = typeof saleProduct.$inferInsert;

export type SaleRecipeOptional = typeof saleRecipeOptional.$inferSelect;
export type NewSaleRecipeOptional = typeof saleRecipeOptional.$inferInsert;

export type Promotion = typeof promotion.$inferSelect;
export type NewPromotion = typeof promotion.$inferInsert;

export type PromotionCondition = typeof promotionCondition.$inferSelect;
export type NewPromotionCondition = typeof promotionCondition.$inferInsert;

export type PromotionReward = typeof promotionReward.$inferSelect;
export type NewPromotionReward = typeof promotionReward.$inferInsert;

export type SalePromotion = typeof salePromotion.$inferSelect;
export type NewSalePromotion = typeof salePromotion.$inferInsert;

export type inventoryLot = typeof inventoryLot.$inferSelect;
export type NewInventoryLot = typeof inventoryLot.$inferInsert;

export type LotBalance = typeof lotBalance.$inferSelect;
export type NewLotBalance = typeof lotBalance.$inferInsert;

export type InventoryCount = typeof inventoryCount.$inferSelect;
export type NewInventoryCount = typeof inventoryCount.$inferInsert;

export type InventoryCountLine = typeof inventoryCountLine.$inferSelect;
export type NewInventoryCountLine = typeof inventoryCountLine.$inferInsert;

export type InventoryMovement = typeof inventoryMovement.$inferSelect;
export type NewInventoryMovement = typeof inventoryMovement.$inferInsert;
