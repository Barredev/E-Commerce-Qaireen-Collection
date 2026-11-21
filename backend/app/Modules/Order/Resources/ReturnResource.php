<?php

namespace App\Modules\Order\Resources;

use App\Models\OrderReturn;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin OrderReturn
 */
class ReturnResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'return_number' => $this->return_number,
            'order_id' => $this->order_id,
            'order_number' => $this->whenLoaded('order', fn () => $this->order?->order_number),
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'reason_category' => $this->reason_category?->value,
            'reason_category_label' => $this->reason_category?->label(),
            'reason' => $this->reason,
            'resolution' => $this->resolution,
            'notes' => $this->notes,
            'refund_amount' => (float) $this->refund_amount,
            'refund_method' => $this->refund_method?->value,
            'refund_method_label' => $this->refund_method?->label(),
            'refund_reference' => $this->refund_reference,
            'requested_at' => $this->requested_at?->toIso8601String(),
            'approved_at' => $this->approved_at?->toIso8601String(),
            'received_at' => $this->received_at?->toIso8601String(),
            'refunded_at' => $this->refunded_at?->toIso8601String(),
            'customer' => $this->whenLoaded('user', fn () => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ] : null),
            'approved_by' => $this->whenLoaded('approvedByUser', fn () => $this->approvedByUser ? [
                'id' => $this->approvedByUser->id,
                'name' => $this->approvedByUser->name,
            ] : null),
            'verified_by' => $this->whenLoaded('verifiedByUser', fn () => $this->verifiedByUser ? [
                'id' => $this->verifiedByUser->id,
                'name' => $this->verifiedByUser->name,
            ] : null),
            'items' => ReturnItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
