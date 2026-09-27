import { FulfilmentHubCode } from '@/types';
import { HubAllocationService, HubStockQuery } from '@/domain/inventory/HubAllocationService';
import { DestinationEngine } from '@/domain/shipping/DestinationEngine';

export class FulfilmentRoutingService {
  static plan(params: {
    destinationCountry: string;
    items: Array<HubStockQuery & { requiredHub?: FulfilmentHubCode }>;
    hubStockChecker?: (hub: FulfilmentHubCode, items: HubStockQuery[]) => boolean;
    failClosed?: boolean;
  }) {
    const state = DestinationEngine.get();
    const required = [...new Set(params.items.map((item) => item.requiredHub).filter(Boolean))] as FulfilmentHubCode[];
    if (required.length > 1 && !state.splitOrders) {
      return {
        ok: false as const,
        code: 'MULTI_HUB_NOT_CONFIGURED',
        customerMessage: 'We are unable to complete delivery to this destination at this time.',
        hubs: required,
      };
    }
    const allocation = HubAllocationService.allocateHub(params.destinationCountry, params.items, (hub, items) => {
      if (state.hubs[hub].status !== 'ACTIVE') return false;
      return params.hubStockChecker ? params.hubStockChecker(hub, items) : true;
    });
    if (state.hubs[allocation.hubCode].status !== 'ACTIVE') {
      return { ok: false as const, code: 'NO_ELIGIBLE_FULFILMENT_ROUTE', customerMessage: 'We are unable to complete delivery to this destination at this time.', hubs: [] };
    }
    if (params.failClosed && params.hubStockChecker && !params.hubStockChecker(allocation.hubCode, params.items) && allocation.reason.includes('replenishment')) {
      return { ok: false as const, code: 'NO_ELIGIBLE_FULFILMENT_ROUTE', customerMessage: 'We are unable to complete delivery to this destination at this time.', hubs: [] };
    }
    return {
      ok: true as const,
      code: 'ROUTED',
      hub: allocation.hubCode,
      reason: allocation.reason,
      isFallback: allocation.isFallback,
      configurationVersion: state.version,
    };
  }
}
