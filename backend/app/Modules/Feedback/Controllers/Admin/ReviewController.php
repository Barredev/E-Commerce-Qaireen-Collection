<?php

namespace App\Modules\Feedback\Controllers\Admin;

use App\Models\ProductReview;
use App\Modules\Feedback\Requests\AdminToggleVisibilityRequest;
use App\Modules\Feedback\Resources\AdminReviewResource;
use App\Modules\Feedback\Services\FeedbackService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ReviewController
{
    public function __construct(private readonly FeedbackService $feedback) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $reviews = ProductReview::query()
            ->with(['user', 'product', 'order', 'orderItem'])
            ->when($request->filled('status'), function ($query) use ($request): void {
                match ($request->string('status')->toString()) {
                    'hidden' => $query->where('is_hidden', true),
                    'visible' => $query->where('is_hidden', false),
                    default => null,
                };
            })
            ->when($request->filled('rating'), fn ($query) => $query->where('rating', $request->integer('rating')))
            ->when($request->filled('product_id'), fn ($query) => $query->where('product_id', $request->string('product_id')->toString()))
            ->when($request->filled('q'), function ($query) use ($request): void {
                $term = '%'.$request->string('q')->trim().'%';

                $query->where(fn ($inner) => $inner
                    ->where('comment', 'ilike', $term)
                    ->orWhereHas('product', fn ($product) => $product->where('name', 'ilike', $term))
                    ->orWhereHas('user', fn ($user) => $user
                        ->where('name', 'ilike', $term)
                        ->orWhere('email', 'ilike', $term))
                    ->orWhereHas('order', fn ($order) => $order->where('order_number', 'ilike', $term)));
            })
            ->when($request->filled('from'), fn ($query) => $query->whereDate('created_at', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($query) => $query->whereDate('created_at', '<=', $request->date('to')))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(min(max($request->integer('per_page', 20), 1), 100))
            ->withQueryString();

        return AdminReviewResource::collection($reviews);
    }

    public function toggleVisibility(AdminToggleVisibilityRequest $request, ProductReview $review): JsonResponse
    {
        $toggled = $this->feedback->toggleReviewVisibility(
            $review,
            $request->input('reason'),
        );

        return response()->json(['data' => new AdminReviewResource($toggled)]);
    }
}
