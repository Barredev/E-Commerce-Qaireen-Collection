<?php

namespace App\Models;

use App\Modules\Promotion\Enums\DiscountBearer;
use App\Modules\Promotion\Enums\PromotionAppliesTo;
use App\Modules\Promotion\Enums\PromotionType;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Promotion extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'type',
        'value',
        'min_purchase',
        'max_discount',
        'applies_to',
        'applicable_ids',
        'usage_limit',
        'usage_count',
        'per_user_limit',
        'starts_at',
        'ends_at',
        'is_active',
        'discount_bearer',
        'description',
    ];

    protected $casts = [
        'type' => PromotionType::class,
        'applies_to' => PromotionAppliesTo::class,
        'discount_bearer' => DiscountBearer::class,
        'value' => 'float',
        'min_purchase' => 'float',
        'max_discount' => 'float',
        'applicable_ids' => 'array',
        'usage_limit' => 'integer',
        'usage_count' => 'integer',
        'per_user_limit' => 'integer',
        'is_active' => 'boolean',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
    ];

    public function isValidForCart(float $subtotal): bool
    {
        if (! $this->is_active) {
            return false;
        }

        $now = now();
        if ($this->starts_at && $now->lt($this->starts_at)) {
            return false;
        }

        if ($this->ends_at && $now->gt($this->ends_at)) {
            return false;
        }

        if ($this->usage_limit !== null && $this->usage_count >= $this->usage_limit) {
            return false;
        }

        if ($this->min_purchase !== null && $subtotal < $this->min_purchase) {
            return false;
        }

        return true;
    }
}
