<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\User;
use App\Modules\Order\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    protected $model = Order::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $subtotal = fake()->numberBetween(150000, 1500000);

        return [
            'order_number' => 'ORD-'.now()->format('Ymd').'-'.Str::upper(Str::random(6)),
            'user_id' => User::factory(),
            'status' => OrderStatus::PendingPayment,
            'subtotal' => $subtotal,
            'discount_total' => 0,
            'shipping_cost' => 0,
            'tax_amount' => 0,
            'grand_total' => $subtotal,
            'shipping_name' => fake()->name(),
            'shipping_phone' => fake()->numerify('08##########'),
            'shipping_address' => fake()->streetAddress(),
            'shipping_district' => fake()->citySuffix(),
            'shipping_city' => fake()->city(),
            'shipping_province' => fake()->state(),
            'shipping_postal_code' => fake()->numerify('#####'),
            'notes' => null,
        ];
    }

    public function paid(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => OrderStatus::Paid,
            'paid_at' => now(),
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => OrderStatus::Completed,
            'paid_at' => now()->subDays(5),
            'shipped_at' => now()->subDays(4),
            'delivered_at' => now()->subDays(2),
            'completed_at' => now()->subDay(),
        ]);
    }
}
