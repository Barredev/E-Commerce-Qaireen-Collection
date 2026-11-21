<?php

namespace App\Models;

use App\Modules\Inventory\Enums\StockCondition;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $return_id
 * @property string $order_item_id
 * @property int $quantity
 * @property StockCondition $condition
 * @property bool $is_restocked
 * @property string $refund_amount
 */
class ReturnItem extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'return_id',
        'order_item_id',
        'quantity',
        'condition',
        'is_restocked',
        'refund_amount',
        'reason',
        'notes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'condition' => StockCondition::class,
            'quantity' => 'integer',
            'is_restocked' => 'boolean',
            'refund_amount' => 'decimal:2',
        ];
    }

    public function orderReturn(): BelongsTo
    {
        return $this->belongsTo(OrderReturn::class, 'return_id');
    }

    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class, 'order_item_id');
    }
}
