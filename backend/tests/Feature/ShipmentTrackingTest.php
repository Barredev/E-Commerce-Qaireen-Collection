<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Shipment;
use App\Models\User;
use App\Modules\Auth\Enums\UserRole;
use App\Modules\Order\Enums\OrderStatus;
use App\Modules\Order\Enums\ShipmentStatus;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ShipmentTrackingTest extends TestCase
{
    use LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.rajaongkir.webhook_token' => 'courier-webhook-secret']);
    }

    public function test_a_webhook_without_a_valid_token_is_rejected(): void
    {
        [$order, $shipment] = $this->shippedOrder();

        $this->postJson('/api/v1/webhooks/shipping/tracking', $this->webhookPayload(), [
            'X-Webhook-Token' => 'wrong-token',
        ])->assertForbidden();

        $this->assertSame(ShipmentStatus::PickedUp, $shipment->refresh()->status);
        $this->assertSame(OrderStatus::Shipped, $order->refresh()->status);
    }

    public function test_a_webhook_without_any_token_is_rejected(): void
    {
        $this->shippedOrder();

        $this->postJson('/api/v1/webhooks/shipping/tracking', $this->webhookPayload())
            ->assertForbidden();
    }

    public function test_a_webhook_for_an_unknown_waybill_returns_404(): void
    {
        $this->shippedOrder();

        $this->postJson(
            '/api/v1/webhooks/shipping/tracking',
            $this->webhookPayload(['tracking_number' => 'UNKNOWN-999']),
            ['X-Webhook-Token' => 'courier-webhook-secret'],
        )->assertNotFound();
    }

    public function test_a_webhook_advances_the_shipment_and_keeps_its_manifest(): void
    {
        [$order, $shipment] = $this->shippedOrder();

        $this->postJson('/api/v1/webhooks/shipping/tracking', $this->webhookPayload([
            'status' => 'in_transit',
            'description' => 'Paket sedang dalam perjalanan ke Jakarta',
            'occurred_at' => '2026-11-01 08:00:00',
            'history' => [
                [
                    'status' => 'picked_up',
                    'description' => 'Paket telah diambil kurir',
                    'occurred_at' => '2026-10-31 16:00:00',
                ],
            ],
        ]), ['X-Webhook-Token' => 'courier-webhook-secret'])
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('shipment_status', ShipmentStatus::InTransit->value)
            ->assertJsonPath('order_status', OrderStatus::Shipped->value);

        $shipment->refresh();

        $this->assertSame(ShipmentStatus::InTransit, $shipment->status);
        $this->assertCount(2, $shipment->tracking_history);
        $this->assertSame('picked_up', $shipment->tracking_history[0]['status']);
        $this->assertSame('in_transit', $shipment->tracking_history[1]['status']);
        $this->assertNotNull($shipment->last_tracked_at);
    }

    public function test_a_delivered_webhook_completes_the_order_delivery(): void
    {
        [$order, $shipment] = $this->shippedOrder();

        $this->postJson('/api/v1/webhooks/shipping/tracking', $this->webhookPayload([
            'status' => 'delivered',
            'description' => 'Paket diterima oleh penerima',
        ]), ['X-Webhook-Token' => 'courier-webhook-secret'])
            ->assertOk()
            ->assertJsonPath('shipment_status', ShipmentStatus::Delivered->value)
            ->assertJsonPath('order_status', OrderStatus::Delivered->value);

        $shipment->refresh();
        $order->refresh();

        $this->assertSame(ShipmentStatus::Delivered, $shipment->status);
        $this->assertNotNull($shipment->delivered_at);
        $this->assertSame(OrderStatus::Delivered, $order->status);
        $this->assertNotNull($order->delivered_at);
    }

    public function test_a_repeated_manifest_does_not_duplicate_history_entries(): void
    {
        [, $shipment] = $this->shippedOrder();

        $payload = $this->webhookPayload([
            'status' => 'in_transit',
            'description' => 'Paket dalam perjalanan',
            'occurred_at' => '2026-11-01 08:00:00',
        ]);

        $this->postJson('/api/v1/webhooks/shipping/tracking', $payload, [
            'X-Webhook-Token' => 'courier-webhook-secret',
        ])->assertOk();

        $this->postJson('/api/v1/webhooks/shipping/tracking', $payload, [
            'X-Webhook-Token' => 'courier-webhook-secret',
        ])->assertOk();

        $this->assertCount(1, $shipment->refresh()->tracking_history);
    }

    public function test_a_late_webhook_does_not_move_the_shipment_backwards(): void
    {
        [, $shipment] = $this->shippedOrder();

        $this->postJson('/api/v1/webhooks/shipping/tracking', $this->webhookPayload([
            'status' => 'delivered',
            'description' => 'Paket diterima',
        ]), ['X-Webhook-Token' => 'courier-webhook-secret'])->assertOk();

        $this->postJson('/api/v1/webhooks/shipping/tracking', $this->webhookPayload([
            'status' => 'picked_up',
            'description' => 'Paket diambil kurir',
        ]), ['X-Webhook-Token' => 'courier-webhook-secret'])->assertOk();

        $this->assertSame(ShipmentStatus::Delivered, $shipment->refresh()->status);
    }

    public function test_guests_cannot_pull_tracking_from_the_admin_endpoint(): void
    {
        [, $shipment] = $this->shippedOrder();

        $this->postJson("/api/v1/admin/shipments/{$shipment->id}/track")->assertUnauthorized();
    }

    public function test_customers_cannot_pull_tracking_from_the_admin_endpoint(): void
    {
        [, $shipment] = $this->shippedOrder();

        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Customer]));

        $this->postJson("/api/v1/admin/shipments/{$shipment->id}/track")->assertForbidden();
    }

    public function test_an_admin_can_pull_the_manifest_from_the_courier_api(): void
    {
        config([
            'services.rajaongkir.key' => 'rajaongkir-live-key',
            'services.rajaongkir.origin_id' => '501',
        ]);

        Http::preventStrayRequests();
        Http::fake([
            'pro.rajaongkir.com/api/waybill' => Http::response([
                'rajaongkir' => [
                    'result' => [
                        'status' => ['status' => 'DELIVERED'],
                        'manifest' => [
                            [
                                'manifest_description' => 'Paket diterima oleh YBS',
                                'manifest_date' => '2026-11-01',
                                'manifest_time' => '10:30:00',
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        [$order, $shipment] = $this->shippedOrder();

        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Admin]));

        $this->postJson("/api/v1/admin/shipments/{$shipment->id}/track")
            ->assertOk()
            ->assertJsonPath('data.status', ShipmentStatus::Delivered->value)
            ->assertJsonPath('data.tracking_history.0.description', 'Paket diterima oleh YBS');

        $this->assertSame(OrderStatus::Delivered, $order->refresh()->status);
    }

    public function test_a_shipment_without_a_waybill_cannot_be_tracked(): void
    {
        [$order, $shipment] = $this->shippedOrder();
        $shipment->update(['tracking_number' => null]);

        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Admin]));

        $this->postJson("/api/v1/admin/shipments/{$shipment->id}/track")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('tracking_number');

        $this->assertSame(OrderStatus::Shipped, $order->refresh()->status);
    }

    /**
     * @return array{0: Order, 1: Shipment}
     */
    private function shippedOrder(): array
    {
        $order = Order::factory()->create([
            'status' => OrderStatus::Shipped,
            'paid_at' => now()->subDay(),
            'shipped_at' => now()->subDay(),
        ]);

        $shipment = Shipment::factory()->create([
            'order_id' => $order->id,
            'courier_code' => 'jne',
            'courier_name' => 'JNE',
            'courier_service' => 'REG',
            'tracking_number' => 'JNE123456789',
            'status' => ShipmentStatus::PickedUp,
            'shipped_at' => now()->subDay(),
        ]);

        return [$order, $shipment];
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function webhookPayload(array $overrides = []): array
    {
        return [
            'courier_code' => 'jne',
            'tracking_number' => 'JNE123456789',
            'status' => 'in_transit',
            'description' => 'Paket dalam perjalanan',
            'occurred_at' => '2026-11-01 09:00:00',
            ...$overrides,
        ];
    }
}
