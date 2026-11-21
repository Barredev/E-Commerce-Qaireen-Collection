import { api } from "@/lib/api/client";
import type { ResourceResponse } from "@/lib/types/api";
import type { Address, AddressPayload } from "@/lib/types/order";

export async function fetchAddresses(): Promise<Address[]> {
  const response = await api.get<ResourceResponse<Address[]>>(
    "/account/addresses",
  );
  return response.data.data;
}

export async function createAddress(payload: AddressPayload): Promise<Address> {
  const response = await api.post<ResourceResponse<Address>>(
    "/account/addresses",
    payload,
  );
  return response.data.data;
}

export async function updateAddress(
  id: string,
  payload: Partial<AddressPayload>,
): Promise<Address> {
  const response = await api.put<ResourceResponse<Address>>(
    `/account/addresses/${id}`,
    payload,
  );
  return response.data.data;
}

export async function deleteAddress(id: string): Promise<void> {
  await api.delete(`/account/addresses/${id}`);
}
