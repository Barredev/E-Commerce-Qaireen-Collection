<?php

namespace Database\Factories;

use App\Models\Brand;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OrderItem>
 */
class OrderItemFactory extends Factory
{
    protected $model = OrderItem::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $quantity = fake()->numberBetween(1, 3);
        $unitPrice = fake()->numberBetween(100000, 500000);

        return [
            'order_id' => Order::factory(),
            'variant_id' => ProductVariant::factory(),
            'brand_id' => Brand::factory(),
            'product_name' => fake()->words(3, true),
            'variant_sku' => 'SKU-'.fake()->unique()->numerify('######'),
            'variant_size' => fake()->randomElement(['S', 'M', 'L', 'XL']),
            'variant_color' => fake()->randomElement(['Hitam', 'Putih', 'Navy']),
            'brand_name' => fake()->company(),
            'unit_price' => $unitPrice,
            'quantity' => $quantity,
            'discount_amount' => 0,
            'line_total' => $unitPrice * $quantity,
            'warehouse_id' => null,
            'stock_reserved' => false,
            'stock_deducted' => false,
        ];
    }
}
