<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryStock extends Model
{
    use HasFactory, HasUuids;

    /**
     * `quantity_available` is a generated column (on_hand - reserved) and is
     * therefore read-only; it must never be mass assigned.
     */
    protected $fillable = [
        'variant_id',
        'warehouse_id',
        'quantity_on_hand',
        'quantity_reserved',
        'low_stock_threshold',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'quantity_on_hand' => 'integer',
            'quantity_reserved' => 'integer',
            'quantity_available' => 'integer',
            'low_stock_threshold' => 'integer',
        ];
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    /**
     * @param  Builder<InventoryStock>  $query
     */
    public function scopeLowStock(Builder $query): void
    {
        $query->whereColumn('quantity_available', '<=', 'low_stock_threshold');
    }

    /**
     * @param  Builder<InventoryStock>  $query
     */
    public function scopeForPool(
        Builder $query,
        string $variantId,
        string $warehouseId,
    ): void {
        $query->where('variant_id', $variantId)
            ->where('warehouse_id', $warehouseId);
    }

    public function isLowStock(): bool
    {
        return $this->quantity_available <= $this->low_stock_threshold;
    }
}
