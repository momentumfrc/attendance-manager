<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
use Illuminate\Database\Eloquent\Casts\Attribute;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles;
    use SoftDeletes;

    protected $fillable = ['name', 'slack_id', 'avatar', 'deleted_at'];
    protected $hidden = ['remember_token', 'roles'];
    protected $appends = ['role_names'];

    protected static function booted(): void {
        static::deleting(function(User $user) {
            if($user->isSystemUser()) {
                throw new \LogicException('The system user must not be deleted.');
            }
        });
    }

    public function getRoleNamesAttribute() {
        return $this->getRoleNames();
    }

    public function isSystemUser(): bool {
        return $this->slack_id === config('auth.system_slack_id');
    }
}
