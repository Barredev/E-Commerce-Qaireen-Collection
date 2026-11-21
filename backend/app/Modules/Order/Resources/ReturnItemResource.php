<?php

namespace App\Modules\Order\Resources;

use App\Models\ReturnItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ReturnItem
 */
class ReturnItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_item_id' => $this->order_item_id,
            'product_name' => $this->whenLoaded('orderItem', fn () => $this->orderItem?->product_name),
            'variant_sku' => $this->whenLoaded('orderItem', fn () => $this->orderItem?->variant_sku),
            'quantity' => (int) $this->quantity,
            'condition' => $this->condition?->value,
            'condition_label' => $this->condition?->label(),
            'is_restocked' => (bool) $this->is_restocked,
            'refund_amount' => (float) $this->refund_amount,
            'reason' => $this->reason,
            'notes' => $this->notes,
        ];
    }
}
