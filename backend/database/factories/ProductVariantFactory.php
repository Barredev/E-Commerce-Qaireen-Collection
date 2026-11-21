<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ProductVariant>
 */
class ProductVariantFactory extends Factory
{
    protected $model = ProductVariant::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'sku' => 'SKU-'.Str::upper(Str::random(10)),
            'size' => fake()->randomElement(['S', 'M', 'L', 'XL']),
            'color' => fake()->randomElement(['Hitam', 'Putih', 'Navy', 'Maroon']),
            'color_hex' => fake()->randomElement(['#000000', '#FFFFFF', '#1E3A8A', '#7F1D1D']),
            'price' => fake()->numberBetween(100000, 900000),
            'weight_grams' => fake()->numberBetween(150, 800),
            'is_active' => true,
        ];
    }
}
