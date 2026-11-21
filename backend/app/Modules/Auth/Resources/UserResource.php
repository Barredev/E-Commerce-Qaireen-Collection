<?php

namespace App\Modules\Auth\Resources;

use App\Models\User;
use App\Modules\Auth\Enums\UserRole;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'role' => $this->role instanceof UserRole
                ? $this->role->value
                : $this->role,
            'role_label' => $this->role instanceof UserRole
                ? $this->role->label()
                : null,
            'avatar_url' => $this->avatar_url,
            'is_active' => (bool) $this->is_active,
            'email_verified_at' => $this->email_verified_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
