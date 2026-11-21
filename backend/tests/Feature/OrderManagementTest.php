<?php

namespace Tests\Feature;

use App\Models\InventoryStock;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use App\Modules\Auth\Enums\UserRole;
use App\Modules\Inventory\Enums\MovementType;
use App\Modules\Order\Enums\OrderStatus;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrderManagementTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_guests_get_401_on_order_endpoints(): void
    {
        $this->getJson('/api/v1/account/orders')->assertUnauthorized();
        $this->getJson('/api/v1/admin/orders')->assertUnauthorized();
    }

    public function test_a_customer_only_sees_their_own_orders(): void
    {
        $user = $this->actingAsCustomer();
        Order::factory()->create(['user_id' => $user->id]);
        Order::factory()->create();

        $this->getJson('/api/v1/account/orders')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.user_id', null);
    }

    public function test_a_customer_cannot_read_another_customers_order(): void
    {
        $this->actingAsCustomer();
        $other = Order::factory()->create();

        $this->getJson("/api/v1/account/orders/{$other->order_number}")
            ->assertNotFound();
    }

    public function test_admin_can_list_orders_and_filter_by_status(): void
    {
        $this->actingAsAdmin();
        Order::factory()->create();
        $paid = Order::factory()->paid()->create();

        $this->getJson('/api/v1/admin/orders?status=paid')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $paid->id);
    }

    public function test_paying_an_order_deducts_reserved_stock_and_records_a_sale(): void
    {
        $this->actingAsAdmin();
        [$order, $item, $stock] = $this->reservedOrder(quantity: 2);

        $this->putJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => OrderStatus::Paid->value,
        ])->assertOk()
            ->assertJsonPath('data.status', OrderStatus::Paid->value);

        $this->assertDatabaseHas('inventory_stocks', [
            'id' => $stock->id,
            'quantity_on_hand' => 8,
            'quantity_reserved' => 0,
        ]);

        $this->assertDatabaseHas('order_items', [
            'id' => $item->id,
            'stock_reserved' => false,
            'stock_deducted' => true,
        ]);

        $this->assertDatabaseHas('stock_movements', [
            'variant_id' => $item->variant_id,
            'movement_type' => MovementType::Sale->value,
            'quantity' => -2,
            'balance_after' => 8,
            'reference_type' => 'order_item',
            'reference_id' => $item->id,
        ]);

        $this->assertNotNull($order->refresh()->paid_at);
        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id,
            'status' => 'paid',
        ]);
    }

    public function test_an_invalid_status_transition_is_rejected(): void
    {
        $this->actingAsAdmin();
        $order = Order::factory()->create();

        $this->putJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => OrderStatus::Shipped->value,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('status');

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => OrderStatus::PendingPayment->value,
        ]);
    }

    public function test_admin_can_ship_a_paid_order(): void
    {
        $this->actingAsAdmin();
        $order = Order::factory()->paid()->create();

        $this->postJson("/api/v1/admin/orders/{$order->id}/ship", [
            'courier_code' => 'jne',
            'courier_name' => 'JNE',
            'courier_service' => 'REG',
            'tracking_number' => 'JNE123456',
        ])->assertOk()
            ->assertJsonPath('data.status', OrderStatus::Shipped->value)
            ->assertJsonPath('data.shipments.0.tracking_number', 'JNE123456');

        $this->assertNotNull($order->refresh()->shipped_at);
    }

    public function test_a_pending_order_cannot_be_shipped(): void
    {
        $this->actingAsAdmin();
        $order = Order::factory()->create();

        $this->postJson("/api/v1/admin/orders/{$order->id}/ship", [
            'courier_code' => 'jne',
            'courier_name' => 'JNE',
            'courier_service' => 'REG',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('status');

        $this->assertDatabaseCount('shipments', 0);
    }

    public function test_an_order_can_move_from_shipped_to_delivered_to_completed(): void
    {
        $this->actingAsAdmin();
        $order = Order::factory()->paid()->create();
        $order->update(['status' => OrderStatus::Shipped, 'shipped_at' => now()]);

        $this->putJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => OrderStatus::Delivered->value,
        ])->assertOk()
            ->assertJsonPath('data.status', OrderStatus::Delivered->value);

        $this->putJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => OrderStatus::Completed->value,
        ])->assertOk()
            ->assertJsonPath('data.status', OrderStatus::Completed->value);

        $this->assertNotNull($order->refresh()->completed_at);
    }

    public function test_cancelling_a_paid_order_returns_the_stock(): void
    {
        $this->actingAsAdmin();
        [$order, $item, $stock] = $this->reservedOrder(quantity: 3);

        $this->putJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => OrderStatus::Paid->value,
        ])->assertOk();

        $this->putJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => OrderStatus::Cancelled->value,
            'reason' => 'Stok habis',
        ])->assertOk()
            ->assertJsonPath('data.status', OrderStatus::Cancelled->value);

        $this->assertDatabaseHas('inventory_stocks', [
            'id' => $stock->id,
            'quantity_on_hand' => 10,
            'quantity_reserved' => 0,
        ]);

        $this->assertDatabaseHas('stock_movements', [
            'variant_id' => $item->variant_id,
            'movement_type' => MovementType::ReturnIn->value,
            'quantity' => 3,
        ]);

        $this->assertSame('Stok habis', $order->refresh()->cancellation_reason);
    }

    public function test_cancelling_an_unpaid_order_releases_the_reservation(): void
    {
        $this->actingAsAdmin();
        [$order, , $stock] = $this->reservedOrder(quantity: 2);

        $this->putJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => OrderStatus::Cancelled->value,
        ])->assertOk();

        $this->assertDatabaseHas('inventory_stocks', [
            'id' => $stock->id,
            'quantity_on_hand' => 10,
            'quantity_reserved' => 0,
        ]);

        $this->assertDatabaseMissing('stock_movements', [
            'movement_type' => MovementType::Sale->value,
        ]);
    }

    public function test_a_customer_can_cancel_their_unpaid_order(): void
    {
        $user = $this->actingAsCustomer();
        $order = Order::factory()->create(['user_id' => $user->id]);

        $this->postJson("/api/v1/account/orders/{$order->order_number}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', OrderStatus::Cancelled->value);

        $this->assertSame('Dibatalkan oleh pelanggan.', $order->refresh()->cancellation_reason);
    }

    public function test_a_customer_cannot_cancel_a_shipped_order(): void
    {
        $user = $this->actingAsCustomer();
        $order = Order::factory()->create([
            'user_id' => $user->id,
            'status' => OrderStatus::Shipped,
        ]);

        $this->postJson("/api/v1/account/orders/{$order->order_number}/cancel")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }

    public function test_only_admins_may_manage_order_status(): void
    {
        $order = Order::factory()->create();

        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Warehouse]));

        $this->putJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => OrderStatus::Paid->value,
        ])->assertForbidden();
    }

    private function actingAsCustomer(): User
    {
        $user = User::factory()->create(['role' => UserRole::Customer]);
        Sanctum::actingAs($user);

        return $user;
    }

    private function actingAsAdmin(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Admin]));
    }

    /**
     * @return array{0: Order, 1: OrderItem, 2: InventoryStock}
     */
    private function reservedOrder(int $quantity): array
    {
        $warehouse = Warehouse::factory()->default()->create();
        $variant = ProductVariant::factory()->create();
        $unitPrice = (float) $variant->price;

        $order = Order::factory()->create([
            'subtotal' => $unitPrice * $quantity,
            'grand_total' => $unitPrice * $quantity,
        ]);

        Payment::factory()->create([
            'order_id' => $order->id,
            'amount' => $order->grand_total,
        ]);

        $item = OrderItem::factory()->create([
            'order_id' => $order->id,
            'variant_id' => $variant->id,
            'brand_id' => $variant->product->brand_id,
            'brand_name' => $variant->product->brand->name,
            'unit_price' => $unitPrice,
            'quantity' => $quantity,
            'line_total' => $unitPrice * $quantity,
            'warehouse_id' => $warehouse->id,
            'stock_reserved' => true,
        ]);

        $stock = InventoryStock::factory()->create([
            'variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'quantity_on_hand' => 10,
            'quantity_reserved' => $quantity,
        ]);

        return [$order, $item, $stock];
    }
}
