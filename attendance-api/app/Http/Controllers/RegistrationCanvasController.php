<?php

namespace App\Http\Controllers;

use App\Services\RegistrationCanvas;
use App\Services\RegistrationCanvasException;

class RegistrationCanvasController extends Controller
{
    public function __construct() {
        $this->middleware('can:modify student registration');
    }

    /**
     * Push the registration canvas to Slack, if it changed since the last push.
     */
    public function push(RegistrationCanvas $canvas)
    {
        try {
            $pushed = $canvas->push();
        } catch(RegistrationCanvasException $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        }

        return ['status' => $pushed ? 'pushed' : 'unchanged'];
    }
}
