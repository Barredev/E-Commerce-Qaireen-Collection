<?php

use App\Http\Middleware\RoleMiddleware;
use App\Modules\Inventory\Exceptions\InsufficientStockException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // API routes are registered by App\Providers\ModuleServiceProvider
        // under the /api/v1 prefix, using the framework "api" middleware group.
        $middleware->alias([
            'role' => RoleMiddleware::class,
        ]);

        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Stock conflicts are a validation outcome for the caller, not a server error.
        $exceptions->render(function (InsufficientStockException $exception, Request $request) {
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                return null;
            }

            return response()->json([
                'message' => $exception->getMessage(),
                'errors' => [
                    'quantity' => [$exception->getMessage()],
                ],
                'available' => $exception->available,
                'requested' => $exception->requested,
            ], 422);
        });
    })->create();
