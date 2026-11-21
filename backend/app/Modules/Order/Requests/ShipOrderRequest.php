<?php

namespace App\Modules\Order\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ShipOrderRequest extends FormRequest
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
            // Optional because checkout already freezes the courier on the order;
            // the service falls back to those values when omitted.
            'courier_code' => ['nullable', 'string', 'max:50'],
            'courier_name' => ['nullable', 'string', 'max:100'],
            'courier_service' => ['nullable', 'string', 'max:100'],
            'tracking_number' => ['nullable', 'string', 'max:100'],
            'shipping_cost' => ['nullable', 'numeric', 'min:0'],
            'estimated_delivery' => ['nullable', 'date', 'after:now'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'courier_code' => 'kode kurir',
            'courier_name' => 'nama kurir',
            'courier_service' => 'layanan kurir',
            'tracking_number' => 'nomor resi',
            'shipping_cost' => 'biaya pengiriman',
            'estimated_delivery' => 'perkiraan tiba',
        ];
    }
}
