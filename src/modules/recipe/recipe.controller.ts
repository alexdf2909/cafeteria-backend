import { asyncHandler } from "../../common/http/async.handler";
import { successResponse } from "../../common/http/http.responses";
import {
    createRecipeSchema,
    getRecipesQuerySchema,
    recipeParamsSchema,
    RecipeParams,
} from "./recipe.dto";
import {
    createRecipeService, getActiveRecipeByPresentationService,
    getRecipeByIdService,
    getRecipesService,
} from "./recipe.service";
import {PresentationParams, presentationParamsSchema} from "../product/product.dto";

export const getRecipesController = asyncHandler(async (req, res) => {
    const parsedQuery = getRecipesQuerySchema.parse(req.query);
    const result = await getRecipesService(parsedQuery);
    return successResponse(res, result.data, undefined, result.meta);
});

export const getRecipeByIdController = asyncHandler(async (req, res) => {
    const { id }: RecipeParams = recipeParamsSchema.parse(req.params);
    const result = await getRecipeByIdService(id);
    return successResponse(res, result);
});

export const createRecipeController = asyncHandler(async (req, res) => {
    const parsedBody = createRecipeSchema.parse(req.body);
    const created = await createRecipeService(parsedBody);
    return successResponse(res, created, "Recipe created successfully", undefined, 201);
});

export const getActivePresentationRecipeController = asyncHandler(async (req, res) => {
    const { id }: PresentationParams = presentationParamsSchema.parse(req.params);
    const result = await getActiveRecipeByPresentationService(id);
    return successResponse(res, result);
});