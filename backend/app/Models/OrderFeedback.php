<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $order_id
 * @property string $user_id
 * @property int|null $shipping_rating
 * @property int|null $service_rating
 * @property string|null $comment
 */
class OrderFeedback extends Model
{
    use HasFactory, HasUuids;

    /**
     * "Feedback" is uncountable, so the table keeps the singular spelling.
     *
     * @var string
     */
    protected $table = 'order_feedback';

    protected $fillable = [
        'order_id',
        'user_id',
        'shipping_rating',
        'service_rating',
        'comment',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'shipping_rating' => 'integer',
            'service_rating' => 'integer',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
