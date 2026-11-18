<?php

namespace App\Http\Requests\Rbac;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'label' => 'required|string|max:100',
            'name' => [
                'nullable',
                'string',
                'max:50',
                'regex:/^[a-zA-Z0-9_\-]+$/',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'label.required' => 'Label tampilan role wajib diisi.',
            'name.regex' => 'Nama teknis role hanya boleh mengandung huruf, angka, underscore, dan tanda hubung.',
        ];
    }
}

