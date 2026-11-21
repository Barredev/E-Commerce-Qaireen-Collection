<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SizeGuide extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'brand_id',
        'product_id',
        'size_label',
        'chest_cm',
        'waist_cm',
        'hip_cm',
        'length_cm',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'chest_cm' => 'decimal:1',
            'waist_cm' => 'decimal:1',
            'hip_cm' => 'decimal:1',
            'length_cm' => 'decimal:1',
        ];
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
