<?php

namespace App\Modules\Catalog\Resources;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Product
 */
class ProductResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $variants = $this->relationLoaded('variants') ? $this->variants : null;

        $prices = $variants !== null && $variants->isNotEmpty()
            ? $variants->pluck('price')->map(fn ($price) => (float) $price)
            : collect([(float) $this->base_price]);

        $images = $this->relationLoaded('images') ? $this->images : collect();
        $thumbnail = $images->firstWhere('is_primary', true) ?? $images->first();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'brand' => new BrandResource($this->whenLoaded('brand')),
            'category' => new CategoryResource($this->whenLoaded('category')),
            'base_price' => (float) $this->base_price,
            'price_min' => $prices->min(),
            'price_max' => $prices->max(),
            'is_active' => (bool) $this->is_active,
            'is_featured' => (bool) $this->is_featured,
            'thumbnail' => $thumbnail?->image_url,
            'variants' => ProductVariantResource::collection($this->whenLoaded('variants')),
            'images' => ProductImageResource::collection($this->whenLoaded('images')),
            'published_at' => $this->published_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
