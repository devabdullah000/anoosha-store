export type PromotionScope = "store" | "categories" | "products";
export type ProductTarget = { productId: string; variantIds: string[] | null }; // null: all live variants
export type CategoryTarget = {
  categoryId: string;
  allProducts: boolean;
  products: ProductTarget[];
  excludedVariantIds: string[];
};
export type PromotionTargets = {
  scope: PromotionScope;
  categories: CategoryTarget[];
  products: ProductTarget[];
  excludedVariantIds: string[]; // applies to store scope
};
export type PromotionListRow = {
  id:string; name:string; description:string|null; discountPercentage:number;
  scope:PromotionScope; isActive:boolean; productsCount:number; variantsCount:number;
  createdAt:string; updatedAt:string;
};
export type PromotionDetail = PromotionListRow & { targets:PromotionTargets };
export type Page<T> = {data:T[];page:number;pageSize:number;total:number};
export type CatalogProduct = {
  id:string;name:string;categoryId:string;categoryName:string;hasVariants:boolean;
  variants:Array<{id:string;name:string;sku:string;stock:number}>;
};
export type CatalogPage = Page<CatalogProduct> & {categories:Array<{id:string;name:string}>};
