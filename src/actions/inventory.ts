'use server';

import { inventoryAdjustmentSchema } from '../validation/schemas';
import { CommerceRepository, DbInventoryRecord } from '../lib/commerce-repository';
import { RBACService } from '../domain/auth/RBACService';
import { FulfilmentHubCode, RoleName } from '../types';

/**
 * Server Action: Retrieves multi-hub inventory matrix across NL, ES, DE, FR.
 */
export async function getInventoryMatrixAction(actorRole: RoleName = 'SUPER_ADMIN') {
  try {
    const hasPermission = RBACService.hasPermission(actorRole, 'catalog:read') || actorRole === 'SUPER_ADMIN' || actorRole === 'ORDER_MANAGER';
    if (!hasPermission) {
      return { success: false, error: 'Unauthorized to view inventory matrix.', inventory: [] };
    }

    const inventory = await CommerceRepository.getInventoryMatrix();
    return { success: true, inventory };
  } catch (error: any) {
    return { success: false, error: error.message, inventory: [] };
  }
}

/**
 * Server Action: Adjusts inventory stock for a variant at a specific hub.
 */
export async function adjustInventoryAction(rawInput: unknown, actorRole: RoleName = 'SUPER_ADMIN', actorId: string = 'admin-staff') {
  try {
    const hasPermission = RBACService.hasPermission(actorRole, 'catalog:write') || actorRole === 'SUPER_ADMIN' || actorRole === 'ORDER_MANAGER';
    if (!hasPermission) {
      return { success: false, error: 'Unauthorized to modify warehouse stock.' };
    }

    const validated = inventoryAdjustmentSchema.parse(rawInput);
    const updated = await CommerceRepository.adjustInventory(
      validated.variantId,
      validated.locationCode as FulfilmentHubCode,
      validated.quantityDelta,
      `${validated.reason}${validated.notes ? ` - ${validated.notes}` : ''}`,
      actorId
    );

    return {
      success: true,
      record: updated,
      message: `Adjusted stock for ${validated.variantId} at hub ${validated.locationCode} by ${validated.quantityDelta}.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Inventory adjustment failed' };
  }
}
