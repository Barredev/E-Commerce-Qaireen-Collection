<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\ProductVariant;
use App\Models\User;
use App\Modules\Auth\Enums\UserRole;
use App\Modules\Feedback\Enums\SizeFit;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductReviewTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_guests_cannot_submit_reviews(): void
    {
        $customer = User::factory()->create(['role' => UserRole::Customer]);
        [$order, $item] = $this->deliveredOrder($customer);

        $this->postJson("/api/v1/account/orders/{$order->order_number}/feedback", [
            'reviews' => [
                ['order_item_id' => $item->id, 'rating' => 5],
            ],
        ])->assertUnauthorized();

        $this->getJson("/api/v1/account/orders/{$order->order_number}/feedback")
            ->assertUnauthorized();

        $this->assertDatabaseCount('product_reviews', 0);
    }

    public function test_a_customer_cannot_review_someone_elses_order(): void
    {
        $owner = User::factory()->create(['role' => UserRole::Customer]);
        [$order, $item] = $this->deliveredOrder($owner);

        $this->actingAsCustomer();

        $this->postJson("/api/v1/account/orders/{$order->order_number}/feedback", [
            'reviews' => [
                ['order_item_id' => $item->id, 'rating' => 1],
            ],
        ])->assertNotFound();

        $this->assertDatabaseCount('product_reviews', 0);
    }

    public function test_a_customer_can_submit_product_reviews_and_order_feedback(): void
    {
        $customer = $this->actingAsCustomer();
        [$order, $item] = $this->deliveredOrder($customer);

        $response = $this->postJson("/api/v1/account/orders/{$order->order_number}/feedback", [
            'reviews' => [
                [
                    'order_item_id' => $item->id,
                    'rating' => 5,
                    'comment' => 'Bahannya adem dan jahitannya rapi.',
                    'material_rating' => 4,
                    'size_fit' => SizeFit::Fit->value,
                ],
            ],
            'order_feedback' => [
                'shipping_rating' => 4,
                'service_rating' => 5,
                'comment' => 'Admin responsif saat ditanya ukuran.',
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.reviews.0.rating', 5)
            ->assertJsonPath('data.reviews.0.size_fit', SizeFit::Fit->value)
            ->assertJsonPath('data.reviews.0.material_rating', 4)
            ->assertJsonPath('data.reviews.0.buyer_name', $this->maskedName($customer->name))
            ->assertJsonPath('data.order_feedback.shipping_rating', 4)
            ->assertJsonPath('data.order_feedback.service_rating', 5);

        $this->assertDatabaseHas('product_reviews', [
            'order_item_id' => $item->id,
            'order_id' => $order->id,
            'product_id' => $item->variant->product_id,
            'variant_id' => $item->variant_id,
            'user_id' => $customer->id,
            'rating' => 5,
            'material_rating' => 4,
            'size_fit' => SizeFit::Fit->value,
            'is_hidden' => false,
        ]);

        $this->assertDatabaseHas('order_feedback', [
            'order_id' => $order->id,
            'user_id' => $customer->id,
            'shipping_rating' => 4,
            'service_rating' => 5,
        ]);
    }

    public function test_a_review_is_rejected_before_the_order_is_delivered(): void
    {
        $customer = $this->actingAsCustomer();
        $order = Order::factory()->paid()->create(['user_id' => $customer->id]);
        $item = OrderItem::factory()->create(['order_id' => $order->id, 'quantity' => 1]);

        $this->postJson("/api/v1/account/orders/{$order->order_number}/feedback", [
            'reviews' => [
                ['order_item_id' => $item->id, 'rating' => 4],
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('status');

        $this->assertDatabaseCount('product_reviews', 0);
    }

    public function test_the_same_order_item_cannot_be_reviewed_twice(): void
    {
        $customer = $this->actingAsCustomer();
        [$order, $item] = $this->deliveredOrder($customer);

        $payload = [
            'reviews' => [
                ['order_item_id' => $item->id, 'rating' => 4],
            ],
        ];

        $this->postJson("/api/v1/account/orders/{$order->order_number}/feedback", $payload)
            ->assertCreated();

        $this->postJson("/api/v1/account/orders/{$order->order_number}/feedback", $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('reviews');

        $this->assertDatabaseCount('product_reviews', 1);
    }

    public function test_a_review_cannot_reference_an_item_from_another_order(): void
    {
        $customer = $this->actingAsCustomer();
        [$order] = $this->deliveredOrder($customer);
        [, $foreignItem] = $this->deliveredOrder(User::factory()->create(['role' => UserRole::Customer]));

        $this->postJson("/api/v1/account/orders/{$order->order_number}/feedback", [
            'reviews' => [
                ['order_item_id' => $foreignItem->id, 'rating' => 5],
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('reviews');

        $this->assertDatabaseCount('product_reviews', 0);
    }

    public function test_the_feedback_status_reports_which_items_are_still_reviewable(): void
    {
        $customer = $this->actingAsCustomer();
        [$order, $item] = $this->deliveredOrder($customer, quantity: 2);

        $this->getJson("/api/v1/account/orders/{$order->order_number}/feedback")
            ->assertOk()
            ->assertJsonPath('data.can_review', true)
            ->assertJsonPath('data.items.0.order_item_id', $item->id)
            ->assertJsonPath('data.items.0.review', null);

        $this->postJson("/api/v1/account/orders/{$order->order_number}/feedback", [
            'reviews' => [
                ['order_item_id' => $item->id, 'rating' => 5],
            ],
        ])->assertCreated();

        $this->getJson("/api/v1/account/orders/{$order->order_number}/feedback")
            ->assertOk()
            ->assertJsonPath('data.can_review', false)
            ->assertJsonPath('data.items.0.review.rating', 5);
    }

    public function test_the_order_detail_exposes_the_product_of_each_line(): void
    {
        $customer = $this->actingAsCustomer();
        [$order, $item] = $this->deliveredOrder($customer);

        $this->getJson("/api/v1/account/orders/{$order->order_number}")
            ->assertOk()
            ->assertJsonPath('data.items.0.product_id', $item->variant->product_id)
            ->assertJsonPath('data.items.0.product_slug', $item->variant->product->slug);
    }

    public function test_hidden_reviews_are_excluded_from_the_public_product_page(): void
    {
        [$product, $variant] = $this->productWithVariant();

        $this->reviewFor($product, $variant, ['rating' => 5, 'comment' => 'Bagus sekali.']);
        $this->reviewFor($product, $variant, [
            'rating' => 1,
            'comment' => 'Ulasan kasar.',
            'is_hidden' => true,
            'hidden_at' => now(),
            'hidden_reason' => 'Mengandung kata kasar.',
        ]);

        $this->getJson("/api/v1/products/{$product->slug}/reviews")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.rating', 5)
            ->assertJsonPath('summary.total_reviews', 1)
            ->assertJsonPath('summary.average_rating', 5)
            ->assertJsonPath('summary.rating_distribution.5', 1)
            ->assertJsonPath('summary.rating_distribution.1', 0);
    }

    public function test_the_public_summary_aggregates_aspect_ratings(): void
    {
        [$product, $variant] = $this->productWithVariant();

        $this->reviewFor($product, $variant, [
            'rating' => 4,
            'material_rating' => 3,
            'size_fit' => SizeFit::TooSmall,
        ]);
        $this->reviewFor($product, $variant, [
            'rating' => 5,
            'material_rating' => 5,
            'size_fit' => SizeFit::Fit,
        ]);

        $this->getJson("/api/v1/products/{$product->slug}/reviews")
            ->assertOk()
            ->assertJsonPath('summary.total_reviews', 2)
            ->assertJsonPath('summary.average_rating', 4.5)
            ->assertJsonPath('summary.material_total', 2)
            ->assertJsonPath('summary.material_average', 4)
            ->assertJsonPath('summary.fit_total', 2)
            ->assertJsonPath('summary.fit_distribution.too_small', 1)
            ->assertJsonPath('summary.fit_distribution.fit', 1)
            ->assertJsonPath('summary.fit_distribution.too_large', 0);
    }

    public function test_a_draft_product_has_no_public_reviews_endpoint(): void
    {
        $product = Product::factory()->draft()->create();

        $this->getJson("/api/v1/products/{$product->slug}/reviews")
            ->assertNotFound();
    }

    public function test_admin_can_hide_and_restore_a_review(): void
    {
        [$product, $variant] = $this->productWithVariant();
        $review = $this->reviewFor($product, $variant, ['rating' => 2]);

        $this->actingAsAdmin();

        $this->patchJson("/api/v1/admin/reviews/{$review->id}/toggle-visibility", [
            'reason' => 'Mengandung ujaran tidak pantas.',
        ])->assertOk()
            ->assertJsonPath('data.is_hidden', true)
            ->assertJsonPath('data.hidden_reason', 'Mengandung ujaran tidak pantas.');

        $this->assertDatabaseHas('product_reviews', [
            'id' => $review->id,
            'is_hidden' => true,
        ]);

        $this->patchJson("/api/v1/admin/reviews/{$review->id}/toggle-visibility")
            ->assertOk()
            ->assertJsonPath('data.is_hidden', false)
            ->assertJsonPath('data.hidden_reason', null);
    }

    public function test_admin_can_list_reviews_filtered_by_moderation_status(): void
    {
        [$product, $variant] = $this->productWithVariant();
        $this->reviewFor($product, $variant, ['rating' => 5]);
        $hidden = $this->reviewFor($product, $variant, [
            'rating' => 1,
            'is_hidden' => true,
            'hidden_at' => now(),
        ]);

        $this->actingAsAdmin();

        $this->getJson('/api/v1/admin/reviews?status=hidden')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $hidden->id)
            ->assertJsonPath('data.0.is_hidden', true);

        $this->getJson('/api/v1/admin/reviews?status=visible')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_only_admins_may_moderate_reviews(): void
    {
        [$product, $variant] = $this->productWithVariant();
        $review = $this->reviewFor($product, $variant);

        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Warehouse]));

        $this->patchJson("/api/v1/admin/reviews/{$review->id}/toggle-visibility")
            ->assertForbidden();

        $this->getJson('/api/v1/admin/reviews')->assertForbidden();

        $this->assertDatabaseHas('product_reviews', [
            'id' => $review->id,
            'is_hidden' => false,
        ]);
    }

    private function actingAsCustomer(): User
    {
        $user = User::factory()->create(['role' => UserRole::Customer]);
        Sanctum::actingAs($user);

        return $user;
    }

    private function actingAsAdmin(): User
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        Sanctum::actingAs($admin);

        return $admin;
    }

    /**
     * @return array{0: Order, 1: OrderItem}
     */
    private function deliveredOrder(User $customer, int $quantity = 1, float $unitPrice = 100000.0): array
    {
        $order = Order::factory()->completed()->create([
            'user_id' => $customer->id,
            'subtotal' => $unitPrice * $quantity,
            'grand_total' => $unitPrice * $quantity,
        ]);

        $item = OrderItem::factory()->create([
            'order_id' => $order->id,
            'unit_price' => $unitPrice,
            'quantity' => $quantity,
            'line_total' => $unitPrice * $quantity,
        ]);

        return [$order, $item];
    }

    /**
     * @return array{0: Product, 1: ProductVariant}
     */
    private function productWithVariant(): array
    {
        $product = Product::factory()->create();
        $variant = ProductVariant::factory()->create(['product_id' => $product->id]);

        return [$product, $variant];
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function reviewFor(Product $product, ProductVariant $variant, array $attributes = []): ProductReview
    {
        $order = Order::factory()->completed()->create();
        $item = OrderItem::factory()->create([
            'order_id' => $order->id,
            'variant_id' => $variant->id,
            'variant_size' => $variant->size,
            'variant_color' => $variant->color,
        ]);

        return ProductReview::factory()->create([
            'order_item_id' => $item->id,
            'order_id' => $order->id,
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'user_id' => $order->user_id,
            ...$attributes,
        ]);
    }

    private function maskedName(string $name): string
    {
        return collect(preg_split('/\s+/', trim($name)))
            ->filter()
            ->map(fn (string $part): string => strtoupper(substr($part, 0, 1)).'***')
            ->implode(' ');
    }
}
