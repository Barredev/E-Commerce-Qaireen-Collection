<?php

namespace App\Modules\Catalog\Resources;

use App\Models\Product;
use Illuminate\Http\Request;

/**
 * @mixin Product
 */
class ProductDetailResource extends ProductResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $sizeGuides = $this->relationLoaded('sizeGuides') ? $this->sizeGuides : collect();

        return [
            ...parent::toArray($request),
            'description' => $this->description,
            'material' => $this->material,
            'care_instructions' => $this->care_instructions,
            'meta_title' => $this->meta_title,
            'meta_description' => $this->meta_description,
            'size_guides' => $sizeGuides->map(fn ($guide) => [
                'id' => $guide->id,
                'size_label' => $guide->size_label,
                'chest_cm' => $guide->chest_cm !== null ? (float) $guide->chest_cm : null,
                'waist_cm' => $guide->waist_cm !== null ? (float) $guide->waist_cm : null,
                'hip_cm' => $guide->hip_cm !== null ? (float) $guide->hip_cm : null,
                'length_cm' => $guide->length_cm !== null ? (float) $guide->length_cm : null,
            ])->values(),
        ];
    }
}
