import { api } from "@/lib/api/client";
import type { ResourceResponse } from "@/lib/types/api";
import type {
  ShippingDestination,
  ShippingQuoteResult,
} from "@/lib/types/order";

export interface ShippingRateQuery {
  destination_id?: string;
  address_id?: string;
  courier?: string;
}

export async function fetchShippingRates(
  query: ShippingRateQuery,
): Promise<ShippingQuoteResult> {
  const response = await api.get<ResourceResponse<ShippingQuoteResult>>(
    "/shipping/rates",
    { params: query },
  );
  return response.data.data;
}

export interface ShippingDestinationResponse {
  data: ShippingDestination[];
  is_simulated: boolean;
}

export async function searchShippingDestinations(
  q = "",
): Promise<ShippingDestinationResponse> {
  const response = await api.get<ShippingDestinationResponse>(
    "/shipping/destinations",
    { params: q ? { q } : undefined },
  );
  return response.data;
}
