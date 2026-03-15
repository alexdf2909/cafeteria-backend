import { BaseRepository } from "../../common/db/base.repository";
import {NewUser, user} from "../../db/schema";
import {GetUsersQuery, UpdateUserDto} from "./user.dto";
import {buildPagination} from "../../common/http/pagination.helpers";
import {buildWhereClause, countRows} from "../../common/db/db.helpers";
import {desc, eq, getTableColumns, ilike, or} from "drizzle-orm";
import {db} from "../../db";

export class UserRepository extends BaseRepository<typeof user, NewUser, UpdateUserDto, string> {
    constructor() {
        super(user, user.id, "User");
    }

    async getUsers(query: GetUsersQuery) {
        const { search, role, active, page, limit } = query;

        const { currentPage, limitPerPage, offset } =
            buildPagination(page, limit);

        const whereClause = buildWhereClause([
            search
                ? or(
                    ilike(user.name, `%${search}%`),
                    ilike(user.email, `%${search}%`),
                )
                : undefined,
            role ? eq(user.role, role) : undefined,
            active ? eq(user.active, active) : undefined,
        ]);

        const total = await countRows(user, whereClause);

        const data = await db
            .select(getTableColumns(user))
            .from(user)
            .where(whereClause)
            .orderBy(desc(user.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        return {
            data,
            total,
            currentPage,
            limitPerPage,
        };
    }


}

export const userRepository = new UserRepository();