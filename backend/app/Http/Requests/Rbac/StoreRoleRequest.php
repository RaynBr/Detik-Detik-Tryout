<?php

namespace App\Http\Requests\Rbac;

use Illuminate\Foundation\Http\FormRequest;

class StoreRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:50',
                'regex:/^[a-zA-Z0-9_\-]+$/',
            ],
            'label' => 'required|string|max:100',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|exists:permissions,key',
            'instansi_id' => 'nullable|string|max:25',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Nama teknis role wajib diisi.',
            'name.regex' => 'Nama teknis role hanya boleh mengandung huruf, angka, underscore, dan tanda hubung.',
            'label.required' => 'Label tampilan role wajib diisi.',
            'permissions.*.exists' => 'Permission [:input] tidak terdaftar di sistem.',
        ];
    }
}

