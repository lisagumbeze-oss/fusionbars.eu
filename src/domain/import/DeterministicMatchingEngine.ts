import { MatchConfidence, RawProductRecordDomain } from './types';

export interface MatchEvaluationResult {
  confidence: MatchConfidence;
  score: number; // 0 to 100
  reasons: string[];
  canonicalSlug: string;
  isMatch: boolean;
  requiresReview: boolean;
}

export class DeterministicMatchingEngine {
  /**
   * Normalizes a product title or flavor for comparison.
   */
  static normalizeText(str?: string | null): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/&amp;/g, '&')
      .replace(/&#8217;/g, "'")
      .replace(/&#8211;/g, '-')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  /**
   * Normalizes a slug: removes prefix/suffix words like 'fusion', 'bar', 'official', 'store'.
   */
  static normalizeSlug(slug?: string | null): string {
    if (!slug) return '';
    let s = slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    // Remove common decorative prefixes
    s = s.replace(/^official-/, '');
    s = s.replace(/^fusion-bar-/, '');
    s = s.replace(/^fusion-bars-/, '');
    s = s.replace(/^fusion-/, '');
    
    // Remove common decorative suffixes
    s = s.replace(/-chocolate-bar$/, '');
    s = s.replace(/-mushroom-bar$/, '');
    s = s.replace(/-shroom-bar$/, '');
    s = s.replace(/-bar$/, '');
    s = s.replace(/-official-store$/, '');
    s = s.replace(/-fusion-chocolate-official-store$/, '');
    s = s.replace(/-fusion-mushroom-bar$/, '');
    s = s.replace(/-fusion$/, '');

    return s.replace(/(^-|-$)/g, '');
  }

  /**
   * Extracts clean image filename from a URL.
   */
  static extractImageFilename(url?: string | null): string {
    if (!url) return '';
    try {
      const parts = url.split('/');
      const last = parts.pop() || '';
      return last.split('?')[0].toLowerCase().replace(/-\d+x\d+/, ''); // strip WordPress thumbnail size
    } catch {
      return '';
    }
  }

  /**
   * Calculates token Jaccard similarity between two strings.
   */
  static tokenSimilarity(a: string, b: string): number {
    const tokensA = new Set(this.normalizeText(a).split(' ').filter(Boolean));
    const tokensB = new Set(this.normalizeText(b).split(' ').filter(Boolean));
    if (tokensA.size === 0 || tokensB.size === 0) return 0;

    let intersection = 0;
    for (const t of tokensA) {
      if (tokensB.has(t)) intersection++;
    }
    const union = new Set([...tokensA, ...tokensB]).size;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Evaluates if two raw product records represent the same product.
   */
  static evaluateMatch(
    prodA: RawProductRecordDomain,
    prodB: RawProductRecordDomain
  ): MatchEvaluationResult {
    const reasons: string[] = [];
    let score = 0;

    // 1. Exact SKU Match
    if (
      prodA.sourceSku &&
      prodB.sourceSku &&
      prodA.sourceSku.trim().toLowerCase() === prodB.sourceSku.trim().toLowerCase()
    ) {
      score += 100;
      reasons.push(`Exact SKU match: ${prodA.sourceSku}`);
      return {
        confidence: 'EXACT_MATCH',
        score: 100,
        reasons,
        canonicalSlug: prodA.sourceSlug,
        isMatch: true,
        requiresReview: false,
      };
    }

    // 2. Exact Slug Match
    if (prodA.sourceSlug.toLowerCase() === prodB.sourceSlug.toLowerCase()) {
      score += 90;
      reasons.push(`Exact slug match: ${prodA.sourceSlug}`);
    }

    // 3. Normalized Slug Match
    const normSlugA = this.normalizeSlug(prodA.sourceSlug);
    const normSlugB = this.normalizeSlug(prodB.sourceSlug);
    if (normSlugA && normSlugB && normSlugA === normSlugB) {
      score += 80;
      reasons.push(`Normalized slug match: "${normSlugA}" === "${normSlugB}"`);
    }

    // 4. Exact Name Match
    const normNameA = this.normalizeText(prodA.sourceName);
    const normNameB = this.normalizeText(prodB.sourceName);
    if (normNameA && normNameB && normNameA === normNameB) {
      score += 85;
      reasons.push(`Exact normalized name match: "${normNameA}"`);
    } else {
      const nameSim = this.tokenSimilarity(prodA.sourceName, prodB.sourceName);
      if (nameSim >= 0.75) {
        score += Math.round(nameSim * 50);
        reasons.push(`High name token similarity: ${Math.round(nameSim * 100)}%`);
      } else if (nameSim >= 0.5) {
        score += Math.round(nameSim * 30);
        reasons.push(`Moderate name token similarity: ${Math.round(nameSim * 100)}%`);
      }
    }

    // 5. Image Filename Match
    const imgA = this.extractImageFilename(prodA.sourcePrimaryImage);
    const imgB = this.extractImageFilename(prodB.sourcePrimaryImage);
    if (imgA && imgB && imgA === imgB) {
      score += 40;
      reasons.push(`Identical primary image filename: ${imgA}`);
    }

    // 6. Category Coherence
    const catA = (prodA.sourceCategoryName || '').toLowerCase();
    const catB = (prodB.sourceCategoryName || '').toLowerCase();
    const bothGummies = catA.includes('gumm') && catB.includes('gumm');
    const bothBars = (catA.includes('bar') || catA.includes('chocolate')) && (catB.includes('bar') || catB.includes('chocolate'));
    const bothVapes = (catA.includes('vape') || catA.includes('disposable')) && (catB.includes('vape') || catB.includes('disposable'));

    if (bothGummies || bothBars || bothVapes) {
      score += 15;
      reasons.push(`Category coherence match: both ${bothGummies ? 'GUMMIES' : bothBars ? 'CHOCOLATE' : 'VAPES'}`);
    }

    // Determine Classification
    let confidence: MatchConfidence = 'UNIQUE';
    let isMatch = false;
    let requiresReview = false;

    if (score >= 85) {
      confidence = 'EXACT_MATCH';
      isMatch = true;
      requiresReview = false;
    } else if (score >= 60) {
      confidence = 'HIGH_CONFIDENCE';
      isMatch = true;
      requiresReview = false;
    } else if (score >= 35) {
      confidence = 'POSSIBLE_MATCH';
      isMatch = false; // Do NOT automatically merge possible matches
      requiresReview = true;
    } else {
      confidence = 'UNIQUE';
      isMatch = false;
      requiresReview = false;
    }

    return {
      confidence,
      score,
      reasons,
      canonicalSlug: prodA.sourceSlug || prodB.sourceSlug,
      isMatch,
      requiresReview,
    };
  }
}
