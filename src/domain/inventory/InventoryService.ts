// ===================================================
// FUSION MUSHROOM BARS EU - INVENTORY SERVICE
// Multi-Hub European Stock Allocation & Movement Ledger
// ===================================================

import { FulfilmentHubCode } from '@/types';

export interface StockAllocationItem {
  variantId: string;
  quantity: number;
}

export interface InventoryRecord {
  variantId: string;
  locationCode: FulfilmentHubCode;
  quantityOnHand: number;
  quantityReserved: number;
}

export class InventoryService {
  /**
   * Evaluates whether all items in an order can be satisfied from available stock.
   */
  static verifyStockAvailability(
    items: StockAllocationItem[],
    stockLevels: Map<string, number>
  ): { isAvailable: boolean; insufficientVariantIds: string[] } {
    const insufficientVariantIds: string[] = [];

    for (const item of items) {
      const available = stockLevels.get(item.variantId) ?? 0;
      if (available < item.quantity) {
        insufficientVariantIds.push(item.variantId);
      }
    }

    return {
      isAvailable: insufficientVariantIds.length === 0,
      insufficientVariantIds,
    };
  }

  /**
   * Calculates new inventory levels upon temporary checkout reservation.
   */
  static applyReservation(
    current: InventoryRecord,
    quantityToReserve: number
  ): { updatedRecord: InventoryRecord; movementDelta: number } {
    const available = current.quantityOnHand - current.quantityReserved;
    if (available < quantityToReserve) {
      throw new Error(`Insufficient stock for variant ${current.variantId}. Available: ${available}, Requested: ${quantityToReserve}`);
    }

    return {
      updatedRecord: {
        ...current,
        quantityReserved: current.quantityReserved + quantityToReserve,
      },
      movementDelta: quantityToReserve,
    };
  }

  /**
   * Releases an unconfirmed or expired stock reservation.
   */
  static releaseReservation(
    current: InventoryRecord,
    quantityToRelease: number
  ): { updatedRecord: InventoryRecord; movementDelta: number } {
    const toRelease = Math.min(current.quantityReserved, quantityToRelease);
    return {
      updatedRecord: {
        ...current,
        quantityReserved: current.quantityReserved - toRelease,
      },
      movementDelta: -toRelease,
    };
  }

  /**
   * Standard European warehouse low stock threshold.
   */
  public static readonly DEFAULT_LOW_STOCK_THRESHOLD = 15;

  /**
   * Checks whether a stock level qualifies for an administrative restock alert.
   */
  static isLowStock(quantityOnHand: number, threshold: number = this.DEFAULT_LOW_STOCK_THRESHOLD): boolean {
    return quantityOnHand <= threshold;
  }

  /**
   * Calculates net available stock (on hand minus reserved).
   */
  static getAvailableStock(quantityOnHand: number, quantityReserved: number): number {
    return Math.max(0, quantityOnHand - quantityReserved);
  }

  /**
   * Manually adjusts stock levels (positive for restock, negative for damage/loss).
   */
  static adjustStock(
    current: InventoryRecord,
    delta: number,
    reason: 'RESTOCK' | 'CYCLE_COUNT' | 'DAMAGE_WRITE_OFF' | 'INTERNAL_TRANSFER' | 'RETURN_RESTOCK'
  ): { updatedRecord: InventoryRecord; movementDelta: number; newAvailable: number } {
    const newOnHand = current.quantityOnHand + delta;
    if (newOnHand < 0) {
      throw new Error(`Inventory adjustment cannot result in negative stock. Current: ${current.quantityOnHand}, Delta: ${delta}`);
    }

    const updatedRecord: InventoryRecord = {
      ...current,
      quantityOnHand: newOnHand,
    };

    return {
      updatedRecord,
      movementDelta: delta,
      newAvailable: this.getAvailableStock(updatedRecord.quantityOnHand, updatedRecord.quantityReserved),
    };
  }

  /**
   * Commits reservation on order confirmation (decrements on-hand and reserved).
   */
  static commitReservation(
    current: InventoryRecord,
    quantityToCommit: number
  ): { updatedRecord: InventoryRecord; movementDelta: number } {
    if (current.quantityReserved < quantityToCommit || current.quantityOnHand < quantityToCommit) {
      throw new Error(`Cannot commit more stock than is reserved.`);
    }

    return {
      updatedRecord: {
        ...current,
        quantityOnHand: current.quantityOnHand - quantityToCommit,
        quantityReserved: current.quantityReserved - quantityToCommit,
      },
      movementDelta: -quantityToCommit,
    };
  }
}

