<?php

namespace App\Http\Requests\Rbac;

use Illuminate\Foundation\Http\FormRequest;

class AssignUserRolesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'roles' => 'required|array|min:1',
            'roles.*' => 'required',
            'user_type' => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'roles.required' => 'Daftar role wajib disertakan.',
            'roles.min' => 'Pengguna harus memiliki minimal satu role.',
        ];
    }
}

