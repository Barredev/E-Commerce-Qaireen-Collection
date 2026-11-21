<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\User;
use App\Modules\Auth\Enums\UserRole;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AddressTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_guests_get_401_on_address_endpoints(): void
    {
        $this->getJson('/api/v1/account/addresses')->assertUnauthorized();
        $this->postJson('/api/v1/account/addresses', [])->assertUnauthorized();
    }

    public function test_a_customer_can_create_their_first_address(): void
    {
        $this->actingAsCustomer();

        $this->postJson('/api/v1/account/addresses', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.recipient_name', 'Budi Santoso')
            ->assertJsonPath('data.is_default', true);

        $this->assertDatabaseHas('addresses', [
            'recipient_name' => 'Budi Santoso',
            'is_default' => true,
        ]);
    }

    public function test_creating_a_default_address_unsets_the_previous_default(): void
    {
        $user = $this->actingAsCustomer();
        $first = Address::query()->create([
            'user_id' => $user->id,
            ...$this->attributes(),
            'is_default' => true,
        ]);

        $this->postJson('/api/v1/account/addresses', $this->payload([
            'label' => 'Kantor',
            'is_default' => true,
        ]))->assertCreated();

        $this->assertFalse($first->refresh()->is_default);
    }

    public function test_a_customer_only_lists_their_own_addresses(): void
    {
        $user = $this->actingAsCustomer();
        Address::query()->create(['user_id' => $user->id, ...$this->attributes()]);
        Address::query()->create(['user_id' => User::factory()->create()->id, ...$this->attributes()]);

        $this->getJson('/api/v1/account/addresses')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_a_customer_can_update_their_address(): void
    {
        $user = $this->actingAsCustomer();
        $address = Address::query()->create([
            'user_id' => $user->id,
            ...$this->attributes(),
        ]);

        $this->putJson("/api/v1/account/addresses/{$address->id}", [
            'city' => 'Bandung',
        ])->assertOk()
            ->assertJsonPath('data.city', 'Bandung');

        $this->assertDatabaseHas('addresses', ['id' => $address->id, 'city' => 'Bandung']);
    }

    public function test_a_customer_cannot_update_another_customers_address(): void
    {
        $this->actingAsCustomer();
        $address = Address::query()->create([
            'user_id' => User::factory()->create()->id,
            ...$this->attributes(),
        ]);

        $this->putJson("/api/v1/account/addresses/{$address->id}", [
            'city' => 'Bandung',
        ])->assertNotFound();

        $this->deleteJson("/api/v1/account/addresses/{$address->id}")->assertNotFound();
    }

    public function test_deleting_the_default_address_promotes_another_one(): void
    {
        $user = $this->actingAsCustomer();
        $default = Address::query()->create([
            'user_id' => $user->id,
            ...$this->attributes(),
            'is_default' => true,
        ]);
        $other = Address::query()->create([
            'user_id' => $user->id,
            ...$this->attributes(['label' => 'Kantor']),
            'is_default' => false,
        ]);

        $this->deleteJson("/api/v1/account/addresses/{$default->id}")->assertOk();

        $this->assertDatabaseMissing('addresses', ['id' => $default->id]);
        $this->assertTrue($other->refresh()->is_default);
    }

    public function test_required_address_fields_are_validated(): void
    {
        $this->actingAsCustomer();

        $this->postJson('/api/v1/account/addresses', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'recipient_name',
                'phone',
                'address_line_1',
                'city',
                'province',
                'postal_code',
            ]);
    }

    private function actingAsCustomer(): User
    {
        $user = User::factory()->create(['role' => UserRole::Customer]);
        Sanctum::actingAs($user);

        return $user;
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'label' => 'Rumah',
            'recipient_name' => 'Budi Santoso',
            'phone' => '081234567890',
            'address_line_1' => 'Jl. Sudirman No. 10',
            'city' => 'Jakarta Selatan',
            'province' => 'DKI Jakarta',
            'postal_code' => '12190',
            ...$overrides,
        ];
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function attributes(array $overrides = []): array
    {
        return $this->payload($overrides);
    }
}
