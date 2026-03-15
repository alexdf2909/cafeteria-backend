import type { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth";
import { fromNodeHeaders } from "better-auth/node";
import type { Role } from "../db/schema";
import { unauthorized, forbidden } from "../errors/error.helpers";
import { errorResponse } from "../common/http/http.responses";

export const authorize =
    (allowedRoles?: Role[]) =>
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                const session = await auth.api.getSession({
                    headers: fromNodeHeaders(req.headers),
                });

                if (!session) {
                    return errorResponse(res, 401, {
                        type: "unauthorized",
                        message: "Unauthorized",
                    });
                }

                const user = session.user;

                if (!user.active) {
                    return errorResponse(res, 403, {
                        type: "forbidden",
                        message: "Account disabled",
                    });
                }

                const role = user.role as Role;

                if (allowedRoles && !allowedRoles.includes(role)) {
                    return res.status(403).json({ error: "Forbidden" });
                }

                req.user = {
                    ...user,
                    role,
                };

                next();
            } catch (error) {
                console.error("[authorize]", error);
                return errorResponse(res, 401, {
                    type: "unauthorized",
                    message: "Invalid session",
                });
            }
        };