<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class CatalogBrowseTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_product_listing_returns_only_published_products(): void
    {
        $brand = Brand::factory()->create();
        $published = Product::factory()->for($brand)->create();

        Product::factory()->for($brand)->draft()->create();
        Product::factory()->for($brand)->create(['published_at' => now()->addDay()]);

        $response = $this->getJson('/api/v1/products');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $published->id);
    }

    public function test_product_listing_ignores_a_brand_query_parameter(): void
    {
        $brand = Brand::factory()->create(['slug' => 'nusantara-thread']);
        $match = Product::factory()->for($brand)->create();

        Product::factory()->create();

        $this->getJson('/api/v1/products?brand=nusantara-thread')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['id' => $match->id]);
    }

    public function test_product_listing_filters_by_parent_category_slug(): void
    {
        $parent = Category::factory()->create(['slug' => 'atasan']);
        $child = Category::factory()->childOf($parent)->create(['slug' => 'kemeja']);
        $match = Product::factory()->create(['category_id' => $child->id]);

        Product::factory()->create();

        $this->getJson('/api/v1/products?category=atasan')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $match->id);
    }

    public function test_product_listing_filters_by_size_and_color(): void
    {
        $match = Product::factory()->create();
        ProductVariant::factory()->for($match)->create(['size' => 'XL', 'color' => 'Navy']);

        $other = Product::factory()->create();
        ProductVariant::factory()->for($other)->create(['size' => 'S', 'color' => 'Hitam']);

        $this->getJson('/api/v1/products?size=XL&color=navy')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $match->id);
    }

    public function test_product_listing_filters_by_price_range(): void
    {
        $cheap = Product::factory()->create();
        ProductVariant::factory()->for($cheap)->create(['price' => 100000]);

        $expensive = Product::factory()->create();
        ProductVariant::factory()->for($expensive)->create(['price' => 500000]);

        $this->getJson('/api/v1/products?min_price=200000')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $expensive->id);

        $this->getJson('/api/v1/products?max_price=200000')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $cheap->id);
    }

    public function test_product_listing_filters_featured_products(): void
    {
        $featured = Product::factory()->featured()->create();

        Product::factory()->create();

        $this->getJson('/api/v1/products?featured=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $featured->id);
    }

    public function test_product_listing_searches_by_name(): void
    {
        $match = Product::factory()->create([
            'name' => 'Kemeja Linen Minimalis',
            'description' => 'Kemeja dengan bahan linen.',
        ]);

        Product::factory()->create([
            'name' => 'Rok Plisket',
            'description' => 'Rok dengan bahan satin.',
        ]);

        $this->getJson('/api/v1/products?q=linen')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $match->id);
    }

    public function test_product_listing_sorts_by_lowest_variant_price(): void
    {
        $expensive = Product::factory()->create();
        ProductVariant::factory()->for($expensive)->create(['price' => 400000]);

        $cheap = Product::factory()->create();
        ProductVariant::factory()->for($cheap)->create(['price' => 100000]);

        $response = $this->getJson('/api/v1/products?sort=price_asc');

        $response->assertOk()->assertJsonCount(2, 'data');

        $this->assertSame(
            [$cheap->id, $expensive->id],
            array_column($response->json('data'), 'id'),
        );
    }

    public function test_product_listing_clamps_per_page_to_sixty(): void
    {
        Product::factory()->count(2)->create();

        $this->getJson('/api/v1/products?per_page=999')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 60);

        $this->getJson('/api/v1/products?per_page=0')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 1);
    }

    public function test_product_detail_returns_variants_and_images(): void
    {
        $brand = Brand::factory()->create(['name' => 'Qaireen Collection']);
        $product = Product::factory()->for($brand)->create(['slug' => 'kemeja-linen']);

        ProductVariant::factory()->for($product)->create([
            'size' => 'M',
            'color' => 'Putih',
            'price' => 289000,
        ]);

        ProductImage::factory()->for($product)->create([
            'image_url' => 'https://example.test/kemeja.jpg',
            'is_primary' => true,
        ]);

        $this->getJson('/api/v1/products/kemeja-linen')
            ->assertOk()
            ->assertJsonPath('data.id', $product->id)
            ->assertJsonCount(1, 'data.variants')
            ->assertJsonPath('data.variants.0.label', 'M / Putih')
            ->assertJsonCount(1, 'data.images')
            ->assertJsonPath('data.images.0.image_url', 'https://example.test/kemeja.jpg');
    }

    public function test_product_detail_returns_404_for_a_draft_product(): void
    {
        Product::factory()->draft()->create(['slug' => 'draf']);

        $this->getJson('/api/v1/products/draf')->assertNotFound();
    }

    public function test_product_detail_returns_404_for_a_future_publication(): void
    {
        Product::factory()->create([
            'slug' => 'terbit-besok',
            'published_at' => now()->addDay(),
        ]);

        $this->getJson('/api/v1/products/terbit-besok')->assertNotFound();
    }

    public function test_product_detail_hides_inactive_variants(): void
    {
        $product = Product::factory()->create(['slug' => 'kemeja']);

        ProductVariant::factory()->for($product)->create(['size' => 'S', 'color' => 'Putih']);
        ProductVariant::factory()->for($product)->create([
            'size' => 'M',
            'color' => 'Hitam',
            'is_active' => false,
        ]);

        $this->getJson('/api/v1/products/kemeja')
            ->assertOk()
            ->assertJsonCount(1, 'data.variants');
    }

    public function test_public_brand_endpoints_are_no_longer_exposed(): void
    {
        $brand = Brand::factory()->create(['slug' => 'qaireen-collection']);

        $this->getJson('/api/v1/brands')->assertNotFound();
        $this->getJson("/api/v1/brands/{$brand->slug}")->assertNotFound();
    }

    public function test_category_listing_returns_active_roots_with_their_children(): void
    {
        $root = Category::factory()->create(['name' => 'Atasan', 'slug' => 'atasan']);
        Category::factory()->childOf($root)->create(['name' => 'Kemeja', 'slug' => 'kemeja']);
        Category::factory()->childOf($root)->create(['name' => 'Kaos', 'is_active' => false]);

        Category::factory()->create(['name' => 'Nonaktif', 'is_active' => false]);

        $this->getJson('/api/v1/categories')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', 'atasan')
            ->assertJsonCount(1, 'data.0.children')
            ->assertJsonPath('data.0.children.0.slug', 'kemeja');
    }

    public function test_category_page_returns_products_and_children(): void
    {
        $root = Category::factory()->create(['slug' => 'atasan']);
        Category::factory()->childOf($root)->create(['slug' => 'kemeja']);

        $product = Product::factory()->create(['category_id' => $root->id]);

        $this->getJson('/api/v1/categories/atasan')
            ->assertOk()
            ->assertJsonPath('data.slug', 'atasan')
            ->assertJsonCount(1, 'data.children')
            ->assertJsonCount(1, 'products.data')
            ->assertJsonPath('products.data.0.id', $product->id);
    }

    public function test_category_page_returns_404_for_an_inactive_category(): void
    {
        Category::factory()->create(['slug' => 'arsip', 'is_active' => false]);

        $this->getJson('/api/v1/categories/arsip')->assertNotFound();
    }
}
