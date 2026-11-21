<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\OrderReturn;
use App\Models\User;
use App\Modules\Order\Enums\ReturnReason;
use App\Modules\Order\Enums\ReturnStatus;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<OrderReturn>
 */
class OrderReturnFactory extends Factory
{
    protected $model = OrderReturn::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'user_id' => User::factory(),
            'return_number' => 'RET-'.now()->format('Ymd').'-'.Str::upper(Str::random(6)),
            'reason_category' => ReturnReason::Damaged,
            'reason' => fake()->sentence(),
            'status' => ReturnStatus::Requested,
            'requested_at' => now(),
            'refund_amount' => 0,
            'notes' => null,
        ];
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ReturnStatus::Approved,
            'approved_at' => now(),
        ]);
    }

    public function received(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ReturnStatus::Received,
            'approved_at' => now()->subDay(),
            'received_at' => now(),
        ]);
    }
}
