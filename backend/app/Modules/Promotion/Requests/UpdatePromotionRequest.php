<?php

namespace App\Modules\Promotion\Requests;

use App\Modules\Promotion\Enums\DiscountBearer;
use App\Modules\Promotion\Enums\PromotionAppliesTo;
use App\Modules\Promotion\Enums\PromotionType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

class UpdatePromotionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('id') ?? $this->route('promotion');

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'code' => ['sometimes', 'required', 'string', 'max:50', 'alpha_dash', Rule::unique('promotions', 'code')->ignore($id)],
            'type' => ['sometimes', 'required', new Enum(PromotionType::class)],
            'value' => ['sometimes', 'required', 'numeric', 'min:0'],
            'min_purchase' => ['nullable', 'numeric', 'min:0'],
            'max_discount' => ['nullable', 'numeric', 'min:0'],
            'applies_to' => ['sometimes', 'required', new Enum(PromotionAppliesTo::class)],
            'applicable_ids' => ['nullable', 'array'],
            'applicable_ids.*' => ['string'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'per_user_limit' => ['nullable', 'integer', 'min:1'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'is_active' => ['boolean'],
            'discount_bearer' => ['sometimes', 'required', new Enum(DiscountBearer::class)],
            'description' => ['nullable', 'string'],
        ];
    }
}
