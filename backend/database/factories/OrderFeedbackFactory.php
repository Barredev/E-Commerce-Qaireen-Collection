<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\OrderFeedback;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OrderFeedback>
 */
class OrderFeedbackFactory extends Factory
{
    protected $model = OrderFeedback::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'user_id' => User::factory(),
            'shipping_rating' => fake()->numberBetween(3, 5),
            'service_rating' => fake()->numberBetween(3, 5),
            'comment' => fake()->optional()->sentence(),
        ];
    }
}
