import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import firstBatchState from '../src/data/catalogue-first-batch-state.json';
import { CatalogueFirstBatchService } from '../src/domain/catalog/CatalogueFirstBatchService';
import { CatalogueSpecialistReviewService } from '../src/domain/catalog/CatalogueSpecialistReviewService';
import { CatalogueReviewService } from '../src/domain/catalog/CatalogueReviewService';
import { CatalogueAdjudicationService } from '../src/domain/catalog/CatalogueAdjudicationService';

const FIRST_BATCH_FILE = path.resolve(process.cwd(), 'src/data/catalogue-first-batch-state.json');
const SPECIALIST_FILE = path.resolve(process.cwd(), 'src/data/catalogue-specialist-review-state.json');

const FINANCE = { actor: 'finance.review@fusionbars.eu', actorRole: 'FINANCE_MANAGER' as const };
const COMPLIANCE = { actor: 'compliance.review@fusionbars.eu', actorRole: 'COMPLIANCE_MANAGER' as const };
const CONTENT = { actor: 'content.review@fusionbars.eu', actorRole: 'CONTENT_MANAGER' as const };
const GATE = { actor: 'operations.review@fusionbars.eu', actorRole: 'SUPER_ADMIN' as const };

function fail(message: string): never {
  throw new Error(message);
}

function sourcePriceEvidence(slug: string): string {
  const packet = CatalogueFirstBatchService.getReviewPacket(slug);
  const prices = (packet?.pricing?.sourcePrices || [])
    .map((row: { source?: string; currency?: string; price?: number | string }) => `${row.source || 'source'} ${row.currency || ''} ${row.price ?? ''}`.trim())
    .filter(Boolean);
  const shown = prices.length ? prices.join('; ') : 'no source amount recorded on the review packet';
  return `Observed source pricing only: ${shown}. No finance-approved EUR or GBP selling price is on file. The source amount was not converted.`;
}

const hashBefore = crypto.createHash('sha256').update(fs.readFileSync(FIRST_BATCH_FILE)).digest('hex');
const publishedBefore = CatalogueAdjudicationService.getState().published.length;
const priceBefore = Object.fromEntries(
  (firstBatchState as { selectedSlugs: string[] }).selectedSlugs.map((slug) => [
    slug,
    CatalogueReviewService.getProductDetail(slug)?.priceEUR ?? null,
  ])
);

CatalogueFirstBatchService.resetStateForTests(firstBatchState as any);
CatalogueFirstBatchService.setPersistenceEnabled(false);
CatalogueSpecialistReviewService.resetStateForTests();
CatalogueSpecialistReviewService.setPersistenceEnabled(false);

const slugs = CatalogueSpecialistReviewService.firstBatchSlugs();
if (slugs.length !== 10) fail(`Expected 10 products, saw ${slugs.length}`);

