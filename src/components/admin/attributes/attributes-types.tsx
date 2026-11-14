export type AttributeValueType =
  | "text"
  | "number"
  | "boolean"
  | "color";

export type AttributeDisplayType =
  | "dropdown"
  | "button"
  | "color";

export type Attribute = {
  id: string;
  name: string;
  valueType: AttributeValueType;
  unit: string | null;
  displayType: AttributeDisplayType;
  createdAt: string;
  updatedAt: string;
};

export type AttributePagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type AttributeListResponse = {
  success: true;
  message: string;
  data: Attribute[];
  pagination: AttributePagination;
};

export type AttributeMutationResponse = {
  success: true;
  message: string;
  data: Attribute;
};

export type ApiErrorResponse = {
  success: false;
  message: string;
};