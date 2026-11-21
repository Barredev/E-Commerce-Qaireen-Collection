<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\Payment;
use App\Modules\Order\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
{
    protected $model = Payment::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'payment_method' => fake()->randomElement(['bank_transfer', 'cod', 'ewallet']),
            'payment_gateway' => null,
            'gateway_transaction_id' => null,
            'gateway_response' => null,
            'amount' => fake()->numberBetween(150000, 1500000),
            'status' => PaymentStatus::Pending,
            'paid_at' => null,
            'expired_at' => now()->addDay(),
        ];
    }

    public function paid(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => PaymentStatus::Paid,
            'paid_at' => now(),
        ]);
    }
}
