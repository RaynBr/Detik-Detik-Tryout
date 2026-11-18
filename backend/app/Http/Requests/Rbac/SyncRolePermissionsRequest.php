<?php

namespace App\Http\Requests\Rbac;

use Illuminate\Foundation\Http\FormRequest;

class SyncRolePermissionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'permissions' => 'present|array',
            'permissions.*' => 'string|exists:permissions,key',
        ];
    }

    public function messages(): array
    {
        return [
            'permissions.present' => 'Daftar permission wajib disertakan dalam request.',
            'permissions.*.exists' => 'Permission [:input] tidak terdaftar di sistem.',
        ];
    }
}

