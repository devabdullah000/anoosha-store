export type Category = {
  id: string;
  name: string;
  description: string | null;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CategoryPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type CategoryListResponse = {
  success: true;
  message: string;
  data: Category[];
  pagination: CategoryPagination;
};

export type CategoryMutationResponse = {
  success: true;
  message: string;
  data: Category;
};

export type ApiErrorResponse = {
  success: false;
  message: string;
};