<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Modules\Auth\Enums\UserRole;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class AdminCatalogTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_guests_get_401_on_admin_catalog_endpoints(): void
    {
        $this->getJson('/api/v1/admin/brands')->assertUnauthorized();
        $this->getJson('/api/v1/admin/categories')->assertUnauthorized();
        $this->getJson('/api/v1/admin/products')->assertUnauthorized();
    }

    public static function nonAdminRoles(): array
    {
        return [
            'customer' => [UserRole::Customer],
            'warehouse' => [UserRole::Warehouse],
        ];
    }

    #[DataProvider('nonAdminRoles')]
    public function test_forbids_roles_other_than_admin(UserRole $role): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => $role]));

        $this->getJson('/api/v1/admin/products')->assertForbidden();
    }

    public function test_admin_can_create_a_brand_and_the_slug_is_generated(): void
    {
        $this->actingAsAdmin();

        $response = $this->postJson('/api/v1/admin/brands', [
            'name' => 'Qaireen Collection',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.slug', 'qaireen-collection');

        $this->assertDatabaseHas('brands', [
            'slug' => 'qaireen-collection',
        ]);
    }

    public function test_generated_brand_slug_avoids_a_collision(): void
    {
        $this->actingAsAdmin();
        Brand::factory()->create(['slug' => 'nusantara-thread']);

        $this->postJson('/api/v1/admin/brands', [
            'name' => 'Nusantara Thread',
        ])->assertCreated()
            ->assertJsonPath('data.slug', 'nusantara-thread-1');
    }

    public function test_a_duplicate_explicit_brand_slug_returns_422(): void
    {
        $this->actingAsAdmin();
        Brand::factory()->create(['slug' => 'nusantara-thread']);

        $this->postJson('/api/v1/admin/brands', [
            'name' => 'Brand Lain',
            'slug' => 'nusantara-thread',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('slug');
    }

    public function test_renaming_a_brand_regenerates_its_slug(): void
    {
        $this->actingAsAdmin();
        $brand = Brand::factory()->create(['name' => 'Nama Lama', 'slug' => 'nama-lama']);

        $this->putJson("/api/v1/admin/brands/{$brand->id}", ['name' => 'Nama Baru'])
            ->assertOk()
            ->assertJsonPath('data.slug', 'nama-baru');

        $this->assertDatabaseHas('brands', ['id' => $brand->id, 'slug' => 'nama-baru']);
    }

    public function test_a_brand_with_products_cannot_be_deleted(): void
    {
        $this->actingAsAdmin();
        $brand = Brand::factory()->create();
        Product::factory()->for($brand)->create();

        $this->deleteJson("/api/v1/admin/brands/{$brand->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('brand');

        $this->assertNotSoftDeleted('brands', ['id' => $brand->id]);
    }

    public function test_admin_can_delete_an_empty_brand(): void
    {
        $this->actingAsAdmin();
        $brand = Brand::factory()->create();

        $this->deleteJson("/api/v1/admin/brands/{$brand->id}")->assertOk();

        $this->assertSoftDeleted('brands', ['id' => $brand->id]);
    }

    public function test_admin_can_create_a_category_with_a_generated_slug(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/v1/admin/categories', ['name' => 'Atasan'])
            ->assertCreated()
            ->assertJsonPath('data.slug', 'atasan');

        $this->assertDatabaseHas('categories', ['slug' => 'atasan']);
    }

    public function test_a_category_cannot_be_its_own_parent(): void
    {
        $this->actingAsAdmin();
        $category = Category::factory()->create();

        $this->putJson("/api/v1/admin/categories/{$category->id}", [
            'parent_id' => $category->id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('parent_id');
    }

    public function test_a_category_with_children_cannot_be_deleted(): void
    {
        $this->actingAsAdmin();
        $parent = Category::factory()->create();
        Category::factory()->childOf($parent)->create();

        $this->deleteJson("/api/v1/admin/categories/{$parent->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('category');

        $this->assertNotSoftDeleted('categories', ['id' => $parent->id]);
    }

    public function test_admin_can_create_a_product_with_variants_and_images(): void
    {
        $this->actingAsAdmin();
        $brand = Brand::factory()->create();
        $category = Category::factory()->create();

        $response = $this->postJson('/api/v1/admin/products', [
            'brand_id' => $brand->id,
            'category_id' => $category->id,
            'name' => 'Kemeja Linen Minimalis',
            'base_price' => 289000,
            'variants' => [
                ['sku' => 'KLM-S-PUTIH', 'size' => 'S', 'color' => 'Putih', 'price' => 289000],
                ['sku' => 'KLM-M-PUTIH', 'size' => 'M', 'color' => 'Putih', 'price' => 299000],
            ],
            'images' => [
                ['image_url' => 'https://example.test/kemeja-1.jpg'],
                ['image_url' => 'https://example.test/kemeja-2.jpg'],
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.slug', 'kemeja-linen-minimalis')
            ->assertJsonCount(2, 'data.variants')
            ->assertJsonCount(2, 'data.images')
            ->assertJsonPath('data.images.0.is_primary', true)
            ->assertJsonPath('data.images.1.is_primary', false);

        $this->assertNotNull($response->json('data.published_at'));

        $this->assertDatabaseHas('products', [
            'slug' => 'kemeja-linen-minimalis',
            'brand_id' => $brand->id,
        ]);
        $this->assertDatabaseCount('product_variants', 2);
        $this->assertDatabaseHas('product_images', [
            'image_url' => 'https://example.test/kemeja-1.jpg',
            'is_primary' => true,
        ]);
    }

    public function test_admin_can_create_a_product_without_a_category(): void
    {
        $this->actingAsAdmin();
        $brand = Brand::factory()->create();

        $this->postJson('/api/v1/admin/products', [
            'brand_id' => $brand->id,
            'name' => 'Kaos Polos',
            'base_price' => 99000,
            'variants' => [
                ['sku' => 'KP-S-HITAM', 'size' => 'S', 'color' => 'Hitam', 'price' => 99000],
            ],
        ])->assertCreated()
            ->assertJsonPath('data.category', null);
    }

    public function test_a_product_requires_at_least_one_variant(): void
    {
        $this->actingAsAdmin();
        $brand = Brand::factory()->create();

        $this->postJson('/api/v1/admin/products', [
            'brand_id' => $brand->id,
            'name' => 'Kaos Polos',
            'base_price' => 99000,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('variants');
    }

    public function test_a_product_rejects_duplicate_variant_skus_in_the_payload(): void
    {
        $this->actingAsAdmin();
        $brand = Brand::factory()->create();

        $this->postJson('/api/v1/admin/products', [
            'brand_id' => $brand->id,
            'name' => 'Kaos Polos',
            'base_price' => 99000,
            'variants' => [
                ['sku' => 'KP-S-HITAM', 'size' => 'S', 'color' => 'Hitam', 'price' => 99000],
                ['sku' => 'KP-S-HITAM', 'size' => 'M', 'color' => 'Hitam', 'price' => 99000],
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('variants.1.sku');
    }

    public function test_a_product_rejects_a_sku_that_already_exists(): void
    {
        $this->actingAsAdmin();
        $brand = Brand::factory()->create();
        ProductVariant::factory()->create(['sku' => 'KP-S-HITAM']);

        $this->postJson('/api/v1/admin/products', [
            'brand_id' => $brand->id,
            'name' => 'Kaos Polos',
            'base_price' => 99000,
            'variants' => [
                ['sku' => 'KP-S-HITAM', 'size' => 'S', 'color' => 'Hitam', 'price' => 99000],
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('variants.0.sku');
    }

    public function test_renaming_a_product_regenerates_its_slug(): void
    {
        $this->actingAsAdmin();
        $product = Product::factory()->create(['name' => 'Nama Lama', 'slug' => 'nama-lama']);

        $this->putJson("/api/v1/admin/products/{$product->id}", ['name' => 'Nama Baru'])
            ->assertOk()
            ->assertJsonPath('data.slug', 'nama-baru');

        $this->assertDatabaseHas('products', ['id' => $product->id, 'slug' => 'nama-baru']);
    }

    public function test_activating_a_draft_product_sets_its_publication_date(): void
    {
        $this->actingAsAdmin();
        $product = Product::factory()->draft()->create();

        $this->putJson("/api/v1/admin/products/{$product->id}", ['is_active' => true])
            ->assertOk();

        $this->assertNotNull($product->fresh()->published_at);
    }

    public function test_admin_can_delete_a_product_and_its_variants(): void
    {
        $this->actingAsAdmin();
        $product = Product::factory()->create();
        $variant = ProductVariant::factory()->for($product)->create();

        $this->deleteJson("/api/v1/admin/products/{$product->id}")->assertOk();

        $this->assertSoftDeleted('products', ['id' => $product->id]);
        $this->assertSoftDeleted('product_variants', ['id' => $variant->id]);
    }

    public function test_admin_product_listing_filters_by_active_state(): void
    {
        $this->actingAsAdmin();
        Product::factory()->create();

        $draft = Product::factory()->draft()->create();

        $this->getJson('/api/v1/admin/products?is_active=0')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $draft->id);
    }

    private function actingAsAdmin(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Admin]));
    }
}
