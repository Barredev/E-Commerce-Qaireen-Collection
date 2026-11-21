<?php

namespace App\Modules\Inventory\Resources;

use App\Models\InventoryStock;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin InventoryStock
 */
class InventoryStockResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'variant_id' => $this->variant_id,
            'warehouse' => new WarehouseResource($this->whenLoaded('warehouse')),
            'variant' => $this->whenLoaded('variant', fn () => [
                'id' => $this->variant->id,
                'sku' => $this->variant->sku,
                'size' => $this->variant->size,
                'color' => $this->variant->color,
                'label' => $this->variant->label(),
                'product' => $this->variant->relationLoaded('product') && $this->variant->product ? [
                    'id' => $this->variant->product->id,
                    'name' => $this->variant->product->name,
                    'slug' => $this->variant->product->slug,
                    'brand' => $this->variant->product->relationLoaded('brand') && $this->variant->product->brand ? [
                        'id' => $this->variant->product->brand->id,
                        'name' => $this->variant->product->brand->name,
                    ] : null,
                ] : null,
            ]),
            'quantity_on_hand' => (int) $this->quantity_on_hand,
            'quantity_reserved' => (int) $this->quantity_reserved,
            'quantity_available' => (int) $this->quantity_available,
            'low_stock_threshold' => (int) $this->low_stock_threshold,
            'is_low_stock' => $this->isLowStock(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
