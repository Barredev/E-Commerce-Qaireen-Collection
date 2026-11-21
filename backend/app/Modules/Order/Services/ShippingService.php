<?php

namespace App\Modules\Order\Services;

use App\Models\Cart;
use App\Modules\Order\Contracts\ShippingProviderInterface;
use Illuminate\Validation\ValidationException;

/**
 * Application-facing shipping layer.
 *
 * Turns a cart into a parcel weight and resolves the courier service the
 * customer picked into a server-side tariff. The client never supplies the
 * amount that ends up on the order.
 */
class ShippingService
{
    /**
     * Couriers bill a minimum of one kilogram per parcel.
     */
    private const MINIMUM_WEIGHT_GRAMS = 1000;

    public function __construct(private readonly ShippingProviderInterface $provider) {}

    /**
     * @return array{
     *     destination_id: string,
     *     weight_grams: int,
     *     is_simulated: bool,
     *     couriers: array<int, array{
     *         code: string,
     *         name: string,
     *         service: string,
     *         description: string,
     *         cost: float,
     *         etd: string|null
     *     }>
     * }
     */
    public function quotesForCart(Cart $cart, string $destinationId, ?string $courier = null): array
    {
        $weightGrams = $this->cartWeightGrams($cart);

        return [
            'destination_id' => $destinationId,
            'weight_grams' => $weightGrams,
            'is_simulated' => $this->provider->isSimulationMode(),
            'couriers' => $this->provider->rates($destinationId, $weightGrams, $courier),
        ];
    }

    /**
     * Resolve the exact courier service chosen by the customer.
     *
     * @return array{
     *     code: string,
     *     name: string,
     *     service: string,
     *     description: string,
     *     cost: float,
     *     etd: string|null
     * }
     *
     * @throws ValidationException when the service is not offered for the destination.
     */
    public function quote(Cart $cart, string $destinationId, string $courierCode, string $courierService): array
    {
        $quotes = $this->provider->rates($destinationId, $this->cartWeightGrams($cart), $courierCode);

        foreach ($quotes as $quote) {
            if (strcasecmp($quote['service'], $courierService) === 0) {
                return $quote;
            }
        }

        throw ValidationException::withMessages([
            'courier_service' => ['Layanan kurir yang dipilih tidak tersedia untuk alamat pengiriman ini.'],
        ]);
    }

    /**
     * Cheapest service offered for a destination, used when the customer
     * leaves the courier choice to the store.
     *
     * @return array{
     *     code: string,
     *     name: string,
     *     service: string,
     *     description: string,
     *     cost: float,
     *     etd: string|null
     * }|null
     */
    public function cheapest(Cart $cart, string $destinationId): ?array
    {
        $quotes = $this->provider->rates($destinationId, $this->cartWeightGrams($cart));

        return $quotes[0] ?? null;
    }

    public function cartWeightGrams(Cart $cart): int
    {
        $cart->loadMissing('items.variant');

        $weight = $cart->items->sum(
            fn ($item): int => (int) ($item->variant?->weight_grams ?? 0) * (int) $item->quantity
        );

        return max(self::MINIMUM_WEIGHT_GRAMS, (int) $weight);
    }
}
