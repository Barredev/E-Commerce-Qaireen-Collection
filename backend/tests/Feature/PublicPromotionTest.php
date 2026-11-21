<?php

namespace Tests\Feature;

use App\Models\Promotion;
use App\Modules\Promotion\Enums\DiscountBearer;
use App\Modules\Promotion\Enums\PromotionAppliesTo;
use App\Modules\Promotion\Enums\PromotionType;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class PublicPromotionTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_guests_can_list_only_running_promotions(): void
    {
        $this->createPromotion(['code' => 'AKTIF10', 'is_active' => true]);
        $this->createPromotion(['code' => 'NONAKTIF', 'is_active' => false]);
        $this->createPromotion([
            'code' => 'KEDALUWARSA',
            'is_active' => true,
            'ends_at' => now()->subDay(),
        ]);
        $this->createPromotion([
            'code' => 'BELUMMULAI',
            'is_active' => true,
            'starts_at' => now()->addDay(),
        ]);
        $this->createPromotion([
            'code' => 'HABIS',
            'is_active' => true,
            'usage_limit' => 5,
            'usage_count' => 5,
        ]);

        $response = $this->getJson('/api/v1/promotions');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.code', 'AKTIF10');
    }

    public function test_the_limit_parameter_is_clamped(): void
    {
        foreach (range(1, 3) as $index) {
            $this->createPromotion(['code' => "PROMO{$index}"]);
        }

        $this->getJson('/api/v1/promotions?limit=2')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson('/api/v1/promotions?limit=0')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_guests_can_subscribe_to_newsletter_idempotently(): void
    {
        $this->postJson('/api/v1/newsletter', ['email' => 'VIP@Example.com'])
            ->assertCreated()
            ->assertJsonPath('data.email', 'vip@example.com')
            ->assertJsonPath('data.already_subscribed', false);

        $this->assertDatabaseHas('newsletter_subscribers', [
            'email' => 'vip@example.com',
        ]);

        $this->postJson('/api/v1/newsletter', ['email' => 'vip@example.com'])
            ->assertOk()
            ->assertJsonPath('data.already_subscribed', true);

        $this->postJson('/api/v1/newsletter', ['email' => 'bukan-email'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createPromotion(array $overrides = []): Promotion
    {
        return Promotion::create(array_merge([
            'name' => 'Promosi Uji',
            'code' => 'PROMO'.fake()->unique()->numerify('####'),
            'type' => PromotionType::Percentage,
            'value' => 10.0,
            'applies_to' => PromotionAppliesTo::All,
            'discount_bearer' => DiscountBearer::Platform,
            'is_active' => true,
            'usage_count' => 0,
        ], $overrides));
    }
}
