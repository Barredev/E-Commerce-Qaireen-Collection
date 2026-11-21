<?php

namespace App\Http\Middleware;

use App\Modules\Auth\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Allow the request only when the authenticated user has one of the given roles.
     *
     * Usage: ->middleware('role:admin,warehouse')
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $current = $user->role instanceof UserRole ? $user->role->value : (string) $user->role;

        if (! in_array($current, $roles, true)) {
            return response()->json(['message' => 'Anda tidak memiliki akses ke sumber daya ini.'], 403);
        }

        return $next($request);
    }
}
