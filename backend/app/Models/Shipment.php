<?php

namespace App\Models;

use App\Modules\Order\Enums\ShipmentStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Shipment extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'order_id',
        'courier_code',
        'courier_name',
        'courier_service',
        'tracking_number',
        'shipping_cost',
        'status',
        'shipped_at',
        'delivered_at',
        'estimated_delivery',
        'tracking_history',
        'last_tracked_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ShipmentStatus::class,
            'shipping_cost' => 'decimal:2',
            'shipped_at' => 'datetime',
            'delivered_at' => 'datetime',
            'estimated_delivery' => 'datetime',
            'tracking_history' => 'array',
            'last_tracked_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
