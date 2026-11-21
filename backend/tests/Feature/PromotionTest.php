<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Cart;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Promotion;
use App\Models\User;
use App\Modules\Auth\Enums\UserRole;
use App\Modules\Promotion\Enums\DiscountBearer;
use App\Modules\Promotion\Enums\PromotionAppliesTo;
use App\Modules\Promotion\Enums\PromotionType;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PromotionTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_guests_cannot_access_admin_promotions(): void
    {
        $this->getJson('/api/v1/admin/promotions')->assertUnauthorized();
        $this->postJson('/api/v1/admin/promotions', [])->assertUnauthorized();
    }

    public function test_admin_can_create_a_percentage_promotion(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/v1/admin/promotions', [
            'name' => 'Diskon Lebaran 20%',
            'code' => 'LEBARAN20',
            'type' => PromotionType::Percentage->value,
            'value' => 20.0,
            'min_purchase' => 100000,
            'max_discount' => 50000,
            'applies_to' => PromotionAppliesTo::All->value,
            'discount_bearer' => DiscountBearer::Platform->value,
            'is_active' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.code', 'LEBARAN20')
            ->assertJsonPath('data.value', 20);

        $this->assertDatabaseHas('promotions', [
            'code' => 'LEBARAN20',
            'name' => 'Diskon Lebaran 20%',
        ]);
    }

    public function test_customer_can_validate_and_apply_coupon_to_cart(): void
    {
        $customer = User::factory()->create(['role' => UserRole::Customer]);
        Sanctum::actingAs($customer);

        $promo = Promotion::create([
            'name' => 'Diskon 10%',
            'code' => 'DISKON10',
            'type' => PromotionType::Percentage,
            'value' => 10.0,
            'min_purchase' => 50000,
            'max_discount' => 25000,
            'applies_to' => PromotionAppliesTo::All,
            'discount_bearer' => DiscountBearer::Platform,
            'is_active' => true,
        ]);

        $brand = Brand::factory()->create();
        $product = Product::factory()->create(['brand_id' => $brand->id]);
        $variant = ProductVariant::factory()->create(['product_id' => $product->id, 'price' => 100000]);

        $cart = Cart::create(['user_id' => $customer->id]);
        $cart->items()->create([
            'variant_id' => $variant->id,
            'quantity' => 2,
        ]);

        $response = $this->postJson('/api/v1/checkout/apply-coupon', [
            'code' => 'DISKON10',
        ]);

        // Subtotal = 200,000. 10% = 20,000 (less than max 25,000).
        $response->assertOk()
            ->assertJsonPath('data.code', 'DISKON10')
            ->assertJsonPath('data.discount_amount', 20000);
    }

    public function test_coupon_below_minimum_purchase_is_rejected(): void
    {
        $customer = User::factory()->create(['role' => UserRole::Customer]);
        Sanctum::actingAs($customer);

        Promotion::create([
            'name' => 'Diskon Besar',
            'code' => 'BESAR50',
            'type' => PromotionType::FixedAmount,
            'value' => 50000.0,
            'min_purchase' => 300000,
            'applies_to' => PromotionAppliesTo::All,
            'discount_bearer' => DiscountBearer::Platform,
            'is_active' => true,
        ]);

        $brand = Brand::factory()->create();
        $product = Product::factory()->create(['brand_id' => $brand->id]);
        $variant = ProductVariant::factory()->create(['product_id' => $product->id, 'price' => 100000]);

        $cart = Cart::create(['user_id' => $customer->id]);
        $cart->items()->create([
            'variant_id' => $variant->id,
            'quantity' => 1, // Only 100,000 < 300,000 min
        ]);

        $response = $this->postJson('/api/v1/checkout/apply-coupon', [
            'code' => 'BESAR50',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['coupon_code']);
    }
}
