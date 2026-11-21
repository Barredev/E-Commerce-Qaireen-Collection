<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\Cart;
use App\Models\InventoryStock;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use App\Modules\Auth\Enums\UserRole;
use App\Modules\Order\Enums\OrderStatus;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CheckoutTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_guests_get_401_on_checkout(): void
    {
        $this->postJson('/api/v1/checkout', [])->assertUnauthorized();
    }

    public function test_checkout_with_an_empty_cart_is_rejected(): void
    {
        $this->actingAsCustomer();

        $this->postJson('/api/v1/checkout', $this->shippingPayload())
            ->assertUnprocessable()
            ->assertJsonValidationErrors('cart');
    }

    public function test_checkout_points_the_admin_to_the_warehouse_menu_when_none_is_active(): void
    {
        $user = $this->actingAsCustomer();
        $variant = $this->variantWithStock(quantity: 10);
        $this->addToCart($user, $variant, 1);

        Warehouse::query()->update(['is_active' => false]);

        $this->postJson('/api/v1/checkout', $this->shippingPayload())
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.cart.0',
                'Belum ada gudang aktif yang bisa memproses pesanan. Aktifkan minimal satu gudang lewat menu Gudang di panel admin.',
            );

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_checkout_creates_an_order_and_clears_the_cart(): void
    {
        $user = $this->actingAsCustomer();
        $variant = $this->variantWithStock(quantity: 10);
        $this->addToCart($user, $variant, 2);

        $this->postJson('/api/v1/checkout', $this->shippingPayload())
            ->assertCreated()
            ->assertJsonPath('data.status', OrderStatus::PendingPayment->value)
            ->assertJsonPath('data.subtotal', (int) ($variant->price * 2))
            ->assertJsonPath('data.grand_total', (int) ($variant->price * 2))
            ->assertJsonPath('data.items.0.quantity', 2)
            ->assertJsonPath('data.items.0.product_name', $variant->product->name);

        $this->assertDatabaseCount('orders', 1);
        $this->assertDatabaseCount('cart_items', 0);
    }

    public function test_checkout_reserves_stock_for_every_line(): void
    {
        $user = $this->actingAsCustomer();
        $variant = $this->variantWithStock(quantity: 10);
        $this->addToCart($user, $variant, 3);

        $this->postJson('/api/v1/checkout', $this->shippingPayload())->assertCreated();

        $this->assertDatabaseHas('inventory_stocks', [
            'variant_id' => $variant->id,
            'quantity_on_hand' => 10,
            'quantity_reserved' => 3,
        ]);

        $this->assertDatabaseHas('order_items', [
            'variant_id' => $variant->id,
            'quantity' => 3,
            'stock_reserved' => true,
            'stock_deducted' => false,
        ]);
    }

    public function test_checkout_creates_a_pending_payment_for_the_grand_total(): void
    {
        $user = $this->actingAsCustomer();
        $variant = $this->variantWithStock(quantity: 5);
        $this->addToCart($user, $variant, 1);

        $this->postJson('/api/v1/checkout', $this->shippingPayload([
            'payment_method' => 'bank_transfer',
        ]))->assertCreated();

        $this->assertDatabaseHas('payments', [
            'payment_method' => 'bank_transfer',
            'amount' => (float) $variant->price,
            'status' => 'pending',
        ]);
    }

    public function test_checkout_snapshots_the_product_data(): void
    {
        $user = $this->actingAsCustomer();
        $variant = $this->variantWithStock(quantity: 5);
        $product = $variant->product;
        $this->addToCart($user, $variant, 1);

        $this->postJson('/api/v1/checkout', $this->shippingPayload())->assertCreated();

        $this->assertDatabaseHas('order_items', [
            'product_name' => $product->name,
            'variant_sku' => $variant->sku,
            'brand_name' => $product->brand->name,
        ]);
    }

    public function test_checkout_uses_the_selected_address_as_a_snapshot(): void
    {
        $user = $this->actingAsCustomer();
        $variant = $this->variantWithStock(quantity: 5);
        $this->addToCart($user, $variant, 1);

        $address = Address::query()->create([
            'user_id' => $user->id,
            'label' => 'Kantor',
            'recipient_name' => 'Siti Aminah',
            'phone' => '081234567890',
            'address_line_1' => 'Jl. Merdeka No. 1',
            'district' => 'Menteng',
            'city' => 'Jakarta Pusat',
            'province' => 'DKI Jakarta',
            'postal_code' => '10310',
            'is_default' => true,
        ]);

        $this->postJson('/api/v1/checkout', [
            'address_id' => $address->id,
            'payment_method' => 'cod',
        ])->assertCreated()
            ->assertJsonPath('data.shipping.name', 'Siti Aminah')
            ->assertJsonPath('data.shipping.city', 'Jakarta Pusat');
    }

    public function test_an_address_belonging_to_another_user_is_rejected(): void
    {
        $this->actingAsCustomer();
        $variant = $this->variantWithStock(quantity: 5);
        $this->addToCart(User::query()->first(), $variant, 1);

        $otherUser = User::factory()->create(['role' => UserRole::Customer]);
        $address = Address::query()->create([
            'user_id' => $otherUser->id,
            'recipient_name' => 'Orang Lain',
            'phone' => '0811111111',
            'address_line_1' => 'Jl. Lain',
            'city' => 'Bandung',
            'province' => 'Jawa Barat',
            'postal_code' => '40111',
        ]);

        $this->postJson('/api/v1/checkout', [
            'address_id' => $address->id,
            'payment_method' => 'cod',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('address_id');
    }

    public function test_checkout_fails_when_stock_was_taken_after_adding_to_cart(): void
    {
        $user = $this->actingAsCustomer();
        $variant = $this->variantWithStock(quantity: 2);
        $this->addToCart($user, $variant, 2);

        InventoryStock::query()
            ->where('variant_id', $variant->id)
            ->update(['quantity_on_hand' => 1]);

        $this->postJson('/api/v1/checkout', $this->shippingPayload())
            ->assertUnprocessable()
            ->assertJsonValidationErrors('cart');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_shipping_details_are_required_without_an_address(): void
    {
        $user = $this->actingAsCustomer();
        $variant = $this->variantWithStock(quantity: 5);
        $this->addToCart($user, $variant, 1);

        $this->postJson('/api/v1/checkout', [
            'payment_method' => 'cod',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors([
                'shipping_name',
                'shipping_phone',
                'shipping_address',
                'shipping_city',
                'shipping_province',
                'shipping_postal_code',
            ]);
    }

    public function test_an_unsupported_payment_method_is_rejected(): void
    {
        $user = $this->actingAsCustomer();
        $variant = $this->variantWithStock(quantity: 5);
        $this->addToCart($user, $variant, 1);

        $this->postJson('/api/v1/checkout', $this->shippingPayload([
            'payment_method' => 'bitcoin',
        ]))->assertUnprocessable()
            ->assertJsonValidationErrors('payment_method');
    }

    private function actingAsCustomer(): User
    {
        $user = User::factory()->create(['role' => UserRole::Customer]);
        Sanctum::actingAs($user);

        return $user;
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function shippingPayload(array $overrides = []): array
    {
        return [
            'shipping_name' => 'Budi Santoso',
            'shipping_phone' => '081234567890',
            'shipping_address' => 'Jl. Sudirman No. 10',
            'shipping_city' => 'Jakarta Selatan',
            'shipping_province' => 'DKI Jakarta',
            'shipping_postal_code' => '12190',
            'payment_method' => 'bank_transfer',
            ...$overrides,
        ];
    }

    private function variantWithStock(int $quantity): ProductVariant
    {
        $warehouse = Warehouse::factory()->default()->create();
        $variant = ProductVariant::factory()->create();
        $variant->product->update(['is_active' => true, 'published_at' => now()->subDay()]);

        InventoryStock::factory()->create([
            'variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'quantity_on_hand' => $quantity,
            'quantity_reserved' => 0,
        ]);

        return $variant;
    }

    private function addToCart(User $user, ProductVariant $variant, int $quantity): void
    {
        $cart = Cart::query()->firstOrCreate(['user_id' => $user->id]);

        $cart->items()->create([
            'variant_id' => $variant->id,
            'quantity' => $quantity,
        ]);
    }
}
