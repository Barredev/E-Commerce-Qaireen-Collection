<?php

namespace App\Modules\Order\Services;

use App\Models\Address;
use App\Models\Cart;
use App\Models\Order;
use App\Models\User;
use App\Modules\Inventory\Services\StockService;
use App\Modules\Order\Enums\OrderStatus;
use App\Modules\Order\Enums\PaymentStatus;
use App\Modules\Promotion\Services\PromotionService;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CheckoutService
{
    public function __construct(
        private readonly StockService $stock,
        private readonly CartService $carts,
        private readonly PromotionService $promotions,
        private readonly ShippingService $shipping,
    ) {}

    /**
     * Convert the authenticated user's cart into an order, reserving stock.
     *
     * @param  array<string, mixed>  $data
     */
    public function checkout(User $user, array $data): Order
    {
        return DB::transaction(function () use ($user, $data): Order {
            $cart = Cart::query()
                ->where('user_id', $user->id)
                ->with(['items.variant.product.brand', 'items.variant.product.images'])
                ->first();

            if ($cart === null || $cart->items->isEmpty()) {
                throw ValidationException::withMessages([
                    'cart' => ['Keranjang belanja Anda masih kosong.'],
                ]);
            }

            $warehouse = $this->stock->defaultWarehouse();

            if ($warehouse === null) {
                throw ValidationException::withMessages([
                    'cart' => ['Belum ada gudang aktif yang bisa memproses pesanan. Aktifkan minimal satu gudang lewat menu Gudang di panel admin.'],
                ]);
            }

            $lineItems = $this->buildLineItems($cart, $warehouse->id);
            $subtotal = collect($lineItems)->sum('line_total');

            $address = $this->resolveAddress($user, $data);

            $couponCode = ! empty($data['coupon_code']) ? trim($data['coupon_code']) : null;
            $discountTotal = 0.0;
            $isFreeShipping = false;

            if ($couponCode !== null) {
                $promoResult = $this->promotions->validateAndCalculate($couponCode, $cart, $user);
                $discountTotal = (float) $promoResult['discount_amount'];
                $isFreeShipping = (bool) ($promoResult['is_free_shipping'] ?? false);
                $couponCode = $promoResult['code'];
            }

            // The tariff always comes from the shipping provider, never from the
            // client, and a free-shipping coupon zeroes the shipping component.
            $shipping = $this->resolveShipping($cart, $data, $address, $isFreeShipping);

            $grandTotal = max(0.0, ($subtotal - $discountTotal) + $shipping['cost']);

            $order = Order::query()->create([
                'order_number' => $this->generateOrderNumber(),
                'user_id' => $user->id,
                'status' => OrderStatus::PendingPayment,
                'subtotal' => $subtotal,
                'discount_total' => $discountTotal,
                'shipping_cost' => $shipping['cost'],
                'tax_amount' => 0,
                'grand_total' => $grandTotal,
                'coupon_code' => $couponCode,
                'courier_code' => $shipping['code'],
                'courier_name' => $shipping['name'],
                'courier_service' => $shipping['service'],
                'shipping_destination_id' => $shipping['destination_id'],
                'notes' => $data['notes'] ?? null,
                ...$this->shippingSnapshot($address, $data),
            ]);

            if ($couponCode !== null) {
                $this->promotions->recordUsage($couponCode);
            }

            foreach ($lineItems as $lineItem) {
                $stock = $lineItem['stock'];
                unset($lineItem['stock']);

                $this->stock->reserve($stock, $lineItem['quantity']);

                $order->items()->create($lineItem);
            }

            $order->payments()->create([
                'payment_method' => $data['payment_method'],
                'amount' => $order->grand_total,
                'status' => PaymentStatus::Pending,
                'expired_at' => now()->addDay(),
            ]);

            $this->carts->clear($cart);

            return $order->refresh()->load($this->relations());
        });
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildLineItems(Cart $cart, string $warehouseId): array
    {
        $lineItems = [];

        foreach ($cart->items as $item) {
            $variant = $item->variant;
            $product = $variant?->product;

            if ($variant === null || $product === null) {
                throw ValidationException::withMessages([
                    'cart' => ['Terdapat produk yang sudah tidak tersedia di keranjang Anda.'],
                ]);
            }

            $sellable = $variant->is_active
                && $product->is_active
                && $product->published_at !== null
                && $product->published_at->isPast();

            if (! $sellable) {
                throw ValidationException::withMessages([
                    'cart' => ["Produk {$product->name} sudah tidak dijual."],
                ]);
            }

            $stock = $this->stock->findAvailablePool($variant->id, $warehouseId, $item->quantity);

            if ($stock === null) {
                throw ValidationException::withMessages([
                    'cart' => ["Stok {$product->name} ({$variant->label()}) tidak mencukupi."],
                ]);
            }

            $unitPrice = (float) $variant->price;
            $lineTotal = $unitPrice * $item->quantity;

            $lineItems[] = [
                'variant_id' => $variant->id,
                'brand_id' => $product->brand_id,
                'product_name' => $product->name,
                'variant_sku' => $variant->sku,
                'variant_size' => $variant->size,
                'variant_color' => $variant->color,
                'brand_name' => $product->brand?->name ?? '',
                'unit_price' => $unitPrice,
                'quantity' => $item->quantity,
                'discount_amount' => 0,
                'line_total' => $lineTotal,
                'warehouse_id' => $warehouseId,
                'stock_reserved' => true,
                'stock_deducted' => false,
                'stock' => $stock,
            ];
        }

        return $lineItems;
    }

    /**
     * Quote the courier service picked at checkout.
     *
     * @param  array<string, mixed>  $data
     * @return array{
     *     cost: float,
     *     code: string|null,
     *     name: string|null,
     *     service: string|null,
     *     destination_id: string|null
     * }
     */
    private function resolveShipping(Cart $cart, array $data, ?Address $address, bool $isFreeShipping): array
    {
        $destinationId = $address?->rajaongkir_destination_id
            ?? (isset($data['shipping_destination_id']) ? (string) $data['shipping_destination_id'] : null);

        $courierCode = strtolower(trim((string) ($data['courier_code'] ?? '')));
        $courierService = trim((string) ($data['courier_service'] ?? ''));

        // Without a destination there is nothing to quote against. Orders that
        // do not pick a courier keep the zero tariff, while a chosen courier
        // without a destination is a customer input error.
        if (empty($destinationId)) {
            if ($courierCode !== '' || $courierService !== '') {
                throw ValidationException::withMessages([
                    'shipping_destination_id' => ['Kota tujuan pengiriman belum dipilih untuk menghitung ongkos kirim.'],
                ]);
            }

            return [
                'cost' => 0.0,
                'code' => null,
                'name' => null,
                'service' => null,
                'destination_id' => null,
            ];
        }

        $quote = $courierCode !== '' && $courierService !== ''
            ? $this->shipping->quote($cart, (string) $destinationId, $courierCode, $courierService)
            : $this->shipping->cheapest($cart, (string) $destinationId);

        if ($quote === null) {
            throw ValidationException::withMessages([
                'courier_service' => ['Ongkos kirim belum tersedia untuk alamat ini. Silakan coba beberapa saat lagi.'],
            ]);
        }

        return [
            'cost' => $isFreeShipping ? 0.0 : (float) $quote['cost'],
            'code' => $quote['code'],
            'name' => $quote['name'],
            'service' => $quote['service'],
            'destination_id' => (string) $destinationId,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function resolveAddress(User $user, array $data): ?Address
    {
        if (empty($data['address_id'])) {
            return null;
        }

        $address = Address::query()
            ->where('user_id', $user->id)
            ->find($data['address_id']);

        if ($address === null) {
            throw ValidationException::withMessages([
                'address_id' => ['Alamat pengiriman tidak ditemukan.'],
            ]);
        }

        return $address;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function shippingSnapshot(?Address $address, array $data): array
    {
        if ($address !== null) {
            return [
                'shipping_name' => $address->recipient_name,
                'shipping_phone' => $address->phone,
                'shipping_address' => trim(
                    $address->address_line_1.' '.($address->address_line_2 ?? '')
                ),
                'shipping_district' => $address->district,
                'shipping_city' => $address->city,
                'shipping_province' => $address->province,
                'shipping_postal_code' => $address->postal_code,
            ];
        }

        return Arr::only($data, [
            'shipping_name',
            'shipping_phone',
            'shipping_address',
            'shipping_district',
            'shipping_city',
            'shipping_province',
            'shipping_postal_code',
        ]);
    }

    private function generateOrderNumber(): string
    {
        do {
            $number = 'ORD-'.now()->format('Ymd').'-'.Str::upper(Str::random(6));
        } while (Order::query()->where('order_number', $number)->exists());

        return $number;
    }

    /**
     * @return array<int, string>
     */
    private function relations(): array
    {
        return ['items', 'payments', 'shipments'];
    }
}
