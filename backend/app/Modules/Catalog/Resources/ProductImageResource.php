<?php

namespace App\Modules\Catalog\Resources;

use App\Models\ProductImage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ProductImage
 */
class ProductImageResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'image_url' => $this->image_url,
            'alt_text' => $this->alt_text,
            'variant_id' => $this->variant_id,
            'sort_order' => (int) $this->sort_order,
            'is_primary' => (bool) $this->is_primary,
        ];
    }
}
