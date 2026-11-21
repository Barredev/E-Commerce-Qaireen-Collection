<?php

namespace Tests\Feature;

use App\Models\InventoryStock;
use App\Models\User;
use App\Models\Warehouse;
use App\Modules\Auth\Enums\UserRole;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class WarehouseManagementTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_guests_get_401_on_warehouse_endpoints(): void
    {
        $this->getJson('/api/v1/admin/warehouses')->assertUnauthorized();
        $this->postJson('/api/v1/admin/warehouses', [])->assertUnauthorized();
    }

    public static function rolesWithoutWarehouseAccess(): array
    {
        return [
            'customer' => [UserRole::Customer],
            'warehouse' => [UserRole::Warehouse],
        ];
    }

    #[DataProvider('rolesWithoutWarehouseAccess')]
    public function test_only_admins_may_manage_warehouses(UserRole $role): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => $role]));

        $this->getJson('/api/v1/admin/warehouses')->assertForbidden();
        $this->postJson('/api/v1/admin/warehouses', [
            'name' => 'Gudang Baru',
            'code' => 'WH-BARU',
        ])->assertForbidden();
    }

    public function test_admin_can_create_a_warehouse(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/v1/admin/warehouses', [
            'name' => 'Gudang Utama',
            'code' => 'WH-UTAMA',
            'city' => 'Jakarta',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Gudang Utama')
            ->assertJsonPath('data.code', 'WH-UTAMA')
            ->assertJsonPath('data.is_active', true);

        $this->assertDatabaseHas('warehouses', ['code' => 'WH-UTAMA']);
    }

    public function test_a_duplicate_warehouse_code_is_rejected(): void
    {
        $this->actingAsAdmin();
        Warehouse::factory()->create(['code' => 'WH-UTAMA']);

        $this->postJson('/api/v1/admin/warehouses', [
            'name' => 'Gudang Lain',
            'code' => 'WH-UTAMA',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('code');
    }

    public function test_the_first_warehouse_becomes_the_default(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/v1/admin/warehouses', [
            'name' => 'Gudang Utama',
            'code' => 'WH-UTAMA',
        ])->assertCreated()
            ->assertJsonPath('data.is_default', true);
    }

    public function test_marking_another_warehouse_as_default_unsets_the_previous_one(): void
    {
        $this->actingAsAdmin();
        $first = Warehouse::factory()->create(['is_default' => true]);
        $second = Warehouse::factory()->create(['is_default' => false]);

        $this->putJson("/api/v1/admin/warehouses/{$second->id}/default")
            ->assertOk()
            ->assertJsonPath('data.is_default', true);

        $this->assertFalse($first->refresh()->is_default);
        $this->assertTrue($second->refresh()->is_default);
    }

    public function test_admin_can_update_a_warehouse(): void
    {
        $this->actingAsAdmin();
        $warehouse = Warehouse::factory()->create(['name' => 'Gudang Lama']);

        $this->putJson("/api/v1/admin/warehouses/{$warehouse->id}", [
            'name' => 'Gudang Baru',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Gudang Baru');

        $this->assertDatabaseHas('warehouses', [
            'id' => $warehouse->id,
            'name' => 'Gudang Baru',
        ]);
    }

    public function test_a_warehouse_holding_stock_cannot_be_deleted(): void
    {
        $this->actingAsAdmin();
        $warehouse = Warehouse::factory()->create();
        InventoryStock::factory()->create(['warehouse_id' => $warehouse->id]);

        $this->deleteJson("/api/v1/admin/warehouses/{$warehouse->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('warehouse');

        $this->assertDatabaseHas('warehouses', ['id' => $warehouse->id]);
    }

    public function test_admin_can_delete_an_empty_warehouse(): void
    {
        $this->actingAsAdmin();
        $warehouse = Warehouse::factory()->create();

        $this->deleteJson("/api/v1/admin/warehouses/{$warehouse->id}")->assertOk();

        $this->assertDatabaseMissing('warehouses', ['id' => $warehouse->id]);
    }

    private function actingAsAdmin(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Admin]));
    }
}