for (const slug of slugs) {
  const packet = CatalogueFirstBatchService.getReviewPacket(slug);
  const detail = CatalogueReviewService.getProductDetail(slug);
  if (!packet || !detail) fail(`Missing packet for ${slug}`);
  const testRecord = Boolean(packet.testRecord?.flagged);
  const highTolerance = /high-tolerance/.test(slug);

  const pricing = CatalogueSpecialistReviewService.recordPricingDecision({
    productSlug: slug,
    state: testRecord ? 'PRICE_NOT_APPLICABLE' : 'PRICE_DEFERRED',
    rationale: testRecord
      ? 'This record is already classified NON_COMMERCIAL_TEST_RECORD. No commercial selling price applies, and none was entered.'
      : highTolerance
        ? 'No finance-approved selling price is on file. The high-tolerance source price was not converted or rewritten into a store price.'
        : 'No finance-approved selling price is on file. Source currency amounts were not converted into EUR or GBP.',
    evidence: sourcePriceEvidence(slug),
    ...FINANCE,
  });
  if (!pricing.success) fail(`${slug} pricing: ${pricing.error}`);

  const compliance = CatalogueSpecialistReviewService.recordComplianceDecision({
    productSlug: slug,
    state: testRecord ? 'DO_NOT_PUBLISH' : 'DEFERRED',
    rationale: testRecord
      ? 'NON_COMMERCIAL_TEST_RECORD remains DO_NOT_PUBLISH. This review does not convert it into a commercial product.'
      : highTolerance
        ? 'No compliance determination is on file. High-tolerance source wording was not treated as legal approval and was not rewritten.'
        : 'No compliance determination, legal opinion, or regulatory authorization is on file. The source record was not treated as approval.',
    evidence: testRecord
      ? 'Saved data-adjudication classification NON_COMMERCIAL_TEST_RECORD and placeholder media. No commercial authorization exists.'
      : 'Inspected the saved first-batch review packet and source provenance. No separate compliance decision or legal reference is recorded.',
    ...COMPLIANCE,
  });
  if (!compliance.success) fail(`${slug} compliance: ${compliance.error}`);

  const content = CatalogueSpecialistReviewService.recordContentDecision({
    productSlug: slug,
    state: testRecord ? 'DO_NOT_PUBLISH' : 'CONTENT_DEFERRED',
    candidatePublicContent: '',
    rationale: testRecord
      ? 'NON-COMMERCIAL TEST RECORD — DO NOT PUBLISH. Internal source text stays internal.'
      : highTolerance
        ? 'No reviewer-authored public copy is on file. High-tolerance source claims were not softened, copied, or approved.'
        : 'No reviewer-authored public copy is on file. Internal source text was not copied to the storefront.',
    ...CONTENT,
  });
  if (!content.success) fail(`${slug} content: ${content.error}`);

  const gate = CatalogueSpecialistReviewService.acknowledgePublicationGate({ productSlug: slug, ...GATE });
  if (!gate.success || gate.published !== false) fail(`${slug} publication: ${gate.error || 'published'}`);
  if (testRecord && gate.publication !== 'DO_NOT_PUBLISH') fail(`${slug} must stay DO_NOT_PUBLISH`);
  if (!testRecord && gate.publication !== 'NOT_READY') fail(`${slug} became ${gate.publication}`);

  const afterPrice = CatalogueReviewService.getProductDetail(slug)?.priceEUR ?? null;
  if (afterPrice !== priceBefore[slug]) fail(`${slug} catalogue price changed`);
}

if (CatalogueAdjudicationService.getState().published.length !== publishedBefore) {
  fail('Published catalogue changed');
}
const hashAfter = crypto.createHash('sha256').update(fs.readFileSync(FIRST_BATCH_FILE)).digest('hex');
if (hashBefore !== hashAfter) fail('First-batch data adjudication file changed');

const state = CatalogueSpecialistReviewService.getState();
fs.writeFileSync(SPECIALIST_FILE, JSON.stringify(state, null, 2));

const names: Record<string, string> = {
  'a-box-of-10-fusion-gummies': 'A Box of 10 Fusion Gummies',
  'a-box-of-fusion-gummies': 'A Box of Fusion Gummies',
  'audit-test-product': 'Audit Test Product',
  'brain-high-tolerance-x-fusion-chocolate-bar-premium-fusion-mushroom-bar': 'Brain High Tolerance bar',
  'fun-dip-high-tolerance-x-fusion-chocolate-bar-premium-fusion-mushroom-bar': 'Fun Dip High Tolerance bar',
  'fusion-100-bars-boutique-box': 'Fusion 100 Bars Boutique Box',
  'fusion-bars-banana-chocolate': 'Banana Chocolate',
  'fusion-bars-peanut-butter': 'Peanut Butter',
  'fusion-cactus-cooler-gummies': 'Cactus Cooler Gummies',
  'fusion-cherry-lime-gummies': 'Cherry Lime Gummies',
};

for (const slug of slugs) {
  const review = state.products[slug];
  const locales = Object.values(review.translations).map((slot) => slot.state).join(',');
  console.log(
    [
      names[slug] || slug,
      review.pricing.state,
      review.compliance.state,
      review.countries.length ? review.countries.map((row) => row.decision).join(',') : 'NOT_CONFIGURED',
      review.content.state,
      review.media.state,
      locales,
      review.publication,
    ].join(' | ')
  );
}
console.log('AUDIT', state.auditTrail.length);
console.log('PUBLISHED_DELTA', CatalogueAdjudicationService.getState().published.length - publishedBefore);
