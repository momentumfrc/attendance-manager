<?php

namespace App\Providers;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\RequestOptions;
use Illuminate\Support\Arr;
use Psr\Http\Message\ResponseInterface;
use SocialiteProviders\Manager\OAuth2\AbstractProvider;
use SocialiteProviders\Manager\OAuth2\User;
/**
 * @author Jordan Powers
 *
 * Based on https://github.com/mpociot/socialite-slack, but updated for slack's v2 authentication
 * process (https://api.slack.com/authentication/sign-in-with-slack).
 */
class SlackSocialiteProvider extends AbstractProvider
{
    public const IDENTIFIER = 'SLACK';

    public static function additionalConfigKeys() {
        return ['team'];
    }

    /**
     * {@inheritdoc}
     */
    public function getScopes()
    {
        if (count($this->scopes) > 0) {
            return $this->scopes;
        }

        return ['openid', 'profile'];
    }

    /**
     * Middleware that throws exceptions for non successful slack api calls
     * "http_error" request option is set to true.
     *
     * @return callable Returns a function that accepts the next handler.
     */
    private function getSlackApiErrorMiddleware()
    {
        return function (callable $handler) {
            return function ($request, array $options) use ($handler) {
                if (empty($options['http_errors'])) {
                    return $handler($request, $options);
                }

                return $handler($request, $options)->then(
                    function (ResponseInterface $response) use ($request) {
                        $body = json_decode((string) $response->getBody(), true);
                        $response->getBody()->rewind();

                        if ($body['ok']) {
                            return $response;
                        }

                        throw RequestException::create($request, $response);
                    }
                );
            };
        };
    }

    /**
     * {@inheritdoc}
     */
    protected function getHttpClient()
    {
        $handler = HandlerStack::create();
        $handler->push($this->getSlackApiErrorMiddleware(), 'slack_api_errors');

        if (is_null($this->httpClient)) {
            $this->httpClient = new Client(['handler' => $handler]);
        }

        return $this->httpClient;
    }

    /**
     * {@inheritdoc}
     */
    protected function getAuthUrl($state)
    {
        return $this->with([
            'team' => $this->getConfig('team')
        ])->buildAuthUrlFromBase(
            'https://slack.com/openid/connect/authorize',
            $state
        );
    }

    /**
     * {@inheritdoc}
     */
    protected function getTokenUrl()
    {
        return 'https://slack.com/api/openid.connect.token';
    }

    /**
     * {@inheritdoc}
     */
    protected function getUserByToken($token)
    {
        try {
            $response = $this->getHttpClient()->get(
                'https://slack.com/api/openid.connect.userInfo',
                [
                    RequestOptions::HEADERS => [
                        'Authorization' => 'Bearer '.$token,
                    ],
                ]
            );
        } catch (RequestException $exception) {
            // Getting user informations requires the "identity.*" scopes, however we might want to not add them to the
            // scope list for various reasons. Instead of throwing an exception on this error, we return an empty user.

            if ($exception->hasResponse()) {
                $data = json_decode((string) $exception->getResponse()->getBody(), true);

                if (Arr::get($data, 'error') === 'missing_scope') {
                    return [];
                }
            }

            throw $exception;
        }

        return json_decode((string) $response->getBody(), true);
    }

    /**
     * {@inheritdoc}
     */
    protected function mapUserToObject(array $user)
    {
        return (new User())->setRaw($user)->map([
            'id'              => Arr::get($user, 'https://slack.com/user_id'),
            'name'            => Arr::get($user, 'name'),
            'avatar'          => Arr::get($user, 'https://slack.com/user_image_192'),
            'organization_id' => Arr::get($user, 'https://slack.com/team_id'),
        ]);
    }
}

