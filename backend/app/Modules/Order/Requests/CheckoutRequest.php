<?php

namespace App\Modules\Order\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CheckoutRequest extends FormRequest
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
            'address_id' => ['nullable', 'uuid', 'exists:addresses,id'],

            'shipping_name' => ['required_without:address_id', 'string', 'max:255'],
            'shipping_phone' => ['required_without:address_id', 'string', 'max:20'],
            'shipping_address' => ['required_without:address_id', 'string'],
            'shipping_district' => ['nullable', 'string', 'max:100'],
            'shipping_city' => ['required_without:address_id', 'string', 'max:100'],
            'shipping_province' => ['required_without:address_id', 'string', 'max:100'],
            'shipping_postal_code' => ['required_without:address_id', 'string', 'max:10'],
            'shipping_destination_id' => ['nullable', 'string', 'max:20'],

            'courier_code' => ['nullable', 'required_with:courier_service', 'string', 'max:50'],
            'courier_service' => ['nullable', 'required_with:courier_code', 'string', 'max:100'],

            'payment_method' => ['required', Rule::in(['bank_transfer', 'cod', 'ewallet'])],
            'coupon_code' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'address_id' => 'alamat',
            'shipping_name' => 'nama penerima',
            'shipping_phone' => 'nomor telepon penerima',
            'shipping_address' => 'alamat pengiriman',
            'shipping_city' => 'kota',
            'shipping_province' => 'provinsi',
            'shipping_postal_code' => 'kode pos',
            'shipping_destination_id' => 'kota tujuan pengiriman',
            'courier_code' => 'kurir',
            'courier_service' => 'layanan kurir',
            'payment_method' => 'metode pembayaran',
        ];
    }
}
