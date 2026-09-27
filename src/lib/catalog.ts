import catalogueData from '../data/consolidated-catalogue.json';
import { NormalizedProduct, NormalizedVariant } from '@/types';
import { PublicationReadinessService } from '@/domain/catalog/PublicationReadinessService';
import { AdminOverrides } from '@/domain/admin/AdminOverrides';
import '@/domain/catalog/CatalogueSpecialistReviewService';

export type { NormalizedProduct, NormalizedVariant };

export interface Category {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  image: string;
  productCount: number;
}

export interface CatalogFilterOptions {
  categorySlug?: string;
  search?: string;
  productType?: string;
  sortBy?: 'featured' | 'price-asc' | 'price-desc' | 'name-asc';
  inStockOnly?: boolean;
}

export class CatalogService {
  private static readonly products: NormalizedProduct[] = (catalogueData as any).products;
  private static readonly categories: Category[] = (catalogueData as any).categories;

  /**
   * Returns all categories.
   */
  static getCategories(): Category[] {
    return this.categories;
  }

  /**
   * Returns a category by slug.
   */
  static getCategoryBySlug(slug: string): Category | undefined {
    return this.categories.find((c) => c.slug === slug);
  }

  /**
   * Returns filtered, searched, and sorted products for storefront display.
   */
  private static withAdminEdits(product: NormalizedProduct): NormalizedProduct {
    const edit = AdminOverrides.product(product.slug);
    if (!edit) return product;
    return {
      ...product,
      name: edit.name || product.name,
      headline: edit.headline !== undefined ? edit.headline : product.headline,
      description: edit.description !== undefined ? edit.description : product.description,
      variants: edit.priceEUR == null
        ? product.variants
        : product.variants.map((variant) => {
            const priceEUR = edit.priceEUR as number;
            const priceGBP = variant.priceEUR > 0
              ? Math.round(variant.priceGBP * (priceEUR / variant.priceEUR))
              : variant.priceGBP;
            return { ...variant, priceEUR, priceGBP };
          }),
    };
  }

  static getProducts(options: CatalogFilterOptions = {}): NormalizedProduct[] {
    let result = this.products.map((product) => this.withAdminEdits(product));

    // Filter by Category
    if (options.categorySlug && options.categorySlug !== 'all') {
      result = result.filter((p) => p.categorySlug === options.categorySlug);
    }

    // Filter by Product Type
    if (options.productType && options.productType !== 'all') {
      result = result.filter((p) => p.productType === options.productType);
    }

    // Search query across name, brand, description, and variant flavors/SKUs
    if (options.search && options.search.trim().length > 0) {
      const q = options.search.toLowerCase().trim();
      result = result.filter((p) => {
        return (
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q) ||
          p.variants.some((v) => v.flavor.toLowerCase().includes(q) || v.sku.toLowerCase().includes(q))
        );
      });
    }

    // In Stock Only
    if (options.inStockOnly) {
      result = result.filter((p) => p.variants.some((v) => v.stockLevel > 0));
    }

    // Sorting
    if (options.sortBy === 'price-asc') {
      result.sort((a, b) => (a.variants[0]?.priceEUR || 0) - (b.variants[0]?.priceEUR || 0));
    } else if (options.sortBy === 'price-desc') {
      result.sort((a, b) => (b.variants[0]?.priceEUR || 0) - (a.variants[0]?.priceEUR || 0));
    } else if (options.sortBy === 'name-asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }

  /** Storefront catalogue. Unpublished and not-yet-published governance records are excluded. */
  static getPublicProducts(options: CatalogFilterOptions = {}): NormalizedProduct[] {
    return this.getProducts(options).filter((product) => PublicationReadinessService.isPubliclyVisible(product.slug));
  }

  static getPublicProductBySlug(slug: string): NormalizedProduct | undefined {
    const product = this.getProductBySlug(slug);
    if (!product || !PublicationReadinessService.isPubliclyVisible(product.slug)) return undefined;
    return product;
  }

  /**
   * Finds a single product by slug.
   */
  static getProductBySlug(slug: string): NormalizedProduct | undefined {
    const product = this.products.find((p) => p.slug === slug);
    return product ? this.withAdminEdits(product) : undefined;
  }

  /**
   * Finds related products in the same category.
   */
  static getRelatedProducts(slug: string, limit = 3): NormalizedProduct[] {
    const current = this.getProductBySlug(slug);
    if (!current) return this.getPublicProducts().slice(0, limit);
    return this.getPublicProducts()
      .filter((p) => p.slug !== slug && p.categorySlug === current.categorySlug)
      .slice(0, limit);
  }

  /**
   * Featured products for the homepage hero carousel/grid.
   */
  static getFeaturedProducts(): NormalizedProduct[] {
    return [
      this.getProductBySlug('fusion-artisan-mushroom-chocolate-bar')!,
      this.getProductBySlug('fusion-10-bar-boutique-box')!,
      this.getProductBySlug('fusion-mushroom-fruit-gummies')!,
      this.getProductBySlug('laughing-gas-x-fusion-artisan-chocolate-bar')!,
    ].filter((product) => product && PublicationReadinessService.isPubliclyVisible(product.slug));
  }
}
