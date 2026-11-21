<?php

namespace App\Providers;

use App\Modules\Order\Contracts\PaymentGatewayInterface;
use App\Modules\Order\Contracts\ShippingProviderInterface;
use App\Modules\Order\Services\MidtransPaymentGateway;
use App\Modules\Order\Services\RajaOngkirShippingService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(PaymentGatewayInterface::class, MidtransPaymentGateway::class);
        $this->app->bind(ShippingProviderInterface::class, RajaOngkirShippingService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
