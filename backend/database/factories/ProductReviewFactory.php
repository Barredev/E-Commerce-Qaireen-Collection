<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\ProductVariant;
use App\Models\User;
use App\Modules\Feedback\Enums\SizeFit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProductReview>
 */
class ProductReviewFactory extends Factory
{
    protected $model = ProductReview::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_item_id' => OrderItem::factory(),
            'order_id' => Order::factory(),
            'product_id' => Product::factory(),
            'variant_id' => ProductVariant::factory(),
            'user_id' => User::factory(),
            'rating' => fake()->numberBetween(3, 5),
            'comment' => fake()->optional(0.8)->sentence(),
            'material_rating' => fake()->optional(0.8)->numberBetween(3, 5),
            'size_fit' => fake()->randomElement(SizeFit::cases()),
            'is_hidden' => false,
            'hidden_at' => null,
            'hidden_reason' => null,
        ];
    }

    public function hidden(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_hidden' => true,
            'hidden_at' => now(),
            'hidden_reason' => 'Mengandung kata kasar.',
        ]);
    }
}
