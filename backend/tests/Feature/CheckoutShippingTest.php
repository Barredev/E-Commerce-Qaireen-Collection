<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\InventoryStock;
use App\Models\ProductVariant;
use App\Models\Promotion;
use App\Models\User;
use App\Models\Warehouse;
use App\Modules\Auth\Enums\UserRole;
use App\Modules\Promotion\Enums\DiscountBearer;
use App\Modules\Promotion\Enums\PromotionAppliesTo;
use App\Modules\Promotion\Enums\PromotionType;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CheckoutShippingTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_checkout_charges_the_tariff_quoted_by_the_shipping_provider(): void
    {
        $user = $this->actingAsCustomer();
        $variant = $this->variantWithStock(price: 100000, weightGrams: 600);
        $this->addToCart($user, $variant, 2); // 1,200 g -> 2 kg, JNE REG 9.000/kg

        $this->postJson('/api/v1/checkout', $this->payload([
            'shipping_destination_id' => '152',
            'courier_code' => 'jne',
            'courier_service' => 'REG',
        ]))->assertCreated()
            ->assertJsonPath('data.subtotal', 200000)
            ->assertJsonPath('data.shipping_cost', 18000)
            ->assertJsonPath('data.grand_total', 218000)
            ->assertJsonPath('data.courier.code', 'jne')
            ->assertJsonPath('data.courier.name', 'JNE')
            ->assertJsonPath('data.courier.service', 'REG');

        $this->assertDatabaseHas('orders', [
            'user_id' => $user->id,
            'shipping_cost' => 18000,
            'grand_total' => 218000,
            'courier_code' => 'jne',
            'courier_service' => 'REG',
            'shipping_destination_id' => '152',
        ]);
    }

    public function test_a_client_supplied_shipping_cost_is_ignored(): void
    {
        $user = $this->actingAsCustomer();
        $variant = $this->variantWithStock(price: 100000, weightGrams: 1000);
        $this->addToCart($user, $variant, 1);

        $this->postJson('/api/v1/checkout', $this->payload([
            'shipping_destination_id' => '152',
            'courier_code' => 'jne',
            'courier_service' => 'REG',
            'shipping_cost' => 1,
            'grand_total' => 1,
        ]))->assertCreated()
            ->assertJsonPath('data.shipping_cost', 9000)
            ->assertJsonPath('data.grand_total', 109000);
    }

    public function test_the_cheapest_service_is_used_when_the_customer_does_not_pick_a_courier(): void
    {
        $user = $this->actingAsCustomer();
        $variant = $this->variantWithStock(price: 100000, weightGrams: 1000);
        $this->addToCart($user, $variant, 1);

        $this->postJson('/api/v1/checkout', $this->payload([
            'shipping_destination_id' => '152',
        ]))->assertCreated()
            ->assertJsonPath('data.shipping_cost', 8000)
            ->assertJsonPath('data.courier.code', 'jnt')
            ->assertJsonPath('data.courier.service', 'EZ')
            ->assertJsonPath('data.grand_total', 108000);
    }

    public function test_a_free_shipping_coupon_zeroes_the_shipping_component(): void
    {
        $user = $this->actingAsCustomer();
        $variant = $this->variantWithStock(price: 100000, weightGrams: 1000);
        $this->addToCart($user, $variant, 1);

        Promotion::query()->create([
            'name' => 'Gratis Ongkir',
            'code' => 'GRATISONGKIR',
            'type' => PromotionType::FreeShipping,
            'value' => 0,
            'applies_to' => PromotionAppliesTo::All,
            'discount_bearer' => DiscountBearer::Platform,
            'is_active' => true,
        ]);

        $this->postJson('/api/v1/checkout', $this->payload([
            'shipping_destination_id' => '152',
            'courier_code' => 'jne',
            'courier_service' => 'REG',
            'coupon_code' => 'GRATISONGKIR',
        ]))->assertCreated()
            ->assertJsonPath('data.shipping_cost', 0)
            ->assertJsonPath('data.discount_total', 0)
            ->assertJsonPath('data.grand_total', 100000)
            ->assertJsonPath('data.coupon_code', 'GRATISONGKIR')
            ->assertJsonPath('data.courier.code', 'jne');

        $this->assertDatabaseHas('promotions', [
            'code' => 'GRATISONGKIR',
            'usage_count' => 1,
        ]);
    }

    public function test_a_courier_service_that_is_not_offered_is_rejected(): void
    {
        $user = $this->actingAsCustomer();
        $variant = $this->variantWithStock(price: 100000, weightGrams: 1000);
        $this->addToCart($user, $variant, 1);

        $this->postJson('/api/v1/checkout', $this->payload([
            'shipping_destination_id' => '152',
            'courier_code' => 'jne',
            'courier_service' => 'SAME_DAY_PREMIUM',
        ]))->assertUnprocessable()
            ->assertJsonValidationErrors('courier_service');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_choosing_a_courier_without_a_destination_is_rejected(): void
    {
        $user = $this->actingAsCustomer();
        $variant = $this->variantWithStock(price: 100000, weightGrams: 1000);
        $this->addToCart($user, $variant, 1);

        $this->postJson('/api/v1/checkout', $this->payload([
            'courier_code' => 'jne',
            'courier_service' => 'REG',
        ]))->assertUnprocessable()
            ->assertJsonValidationErrors('shipping_destination_id');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_the_destination_is_taken_from_the_saved_address(): void
    {
        $user = $this->actingAsCustomer();
        $variant = $this->variantWithStock(price: 100000, weightGrams: 1000);
        $this->addToCart($user, $variant, 1);

        $address = $user->addresses()->create([
            'label' => 'Rumah',
            'recipient_name' => 'Budi Santoso',
            'phone' => '081234567890',
            'address_line_1' => 'Jl. Sudirman No. 10',
            'city' => 'Jakarta Selatan',
            'province' => 'DKI Jakarta',
            'postal_code' => '12190',
            'rajaongkir_destination_id' => '152',
            'is_default' => true,
        ]);

        $this->postJson('/api/v1/checkout', [
            'address_id' => $address->id,
            'courier_code' => 'sicepat',
            'courier_service' => 'REG',
            'payment_method' => 'cod',
        ])->assertCreated()
            ->assertJsonPath('data.shipping_cost', 8500)
            ->assertJsonPath('data.shipping.city', 'Jakarta Selatan')
            ->assertJsonPath('data.courier.code', 'sicepat');

        $this->assertDatabaseHas('orders', [
            'shipping_destination_id' => '152',
            'courier_code' => 'sicepat',
        ]);
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
    private function payload(array $overrides = []): array
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

    private function variantWithStock(int $price, int $weightGrams): ProductVariant
    {
        $warehouse = Warehouse::factory()->default()->create();
        $variant = ProductVariant::factory()->create([
            'price' => $price,
            'weight_grams' => $weightGrams,
        ]);
        $variant->product->update(['is_active' => true, 'published_at' => now()->subDay()]);

        InventoryStock::factory()->create([
            'variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'quantity_on_hand' => 10,
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
