<?php

use App\Modules\Order\Services\OrderService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('orders:expire-unpaid', function (OrderService $orders): void {
    $cancelled = $orders->expireUnpaidOrders();

    $this->info("{$cancelled} pesanan kedaluwarsa dibatalkan.");
})->purpose('Batalkan pesanan yang melewati batas pembayaran dan lepaskan reservasi stok');

Schedule::command('orders:expire-unpaid')->hourly();
