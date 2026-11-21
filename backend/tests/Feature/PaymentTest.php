<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\InventoryStock;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use App\Modules\Auth\Enums\UserRole;
use App\Modules\Order\Enums\OrderStatus;
use App\Modules\Order\Enums\PaymentStatus;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PaymentTest extends TestCase
{
    use LazilyRefreshDatabase;

    private function createPendingOrder(User $user): Order
    {
        $brand = Brand::factory()->create();
        $product = Product::factory()->create(['brand_id' => $brand->id]);
        $variant = ProductVariant::factory()->create(['product_id' => $product->id, 'price' => 100000]);
        $warehouse = Warehouse::factory()->default()->create();

        $stock = InventoryStock::create([
            'variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'quantity_on_hand' => 10,
            'quantity_reserved' => 2,
        ]);

        $order = Order::create([
            'order_number' => 'ORD-'.strtoupper(uniqid()),
            'user_id' => $user->id,
            'status' => OrderStatus::PendingPayment,
            'subtotal' => 200000,
            'discount_total' => 0,
            'shipping_cost' => 15000,
            'grand_total' => 215000,
            'shipping_name' => 'Budi Santoso',
            'shipping_phone' => '08123456789',
            'shipping_address' => 'Jl. Merdeka 45',
            'shipping_city' => 'Jakarta Pusat',
            'shipping_province' => 'DKI Jakarta',
            'shipping_postal_code' => '10110',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'variant_id' => $variant->id,
            'brand_id' => $brand->id,
            'warehouse_id' => $warehouse->id,
            'product_name' => $product->name,
            'variant_sku' => $variant->sku,
            'variant_size' => $variant->size,
            'variant_color' => $variant->color,
            'brand_name' => $brand->name,
            'unit_price' => 100000,
            'quantity' => 2,
            'discount_amount' => 0,
            'line_total' => 200000,
            'stock_reserved' => true,
            'stock_deducted' => false,
        ]);

        $order->payments()->create([
            'payment_method' => 'qris',
            'amount' => 215000,
            'status' => PaymentStatus::Pending,
            'expired_at' => now()->addDay(),
        ]);

        return $order;
    }

    public function test_customer_can_create_payment_token_for_pending_order(): void
    {
        $customer = User::factory()->create(['role' => UserRole::Customer]);
        Sanctum::actingAs($customer);

        $order = $this->createPendingOrder($customer);

        $response = $this->postJson("/api/v1/account/orders/{$order->order_number}/pay");

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'token',
                    'redirect_url',
                    'payment_gateway',
                ],
            ]);
    }

    public function test_simulation_mode_returns_no_midtrans_url(): void
    {
        config([
            'services.midtrans.server_key' => '',
            'services.midtrans.client_key' => '',
        ]);

        $customer = User::factory()->create(['role' => UserRole::Customer]);
        Sanctum::actingAs($customer);

        $order = $this->createPendingOrder($customer);

        $response = $this->postJson("/api/v1/account/orders/{$order->order_number}/pay");

        $response->assertOk()
            ->assertJsonPath('data.is_simulated', true)
            ->assertJsonPath('data.token', '')
            ->assertJsonPath('data.redirect_url', '')
            ->assertJsonPath('data.payment_gateway', 'midtrans_simulated');

        $this->assertStringNotContainsString('midtrans.com', $response->getContent());

        $this->assertNull($order->payments()->latest()->first()->gateway_transaction_id);
    }

    public function test_real_mode_creates_snap_transaction(): void
    {
        config([
            'services.midtrans.server_key' => 'SB-Mid-server-REALKEY',
            'services.midtrans.client_key' => 'SB-Mid-client-REALKEY',
            'services.midtrans.is_production' => false,
        ]);

        Http::preventStrayRequests();
        Http::fake([
            'app.sandbox.midtrans.com/snap/v1/transactions' => Http::response([
                'token' => 'REAL-SNAP-TOKEN-123',
                'redirect_url' => 'https://app.sandbox.midtrans.com/snap/v2/vtweb/REAL-SNAP-TOKEN-123',
            ], 201),
        ]);

        $customer = User::factory()->create(['role' => UserRole::Customer]);
        Sanctum::actingAs($customer);

        $order = $this->createPendingOrder($customer);

        $response = $this->postJson("/api/v1/account/orders/{$order->order_number}/pay");

        $response->assertOk()
            ->assertJsonPath('data.is_simulated', false)
            ->assertJsonPath('data.token', 'REAL-SNAP-TOKEN-123')
            ->assertJsonPath('data.redirect_url', 'https://app.sandbox.midtrans.com/snap/v2/vtweb/REAL-SNAP-TOKEN-123');

        Http::assertSent(function ($request) use ($order) {
            return $request->url() === 'https://app.sandbox.midtrans.com/snap/v1/transactions'
                && $request->header('Authorization') === ['Basic '.base64_encode('SB-Mid-server-REALKEY:')]
                && $request['transaction_details']['order_id'] === $order->order_number
                && $request['transaction_details']['gross_amount'] === 215000
                && $request['callbacks']['finish'] === 'http://localhost:3000/account/orders/'.$order->order_number;
        });

        $payment = $order->payments()->latest()->first();
        $this->assertNull($payment->gateway_transaction_id);
        $this->assertSame('REAL-SNAP-TOKEN-123', $payment->gateway_response['snap_token'] ?? null);
    }

    public function test_real_mode_gateway_failure_returns_503(): void
    {
        config([
            'services.midtrans.server_key' => 'SB-Mid-server-REALKEY',
            'services.midtrans.client_key' => 'SB-Mid-client-REALKEY',
        ]);

        Http::preventStrayRequests();
        Http::fake([
            'app.sandbox.midtrans.com/snap/v1/transactions' => Http::response([
                'error_messages' => ['Transaction cannot be created.'],
            ], 406),
        ]);

        $customer = User::factory()->create(['role' => UserRole::Customer]);
        Sanctum::actingAs($customer);

        $order = $this->createPendingOrder($customer);

        $response = $this->postJson("/api/v1/account/orders/{$order->order_number}/pay");

        $response->assertStatus(503)
            ->assertJsonPath('message', 'Gateway pembayaran sedang tidak dapat dihubungi. Coba lagi beberapa saat lagi.');

        $this->assertStringNotContainsString('midtrans.com', $response->getContent());

        $payment = $order->payments()->latest()->first();
        $this->assertNull($payment->gateway_transaction_id);
        $this->assertArrayNotHasKey('snap_token', $payment->gateway_response ?? []);
    }

    public function test_snap_token_is_reused_for_repeated_clicks(): void
    {
        config([
            'services.midtrans.server_key' => 'SB-Mid-server-REALKEY',
            'services.midtrans.client_key' => 'SB-Mid-client-REALKEY',
        ]);

        Http::preventStrayRequests();
        Http::fake([
            'app.sandbox.midtrans.com/snap/v1/transactions' => Http::response([
                'token' => 'REAL-SNAP-TOKEN-123',
                'redirect_url' => 'https://app.sandbox.midtrans.com/snap/v2/vtweb/REAL-SNAP-TOKEN-123',
            ], 201),
        ]);

        $customer = User::factory()->create(['role' => UserRole::Customer]);
        Sanctum::actingAs($customer);

        $order = $this->createPendingOrder($customer);

        $first = $this->postJson("/api/v1/account/orders/{$order->order_number}/pay");
        $second = $this->postJson("/api/v1/account/orders/{$order->order_number}/pay");

        $first->assertOk()->assertJsonPath('data.token', 'REAL-SNAP-TOKEN-123');
        $second->assertOk()->assertJsonPath('data.token', 'REAL-SNAP-TOKEN-123');

        Http::assertSentCount(1);
    }

    public function test_simulate_pay_is_rejected_when_gateway_configured(): void
    {
        config([
            'services.midtrans.server_key' => 'SB-Mid-server-REALKEY',
            'services.midtrans.client_key' => 'SB-Mid-client-REALKEY',
        ]);

        $customer = User::factory()->create(['role' => UserRole::Customer]);
        Sanctum::actingAs($customer);

        $order = $this->createPendingOrder($customer);

        $response = $this->postJson("/api/v1/account/orders/{$order->order_number}/simulate-pay");

        $response->assertStatus(403)
            ->assertJsonPath('message', 'Simulator hanya tersedia saat gateway belum dikonfigurasi.');

        $this->assertEquals(OrderStatus::PendingPayment, $order->fresh()->status);
    }

    public function test_midtrans_webhook_marks_order_as_paid_and_deducts_stock(): void
    {
        $customer = User::factory()->create(['role' => UserRole::Customer]);
        $order = $this->createPendingOrder($customer);
        $orderItem = $order->items->first();

        $webhookPayload = [
            'order_id' => $order->order_number,
            'transaction_id' => 'TRX-MIDTRANS-999',
            'transaction_status' => 'settlement',
            'payment_type' => 'bank_transfer',
            'gross_amount' => (string) $order->grand_total,
            'settlement_time' => now()->toDateTimeString(),
            'signature_key' => 'simulated_signature',
        ];

        $response = $this->postJson('/api/v1/webhooks/payment/midtrans', $webhookPayload);

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('order_status', 'paid');

        $order->refresh();
        $this->assertEquals(OrderStatus::Paid, $order->status);
        $this->assertNotNull($order->paid_at);

        $orderItem->refresh();
        $this->assertFalse($orderItem->stock_reserved);
        $this->assertTrue($orderItem->stock_deducted);

        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id,
            'status' => PaymentStatus::Paid->value,
            'gateway_transaction_id' => 'TRX-MIDTRANS-999',
        ]);
    }

    public function test_the_expiry_command_cancels_overdue_unpaid_orders(): void
    {
        $customer = User::factory()->create(['role' => UserRole::Customer]);
        $order = $this->createPendingOrder($customer);
        $order->payments()->update(['expired_at' => now()->subHour()]);

        $this->artisan('orders:expire-unpaid')->assertSuccessful();

        $order->refresh();

        $this->assertEquals(OrderStatus::Cancelled, $order->status);
        $this->assertSame('Pembayaran kedaluwarsa.', $order->cancellation_reason);
        $this->assertNotNull($order->cancelled_at);

        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id,
            'status' => PaymentStatus::Expired->value,
        ]);

        $this->assertDatabaseHas('inventory_stocks', [
            'variant_id' => $order->items()->first()->variant_id,
            'quantity_reserved' => 0,
        ]);
    }

    public function test_the_expiry_command_leaves_orders_inside_the_payment_window_alone(): void
    {
        $customer = User::factory()->create(['role' => UserRole::Customer]);
        $order = $this->createPendingOrder($customer);

        $this->artisan('orders:expire-unpaid')->assertSuccessful();

        $order->refresh();

        $this->assertEquals(OrderStatus::PendingPayment, $order->status);
        $this->assertNull($order->cancelled_at);

        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id,
            'status' => PaymentStatus::Pending->value,
        ]);

        $this->assertDatabaseHas('inventory_stocks', [
            'variant_id' => $order->items()->first()->variant_id,
            'quantity_reserved' => 2,
        ]);
    }

    public function test_midtrans_webhook_cancels_order_when_expired(): void
    {
        $customer = User::factory()->create(['role' => UserRole::Customer]);
        $order = $this->createPendingOrder($customer);

        $webhookPayload = [
            'order_id' => $order->order_number,
            'transaction_id' => 'TRX-MIDTRANS-EXP',
            'transaction_status' => 'expire',
            'payment_type' => 'echannel',
            'gross_amount' => (string) $order->grand_total,
            'signature_key' => 'simulated_signature',
        ];

        $response = $this->postJson('/api/v1/webhooks/payment/midtrans', $webhookPayload);

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('order_status', 'cancelled');

        $order->refresh();
        $this->assertEquals(OrderStatus::Cancelled, $order->status);
    }
}
