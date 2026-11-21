<?php

namespace App\Modules\Promotion\Controllers;

use App\Models\Promotion;
use App\Modules\Promotion\Resources\PromotionResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Promosi yang sedang berjalan untuk etalase (tanpa autentikasi).
 */
class PublicPromotionController
{
    /**
     * Daftar promosi aktif yang berada di dalam rentang tanggal dan belum
     * melewati batas pemakaian.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $limit = min(max($request->integer('limit', 6), 1), 20);

        $promotions = Promotion::query()
            ->where('is_active', true)
            ->where(function ($query): void {
                $query->whereNull('starts_at')
                    ->orWhere('starts_at', '<=', now());
            })
            ->where(function ($query): void {
                $query->whereNull('ends_at')
                    ->orWhere('ends_at', '>=', now());
            })
            ->where(function ($query): void {
                $query->whereNull('usage_limit')
                    ->orWhereColumn('usage_count', '<', 'usage_limit');
            })
            ->orderBy('ends_at')
            ->limit($limit)
            ->get();

        return PromotionResource::collection($promotions);
    }
}
