// ===================================================
// FUSION MUSHROOM BARS EU - PRODUCT DATA QUALITY AUDIT
// Catalogue Integrity & Merchandising Compliance Engine
// ===================================================

import { NormalizedProduct } from '@/types';

export interface QualityIssue {
  productId: string;
  productName: string;
  variantId?: string;
  sku?: string;
  severity: 'ERROR' | 'WARNING';
  field: string;
  message: string;
}

export interface ProductDataQualityReport {
  timestamp: string;
  totalProductsAudited: number;
  totalVariantsAudited: number;
  cleanProductsCount: number;
  flaggedProductsCount: number;
  issueCounts: {
    missingPrimaryImage: number;
    missingPrice: number;
    zeroPrice: number;
    missingCategory: number;
    missingShortDescription: number;
    missingWeight: number;
    suspiciousSku: number;
    dosageOrClaimWarning: number;
  };
  issues: QualityIssue[];
  passed: boolean;
}

export class ProductQualityAuditService {
  /**
   * Performs an exhaustive programmatic audit across all products in the catalogue.
   */
  static auditCatalogue(products: NormalizedProduct[]): ProductDataQualityReport {
    const issues: QualityIssue[] = [];
    let missingPrimaryImage = 0;
    let missingPrice = 0;
    let zeroPrice = 0;
    let missingCategory = 0;
    let missingShortDescription = 0;
    let missingWeight = 0;
    let suspiciousSku = 0;
    let dosageOrClaimWarning = 0;

    let totalVariantsAudited = 0;
    const flaggedProductIds = new Set<string>();

    for (const prod of products) {
      // 1. Primary Image check
      if (!prod.primaryImage || prod.primaryImage.trim().length === 0) {
        missingPrimaryImage++;
        flaggedProductIds.add(prod.id);
        issues.push({
          productId: prod.id,
          productName: prod.name,
          severity: 'ERROR',
          field: 'primaryImage',
          message: 'Product lacks a valid primary image URL',
        });
      }

      // 2. Category check
      if (!prod.categorySlug || !prod.categoryName) {
        missingCategory++;
        flaggedProductIds.add(prod.id);
        issues.push({
          productId: prod.id,
          productName: prod.name,
          severity: 'ERROR',
          field: 'categorySlug',
          message: 'Product is not mapped to any valid catalogue category',
        });
      }

      // 3. Short description check
      if (!prod.shortDescription || prod.shortDescription.trim().length === 0) {
        missingShortDescription++;
        flaggedProductIds.add(prod.id);
        issues.push({
          productId: prod.id,
          productName: prod.name,
          severity: 'ERROR',
          field: 'shortDescription',
          message: 'Product missing customer-facing short description summary',
        });
      }

      // 4. Content claims & dosage wording check
      const fullText = `${prod.name} ${prod.headline} ${prod.shortDescription} ${prod.description}`.toLowerCase();
      if (
        fullText.includes('dosage guide') ||
        fullText.includes('microdose protocol') ||
        fullText.includes('cure') ||
        fullText.includes('treats')
      ) {
        dosageOrClaimWarning++;
        flaggedProductIds.add(prod.id);
        issues.push({
          productId: prod.id,
          productName: prod.name,
          severity: 'WARNING',
          field: 'contentGovernance',
          message: 'Product contains dosage or therapeutic claim keywords requiring content review',
        });
      }

      // 5. Variants audit
      if (!prod.variants || prod.variants.length === 0) {
        flaggedProductIds.add(prod.id);
        issues.push({
          productId: prod.id,
          productName: prod.name,
          severity: 'ERROR',
          field: 'variants',
          message: 'Product contains zero SKU variants',
        });
        continue;
      }

      for (const v of prod.variants) {
        totalVariantsAudited++;

        // Price check
        if (v.priceEUR === undefined || v.priceEUR === null) {
          missingPrice++;
          flaggedProductIds.add(prod.id);
          issues.push({
            productId: prod.id,
            productName: prod.name,
            variantId: v.id,
            sku: v.sku,
            severity: 'ERROR',
            field: 'priceEUR',
            message: `Variant ${v.flavor} is missing EUR pricing`,
          });
        } else if (v.priceEUR <= 0) {
          zeroPrice++;
          flaggedProductIds.add(prod.id);
          issues.push({
            productId: prod.id,
            productName: prod.name,
            variantId: v.id,
            sku: v.sku,
            severity: 'ERROR',
            field: 'priceEUR',
            message: `Variant ${v.flavor} has zero or negative priceEUR (${v.priceEUR})`,
          });
        }

        // Weight / Net content check
        if (!v.weightGrams || v.weightGrams <= 0 || !v.weightLabel) {
          missingWeight++;
          flaggedProductIds.add(prod.id);
          issues.push({
            productId: prod.id,
            productName: prod.name,
            variantId: v.id,
            sku: v.sku,
            severity: 'WARNING',
            field: 'weightGrams',
            message: `Variant ${v.flavor} missing net weight specifications`,
          });
        }

        // SKU check (must follow standard pattern)
        if (!v.sku || v.sku.trim().length < 4 || v.sku.includes('UNKNOWN') || v.sku.includes('PLACEHOLDER')) {
          suspiciousSku++;
          flaggedProductIds.add(prod.id);
          issues.push({
            productId: prod.id,
            productName: prod.name,
            variantId: v.id,
            sku: v.sku,
            severity: 'WARNING',
            field: 'sku',
            message: `Variant ${v.flavor} has suspicious or non-standard SKU: ${v.sku}`,
          });
        }
      }
    }

    const errorCount = issues.filter((i) => i.severity === 'ERROR').length;

    return {
      timestamp: new Date().toISOString(),
      totalProductsAudited: products.length,
      totalVariantsAudited,
      cleanProductsCount: products.length - flaggedProductIds.size,
      flaggedProductsCount: flaggedProductIds.size,
      issueCounts: {
        missingPrimaryImage,
        missingPrice,
        zeroPrice,
        missingCategory,
        missingShortDescription,
        missingWeight,
        suspiciousSku,
        dosageOrClaimWarning,
      },
      issues,
      passed: errorCount === 0,
    };
  }
}
