import express from 'express';

import cors from 'cors';
import unitRouter from "./modules/unit/unit.route";
import itemRouter from "./modules/item/item.route"
import itemCategoryRouter from "./modules/itemCategory/itemCategory.route"
import {errorHandler} from "./errors/errorHandler";
import dashboardRouter from "./modules/dashboard/dashboard.route";
import itemPackageRouter from "./modules/itemPackage/itemPackage.route";
import itemSupplierRouter from "./modules/itemSupplier/itemSupplier.route";
import supplierRouter from "./modules/supplier/supplier.route";
import purchaseRouter from "./modules/purchase/purchase.route";
import productRouter from "./modules/product/product.route";
import productCategoryRouter from "./modules/productCategory/productCategory.route";
import recipeRouter from "./modules/recipe/recipe.route";
import saleRouter from "./modules/sale/sale.route";
import inventoryMovementRouter from "./modules/inventoryMovement/inventoryMovement.route";
import inventoryCountRouter from "./modules/inventoryCount/inventoryCount.route";
import userRouter from "./modules/user/user.route";
import {toNodeHandler} from "better-auth/node";
import {auth} from "./lib/auth";

const app = express();
const PORT = process.env.PORT ?? 8000;

app.use(
    cors({
        origin: process.env.FRONTEND_URL, // React app URL
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"], // Specify allowed HTTP methods
        credentials: true, // allow cookies
    })
);

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.use("/api/dashboard", dashboardRouter);
app.use("/api/units", unitRouter);
app.use("/api/item-categories", itemCategoryRouter);
app.use("/api/items", itemRouter);
app.use("/api/item-packages", itemPackageRouter);
app.use("/api/item-suppliers", itemSupplierRouter);
app.use("/api/suppliers", supplierRouter);
app.use("/api/purchases", purchaseRouter);
app.use("/api/product-categories", productCategoryRouter);
app.use("/api/products", productRouter);
app.use("/api/recipes", recipeRouter);
app.use("/api/sales", saleRouter);
app.use("/api/inventory", inventoryMovementRouter);
app.use("/api/inventory-counts", inventoryCountRouter);
app.use("/api/users", userRouter);

app.use(errorHandler);

app.get("/", (req, res) => {
    res.send("Backend server is running!");
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});