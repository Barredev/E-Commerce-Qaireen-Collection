<?php

namespace Tests\Feature;

use App\Models\ProductVariant;
use App\Models\StockReceipt;
use App\Models\StockReceiptItem;
use App\Models\User;
use App\Models\Warehouse;
use App\Modules\Auth\Enums\UserRole;
use App\Modules\Inventory\Enums\MovementType;
use App\Modules\Inventory\Enums\ReceiptSourceType;
use App\Modules\Inventory\Enums\ReceiptStatus;
use App\Modules\Inventory\Enums\StockCondition;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StockReceiptTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_guests_get_401_on_receipt_endpoints(): void
    {
        $this->getJson('/api/v1/admin/inventory/receipts')->assertUnauthorized();
        $this->postJson('/api/v1/admin/inventory/receipts', [])->assertUnauthorized();
    }

    public function test_admin_can_create_a_draft_receipt(): void
    {
        $this->actingAsAdmin();
        $warehouse = Warehouse::factory()->create();
        $variant = ProductVariant::factory()->create();

        $this->postJson('/api/v1/admin/inventory/receipts', [
            'warehouse_id' => $warehouse->id,
            'source_type' => ReceiptSourceType::Production->value,
            'items' => [
                ['variant_id' => $variant->id, 'quantity' => 12],
            ],
        ])->assertCreated()
            ->assertJsonPath('data.status', ReceiptStatus::Draft->value)
            ->assertJsonPath('data.items.0.quantity', 12)
            ->assertJsonPath('data.items.0.sku', $variant->sku);

        $this->assertDatabaseHas('stock_receipts', [
            'warehouse_id' => $warehouse->id,
            'status' => ReceiptStatus::Draft->value,
        ]);
    }

    public function test_a_receipt_requires_at_least_one_item(): void
    {
        $this->actingAsAdmin();
        $warehouse = Warehouse::factory()->create();

        $this->postJson('/api/v1/admin/inventory/receipts', [
            'warehouse_id' => $warehouse->id,
            'source_type' => ReceiptSourceType::Production->value,
            'items' => [],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('items');
    }

    public function test_the_same_variant_cannot_appear_twice_in_one_receipt(): void
    {
        $this->actingAsAdmin();
        $warehouse = Warehouse::factory()->create();
        $variant = ProductVariant::factory()->create();

        $this->postJson('/api/v1/admin/inventory/receipts', [
            'warehouse_id' => $warehouse->id,
            'source_type' => ReceiptSourceType::Production->value,
            'items' => [
                ['variant_id' => $variant->id, 'quantity' => 2],
                ['variant_id' => $variant->id, 'quantity' => 3],
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('items.0.variant_id');
    }

    public function test_confirming_a_receipt_adds_stock_and_records_a_movement(): void
    {
        $this->actingAsAdmin();
        $warehouse = Warehouse::factory()->create();
        $variant = ProductVariant::factory()->create();

        $receipt = StockReceipt::factory()->create([
            'warehouse_id' => $warehouse->id,
            'source_type' => ReceiptSourceType::Production,
        ]);

        StockReceiptItem::factory()->create([
            'stock_receipt_id' => $receipt->id,
            'variant_id' => $variant->id,
            'quantity' => 7,
        ]);

        $this->putJson("/api/v1/admin/inventory/receipts/{$receipt->id}/confirm")
            ->assertOk()
            ->assertJsonPath('data.status', ReceiptStatus::Confirmed->value);

        $this->assertDatabaseHas('inventory_stocks', [
            'variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'quantity_on_hand' => 7,
            'quantity_reserved' => 0,
        ]);

        $this->assertDatabaseHas('stock_movements', [
            'variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'movement_type' => MovementType::Receipt->value,
            'quantity' => 7,
            'balance_after' => 7,
            'reference_type' => 'stock_receipt',
            'reference_id' => $receipt->id,
        ]);

        $this->assertNotNull($receipt->refresh()->received_at);
    }

    public function test_damaged_items_are_recorded_but_do_not_become_sellable_stock(): void
    {
        $this->actingAsAdmin();
        $warehouse = Warehouse::factory()->create();
        $goodVariant = ProductVariant::factory()->create();
        $damagedVariant = ProductVariant::factory()->create();

        $receipt = StockReceipt::factory()->create(['warehouse_id' => $warehouse->id]);

        StockReceiptItem::factory()->create([
            'stock_receipt_id' => $receipt->id,
            'variant_id' => $goodVariant->id,
            'quantity' => 6,
            'condition' => StockCondition::Good,
        ]);
        StockReceiptItem::factory()->create([
            'stock_receipt_id' => $receipt->id,
            'variant_id' => $damagedVariant->id,
            'quantity' => 3,
            'condition' => StockCondition::Damaged,
        ]);

        $this->putJson("/api/v1/admin/inventory/receipts/{$receipt->id}/confirm")
            ->assertOk();

        $this->assertDatabaseHas('inventory_stocks', [
            'variant_id' => $goodVariant->id,
            'quantity_on_hand' => 6,
        ]);

        $this->assertDatabaseMissing('inventory_stocks', [
            'variant_id' => $damagedVariant->id,
        ]);
    }

    public function test_confirming_an_already_confirmed_receipt_is_rejected(): void
    {
        $this->actingAsAdmin();
        $receipt = StockReceipt::factory()->confirmed()->create();
        StockReceiptItem::factory()->create(['stock_receipt_id' => $receipt->id]);

        $this->putJson("/api/v1/admin/inventory/receipts/{$receipt->id}/confirm")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }

    public function test_admin_can_cancel_a_draft_receipt(): void
    {
        $this->actingAsAdmin();
        $receipt = StockReceipt::factory()->create();

        $this->putJson("/api/v1/admin/inventory/receipts/{$receipt->id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', ReceiptStatus::Cancelled->value);

        $this->assertDatabaseHas('stock_receipts', [
            'id' => $receipt->id,
            'status' => ReceiptStatus::Cancelled->value,
        ]);
    }

    public function test_a_confirmed_receipt_cannot_be_edited(): void
    {
        $this->actingAsAdmin();
        $receipt = StockReceipt::factory()->confirmed()->create();

        $this->putJson("/api/v1/admin/inventory/receipts/{$receipt->id}", [
            'notes' => 'Perubahan',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }

    public function test_warehouse_staff_can_create_and_view_receipts_and_inventory_lookups(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Warehouse]));

        $warehouse = Warehouse::factory()->create();
        $variant = ProductVariant::factory()->create();

        $created = $this->postJson('/api/v1/admin/inventory/receipts', [
            'warehouse_id' => $warehouse->id,
            'source_type' => ReceiptSourceType::Purchase->value,
            'items' => [['variant_id' => $variant->id, 'quantity' => 2]],
        ])->assertCreated();

        $receiptId = $created->json('data.id');

        $this->getJson('/api/v1/admin/inventory/receipts')
            ->assertOk()
            ->assertJsonPath('data.0.id', $receiptId);

        $this->getJson("/api/v1/admin/inventory/receipts/{$receiptId}")
            ->assertOk()
            ->assertJsonPath('data.id', $receiptId);

        $this->getJson('/api/v1/admin/inventory/warehouses')
            ->assertOk()
            ->assertJsonPath('data.0.id', $warehouse->id);

        $this->getJson('/api/v1/admin/inventory/variants')
            ->assertOk()
            ->assertJsonPath('data.0.id', $variant->id);
    }

    public function test_customers_cannot_access_inventory_lookups(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Customer]));

        $this->getJson('/api/v1/admin/inventory/warehouses')->assertForbidden();
        $this->getJson('/api/v1/admin/inventory/variants')->assertForbidden();
    }

    public function test_confirming_an_empty_receipt_is_rejected(): void
    {
        $this->actingAsAdmin();
        $receipt = StockReceipt::factory()->create();

        $this->putJson("/api/v1/admin/inventory/receipts/{$receipt->id}/confirm")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('items');

        $this->assertDatabaseCount('inventory_stocks', 0);
    }

    private function actingAsAdmin(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Admin]));
    }
}
