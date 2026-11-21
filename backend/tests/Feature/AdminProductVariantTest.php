<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Modules\Auth\Enums\UserRole;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminProductVariantTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_admin_can_add_a_variant_to_a_product(): void
    {
        $this->actingAsAdmin();
        $product = Product::factory()->create();

        $response = $this->postJson("/api/v1/admin/products/{$product->id}/variants", [
            'sku' => 'KLM-XL-NAVY',
            'size' => 'XL',
            'color' => 'Navy',
            'price' => 319000,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.sku', 'KLM-XL-NAVY')
            ->assertJsonPath('data.label', 'XL / Navy');

        $this->assertDatabaseHas('product_variants', [
            'sku' => 'KLM-XL-NAVY',
            'product_id' => $product->id,
        ]);
    }

    public function test_a_variant_with_an_existing_size_and_color_is_rejected(): void
    {
        $this->actingAsAdmin();
        $product = Product::factory()->create();
        ProductVariant::factory()->for($product)->create(['size' => 'M', 'color' => 'Putih']);

        $this->postJson("/api/v1/admin/products/{$product->id}/variants", [
            'sku' => 'DUPLIKAT-M-PUTIH',
            'size' => 'M',
            'color' => 'Putih',
            'price' => 150000,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('size');
    }

    public function test_admin_can_update_a_variant(): void
    {
        $this->actingAsAdmin();
        $product = Product::factory()->create();
        $variant = ProductVariant::factory()->for($product)->create([
            'size' => 'S',
            'color' => 'Putih',
            'price' => 150000,
        ]);

        $this->putJson("/api/v1/admin/products/{$product->id}/variants/{$variant->id}", [
            'price' => 350000,
        ])->assertOk()
            ->assertJsonPath('data.price', 350000);

        $this->assertDatabaseHas('product_variants', ['id' => $variant->id, 'price' => 350000]);
    }

    public function test_admin_cannot_update_a_variant_through_another_product(): void
    {
        $this->actingAsAdmin();
        $productA = Product::factory()->create();
        $productB = Product::factory()->create();
        $variant = ProductVariant::factory()->for($productB)->create();

        $this->putJson("/api/v1/admin/products/{$productA->id}/variants/{$variant->id}", [
            'price' => 1000,
        ])->assertNotFound();
    }

    public function test_admin_can_delete_a_variant(): void
    {
        $this->actingAsAdmin();
        $product = Product::factory()->create();
        $variant = ProductVariant::factory()->for($product)->create();

        $this->deleteJson("/api/v1/admin/products/{$product->id}/variants/{$variant->id}")
            ->assertOk();

        $this->assertSoftDeleted('product_variants', ['id' => $variant->id]);
    }

    private function actingAsAdmin(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Admin]));
    }
}
