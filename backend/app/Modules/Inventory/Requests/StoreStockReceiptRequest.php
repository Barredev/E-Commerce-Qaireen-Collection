<?php

namespace App\Modules\Inventory\Requests;

use App\Modules\Inventory\Enums\ReceiptSourceType;
use App\Modules\Inventory\Enums\StockCondition;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStockReceiptRequest extends FormRequest
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
            'warehouse_id' => ['required', 'uuid', 'exists:warehouses,id'],
            'source_type' => ['required', Rule::enum(ReceiptSourceType::class)],
            'received_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],

            'items' => ['required', 'array', 'min:1'],
            'items.*.variant_id' => ['required', 'uuid', 'distinct', 'exists:product_variants,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_cost' => ['nullable', 'numeric', 'min:0'],
            'items.*.condition' => ['nullable', Rule::enum(StockCondition::class)],
            'items.*.notes' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'items.required' => 'Penerimaan stok minimal harus memiliki satu item.',
            'items.min' => 'Penerimaan stok minimal harus memiliki satu item.',
            'items.*.variant_id.distinct' => 'Varian yang sama tidak boleh dicantumkan lebih dari sekali.',
        ];
    }
}
