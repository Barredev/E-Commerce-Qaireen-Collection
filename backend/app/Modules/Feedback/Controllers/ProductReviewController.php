<?php

namespace App\Modules\Feedback\Controllers;

use App\Models\Product;
use App\Models\ProductReview;
use App\Modules\Feedback\Resources\ProductReviewResource;
use App\Modules\Feedback\Services\FeedbackService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductReviewController
{
    public function __construct(private readonly FeedbackService $feedback) {}

    /**
     * Published reviews plus the aggregate summary for one product.
     */
    public function index(Request $request, Product $product): JsonResponse
    {
        abort_unless(
            $product->is_active && $product->published_at !== null && $product->published_at->isPast(),
            404
        );

        $reviews = ProductReview::query()
            ->forProduct($product->id)
            ->published()
            ->with(['user', 'product', 'orderItem'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(min(max($request->integer('per_page', 5), 1), 20))
            ->withQueryString();

        $payload = ProductReviewResource::collection($reviews)->response()->getData(true);
        $payload['summary'] = $this->feedback->getProductReviewSummary($product);

        return response()->json($payload);
    }
}
