<?php

namespace App\Modules\Order\Contracts;

interface ShippingProviderInterface
{
    /**
     * Whether the provider answers from a local tariff table instead of the API.
     */
    public function isSimulationMode(): bool;

    /**
     * Courier services available for a destination and parcel weight.
     *
     * @return array<int, array{
     *     code: string,
     *     name: string,
     *     service: string,
     *     description: string,
     *     cost: float,
     *     etd: string|null
     * }>
     */
    public function rates(string $destinationId, int $weightGrams, ?string $courier = null): array;

    /**
     * Latest waybill status plus its manifest history.
     *
     * @return array{
     *     status: string,
     *     history: array<int, array{status: string|null, description: string, occurred_at: string|null}>,
     *     is_simulated: bool
     * }
     */
    public function track(string $courierCode, string $trackingNumber): array;

    /**
     * City lookup used by the address form.
     *
     * @return array<int, array{id: string, name: string, province: string, type: string}>
     */
    public function destinations(string $search): array;
}
