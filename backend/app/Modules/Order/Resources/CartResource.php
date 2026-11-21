<?php

namespace App\Modules\Order\Resources;

use App\Models\Cart;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Cart
 */
class CartResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $items = $this->relationLoaded('items') ? $this->items : collect();

        return [
            'id' => $this->id,
            'items' => CartItemResource::collection($this->whenLoaded('items')),
            'items_count' => $items->sum('quantity'),
            'subtotal' => (float) $items->sum(
                fn ($item) => (float) ($item->variant?->price ?? 0) * (int) $item->quantity
            ),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
