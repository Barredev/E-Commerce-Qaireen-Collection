<?php

namespace App\Modules\Feedback\Requests;

use App\Modules\Feedback\Enums\SizeFit;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubmitFeedbackRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'reviews' => ['required', 'array', 'min:1'],
            'reviews.*.order_item_id' => ['required', 'uuid', 'distinct'],
            'reviews.*.rating' => ['required', 'integer', 'min:1', 'max:5'],
            'reviews.*.comment' => ['nullable', 'string', 'max:1000'],
            'reviews.*.material_rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'reviews.*.size_fit' => ['nullable', Rule::enum(SizeFit::class)],

            'order_feedback' => ['nullable', 'array'],
            'order_feedback.shipping_rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'order_feedback.service_rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'order_feedback.comment' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'reviews' => 'ulasan produk',
            'reviews.*.order_item_id' => 'barang pesanan',
            'reviews.*.rating' => 'rating produk',
            'reviews.*.comment' => 'komentar ulasan',
            'reviews.*.material_rating' => 'rating kualitas bahan',
            'reviews.*.size_fit' => 'kecocokan ukuran',
            'order_feedback' => 'feedback pesanan',
            'order_feedback.shipping_rating' => 'rating pengiriman',
            'order_feedback.service_rating' => 'rating layanan',
            'order_feedback.comment' => 'komentar layanan',
        ];
    }
}
