<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'midtrans' => [
        // An empty server key puts the gateway in simulation mode: no request is
        // sent to Midtrans and no Snap URL is produced (the UI offers the local
        // "simulate-pay" button instead of a link that would 404).
        'server_key' => env('MIDTRANS_SERVER_KEY', ''),
        'client_key' => env('MIDTRANS_CLIENT_KEY', ''),
        'is_production' => env('MIDTRANS_IS_PRODUCTION', false),
        'is_sanitized' => env('MIDTRANS_IS_SANITIZED', true),
        'is_3ds' => env('MIDTRANS_IS_3DS', true),
        // Where Snap sends the customer after finish/unfinish/error.
        'finish_url' => env('FRONTEND_URL', 'http://localhost:3000'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Company Identity (printed on invoices)
    |--------------------------------------------------------------------------
    */

    'company' => [
        'name' => env('COMPANY_NAME', 'Qaireen Collection'),
        'address' => env('COMPANY_ADDRESS', ''),
        'phone' => env('COMPANY_PHONE', ''),
        'email' => env('COMPANY_EMAIL', ''),
        'npwp' => env('COMPANY_NPWP', ''),
    ],

    'rajaongkir' => [
        'key' => env('RAJAONGKIR_API_KEY', ''),
        // The Pro tier is required for waybill (resi) tracking; the Starter
        // tier only exposes city and cost lookups.
        'base_url' => env('RAJAONGKIR_BASE_URL', 'https://pro.rajaongkir.com/api'),
        'origin_id' => env('RAJAONGKIR_ORIGIN_ID', ''),
        'couriers' => array_values(array_filter(explode(',', (string) env('RAJAONGKIR_COURIERS', 'jne,sicepat,jnt')))),
        'webhook_token' => env('RAJAONGKIR_WEBHOOK_TOKEN', ''),
        'simulation' => env('RAJAONGKIR_SIMULATION', false),
    ],

];
