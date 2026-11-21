<?php

namespace App\Modules\Order\Resources;

use App\Models\Order;
use App\Modules\Order\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Order
 */
class OrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $allowedTransitions = app(OrderService::class)->allowedTransitions($this->status);

        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'allowed_transitions' => array_map(
                fn ($status) => ['value' => $status->value, 'label' => $status->label()],
                $allowedTransitions,
            ),
            'subtotal' => (float) $this->subtotal,
            'discount_total' => (float) $this->discount_total,
            'shipping_cost' => (float) $this->shipping_cost,
            'tax_amount' => (float) $this->tax_amount,
            'grand_total' => (float) $this->grand_total,
            'coupon_code' => $this->coupon_code,
            'courier' => [
                'code' => $this->courier_code,
                'name' => $this->courier_name,
                'service' => $this->courier_service,
            ],
            'shipping_destination_id' => $this->shipping_destination_id,
            'shipping' => [
                'name' => $this->shipping_name,
                'phone' => $this->shipping_phone,
                'address' => $this->shipping_address,
                'district' => $this->shipping_district,
                'city' => $this->shipping_city,
                'province' => $this->shipping_province,
                'postal_code' => $this->shipping_postal_code,
            ],
            'billing_name' => $this->billing_name,
            'notes' => $this->notes,
            'cancellation_reason' => $this->cancellation_reason,
            'paid_at' => $this->paid_at?->toIso8601String(),
            'shipped_at' => $this->shipped_at?->toIso8601String(),
            'delivered_at' => $this->delivered_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'refunded_at' => $this->refunded_at?->toIso8601String(),
            'customer' => $this->whenLoaded('user', fn () => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'phone' => $this->user->phone,
            ] : null),
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'payments' => $this->whenLoaded('payments', fn () => $this->payments->map(fn ($payment) => [
                'id' => $payment->id,
                'payment_method' => $payment->payment_method,
                'payment_gateway' => $payment->payment_gateway,
                'gateway_transaction_id' => $payment->gateway_transaction_id,
                'amount' => (float) $payment->amount,
                'status' => $payment->status?->value,
                'status_label' => $payment->status?->label(),
                'paid_at' => $payment->paid_at?->toIso8601String(),
                'expired_at' => $payment->expired_at?->toIso8601String(),
            ])),
            'shipments' => ShipmentResource::collection($this->whenLoaded('shipments')),
            'returns' => ReturnResource::collection($this->whenLoaded('returns')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
