<?php

namespace App\Modules\Order\Requests;

use App\Modules\Inventory\Enums\StockCondition;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReceiveReturnRequest extends FormRequest
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
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'uuid', 'exists:return_items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.condition' => ['required', Rule::enum(StockCondition::class)],
            'items.*.notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'items' => 'baris retur',
            'items.*.id' => 'baris retur',
            'items.*.quantity' => 'jumlah terverifikasi',
            'items.*.condition' => 'kondisi barang',
            'items.*.notes' => 'catatan pemeriksaan',
        ];
    }
}
