<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductImage;
use App\Models\User;
use App\Modules\Auth\Enums\UserRole;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminProductImageTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_the_first_image_becomes_primary(): void
    {
        $this->actingAsAdmin();
        $product = Product::factory()->create();

        $this->postJson("/api/v1/admin/products/{$product->id}/images", [
            'image_url' => 'https://example.test/kemeja.jpg',
        ])->assertCreated()
            ->assertJsonPath('data.is_primary', true);

        $this->assertDatabaseHas('product_images', [
            'product_id' => $product->id,
            'is_primary' => true,
        ]);
    }

    public function test_setting_a_new_primary_image_clears_the_previous_primary(): void
    {
        $this->actingAsAdmin();
        $product = Product::factory()->create();
        $first = ProductImage::factory()->for($product)->create(['is_primary' => true]);

        $this->postJson("/api/v1/admin/products/{$product->id}/images", [
            'image_url' => 'https://example.test/kemeja-baru.jpg',
            'is_primary' => true,
        ])->assertCreated();

        $this->assertFalse($first->fresh()->is_primary);
        $this->assertSame(1, $product->images()->where('is_primary', true)->count());
    }

    public function test_admin_can_upload_an_image_file(): void
    {
        $this->actingAsAdmin();
        $product = Product::factory()->create();

        $response = $this->post(
            "/api/v1/admin/products/{$product->id}/images",
            [
                'file' => UploadedFile::fake()->image('kemeja.jpg', 800, 1000),
                'alt_text' => 'Kemeja putih',
                'is_primary' => '1',
            ],
            ['Accept' => 'application/json'],
        );

        $response->assertCreated()
            ->assertJsonPath('data.alt_text', 'Kemeja putih')
            ->assertJsonPath('data.is_primary', true);

        $image = $product->images()->firstOrFail();

        $this->assertStringContainsString('/storage/products/', $image->image_url);
        Storage::disk('public')->assertExists(
            str_replace('/storage/', '', parse_url($image->image_url, PHP_URL_PATH) ?? ''),
        );
    }

    public function test_admin_can_reorder_images(): void
    {
        $this->actingAsAdmin();
        $product = Product::factory()->create();
        $first = ProductImage::factory()->for($product)->create(['sort_order' => 0]);
        $second = ProductImage::factory()->for($product)->create(['sort_order' => 1]);

        $this->putJson("/api/v1/admin/products/{$product->id}/images/reorder", [
            'images' => [
                ['id' => $first->id, 'sort_order' => 5],
                ['id' => $second->id, 'sort_order' => 2],
            ],
        ])->assertOk();

        $this->assertSame(5, $first->fresh()->sort_order);
        $this->assertSame(2, $second->fresh()->sort_order);
    }

    public function test_reordering_rejects_an_image_from_another_product(): void
    {
        $this->actingAsAdmin();
        $product = Product::factory()->create();
        $foreign = ProductImage::factory()->create();

        $this->putJson("/api/v1/admin/products/{$product->id}/images/reorder", [
            'images' => [
                ['id' => $foreign->id, 'sort_order' => 0],
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('images');
    }

    public function test_admin_can_delete_an_image(): void
    {
        $this->actingAsAdmin();
        $product = Product::factory()->create();
        $image = ProductImage::factory()->for($product)->create();

        $this->deleteJson("/api/v1/admin/products/{$product->id}/images/{$image->id}")
            ->assertOk();

        $this->assertDatabaseMissing('product_images', ['id' => $image->id]);
    }

    private function actingAsAdmin(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Admin]));
    }
}
