<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Auth;


class CheckUserRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  \String $role
     * @return mixed
     */
    public function handle($request, Closure $next, ...$roles)
    {
        $user = Auth::guard()->user();
        if( ! in_array($user->role, $roles, true) ) {
            throw new AuthorizationException('You do not have permission to view this page');
        }
        return $next($request);
    }
}
