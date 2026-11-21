<?php

namespace App\Modules\Order\Resources;

use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin OrderItem
 */
class OrderItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'variant_id' => $this->variant_id,
            'product_id' => $this->whenLoaded('variant', fn () => $this->variant?->product_id),
            'product_slug' => $this->whenLoaded('variant', fn () => $this->variant?->product?->slug),
            'brand_id' => $this->brand_id,
            'product_name' => $this->product_name,
            'variant_sku' => $this->variant_sku,
            'variant_size' => $this->variant_size,
            'variant_color' => $this->variant_color,
            'brand_name' => $this->brand_name,
            'unit_price' => (float) $this->unit_price,
            'quantity' => (int) $this->quantity,
            'discount_amount' => (float) $this->discount_amount,
            'line_total' => (float) $this->line_total,
        ];
    }
}
