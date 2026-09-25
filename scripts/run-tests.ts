import { DomainTestSuite } from '../src/test/suite';

async function main() {
  console.log('==================================================');
  console.log('FUSION MUSHROOM BARS EU - DOMAIN ENGINE TEST SUITE');
  console.log('==================================================\n');

  const report = await DomainTestSuite.runAll();

  for (const res of report.results) {
    const symbol = res.passed ? '✔ PASS' : '✖ FAIL';
    console.log(`${symbol} [${res.category}] ${res.name} (${res.durationMs}ms)`);
    if (!res.passed && res.error) {
      console.error(`       ERROR: ${res.error}`);
    }
  }

  console.log('\n--------------------------------------------------');
  console.log(`TOTAL:  ${report.totalTests}`);
  console.log(`PASSED: ${report.passedCount}`);
  console.log(`FAILED: ${report.failedCount}`);
  console.log(`TIME:   ${report.durationMs}ms`);
  console.log('--------------------------------------------------');

  if (report.failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
