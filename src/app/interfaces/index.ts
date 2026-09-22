export interface IQuery {
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
	searchTerm?: string;
	[key: string]: unknown;
}

export interface IPaginationMeta {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}
