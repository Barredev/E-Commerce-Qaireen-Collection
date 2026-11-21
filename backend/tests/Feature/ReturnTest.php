<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderReturn;
use App\Models\ReturnItem;
use App\Models\User;
use App\Models\Warehouse;
use App\Modules\Auth\Enums\UserRole;
use App\Modules\Inventory\Enums\MovementType;
use App\Modules\Inventory\Enums\StockCondition;
use App\Modules\Order\Enums\OrderStatus;
use App\Modules\Order\Enums\RefundMethod;
use App\Modules\Order\Enums\ReturnReason;
use App\Modules\Order\Enums\ReturnStatus;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReturnTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_guests_cannot_access_return_endpoints(): void
    {
        $this->getJson('/api/v1/account/returns')->assertUnauthorized();
        $this->getJson('/api/v1/admin/returns')->assertUnauthorized();
    }

    public function test_a_customer_can_request_a_return_for_a_delivered_order(): void
    {
        $customer = $this->actingAsCustomer();
        [$order, $item] = $this->deliveredOrder($customer, quantity: 2);

        $response = $this->postJson("/api/v1/account/orders/{$order->order_number}/returns", [
            'reason_category' => ReturnReason::Damaged->value,
            'reason' => 'Kemasan penyok saat diterima.',
            'items' => [
                ['order_item_id' => $item->id, 'quantity' => 2],
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', ReturnStatus::Requested->value)
            ->assertJsonPath('data.reason_category', ReturnReason::Damaged->value)
            ->assertJsonPath('data.refund_amount', 200000)
            ->assertJsonPath('data.items.0.quantity', 2)
            ->assertJsonPath('data.items.0.condition', StockCondition::Good->value)
            ->assertJsonPath('data.items.0.is_restocked', false);

        $this->assertDatabaseHas('returns', [
            'order_id' => $order->id,
            'user_id' => $customer->id,
            'status' => ReturnStatus::Requested->value,
            'refund_amount' => 200000.0,
        ]);

        $this->assertDatabaseHas('return_items', [
            'order_item_id' => $item->id,
            'quantity' => 2,
            'refund_amount' => 200000.0,
        ]);
    }

    public function test_a_return_cannot_exceed_the_purchased_quantity(): void
    {
        $customer = $this->actingAsCustomer();
        [$order, $item] = $this->deliveredOrder($customer, quantity: 2);

        $this->postJson("/api/v1/account/orders/{$order->order_number}/returns", [
            'reason_category' => ReturnReason::ChangedMind->value,
            'reason' => 'Berubah pikiran.',
            'items' => [
                ['order_item_id' => $item->id, 'quantity' => 3],
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('items');

        $this->assertDatabaseCount('returns', 0);
    }

    public function test_a_return_is_rejected_once_the_return_window_has_passed(): void
    {
        $customer = $this->actingAsCustomer();
        [$order, $item] = $this->deliveredOrder($customer, quantity: 1);

        $order->forceFill([
            'delivered_at' => now()->subDays(30),
            'completed_at' => now()->subDays(29),
        ])->save();

        $this->postJson("/api/v1/account/orders/{$order->order_number}/returns", [
            'reason_category' => ReturnReason::Damaged->value,
            'reason' => 'Barang rusak.',
            'items' => [
                ['order_item_id' => $item->id, 'quantity' => 1],
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('items');
    }

    public function test_a_refunded_return_still_consumes_the_return_quota(): void
    {
        $customer = $this->actingAsCustomer();
        [$order, $item] = $this->deliveredOrder($customer, quantity: 3);

        $return = $this->approvedAndReceived($order, $item, 2);
        $this->refundReturn($return);

        Sanctum::actingAs($customer);

        $this->postJson("/api/v1/account/orders/{$order->order_number}/returns", [
            'reason_category' => ReturnReason::Damaged->value,
            'reason' => 'Ingin mengembalikan dua unit lagi.',
            'items' => [
                ['order_item_id' => $item->id, 'quantity' => 2],
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('items');

        $this->assertDatabaseCount('returns', 1);

        $this->postJson("/api/v1/account/orders/{$order->order_number}/returns", [
            'reason_category' => ReturnReason::Damaged->value,
            'reason' => 'Mengembalikan unit terakhir.',
            'items' => [
                ['order_item_id' => $item->id, 'quantity' => 1],
            ],
        ])->assertCreated();
    }

    public function test_a_return_cannot_be_requested_for_an_order_that_was_not_delivered(): void
    {
        $customer = $this->actingAsCustomer();
        $order = Order::factory()->paid()->create(['user_id' => $customer->id]);
        $item = OrderItem::factory()->create([
            'order_id' => $order->id,
            'quantity' => 1,
            'line_total' => 100000,
        ]);

        $this->postJson("/api/v1/account/orders/{$order->order_number}/returns", [
            'reason_category' => ReturnReason::Other->value,
            'reason' => 'Ingin mengembalikan.',
            'items' => [
                ['order_item_id' => $item->id, 'quantity' => 1],
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }

    public function test_admin_can_approve_and_receive_good_items_back_into_stock(): void
    {
        $customer = $this->actingAsCustomer();
        $warehouse = Warehouse::factory()->default()->create();
        [$order, $item] = $this->deliveredOrder($customer, quantity: 2, warehouse: $warehouse);
        $return = $this->requestReturn($order, $item, 2);

        $admin = $this->actingAsAdmin();

        $this->putJson("/api/v1/admin/returns/{$return->id}/approve", [])
            ->assertOk()
            ->assertJsonPath('data.status', ReturnStatus::Approved->value)
            ->assertJsonPath('data.approved_by.id', $admin->id);

        $line = $this->firstReturnLine($return);

        $this->putJson("/api/v1/admin/returns/{$return->id}/receive", [
            'items' => [
                ['id' => $line->id, 'quantity' => 2, 'condition' => StockCondition::Good->value],
            ],
        ])->assertOk()
            ->assertJsonPath('data.status', ReturnStatus::Received->value)
            ->assertJsonPath('data.verified_by.id', $admin->id)
            ->assertJsonPath('data.items.0.is_restocked', true)
            ->assertJsonPath('data.items.0.condition', StockCondition::Good->value);

        $this->assertDatabaseHas('inventory_stocks', [
            'variant_id' => $item->variant_id,
            'warehouse_id' => $warehouse->id,
            'quantity_on_hand' => 2,
        ]);

        $this->assertDatabaseHas('stock_movements', [
            'variant_id' => $item->variant_id,
            'movement_type' => MovementType::ReturnIn->value,
            'quantity' => 2,
            'balance_after' => 2,
            'reference_type' => 'return_item',
            'reference_id' => $line->id,
            'created_by' => $admin->id,
        ]);
    }

    public function test_damaged_items_are_not_put_back_into_stock(): void
    {
        $customer = $this->actingAsCustomer();
        $warehouse = Warehouse::factory()->default()->create();
        [$order, $item] = $this->deliveredOrder($customer, quantity: 1, warehouse: $warehouse);
        $return = $this->requestReturn($order, $item, 1);

        $this->actingAsAdmin();

        $this->putJson("/api/v1/admin/returns/{$return->id}/approve", [])->assertOk();

        $line = $this->firstReturnLine($return);

        $this->putJson("/api/v1/admin/returns/{$return->id}/receive", [
            'items' => [
                ['id' => $line->id, 'quantity' => 1, 'condition' => StockCondition::Damaged->value],
            ],
        ])->assertOk()
            ->assertJsonPath('data.items.0.is_restocked', false)
            ->assertJsonPath('data.items.0.condition', StockCondition::Damaged->value);

        $this->assertDatabaseCount('stock_movements', 0);
        $this->assertDatabaseCount('inventory_stocks', 0);
    }

    public function test_receiving_requires_every_return_line_to_be_verified(): void
    {
        $customer = $this->actingAsCustomer();
        [$order, $item] = $this->deliveredOrder($customer, quantity: 1);
        $return = $this->requestReturn($order, $item, 1);

        $this->actingAsAdmin();

        $this->putJson("/api/v1/admin/returns/{$return->id}/receive", [
            'items' => [],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('items');

        $this->assertDatabaseHas('returns', [
            'id' => $return->id,
            'status' => ReturnStatus::Requested->value,
        ]);
    }

    public function test_refunding_a_full_return_marks_the_order_as_refunded(): void
    {
        $customer = $this->actingAsCustomer();
        [$order, $item] = $this->deliveredOrder($customer, quantity: 2);
        $return = $this->approvedAndReceived($order, $item, 2);

        $this->putJson("/api/v1/admin/returns/{$return->id}/refund", [
            'refund_method' => RefundMethod::BankTransfer->value,
            'refund_reference' => 'BCA-TRF-000111',
        ])->assertOk()
            ->assertJsonPath('data.status', ReturnStatus::Refunded->value)
            ->assertJsonPath('data.refund_method', RefundMethod::BankTransfer->value)
            ->assertJsonPath('data.refund_reference', 'BCA-TRF-000111');

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => OrderStatus::Refunded->value,
        ]);

        $this->assertNotNull($order->refresh()->refunded_at);
    }

    public function test_refunding_a_partial_return_keeps_the_order_completed(): void
    {
        $customer = $this->actingAsCustomer();
        [$order, $item] = $this->deliveredOrder($customer, quantity: 2);
        $return = $this->approvedAndReceived($order, $item, 1);

        $this->putJson("/api/v1/admin/returns/{$return->id}/refund", [
            'refund_method' => RefundMethod::StoreCredit->value,
        ])->assertOk()
            ->assertJsonPath('data.status', ReturnStatus::Refunded->value)
            ->assertJsonPath('data.refund_amount', 100000);

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => OrderStatus::Completed->value,
        ]);
    }

    public function test_money_can_only_be_released_after_the_goods_reached_the_warehouse(): void
    {
        $customer = $this->actingAsCustomer();
        [$order, $item] = $this->deliveredOrder($customer, quantity: 1);
        $return = $this->requestReturn($order, $item, 1);

        $this->actingAsAdmin();

        $this->putJson("/api/v1/admin/returns/{$return->id}/refund", [
            'refund_method' => RefundMethod::BankTransfer->value,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('status');

        $this->assertDatabaseHas('returns', [
            'id' => $return->id,
            'status' => ReturnStatus::Requested->value,
        ]);
    }

    public function test_admin_can_reject_a_return(): void
    {
        $customer = $this->actingAsCustomer();
        [$order, $item] = $this->deliveredOrder($customer, quantity: 1);
        $return = $this->requestReturn($order, $item, 1);

        $this->actingAsAdmin();

        $this->putJson("/api/v1/admin/returns/{$return->id}/reject", [
            'resolution' => 'Barang sudah melewati batas pemakaian.',
        ])->assertOk()
            ->assertJsonPath('data.status', ReturnStatus::Rejected->value)
            ->assertJsonPath('data.resolution', 'Barang sudah melewati batas pemakaian.');
    }

    public function test_a_customer_can_cancel_a_pending_return(): void
    {
        $customer = $this->actingAsCustomer();
        [$order, $item] = $this->deliveredOrder($customer, quantity: 1);
        $return = $this->requestReturn($order, $item, 1);

        $this->postJson("/api/v1/account/returns/{$return->return_number}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', ReturnStatus::Cancelled->value);
    }

    public function test_a_customer_cannot_cancel_an_approved_return(): void
    {
        $customer = $this->actingAsCustomer();
        [$order, $item] = $this->deliveredOrder($customer, quantity: 1);
        $return = $this->requestReturn($order, $item, 1);

        $this->actingAsAdmin();
        $this->putJson("/api/v1/admin/returns/{$return->id}/approve", [])->assertOk();

        Sanctum::actingAs($customer);

        $this->postJson("/api/v1/account/returns/{$return->return_number}/cancel")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }

    public function test_the_customer_order_detail_includes_return_lines(): void
    {
        $customer = $this->actingAsCustomer();
        [$order, $item] = $this->deliveredOrder($customer, quantity: 2);
        $return = $this->requestReturn($order, $item, 1);

        $this->getJson("/api/v1/account/orders/{$order->order_number}")
            ->assertOk()
            ->assertJsonPath('data.returns.0.id', $return->id)
            ->assertJsonPath('data.returns.0.items.0.order_item_id', $item->id)
            ->assertJsonPath('data.returns.0.items.0.quantity', 1)
            ->assertJsonPath('data.returns.0.items.0.is_restocked', false);
    }

    public function test_a_customer_only_sees_their_own_returns(): void
    {
        $customer = $this->actingAsCustomer();
        [$order, $item] = $this->deliveredOrder($customer, quantity: 1);
        $this->requestReturn($order, $item, 1);

        $other = OrderReturn::factory()->create();

        $this->getJson('/api/v1/account/returns')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson("/api/v1/account/returns/{$other->return_number}")
            ->assertNotFound();
    }

    public function test_admin_can_list_returns_filtered_by_status(): void
    {
        $this->actingAsAdmin();
        OrderReturn::factory()->create();
        $approved = OrderReturn::factory()->approved()->create();

        $this->getJson('/api/v1/admin/returns?status=approved')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $approved->id);
    }

    public function test_only_admins_may_process_returns(): void
    {
        $return = OrderReturn::factory()->create();

        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Warehouse]));

        $this->putJson("/api/v1/admin/returns/{$return->id}/approve", [])
            ->assertForbidden();
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
    private function deliveredOrder(
        User $customer,
        int $quantity = 2,
        float $unitPrice = 100000.0,
        ?Warehouse $warehouse = null,
    ): array {
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
            'warehouse_id' => $warehouse?->id,
        ]);

        return [$order, $item];
    }

    private function requestReturn(Order $order, OrderItem $item, int $quantity): OrderReturn
    {
        $response = $this->postJson("/api/v1/account/orders/{$order->order_number}/returns", [
            'reason_category' => ReturnReason::Damaged->value,
            'reason' => 'Barang tidak sesuai saat diterima.',
            'items' => [
                ['order_item_id' => $item->id, 'quantity' => $quantity],
            ],
        ])->assertCreated();

        return OrderReturn::query()->findOrFail($response->json('data.id'));
    }

    private function approvedAndReceived(
        Order $order,
        OrderItem $item,
        int $quantity,
        StockCondition $condition = StockCondition::Good,
    ): OrderReturn {
        $customer = User::query()->findOrFail($order->user_id);
        Sanctum::actingAs($customer);

        $return = $this->requestReturn($order, $item, $quantity);

        $this->actingAsAdmin();
        $this->putJson("/api/v1/admin/returns/{$return->id}/approve", [])->assertOk();

        $line = $this->firstReturnLine($return);

        $this->putJson("/api/v1/admin/returns/{$return->id}/receive", [
            'items' => [
                ['id' => $line->id, 'quantity' => $quantity, 'condition' => $condition->value],
            ],
        ])->assertOk();

        return $return->refresh();
    }

    private function refundReturn(OrderReturn $return): void
    {
        $this->actingAsAdmin();

        $this->putJson("/api/v1/admin/returns/{$return->id}/refund", [
            'refund_method' => RefundMethod::BankTransfer->value,
        ])->assertOk();
    }

    private function firstReturnLine(OrderReturn $return): ReturnItem
    {
        return ReturnItem::query()->where('return_id', $return->id)->firstOrFail();
    }
}
