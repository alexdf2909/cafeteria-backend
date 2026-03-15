import {CreateUserDto, GetUsersQuery, UpdateUserDto} from "./user.dto";
import { eq } from "drizzle-orm";
import { user } from "../../db/schema";
import { auth } from "../../lib/auth";
import { buildPaginationMeta} from "../../common/http/pagination.helpers";
import { ensureUnique} from "../../common/db/db.helpers";
import {badRequest, forbidden} from "../../errors/error.helpers";
import {userRepository} from "./user.repository";

export async function getUsersService(query: GetUsersQuery) {

    const result = await userRepository.getUsers(query);

    return {
        data: result.data,
        meta: buildPaginationMeta(
            result.currentPage,
            result.limitPerPage,
            result.total
        ),
    };
}

export async function getUserByIdService(userId: string, currentUserId: string, currentRole: string) {
    if (currentRole === "empleado" && userId !== currentUserId) {
        throw forbidden("You can only view your own account");
    }
    return userRepository.findByIdOrFail(userId);
}

export async function createUserService(data: CreateUserDto) {

    await ensureUnique(
        user,
        eq(user.email, data.email),
        "Email already used"
    );

    const created = await auth.api.signUpEmail({
        body: {
            name: data.name,
            email: data.email,
            password: data.password,
        },
    });

    return userRepository.update(created.user.id, {
        role: data.role,
    })
}

export async function updateUserService(userId: string, data: UpdateUserDto, currentUserId: string, currentRole: string) {
    await userRepository.findByIdOrFail(userId);

    if (currentRole === "empleado" && userId !== currentUserId) {
        throw forbidden("You can only update your own account");
    }

    // estas validaciones solo aplican si te editas a ti mismo
    if (currentUserId === userId && data.role) {
        throw badRequest("You cannot change your own role");
    }

    if (currentUserId === userId && data.active === false) {
        throw badRequest("You cannot deactivate your own account");
    }

    return userRepository.update(userId, data);
}


