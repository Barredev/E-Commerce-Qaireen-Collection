<?php

namespace App\Models;

use App\Modules\Feedback\Enums\SizeFit;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $order_item_id
 * @property string $order_id
 * @property string $product_id
 * @property string|null $variant_id
 * @property string $user_id
 * @property int $rating
 * @property string|null $comment
 * @property int|null $material_rating
 * @property SizeFit|null $size_fit
 * @property bool $is_hidden
 * @property Carbon|null $hidden_at
 * @property string|null $hidden_reason
 */
class ProductReview extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'order_item_id',
        'order_id',
        'product_id',
        'variant_id',
        'user_id',
        'rating',
        'comment',
        'material_rating',
        'size_fit',
        'is_hidden',
        'hidden_at',
        'hidden_reason',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'material_rating' => 'integer',
            'size_fit' => SizeFit::class,
            'is_hidden' => 'boolean',
            'hidden_at' => 'datetime',
        ];
    }

    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Reviews that are visible in the storefront.
     *
     * @param  Builder<ProductReview>  $query
     */
    public function scopePublished(Builder $query): void
    {
        $query->where('is_hidden', false);
    }

    /**
     * @param  Builder<ProductReview>  $query
     */
    public function scopeForProduct(Builder $query, string $productId): void
    {
        $query->where('product_id', $productId);
    }
}
