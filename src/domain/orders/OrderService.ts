// ===================================================
// FUSION MUSHROOM BARS EU - ORDER SERVICE
// Order Lifecycle Orchestration & History Auditing
// ===================================================

import { OrderStatus, RoleName } from '@/types';
import { OrderStatusService } from './OrderStatusService';

export interface OrderStatusTransitionPayload {
  orderId: string;
  currentStatus: OrderStatus;
  newStatus: OrderStatus;
  userRole: RoleName | 'SYSTEM' | 'CUSTOMER';
  actorId: string;
  note?: string;
}

export class OrderService {
  /**
   * Generates a unique, professional European order reference.
   * Format: FB-EU-YYYY-XXXXX (e.g. FB-EU-2026-48192)
   */
  static generateOrderNumber(date: Date = new Date()): string {
    const year = date.getFullYear();
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    return `FB-EU-${year}-${randomSuffix}`;
  }

  /**
   * Validates and executes an order status transition.
   */
  static evaluateTransition(payload: OrderStatusTransitionPayload): {
    success: boolean;
    error?: string;
    fromStatus: OrderStatus;
    toStatus: OrderStatus;
  } {
    const validation = OrderStatusService.canRolePerformTransition({
      fromStatus: payload.currentStatus,
      toStatus: payload.newStatus,
      userRole: payload.userRole,
    });

    if (!validation.allowed) {
      return {
        success: false,
        error: validation.reason,
        fromStatus: payload.currentStatus,
        toStatus: payload.newStatus,
      };
    }

    return {
      success: true,
      fromStatus: payload.currentStatus,
      toStatus: payload.newStatus,
    };
  }
}
