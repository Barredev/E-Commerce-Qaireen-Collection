<?php

namespace App\Modules\Feedback\Resources;

use App\Models\ProductReview;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ProductReview
 */
class AdminReviewResource extends JsonResource
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
            'is_hidden' => (bool) $this->is_hidden,
            'hidden_at' => $this->hidden_at?->toIso8601String(),
            'hidden_reason' => $this->hidden_reason,
            'customer' => $this->whenLoaded('user', fn () => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ] : null),
            'product' => $this->whenLoaded('product', fn () => $this->product ? [
                'id' => $this->product->id,
                'name' => $this->product->name,
                'slug' => $this->product->slug,
            ] : null),
            'order_number' => $this->whenLoaded('order', fn () => $this->order?->order_number),
            'variant' => [
                'size' => $this->orderItem?->variant_size,
                'color' => $this->orderItem?->variant_color,
            ],
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
