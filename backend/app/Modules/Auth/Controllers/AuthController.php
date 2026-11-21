<?php

namespace App\Modules\Auth\Controllers;

use App\Models\User;
use App\Modules\Auth\Enums\UserRole;
use App\Modules\Auth\Requests\LoginRequest;
use App\Modules\Auth\Requests\RegisterRequest;
use App\Modules\Auth\Requests\UpdateProfileRequest;
use App\Modules\Auth\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController
{
    /**
     * Register a new customer account.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            ...$request->safe()->only(['name', 'email', 'password', 'phone']),
            'role' => UserRole::Customer,
            'is_active' => true,
        ]);

        $token = $user->createToken($request->string('device_name')->toString() ?: 'web')->plainTextToken;

        return response()->json([
            'message' => 'Registrasi berhasil.',
            'data' => new UserResource($user),
            'token' => $token,
        ], Response::HTTP_CREATED);
    }

    /**
     * Issue a Sanctum token for valid credentials.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::query()->where('email', $request->string('email')->toString())->first();

        if (! $user || ! Hash::check($request->string('password')->toString(), $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email atau kata sandi yang Anda masukkan salah.'],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Akun Anda sedang tidak aktif. Silakan hubungi administrator.'],
            ]);
        }

        $token = $user->createToken($request->string('device_name')->toString() ?: 'web')->plainTextToken;

        return response()->json([
            'message' => 'Login berhasil.',
            'data' => new UserResource($user),
            'token' => $token,
        ]);
    }

    /**
     * Revoke the token used for the current request.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['message' => 'Berhasil keluar.']);
    }

    /**
     * Return the authenticated user's profile.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'data' => new UserResource($request->user()),
        ]);
    }

    /**
     * Update the authenticated user's profile.
     */
    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->safe()->only(['name', 'email', 'phone', 'avatar_url']);

        if ($request->filled('password')) {
            if (! Hash::check($request->string('current_password')->toString(), $user->password)) {
                throw ValidationException::withMessages([
                    'current_password' => ['Kata sandi saat ini tidak sesuai.'],
                ]);
            }

            $data['password'] = $request->string('password')->toString();
        }

        $user->update($data);

        return response()->json([
            'message' => 'Profil berhasil diperbarui.',
            'data' => new UserResource($user->refresh()),
        ]);
    }
}
