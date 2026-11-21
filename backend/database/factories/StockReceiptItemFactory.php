<?php

namespace Database\Factories;

use App\Models\ProductVariant;
use App\Models\StockReceipt;
use App\Models\StockReceiptItem;
use App\Modules\Inventory\Enums\StockCondition;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StockReceiptItem>
 */
class StockReceiptItemFactory extends Factory
{
    protected $model = StockReceiptItem::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'stock_receipt_id' => StockReceipt::factory(),
            'variant_id' => ProductVariant::factory(),
            'quantity' => fake()->numberBetween(1, 50),
            'unit_cost' => fake()->numberBetween(50000, 300000),
            'condition' => StockCondition::Good,
            'notes' => null,
        ];
    }
}
