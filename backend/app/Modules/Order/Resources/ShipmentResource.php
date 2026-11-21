<?php

namespace App\Modules\Order\Resources;

use App\Models\Shipment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Shipment
 */
class ShipmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'courier_code' => $this->courier_code,
            'courier_name' => $this->courier_name,
            'courier_service' => $this->courier_service,
            'tracking_number' => $this->tracking_number,
            'shipping_cost' => (float) $this->shipping_cost,
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'shipped_at' => $this->shipped_at?->toIso8601String(),
            'delivered_at' => $this->delivered_at?->toIso8601String(),
            'estimated_delivery' => $this->estimated_delivery?->toIso8601String(),
            'tracking_history' => $this->tracking_history ?? [],
            'last_tracked_at' => $this->last_tracked_at?->toIso8601String(),
        ];
    }
}
