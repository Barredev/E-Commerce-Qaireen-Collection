<?php

namespace App\Modules\Feedback\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AdminToggleVisibilityRequest extends FormRequest
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
            'reason' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'reason' => 'alasan moderasi',
        ];
    }
}
