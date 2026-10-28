<?php

namespace App\Services;

use RuntimeException;

/**
 * The registration canvas couldn't be pushed to Slack: it isn't configured, or Slack refused the edit.
 */
class RegistrationCanvasException extends RuntimeException
{
}
