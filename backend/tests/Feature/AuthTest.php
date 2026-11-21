<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_guest_can_register_and_receives_a_token(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Budi Santoso',
            'email' => 'budi@example.com',
            'password' => 'rahasia123',
            'password_confirmation' => 'rahasia123',
            'phone' => '081234567890',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.email', 'budi@example.com')
            ->assertJsonPath('data.role', UserRole::Customer->value)
            ->assertJsonStructure(['message', 'data' => ['id', 'name', 'email', 'role'], 'token']);

        $this->assertDatabaseHas('users', [
            'email' => 'budi@example.com',
            'role' => UserRole::Customer->value,
        ]);
    }

    public function test_registration_always_creates_a_customer_even_if_a_role_is_supplied(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Penyusup',
            'email' => 'penyusup@example.com',
            'password' => 'rahasia123',
            'password_confirmation' => 'rahasia123',
            'role' => UserRole::Admin->value,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.role', UserRole::Customer->value);
    }

    public function test_registration_requires_a_unique_email(): void
    {
        User::factory()->create(['email' => 'budi@example.com']);

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Budi Lain',
            'email' => 'budi@example.com',
            'password' => 'rahasia123',
            'password_confirmation' => 'rahasia123',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_a_user_can_login_with_valid_credentials(): void
    {
        User::factory()->create([
            'email' => 'budi@example.com',
            'password' => 'rahasia123',
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'budi@example.com',
            'password' => 'rahasia123',
        ])->assertOk()
            ->assertJsonPath('data.email', 'budi@example.com')
            ->assertJsonStructure(['message', 'data', 'token']);
    }

    public function test_a_user_cannot_login_with_invalid_credentials(): void
    {
        User::factory()->create([
            'email' => 'budi@example.com',
            'password' => 'rahasia123',
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'budi@example.com',
            'password' => 'salah',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_an_inactive_user_cannot_login(): void
    {
        User::factory()->create([
            'email' => 'budi@example.com',
            'password' => 'rahasia123',
            'is_active' => false,
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'budi@example.com',
            'password' => 'rahasia123',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_an_authenticated_user_can_view_and_update_their_profile(): void
    {
        $user = User::factory()->create(['name' => 'Nama Lama']);
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.name', 'Nama Lama');

        $this->withToken($token)
            ->putJson('/api/v1/auth/me', ['name' => 'Nama Baru'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Nama Baru');

        $this->assertSame('Nama Baru', $user->fresh()->name);
    }

    public function test_changing_the_password_requires_the_current_password(): void
    {
        $user = User::factory()->create(['password' => 'rahasia123']);
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->putJson('/api/v1/auth/me', [
                'current_password' => 'salah',
                'password' => 'barusekali123',
                'password_confirmation' => 'barusekali123',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('current_password');
    }

    public function test_a_user_can_logout_and_the_token_is_revoked(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/auth/logout')->assertOk();

        $this->assertDatabaseCount('personal_access_tokens', 0);

        // Drop the guard's cached user so the next request re-reads the token.
        $this->app['auth']->forgetGuards();

        $this->withToken($token)->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_guests_cannot_access_protected_auth_endpoints(): void
    {
        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
    }
}
