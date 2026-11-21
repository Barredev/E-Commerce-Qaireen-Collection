<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\InventoryStock;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use App\Modules\Auth\Enums\UserRole;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ShippingRateTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_guests_get_401_on_shipping_endpoints(): void
    {
        $this->getJson('/api/v1/shipping/rates')->assertUnauthorized();
        $this->getJson('/api/v1/shipping/destinations')->assertUnauthorized();
    }

    public function test_customer_receives_simulated_quotes_for_their_cart(): void
    {
        $user = $this->actingAsCustomer();
        $variant = $this->variantWithStock(weightGrams: 600);
        $this->addToCart($user, $variant, 2); // 1,200 g -> billed as 2 kg

        $this->getJson('/api/v1/shipping/rates?destination_id=152')
            ->assertOk()
            ->assertJsonPath('data.destination_id', '152')
            ->assertJsonPath('data.weight_grams', 1200)
            ->assertJsonPath('data.is_simulated', true)
            ->assertJsonPath('data.couriers.0.code', 'jnt')
            ->assertJsonPath('data.couriers.0.service', 'EZ')
            ->assertJsonPath('data.couriers.0.cost', 16000)
            ->assertJsonCount(6, 'data.couriers');
    }

    public function test_a_parcel_is_billed_at_a_minimum_of_one_kilogram(): void
    {
        $user = $this->actingAsCustomer();
        $variant = $this->variantWithStock(weightGrams: 200);
        $this->addToCart($user, $variant, 1);

        $this->getJson('/api/v1/shipping/rates?destination_id=152')
            ->assertOk()
            ->assertJsonPath('data.weight_grams', 1000)
            ->assertJsonPath('data.couriers.0.cost', 8000);
    }

    public function test_quotes_can_be_filtered_to_a_single_courier(): void
    {
        $user = $this->actingAsCustomer();
        $variant = $this->variantWithStock(weightGrams: 1000);
        $this->addToCart($user, $variant, 1);

        $this->getJson('/api/v1/shipping/rates?destination_id=152&courier=sicepat')
            ->assertOk()
            ->assertJsonCount(2, 'data.couriers')
            ->assertJsonPath('data.couriers.0.code', 'sicepat')
            ->assertJsonPath('data.couriers.1.code', 'sicepat');
    }

    public function test_an_empty_cart_cannot_be_quoted(): void
    {
        $this->actingAsCustomer();

        $this->getJson('/api/v1/shipping/rates?destination_id=152')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('cart');
    }

    public function test_a_destination_is_required_to_quote_rates(): void
    {
        $user = $this->actingAsCustomer();
        $variant = $this->variantWithStock(weightGrams: 500);
        $this->addToCart($user, $variant, 1);

        $this->getJson('/api/v1/shipping/rates')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('destination_id');
    }

    public function test_an_address_belonging_to_another_customer_is_rejected(): void
    {
        $user = $this->actingAsCustomer();
        $variant = $this->variantWithStock(weightGrams: 500);
        $this->addToCart($user, $variant, 1);

        $other = User::factory()->create(['role' => UserRole::Customer]);

        $this->getJson('/api/v1/shipping/rates?address_id='.$other->id)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('address_id');
    }

    public function test_rates_are_pulled_from_the_rajaongkir_api_when_configured(): void
    {
        config([
            'services.rajaongkir.key' => 'rajaongkir-live-key',
            'services.rajaongkir.origin_id' => '501',
        ]);

        Http::preventStrayRequests();
        Http::fake([
            'pro.rajaongkir.com/api/cost' => Http::response([
                'rajaongkir' => [
                    'status' => ['code' => 200, 'description' => 'OK'],
                    'results' => [
                        [
                            'code' => 'jne',
                            'name' => 'JNE',
                            'costs' => [
                                [
                                    'service' => 'YES',
                                    'description' => 'Yakin Esok Sampai',
                                    'cost' => [['value' => 45000, 'etd' => '1-1', 'note' => '']],
                                ],
                                [
                                    'service' => 'REG',
                                    'description' => 'Reguler',
                                    'cost' => [['value' => 24000, 'etd' => '2-3', 'note' => '']],
                                ],
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $user = $this->actingAsCustomer();
        $variant = $this->variantWithStock(weightGrams: 1000);
        $this->addToCart($user, $variant, 1);

        $this->getJson('/api/v1/shipping/rates?destination_id=152&courier=jne')
            ->assertOk()
            ->assertJsonPath('data.is_simulated', false)
            ->assertJsonCount(2, 'data.couriers')
            ->assertJsonPath('data.couriers.0.service', 'REG')
            ->assertJsonPath('data.couriers.0.cost', 24000)
            ->assertJsonPath('data.couriers.0.etd', '2-3')
            ->assertJsonPath('data.couriers.1.service', 'YES')
            ->assertJsonPath('data.couriers.1.cost', 45000);
    }

    public function test_an_api_error_returns_no_quotes_instead_of_failing_the_request(): void
    {
        config([
            'services.rajaongkir.key' => 'rajaongkir-live-key',
            'services.rajaongkir.origin_id' => '501',
        ]);

        Http::preventStrayRequests();
        Http::fake([
            'pro.rajaongkir.com/api/cost' => Http::response(['rajaongkir' => ['status' => ['code' => 500]]], 500),
        ]);

        $user = $this->actingAsCustomer();
        $variant = $this->variantWithStock(weightGrams: 1000);
        $this->addToCart($user, $variant, 1);

        $this->getJson('/api/v1/shipping/rates?destination_id=152')
            ->assertOk()
            ->assertJsonPath('data.couriers', []);
    }

    public function test_a_connection_failure_returns_no_quotes(): void
    {
        config([
            'services.rajaongkir.key' => 'rajaongkir-live-key',
            'services.rajaongkir.origin_id' => '501',
        ]);

        Http::preventStrayRequests();
        Http::fake([
            'pro.rajaongkir.com/api/cost' => Http::failedConnection(),
        ]);

        $user = $this->actingAsCustomer();
        $variant = $this->variantWithStock(weightGrams: 1000);
        $this->addToCart($user, $variant, 1);

        $this->getJson('/api/v1/shipping/rates?destination_id=152')
            ->assertOk()
            ->assertJsonPath('data.couriers', []);
    }

    public function test_destinations_are_searchable_in_simulation_mode(): void
    {
        $this->actingAsCustomer();

        $this->getJson('/api/v1/shipping/destinations?q=jakarta')
            ->assertOk()
            ->assertJsonPath('is_simulated', true)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'Jakarta Selatan');
    }

    public function test_destinations_are_pulled_from_the_rajaongkir_api_when_configured(): void
    {
        config([
            'services.rajaongkir.key' => 'rajaongkir-live-key',
            'services.rajaongkir.origin_id' => '501',
        ]);

        Http::preventStrayRequests();
        Http::fake([
            'pro.rajaongkir.com/api/city' => Http::response([
                'rajaongkir' => [
                    'results' => [
                        ['city_id' => '152', 'city_name' => 'Jakarta Selatan', 'province' => 'DKI Jakarta', 'type' => 'Kota'],
                        ['city_id' => '23', 'city_name' => 'Bandung', 'province' => 'Jawa Barat', 'type' => 'Kota'],
                    ],
                ],
            ], 200),
        ]);

        $this->actingAsCustomer();

        $this->getJson('/api/v1/shipping/destinations?q=bandung')
            ->assertOk()
            ->assertJsonPath('is_simulated', false)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', '23')
            ->assertJsonPath('data.0.province', 'Jawa Barat');
    }

    private function actingAsCustomer(): User
    {
        $user = User::factory()->create(['role' => UserRole::Customer]);
        Sanctum::actingAs($user);

        return $user;
    }

    private function variantWithStock(int $weightGrams): ProductVariant
    {
        $warehouse = Warehouse::factory()->default()->create();
        $variant = ProductVariant::factory()->create(['weight_grams' => $weightGrams]);
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
