<?php

namespace App\Modules\Order\Resources;

use App\Models\CartItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CartItem
 */
class CartItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $variant = $this->whenLoaded('variant', fn () => $this->variant);
        $product = $variant?->relationLoaded('product') ? $variant->product : null;
        $brand = $product?->relationLoaded('brand') ? $product->brand : null;
        $images = $product?->relationLoaded('images') ? $product->images : collect();
        $thumbnail = $images->firstWhere('is_primary', true) ?? $images->first();
        $unitPrice = (float) ($variant?->price ?? 0);

        return [
            'id' => $this->id,
            'variant_id' => $this->variant_id,
            'quantity' => (int) $this->quantity,
            'unit_price' => $unitPrice,
            'line_total' => $unitPrice * (int) $this->quantity,
            'variant' => $variant ? [
                'id' => $variant->id,
                'sku' => $variant->sku,
                'size' => $variant->size,
                'color' => $variant->color,
                'color_hex' => $variant->color_hex,
                'label' => $variant->label(),
                'price' => $unitPrice,
            ] : null,
            'product' => $product ? [
                'id' => $product->id,
                'name' => $product->name,
                'slug' => $product->slug,
                'thumbnail' => $thumbnail?->image_url,
                'brand' => $brand ? [
                    'id' => $brand->id,
                    'name' => $brand->name,
                    'slug' => $brand->slug,
                    'type' => $brand->type?->value,
                    'type_label' => $brand->type?->label(),
                ] : null,
            ] : null,
        ];
    }
}
