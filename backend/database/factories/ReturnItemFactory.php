<?php

namespace Database\Factories;

use App\Models\OrderItem;
use App\Models\OrderReturn;
use App\Models\ReturnItem;
use App\Modules\Inventory\Enums\StockCondition;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ReturnItem>
 */
class ReturnItemFactory extends Factory
{
    protected $model = ReturnItem::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'return_id' => OrderReturn::factory(),
            'order_item_id' => OrderItem::factory(),
            'quantity' => 1,
            'condition' => StockCondition::Good,
            'is_restocked' => false,
            'refund_amount' => 0,
            'reason' => null,
            'notes' => null,
        ];
    }

    public function damaged(): static
    {
        return $this->state(fn (array $attributes) => [
            'condition' => StockCondition::Damaged,
        ]);
    }
}
