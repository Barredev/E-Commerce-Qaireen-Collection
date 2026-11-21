<?php

namespace App\Modules\Promotion\Controllers;

use App\Models\NewsletterSubscriber;
use App\Modules\Promotion\Requests\SubscribeNewsletterRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * Pendaftaran newsletter VIP storefront.
 */
class NewsletterController
{
    public function store(SubscribeNewsletterRequest $request): JsonResponse
    {
        $email = mb_strtolower($request->string('email')->trim()->toString());

        $subscriber = NewsletterSubscriber::query()->firstOrCreate(
            ['email' => $email],
            ['subscribed_at' => now()],
        );

        $isNew = $subscriber->wasRecentlyCreated;

        return response()->json([
            'message' => $isNew
                ? 'Terima kasih! Email Anda telah terdaftar di VIP Members Club.'
                : 'Email Anda sudah terdaftar di VIP Members Club.',
            'data' => [
                'email' => $subscriber->email,
                'already_subscribed' => ! $isNew,
            ],
        ], $isNew ? Response::HTTP_CREATED : Response::HTTP_OK);
    }
}
