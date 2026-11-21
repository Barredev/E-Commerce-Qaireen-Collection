<?php

namespace App\Modules\Catalog\Resources;

use App\Models\Brand;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Brand
 */
class BrandResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'logo_url' => $this->logo_url,
            'banner_url' => $this->banner_url,
            'is_active' => (bool) $this->is_active,
            'sort_order' => (int) $this->sort_order,
            'products_count' => $this->whenCounted('products'),
            'meta_title' => $this->when($request->user()?->isAdmin(), $this->meta_title),
            'meta_description' => $this->when($request->user()?->isAdmin(), $this->meta_description),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
