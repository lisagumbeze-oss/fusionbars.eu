import { MasterCatalogueImportService } from '../src/domain/import/MasterCatalogueImportService';

async function main() {
  console.log('Starting Master Catalogue Import...');
  const result = MasterCatalogueImportService.runMasterImport();

  console.log('\n==================================================');
  console.log('MASTER CATALOGUE IMPORT SUMMARY');
  console.log('==================================================');
  console.log('1. Reference Website Products:', result.counts.referenceWebsite.products);
  console.log('2. Repository A Products:', result.counts.repositoryA.productRecords);
  console.log('3. Repository B Products:', result.counts.repositoryB.productRecords);
  console.log('4. Combined Raw Records:', result.counts.combined.rawRecords);
  console.log('5. Unique Normalized Products (Preserved Base):', result.counts.combined.normalizedProducts);
  console.log('6. Total Variants (Preserved Base):', result.counts.combined.variants);
  console.log('7. Categories:', result.counts.combined.categories);
  console.log('8. Total Images / Media Records:', result.counts.combined.images);
  console.log('9. Total Customer Reviews:', result.counts.combined.reviews);
  console.log('10. Matched Products:', result.counts.combined.matchedProducts);
  console.log('11. Conflicts Detected:', result.counts.combined.conflicts);
  console.log('12. Missing Fields Count:', result.counts.combined.missingFields);
  console.log('13. Products Requiring Review:', result.counts.combined.productsRequiringReview);
  console.log('14. Batch IDs:', result.batchIds);
  console.log('15. Backup Status:', result.backupStatus);
  console.log('16. Reports Generated:\n  -', result.reportsWritten.join('\n  - '));
  console.log('==================================================');
}

main().catch((err) => {
  console.error('Fatal import error:', err);
  process.exit(1);
});
