<?php

namespace App\Modules\Order\Services;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\ProductVariant;
use App\Models\User;
use App\Modules\Inventory\Services\StockService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CartService
{
    public function __construct(private readonly StockService $stock) {}

    public function forUser(User $user): Cart
    {
        $cart = Cart::query()->firstOrCreate(['user_id' => $user->id]);

        return $this->load($cart);
    }

    public function addItem(User $user, string $variantId, int $quantity): Cart
    {
        return DB::transaction(function () use ($user, $variantId, $quantity): Cart {
            $cart = Cart::query()->firstOrCreate(['user_id' => $user->id]);
            $variant = ProductVariant::query()->with('product')->findOrFail($variantId);

            $this->ensureVariantIsSellable($variant);

            $item = $cart->items()->where('variant_id', $variant->id)->first();
            $newQuantity = ($item?->quantity ?? 0) + $quantity;

            $this->ensureStockIsAvailable($variant, $newQuantity);

            if ($item) {
                $item->update(['quantity' => $newQuantity]);
            } else {
                $cart->items()->create([
                    'variant_id' => $variant->id,
                    'quantity' => $quantity,
                ]);
            }

            return $this->load($cart->refresh());
        });
    }

    public function updateItem(User $user, CartItem $item, int $quantity): Cart
    {
        return DB::transaction(function () use ($user, $item, $quantity): Cart {
            $cart = $this->ownedCart($user, $item);
            $variant = $item->variant()->with('product')->firstOrFail();

            $this->ensureVariantIsSellable($variant);
            $this->ensureStockIsAvailable($variant, $quantity);

            $item->update(['quantity' => $quantity]);

            return $this->load($cart->refresh());
        });
    }

    public function removeItem(User $user, CartItem $item): Cart
    {
        $cart = $this->ownedCart($user, $item);

        $item->delete();

        return $this->load($cart->refresh());
    }

    public function clear(Cart $cart): void
    {
        $cart->items()->delete();
    }

    private function ownedCart(User $user, CartItem $item): Cart
    {
        $cart = $this->forUser($user);

        abort_unless($item->cart_id === $cart->id, 404);

        return $cart;
    }

    private function ensureVariantIsSellable(ProductVariant $variant): void
    {
        $product = $variant->product;

        $sellable = $variant->is_active
            && $product !== null
            && $product->is_active
            && $product->published_at !== null
            && $product->published_at->isPast();

        if (! $sellable) {
            throw ValidationException::withMessages([
                'variant_id' => ['Varian produk ini sudah tidak dijual.'],
            ]);
        }
    }

    private function ensureStockIsAvailable(ProductVariant $variant, int $quantity): void
    {
        $warehouse = $this->stock->defaultWarehouse();

        if ($warehouse === null) {
            throw ValidationException::withMessages([
                'quantity' => ['Belum ada gudang aktif yang bisa memproses pesanan. Aktifkan minimal satu gudang lewat menu Gudang di panel admin.'],
            ]);
        }

        if ($this->stock->availableQuantity($variant->id, $warehouse->id) < $quantity) {
            throw ValidationException::withMessages([
                'quantity' => ['Stok yang tersedia tidak mencukupi jumlah yang diminta.'],
            ]);
        }
    }

    private function load(Cart $cart): Cart
    {
        return $cart->load([
            'items.variant.product.brand',
            'items.variant.product.images',
        ]);
    }
}
