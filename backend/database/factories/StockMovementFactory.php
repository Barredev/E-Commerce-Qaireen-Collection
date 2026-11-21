<?php

namespace Database\Factories;

use App\Models\ProductVariant;
use App\Models\StockMovement;
use App\Models\Warehouse;
use App\Modules\Inventory\Enums\MovementType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StockMovement>
 */
class StockMovementFactory extends Factory
{
    protected $model = StockMovement::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $quantity = fake()->numberBetween(1, 40);

        return [
            'variant_id' => ProductVariant::factory(),
            'warehouse_id' => Warehouse::factory(),
            'movement_type' => MovementType::Receipt,
            'reference_type' => null,
            'reference_id' => null,
            'quantity' => $quantity,
            'balance_after' => $quantity,
            'notes' => null,
            'created_by' => null,
        ];
    }
}
