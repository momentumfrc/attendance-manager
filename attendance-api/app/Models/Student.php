<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Student extends Model
{
    use HasFactory;

    protected $appends = ['last_check_in', 'last_check_out'];

    public function checkIns() {
        return $this->hasMany(CheckIn::class);
    }

    public function checkOuts() {
        return $this->hasMany(CheckOut::class);
    }

    public function lastCheckIn(): Attribute {
        return new Attribute(
            get: fn() => $this->checkIns()->orderBy('updated_at', 'desc')->first()
        );
    }

    public function lastCheckOut(): Attribute {
        return new Attribute(
            get: fn() => $this->checkOuts()->orderBy('updated_at', 'desc')->first()
        );
    }

}
