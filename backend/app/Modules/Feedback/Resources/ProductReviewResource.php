<?php

namespace App\Modules\Feedback\Resources;

use App\Models\ProductReview;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

/**
 * @mixin ProductReview
 */
class ProductReviewResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'rating' => (int) $this->rating,
            'comment' => $this->comment,
            'material_rating' => $this->material_rating !== null ? (int) $this->material_rating : null,
            'size_fit' => $this->size_fit?->value,
            'size_fit_label' => $this->size_fit?->label(),
            'buyer_name' => $this->whenLoaded('user', fn () => $this->maskName($this->user?->name)),
            'variant' => [
                'size' => $this->orderItem?->variant_size,
                'color' => $this->orderItem?->variant_color,
            ],
            'product' => $this->whenLoaded('product', fn () => $this->product ? [
                'id' => $this->product->id,
                'name' => $this->product->name,
                'slug' => $this->product->slug,
            ] : null),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }

    /**
     * Public listings show "A*** B***" so buyers are not identifiable.
     */
    private function maskName(?string $name): ?string
    {
        if ($name === null || trim($name) === '') {
            return null;
        }

        return collect(preg_split('/\s+/', trim($name)))
            ->filter()
            ->map(fn (string $part): string => Str::upper(Str::substr($part, 0, 1)).'***')
            ->implode(' ');
    }
}
