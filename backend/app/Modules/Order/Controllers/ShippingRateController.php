<?php

namespace App\Modules\Order\Controllers;

use App\Modules\Order\Contracts\ShippingProviderInterface;
use App\Modules\Order\Services\CartService;
use App\Modules\Order\Services\ShippingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ShippingRateController
{
    public function __construct(
        private readonly ShippingService $shipping,
        private readonly CartService $carts,
        private readonly ShippingProviderInterface $provider,
    ) {}

    /**
     * Realtime courier quotes for the authenticated customer's cart.
     */
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'address_id' => ['nullable', 'uuid'],
            'destination_id' => ['nullable', 'string', 'max:20'],
            'courier' => ['nullable', 'string', 'max:50'],
        ]);

        $user = $request->user();
        $destinationId = $data['destination_id'] ?? null;

        if (! empty($data['address_id'])) {
            $address = $user->addresses()->find($data['address_id']);

            if ($address === null) {
                throw ValidationException::withMessages([
                    'address_id' => ['Alamat pengiriman tidak ditemukan.'],
                ]);
            }

            $destinationId = $address->rajaongkir_destination_id ?? $destinationId;
        }

        if (empty($destinationId)) {
            throw ValidationException::withMessages([
                'destination_id' => ['Kota tujuan pengiriman belum dipilih.'],
            ]);
        }

        $cart = $this->carts->forUser($user);

        if ($cart->items->isEmpty()) {
            throw ValidationException::withMessages([
                'cart' => ['Keranjang belanja Anda masih kosong.'],
            ]);
        }

        return response()->json([
            'data' => $this->shipping->quotesForCart($cart, (string) $destinationId, $data['courier'] ?? null),
        ]);
    }

    /**
     * City lookup used by the address and checkout forms.
     */
    public function destinations(Request $request): JsonResponse
    {
        $data = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
        ]);

        return response()->json([
            'data' => $this->provider->destinations((string) ($data['q'] ?? '')),
            'is_simulated' => $this->provider->isSimulationMode(),
        ]);
    }
}
