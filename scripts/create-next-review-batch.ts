import fs from 'node:fs';
import { CatalogueReviewService } from '../src/domain/catalog/CatalogueReviewService';
import { CatalogueFirstBatchService } from '../src/domain/catalog/CatalogueFirstBatchService';
import { CatalogueSpecialistReviewService } from '../src/domain/catalog/CatalogueSpecialistReviewService';
import { CatalogueRolloutService } from '../src/domain/catalog/CatalogueRolloutService';
import firstBatch from '../src/data/catalogue-first-batch-state.json';
import specialist from '../src/data/catalogue-specialist-review-state.json';

CatalogueReviewService.setPersistenceEnabled(false);
CatalogueFirstBatchService.setPersistenceEnabled(false);
CatalogueSpecialistReviewService.setPersistenceEnabled(false);

const beforeBatch = JSON.stringify(firstBatch);
const beforeSpecialist = JSON.stringify(specialist);
CatalogueRolloutService.resetForTests();
const batch = CatalogueRolloutService.createBatch({
  size: 10,
  actor: 'catalogue.manager@fusionbars.eu',
  actorRole: 'CATALOG_MANAGER',
  name: 'Review batch 2',
});
const snapshot = CatalogueRolloutService.snapshot();
fs.writeFileSync('src/data/catalogue-rollout-state.json', JSON.stringify(CatalogueRolloutService.getState(), null, 2));
if (JSON.stringify(firstBatch) !== beforeBatch || JSON.stringify(specialist) !== beforeSpecialist) {
  throw new Error('Creating the next batch changed the pilot files.');
}
console.log(JSON.stringify({ batch, snapshot }, null, 2));
