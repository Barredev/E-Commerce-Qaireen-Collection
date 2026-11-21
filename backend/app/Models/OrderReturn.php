<?php

namespace App\Models;

use App\Modules\Order\Enums\RefundMethod;
use App\Modules\Order\Enums\ReturnReason;
use App\Modules\Order\Enums\ReturnStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string $id
 * @property string $order_id
 * @property string $user_id
 * @property string $return_number
 * @property ReturnReason $reason_category
 * @property string $reason
 * @property ReturnStatus $status
 * @property string $refund_amount
 * @property RefundMethod|null $refund_method
 */
class OrderReturn extends Model
{
    use HasFactory, HasUuids;

    /**
     * "Return" is a reserved word, so the model cannot be named Return; the
     * table it maps to is still called "returns".
     *
     * @var string
     */
    protected $table = 'returns';

    protected $fillable = [
        'order_id',
        'user_id',
        'return_number',
        'reason_category',
        'reason',
        'status',
        'requested_at',
        'approved_by',
        'approved_at',
        'verified_by',
        'received_at',
        'resolution',
        'refund_amount',
        'refund_method',
        'refund_reference',
        'refunded_at',
        'notes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'reason_category' => ReturnReason::class,
            'status' => ReturnStatus::class,
            'refund_method' => RefundMethod::class,
            'refund_amount' => 'decimal:2',
            'requested_at' => 'datetime',
            'approved_at' => 'datetime',
            'received_at' => 'datetime',
            'refunded_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(ReturnItem::class, 'return_id');
    }

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function verifiedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
