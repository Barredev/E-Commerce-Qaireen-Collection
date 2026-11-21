<?php

namespace App\Modules\Inventory\Resources;

use App\Models\StockReceiptItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StockReceiptItem
 */
class StockReceiptItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'variant_id' => $this->variant_id,
            'sku' => $this->whenLoaded('variant', fn () => $this->variant->sku),
            'variant_label' => $this->whenLoaded('variant', fn () => $this->variant->label()),
            'product_name' => $this->whenLoaded(
                'variant',
                fn () => $this->variant->product?->name
            ),
            'quantity' => (int) $this->quantity,
            'unit_cost' => $this->unit_cost !== null ? (float) $this->unit_cost : null,
            'condition' => $this->condition?->value,
            'condition_label' => $this->condition?->label(),
            'notes' => $this->notes,
        ];
    }
}
