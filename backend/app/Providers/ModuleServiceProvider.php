<?php

namespace App\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class ModuleServiceProvider extends ServiceProvider
{
    /**
     * Register every module's routes.php file under the /api/v1 prefix.
     *
     * Each module (app/Modules/{Module}/routes.php) owns its own route
     * definitions, keeping the modular monolith boundaries explicit.
     */
    public function boot(): void
    {
        $modules = glob(app_path('Modules/*'), GLOB_ONLYDIR) ?: [];

        sort($modules);

        foreach ($modules as $module) {
            $routes = $module.'/routes.php';

            if (! file_exists($routes)) {
                continue;
            }

            Route::middleware('api')
                ->prefix('api/v1')
                ->group($routes);
        }
    }
}
