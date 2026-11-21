<?php

namespace App\Modules\Order\Requests;

use App\Modules\Order\Enums\RefundMethod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RefundReturnRequest extends FormRequest
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
            'refund_method' => ['required', Rule::enum(RefundMethod::class)],
            'refund_reference' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'refund_method' => 'metode pengembalian dana',
            'refund_reference' => 'nomor referensi pengembalian',
        ];
    }
}
