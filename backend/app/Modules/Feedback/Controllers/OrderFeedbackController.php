<?php

namespace App\Modules\Feedback\Controllers;

use App\Models\Order;
use App\Modules\Feedback\Requests\SubmitFeedbackRequest;
use App\Modules\Feedback\Resources\OrderFeedbackResource;
use App\Modules\Feedback\Resources\ProductReviewResource;
use App\Modules\Feedback\Services\FeedbackService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderFeedbackController
{
    public function __construct(private readonly FeedbackService $feedback) {}

    /**
     * Review eligibility for one order, plus anything already submitted.
     */
    public function show(Request $request, Order $order): JsonResponse
    {
        $this->ensureOwnedBy($request, $order);

        $order->load([
            'items.review.user',
            'items.review.product',
            'items.review.orderItem',
            'items.variant.product',
            'feedback',
        ]);

        $reviewability = $this->feedback->reviewability($order);
        $hasUnreviewedItem = $order->items->contains(fn ($item) => $item->review === null);

        return response()->json([
            'data' => [
                'order_number' => $order->order_number,
                'status' => $order->status?->value,
                'can_review' => $reviewability['can_review'] && $hasUnreviewedItem,
                'message' => $reviewability['message']
                    ?? ($hasUnreviewedItem ? null : 'Semua barang pada pesanan ini sudah diulas.'),
                'items' => $order->items->map(fn ($item) => [
                    'order_item_id' => $item->id,
                    'product_id' => $item->variant?->product_id,
                    'product_name' => $item->product_name,
                    'product_slug' => $item->variant?->product?->slug,
                    'variant_size' => $item->variant_size,
                    'variant_color' => $item->variant_color,
                    'quantity' => (int) $item->quantity,
                    'review' => $item->review !== null
                        ? (new ProductReviewResource($item->review))->resolve()
                        : null,
                ])->values(),
                'order_feedback' => $order->feedback !== null
                    ? (new OrderFeedbackResource($order->feedback))->resolve()
                    : null,
            ],
        ]);
    }

    public function store(SubmitFeedbackRequest $request, Order $order): JsonResponse
    {
        $this->ensureOwnedBy($request, $order);

        $result = $this->feedback->submitFeedback($order, $request->user(), $request->validated());

        return response()->json([
            'data' => [
                'reviews' => ProductReviewResource::collection($result['reviews'])->resolve(),
                'order_feedback' => $result['order_feedback'] !== null
                    ? (new OrderFeedbackResource($result['order_feedback']))->resolve()
                    : null,
            ],
        ], 201);
    }

    private function ensureOwnedBy(Request $request, Order $order): void
    {
        abort_unless($order->user_id === $request->user()->id, 404);
    }
}
