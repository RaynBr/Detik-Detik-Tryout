<?php

return [
    /*
    |--------------------------------------------------------------------------
    | RBAC Enforcement Mode (Shadow Mode vs Strict Mode)
    |--------------------------------------------------------------------------
    | When enforce is false (shadow mode), the permission middleware will NOT
    | return 403 HTTP response. It will only log a warning to Laravel logs.
    | When enforce is true, it strictly aborts with 403 Forbidden JSON.
    */
    'enforce' => (bool) env('RBAC_ENFORCE', false),

    /*
    |--------------------------------------------------------------------------
    | Tenant Scoping Enforcement Mode (Shadow vs Strict)
    |--------------------------------------------------------------------------
    | When false (shadow mode), TenantScope and EnsureTenantOwnership do NOT
    | filter queries or block 403. They only write a warning log.
    | When true, queries are scoped and mismatched parameters return 403.
    */
    'tenant_enforce' => (bool) env('RBAC_TENANT_ENFORCE', false),

    /*
    |--------------------------------------------------------------------------
    | Log Denied Permissions
    |--------------------------------------------------------------------------
    | If true, unauthorized access attempts (whether blocked or shadowed)
    | are logged with user context, route, and missing permissions.
    */
    'log_denied' => (bool) env('RBAC_LOG_DENIED', true),

    /*
    |--------------------------------------------------------------------------
    | Permission Cache TTL (seconds)
    |--------------------------------------------------------------------------
    | Duration to cache user permissions in cache store.
    | Automatically flushed on any role, permission, or user-role mutation.
    */
    'cache_ttl' => (int) env('RBAC_CACHE_TTL', 3600),

    /*
    |--------------------------------------------------------------------------
    | Automatic Default Role Assignment on Account Creation
    |--------------------------------------------------------------------------
    | When true, UserBo and UserSiswa models automatically receive their
    | corresponding global system role in user_roles upon creation via the
    | HasDynamicRbac model event. Can be disabled in tests/seeders.
    */
    'auto_assign_on_create' => (bool) env('RBAC_AUTO_ASSIGN_ON_CREATE', true),
];

