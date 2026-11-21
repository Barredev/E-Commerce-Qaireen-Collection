<?php

namespace App\Modules\Feedback\Services;

use App\Models\Order;
use App\Models\OrderFeedback;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\ProductVariant;
use App\Models\User;
use App\Modules\Feedback\Enums\SizeFit;
use App\Modules\Order\Enums\OrderStatus;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Owns verified-buyer reviews: gating on the order state, writing the product
 * review and service feedback together, and the aggregates the storefront
 * reads back.
 */
class FeedbackService
{
    /**
     * @var array<int, OrderStatus>
     */
    private const REVIEWABLE_STATUSES = [OrderStatus::Delivered, OrderStatus::Completed];

    /**
     * @return array{can_review: bool, message: string|null}
     */
    public function reviewability(Order $order): array
    {
        if (! in_array($order->status, self::REVIEWABLE_STATUSES, true)) {
            return [
                'can_review' => false,
                'message' => 'Ulasan hanya dapat diberikan untuk pesanan yang sudah diterima pelanggan.',
            ];
        }

        return ['can_review' => true, 'message' => null];
    }

    /**
     * Persist one review per order line plus the optional service feedback.
     *
     * @param  array{reviews: array<int, array{order_item_id: string, rating: int, comment?: string|null, material_rating?: int|null, size_fit?: string|null}>, order_feedback?: array{shipping_rating?: int|null, service_rating?: int|null, comment?: string|null}|null}  $data
     * @return array{reviews: Collection<int, ProductReview>, order_feedback: OrderFeedback|null}
     */
    public function submitFeedback(Order $order, User $user, array $data): array
    {
        return DB::transaction(function () use ($order, $user, $data): array {
            $locked = Order::query()->lockForUpdate()->findOrFail($order->id);

            if (! in_array($locked->status, self::REVIEWABLE_STATUSES, true)) {
                throw ValidationException::withMessages([
                    'status' => ['Ulasan hanya dapat diberikan untuk pesanan yang sudah diterima pelanggan.'],
                ]);
            }

            $submitted = collect($data['reviews'])->keyBy('order_item_id');

            $items = $locked->items()
                ->whereIn('id', $submitted->keys()->all())
                ->get()
                ->keyBy('id');

            if ($items->count() !== $submitted->count()) {
                throw ValidationException::withMessages([
                    'reviews' => ['Terdapat barang yang bukan bagian dari pesanan ini.'],
                ]);
            }

            $alreadyReviewed = ProductReview::query()
                ->whereIn('order_item_id', $submitted->keys()->all())
                ->exists();

            if ($alreadyReviewed) {
                throw ValidationException::withMessages([
                    'reviews' => ['Sebagian barang pada pesanan ini sudah pernah diulas.'],
                ]);
            }

            // A soft-deleted variant still owns the line, so resolve the product
            // through the variant's real row instead of the default scope.
            $variants = ProductVariant::query()
                ->withTrashed()
                ->whereIn('id', $items->pluck('variant_id')->all())
                ->get()
                ->keyBy('id');

            foreach ($items as $itemId => $item) {
                $payload = $submitted->get($itemId);

                ProductReview::query()->create([
                    'order_item_id' => $item->id,
                    'order_id' => $locked->id,
                    'product_id' => $variants->get($item->variant_id)?->product_id,
                    'variant_id' => $item->variant_id,
                    'user_id' => $user->id,
                    'rating' => (int) $payload['rating'],
                    'comment' => $payload['comment'] ?? null,
                    'material_rating' => $payload['material_rating'] ?? null,
                    'size_fit' => $payload['size_fit'] ?? null,
                ]);
            }

            $feedback = $this->storeOrderFeedback($locked, $user, $data['order_feedback'] ?? null);

            $reviews = ProductReview::query()
                ->whereIn('order_item_id', $submitted->keys()->all())
                ->with(['user', 'product', 'orderItem'])
                ->orderBy('created_at')
                ->orderBy('id')
                ->get();

            return ['reviews' => $reviews, 'order_feedback' => $feedback];
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function getProductReviewSummary(Product $product): array
    {
        $base = fn () => ProductReview::query()
            ->forProduct($product->id)
            ->published();

        $total = $base()->count();
        $average = $base()->avg('rating');

        $distribution = $base()
            ->selectRaw('rating, count(*) as total')
            ->groupBy('rating')
            ->pluck('total', 'rating');

        $ratingDistribution = [];

        for ($rating = 5; $rating >= 1; $rating--) {
            $ratingDistribution[(string) $rating] = (int) ($distribution[$rating] ?? 0);
        }

        $materialTotal = $base()->whereNotNull('material_rating')->count();
        $materialAverage = $base()->whereNotNull('material_rating')->avg('material_rating');

        $fit = $base()
            ->whereNotNull('size_fit')
            ->selectRaw('size_fit, count(*) as total')
            ->groupBy('size_fit')
            ->pluck('total', 'size_fit');

        $fitDistribution = [];

        foreach (SizeFit::cases() as $case) {
            $fitDistribution[$case->value] = (int) ($fit[$case->value] ?? 0);
        }

        return [
            'total_reviews' => $total,
            'average_rating' => $average !== null ? round((float) $average, 2) : null,
            'rating_distribution' => $ratingDistribution,
            'material_total' => $materialTotal,
            'material_average' => $materialAverage !== null ? round((float) $materialAverage, 2) : null,
            'fit_total' => array_sum($fitDistribution),
            'fit_distribution' => $fitDistribution,
        ];
    }

    public function toggleReviewVisibility(ProductReview $review, ?string $reason = null): ProductReview
    {
        $hiding = ! $review->is_hidden;

        $review->update([
            'is_hidden' => $hiding,
            'hidden_at' => $hiding ? now() : null,
            'hidden_reason' => $hiding ? $reason : null,
        ]);

        return $review->refresh()->load(['user', 'product', 'order', 'orderItem']);
    }

    /**
     * @param  array{shipping_rating?: int|null, service_rating?: int|null, comment?: string|null}|null  $payload
     */
    private function storeOrderFeedback(Order $order, User $user, ?array $payload): ?OrderFeedback
    {
        if ($payload === null || $this->isEmptyFeedback($payload)) {
            return null;
        }

        return OrderFeedback::query()->updateOrCreate(
            ['order_id' => $order->id],
            [
                'user_id' => $user->id,
                'shipping_rating' => $payload['shipping_rating'] ?? null,
                'service_rating' => $payload['service_rating'] ?? null,
                'comment' => $payload['comment'] ?? null,
            ],
        );
    }

    /**
     * @param  array{shipping_rating?: int|null, service_rating?: int|null, comment?: string|null}  $payload
     */
    private function isEmptyFeedback(array $payload): bool
    {
        return ($payload['shipping_rating'] ?? null) === null
            && ($payload['service_rating'] ?? null) === null
            && trim((string) ($payload['comment'] ?? '')) === '';
    }
}
