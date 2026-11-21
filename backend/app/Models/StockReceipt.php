<?php

namespace App\Models;

use App\Modules\Inventory\Enums\ReceiptSourceType;
use App\Modules\Inventory\Enums\ReceiptStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockReceipt extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'receipt_number',
        'warehouse_id',
        'source_type',
        'received_by',
        'received_at',
        'notes',
        'status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'source_type' => ReceiptSourceType::class,
            'status' => ReceiptStatus::class,
            'received_at' => 'datetime',
        ];
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(StockReceiptItem::class);
    }

    /**
     * @param  Builder<StockReceipt>  $query
     */
    public function scopeDraft(Builder $query): void
    {
        $query->where('status', ReceiptStatus::Draft);
    }

    public function isDraft(): bool
    {
        return $this->status === ReceiptStatus::Draft;
    }
}
