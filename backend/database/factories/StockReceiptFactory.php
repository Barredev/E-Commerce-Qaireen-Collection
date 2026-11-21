<?php

namespace Database\Factories;

use App\Models\StockReceipt;
use App\Models\Warehouse;
use App\Modules\Inventory\Enums\ReceiptSourceType;
use App\Modules\Inventory\Enums\ReceiptStatus;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<StockReceipt>
 */
class StockReceiptFactory extends Factory
{
    protected $model = StockReceipt::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'receipt_number' => 'SR-'.now()->format('Ymd').'-'.Str::upper(Str::random(6)),
            'warehouse_id' => Warehouse::factory(),
            'source_type' => ReceiptSourceType::Production,
            'received_at' => null,
            'notes' => null,
            'status' => ReceiptStatus::Draft,
        ];
    }

    public function confirmed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ReceiptStatus::Confirmed,
            'received_at' => now(),
        ]);
    }
}
