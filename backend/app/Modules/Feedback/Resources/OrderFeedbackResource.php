<?php

namespace App\Modules\Feedback\Resources;

use App\Models\OrderFeedback;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin OrderFeedback
 */
class OrderFeedbackResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'shipping_rating' => $this->shipping_rating !== null ? (int) $this->shipping_rating : null,
            'service_rating' => $this->service_rating !== null ? (int) $this->service_rating : null,
            'comment' => $this->comment,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
