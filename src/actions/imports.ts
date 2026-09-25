'use server';

import { MasterCatalogueImportService, MasterImportResult } from '@/domain/import/MasterCatalogueImportService';

export async function getMasterImportReportAction(): Promise<{
  success: boolean;
  data?: MasterImportResult;
  error?: string;
}> {
  try {
    const report = MasterCatalogueImportService.getImportResult();
    return {
      success: true,
      data: report,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to retrieve master import report.',
    };
  }
}

export async function executeRerunImportAction(): Promise<{
  success: boolean;
  data?: MasterImportResult;
  error?: string;
}> {
  try {
    const report = MasterCatalogueImportService.runMasterImport();
    return {
      success: true,
      data: report,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to re-execute master import pipeline.',
    };
  }
}
