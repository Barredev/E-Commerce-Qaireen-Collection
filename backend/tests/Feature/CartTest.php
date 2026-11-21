<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\InventoryStock;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use App\Modules\Auth\Enums\UserRole;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CartTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_guests_get_401_on_cart_endpoints(): void
    {
        $this->getJson('/api/v1/cart')->assertUnauthorized();
        $this->postJson('/api/v1/cart/items', [])->assertUnauthorized();
    }

    public function test_an_empty_cart_is_created_on_first_read(): void
    {
        $user = $this->actingAsCustomer();

        $this->getJson('/api/v1/cart')
            ->assertOk()
            ->assertJsonPath('data.items', [])
            ->assertJsonPath('data.items_count', 0)
            ->assertJsonPath('data.subtotal', 0);

        $this->assertDatabaseHas('carts', ['user_id' => $user->id]);
    }

    public function test_a_customer_can_add_a_variant_to_the_cart(): void
    {
        $this->actingAsCustomer();
        $variant = $this->variantWithStock(quantity: 10);

        $this->postJson('/api/v1/cart/items', [
            'variant_id' => $variant->id,
            'quantity' => 2,
        ])->assertCreated()
            ->assertJsonPath('data.items.0.variant_id', $variant->id)
            ->assertJsonPath('data.items.0.quantity', 2)
            ->assertJsonPath('data.items.0.unit_price', (int) $variant->price);

        $this->assertDatabaseHas('cart_items', [
            'variant_id' => $variant->id,
            'quantity' => 2,
        ]);
    }

    public function test_adding_the_same_variant_again_merges_the_quantity(): void
    {
        $this->actingAsCustomer();
        $variant = $this->variantWithStock(quantity: 10);

        $this->postJson('/api/v1/cart/items', ['variant_id' => $variant->id, 'quantity' => 2]);
        $this->postJson('/api/v1/cart/items', ['variant_id' => $variant->id, 'quantity' => 3])
            ->assertCreated()
            ->assertJsonPath('data.items.0.quantity', 5);

        $this->assertDatabaseCount('cart_items', 1);
    }

    public function test_adding_more_than_the_available_stock_is_rejected(): void
    {
        $this->actingAsCustomer();
        $variant = $this->variantWithStock(quantity: 2);

        $this->postJson('/api/v1/cart/items', [
            'variant_id' => $variant->id,
            'quantity' => 3,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('quantity');

        $this->assertDatabaseCount('cart_items', 0);
    }

    public function test_a_variant_of_an_inactive_product_cannot_be_added(): void
    {
        $this->actingAsCustomer();
        $variant = $this->variantWithStock(quantity: 10);
        $variant->product->update(['is_active' => false]);

        $this->postJson('/api/v1/cart/items', [
            'variant_id' => $variant->id,
            'quantity' => 1,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('variant_id');
    }

    public function test_adding_without_an_active_warehouse_is_rejected(): void
    {
        $this->actingAsCustomer();
        $variant = ProductVariant::factory()->create();
        $variant->product->update(['is_active' => true, 'published_at' => now()->subDay()]);

        $this->postJson('/api/v1/cart/items', [
            'variant_id' => $variant->id,
            'quantity' => 1,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('quantity');
    }

    public function test_a_customer_can_update_a_cart_item_quantity(): void
    {
        $user = $this->actingAsCustomer();
        $variant = $this->variantWithStock(quantity: 10);
        $item = $this->cartItemFor($user, $variant, 1);

        $this->putJson("/api/v1/cart/items/{$item->id}", ['quantity' => 4])
            ->assertOk()
            ->assertJsonPath('data.items.0.quantity', 4);

        $this->assertDatabaseHas('cart_items', ['id' => $item->id, 'quantity' => 4]);
    }

    public function test_a_customer_can_remove_a_cart_item(): void
    {
        $user = $this->actingAsCustomer();
        $variant = $this->variantWithStock(quantity: 10);
        $item = $this->cartItemFor($user, $variant, 2);

        $this->deleteJson("/api/v1/cart/items/{$item->id}")
            ->assertOk()
            ->assertJsonPath('data.items', []);

        $this->assertDatabaseMissing('cart_items', ['id' => $item->id]);
    }

    public function test_a_customer_cannot_modify_another_customers_cart_item(): void
    {
        $this->actingAsCustomer();
        $otherUser = User::factory()->create(['role' => UserRole::Customer]);
        $variant = $this->variantWithStock(quantity: 10);
        $item = $this->cartItemFor($otherUser, $variant, 1);

        $this->putJson("/api/v1/cart/items/{$item->id}", ['quantity' => 5])
            ->assertNotFound();

        $this->deleteJson("/api/v1/cart/items/{$item->id}")->assertNotFound();
    }

    public function test_the_quantity_must_be_at_least_one(): void
    {
        $this->actingAsCustomer();
        $variant = $this->variantWithStock(quantity: 10);

        $this->postJson('/api/v1/cart/items', [
            'variant_id' => $variant->id,
            'quantity' => 0,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('quantity');
    }

    private function actingAsCustomer(): User
    {
        $user = User::factory()->create(['role' => UserRole::Customer]);
        Sanctum::actingAs($user);

        return $user;
    }

    private function variantWithStock(int $quantity): ProductVariant
    {
        $warehouse = Warehouse::factory()->default()->create();
        $variant = ProductVariant::factory()->create();
        $variant->product->update(['is_active' => true, 'published_at' => now()->subDay()]);

        InventoryStock::factory()->create([
            'variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'quantity_on_hand' => $quantity,
            'quantity_reserved' => 0,
        ]);

        return $variant;
    }

    private function cartItemFor(User $user, ProductVariant $variant, int $quantity): CartItem
    {
        $cart = Cart::query()->firstOrCreate(['user_id' => $user->id]);

        return $cart->items()->create([
            'variant_id' => $variant->id,
            'quantity' => $quantity,
        ]);
    }
}
