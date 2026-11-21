<?php

namespace App\Modules\Catalog\Resources;

use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ProductVariant
 */
class ProductVariantResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'size' => $this->size,
            'color' => $this->color,
            'color_hex' => $this->color_hex,
            'price' => (float) $this->price,
            'weight_grams' => (int) $this->weight_grams,
            'is_active' => (bool) $this->is_active,
            'label' => $this->label(),
        ];
    }
}
