<?php

namespace App\Modules\Catalog\Services;

use App\Models\Brand;
use App\Models\Product;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class ProductService
{
    /**
     * Create a product together with its variants and images.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Product
    {
        return DB::transaction(function () use ($data): Product {
            $product = Product::create([
                ...Arr::except($data, ['variants', 'images', 'slug']),
                // Toko tunggal: brand diisi otomatis dari identitas toko yang tersedia
                // sehingga form produk tidak perlu memilih brand.
                'brand_id' => $data['brand_id'] ?? Brand::query()->value('id'),
                'slug' => $data['slug'] ?? Product::generateUniqueSlug($data['name']),
                'published_at' => $this->resolvePublishedAt($data),
            ]);

            foreach ($data['variants'] as $variant) {
                $product->variants()->create([
                    'sku' => $variant['sku'],
                    'size' => $variant['size'],
                    'color' => $variant['color'],
                    'color_hex' => $variant['color_hex'] ?? null,
                    'price' => $variant['price'],
                    'weight_grams' => $variant['weight_grams'] ?? 0,
                    'is_active' => $variant['is_active'] ?? true,
                ]);
            }

            $this->storeImages($product, $data['images'] ?? []);

            return $product->load(['brand', 'category', 'variants', 'images']);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Product $product, array $data): Product
    {
        return DB::transaction(function () use ($product, $data): Product {
            $payload = Arr::except($data, ['slug']);

            if (array_key_exists('brand_id', $payload) && $payload['brand_id'] === null) {
                unset($payload['brand_id']);
            }

            if (array_key_exists('slug', $data)) {
                $payload['slug'] = $data['slug'];
            } elseif (array_key_exists('name', $data) && $data['name'] !== $product->name) {
                $payload['slug'] = Product::generateUniqueSlug($data['name'], $product->id);
            }

            if (array_key_exists('is_active', $data) && $data['is_active'] && $product->published_at === null) {
                $payload['published_at'] = now();
            }

            $product->update($payload);

            return $product->refresh()->load(['brand', 'category', 'variants', 'images']);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function resolvePublishedAt(array $data): mixed
    {
        if (! empty($data['published_at'])) {
            return $data['published_at'];
        }

        return ($data['is_active'] ?? true) ? now() : null;
    }

    /**
     * @param  array<int, array<string, mixed>>  $images
     */
    private function storeImages(Product $product, array $images): void
    {
        if ($images === []) {
            return;
        }

        $hasPrimary = collect($images)->contains(fn (array $image) => (bool) ($image['is_primary'] ?? false));

        foreach ($images as $index => $image) {
            $product->images()->create([
                'variant_id' => $image['variant_id'] ?? null,
                'image_url' => $image['image_url'],
                'alt_text' => $image['alt_text'] ?? $product->name,
                'sort_order' => $image['sort_order'] ?? $index,
                'is_primary' => $hasPrimary
                    ? (bool) ($image['is_primary'] ?? false)
                    : $index === 0,
            ]);
        }
    }
}
