<?php

namespace App\Modules\Inventory\Resources;

use App\Models\StockReceipt;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StockReceipt
 */
class StockReceiptResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'receipt_number' => $this->receipt_number,
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'source_type' => $this->source_type?->value,
            'source_type_label' => $this->source_type?->label(),
            'warehouse' => new WarehouseResource($this->whenLoaded('warehouse')),
            'received_by' => $this->received_by,
            'receiver' => $this->whenLoaded('receiver', fn () => $this->receiver ? [
                'id' => $this->receiver->id,
                'name' => $this->receiver->name,
            ] : null),
            'received_at' => $this->received_at?->toIso8601String(),
            'notes' => $this->notes,
            'items_count' => $this->whenCounted('items'),
            'total_quantity' => $this->whenLoaded('items', fn () => (int) $this->items->sum('quantity')),
            'items' => StockReceiptItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
