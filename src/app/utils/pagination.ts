import type { IQuery } from "../interfaces";

export const buildPagination = (query: IQuery) => {
	const page = query.page ? Number(query.page) : 1;
	const limit = query.limit ? Number(query.limit) : 10;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy || "createdAt";
	const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

	return { page, limit, skip, sortBy, sortOrder };
};

export const buildMeta = (
	page: number,
	limit: number,
	total: number,
) => ({
	page,
	limit,
	total,
	totalPages: Math.ceil(total / limit) || 1,
});
