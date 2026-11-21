<?php

namespace App\Modules\Order\Requests;

use App\Modules\Order\Enums\ReturnReason;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreReturnRequest extends FormRequest
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
            'reason_category' => ['required', Rule::enum(ReturnReason::class)],
            'reason' => ['required', 'string', 'max:2000'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.order_item_id' => ['required', 'uuid', 'exists:order_items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.reason' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'reason_category' => 'kategori alasan',
            'reason' => 'alasan retur',
            'notes' => 'catatan',
            'items' => 'barang yang diretur',
            'items.*.order_item_id' => 'barang pesanan',
            'items.*.quantity' => 'jumlah retur',
            'items.*.reason' => 'alasan per barang',
        ];
    }
}
