<?php

namespace App\Modules\Inventory\Resources;

use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Warehouse
 */
class WarehouseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'address' => $this->address,
            'city' => $this->city,
            'is_active' => (bool) $this->is_active,
            'is_default' => (bool) $this->is_default,
            'stocks_count' => $this->whenCounted('stocks'),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
