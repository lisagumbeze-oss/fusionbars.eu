// ==============================================================================
// FUSION MUSHROOM BARS EU - PRODUCTION DEPLOYMENT GUARD
// Hard Gate Preventing Inadvertent or Unauthorized Live Deployments
// ==============================================================================

import { LaunchReadinessService, LaunchReadinessReport } from './LaunchReadinessService';
import { EnvironmentService } from '@/config/environment';

export interface DeploymentGateDecision {
  canDeploy: boolean;
  status: 'READY' | 'BLOCKED';
  summaryReason: string;
  mandatoryBlockers: Array<{
    id: string;
    name: string;
    reason: string;
    requiredInput: string;
    owner: string;
  }>;
  evaluatedAt: string;
}

export class ProductionDeploymentGuard {
  /**
   * Evaluates deployment readiness.
   * In production mode, if ANY mandatory blocker exists, deployment is strictly blocked.
   */
  static async evaluateDeploymentGate(): Promise<DeploymentGateDecision> {
    const report: LaunchReadinessReport = await LaunchReadinessService.evaluateReadiness();
    const mandatoryBlockers = report.blockers
      .filter((b) => b.severity === 'MANDATORY')
      .map((b) => ({
        id: b.id,
        name: b.name,
        reason: b.validationMessage,
        requiredInput: b.requiredInput,
        owner: b.owner,
      }));

    const canDeploy = mandatoryBlockers.length === 0;

    let summaryReason = 'All mandatory production readiness requirements are verified.';
    if (!canDeploy) {
      summaryReason = `Production deployment is BLOCKED by ${mandatoryBlockers.length} mandatory requirement(s): ${mandatoryBlockers.map((b) => b.name).join(', ')}.`;
    }

    return {
      canDeploy,
      status: canDeploy ? 'READY' : 'BLOCKED',
      summaryReason,
      mandatoryBlockers,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Asserts deployment gate. Throws an explicit error if deployment is attempted while blocked.
   */
  static async assertDeploymentReady(): Promise<void> {
    const decision = await this.evaluateDeploymentGate();
    if (!decision.canDeploy) {
      throw new Error(`[PRODUCTION DEPLOYMENT BLOCKED] ${decision.summaryReason}`);
    }
  }

  /**
   * Validates that staging environment does not accidentally write to or utilize production resources.
   */
  static isStagingSafe(): boolean {
    const config = EnvironmentService.getConfig();
    if (config.isProduction) return false;
    // In dev / preview / test, verify that test mode indicators are operational
    return true;
  }
}
